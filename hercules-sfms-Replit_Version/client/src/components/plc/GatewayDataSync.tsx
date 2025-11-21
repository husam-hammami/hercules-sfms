import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Wifi, WifiOff, Activity, Download, Upload, Database, 
  Server, CheckCircle2, XCircle, AlertTriangle, Loader2,
  TrendingUp, Info, Zap
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PlcTag } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useDemo } from '@/contexts/DemoContext';
import { useToast } from '@/hooks/use-toast';

interface GatewayDataSyncProps {
  facilityId: string;
  facilityName: string;
}

interface SyncStatus {
  status: 'idle' | 'syncing' | 'connected' | 'error';
  lastSync: Date | null;
  tagsCount: number;
  dataPointsToday: number;
  errorCount: number;
  bandwidth: number;
}

interface GatewayInfo {
  id: string;
  name: string;
  connectionStatus: 'active' | 'stale' | 'disconnected';
  lastHeartbeat: string | null;
  tagsMonitored: number;
  syncCount: number;
  gatewayInfo: {
    os?: string;
    osVersion?: string;
    cpu?: string;
    memory?: string;
  };
  activatedAt: string | null;
}

export function GatewayDataSync({ facilityId, facilityName }: GatewayDataSyncProps) {
  const { isDemoMode } = useDemo();
  const { toast } = useToast();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'idle',
    lastSync: null,
    tagsCount: 0,
    dataPointsToday: 0,
    errorCount: 0,
    bandwidth: 0,
  });
  const [isSimulating, setIsSimulating] = useState(false);

  // Fetch active gateways from new endpoint (always enabled since endpoint doesn't require auth)
  const { data: activeGateways = [] } = useQuery<GatewayInfo[]>({
    queryKey: ['/api/gateways/active'],
    enabled: true,
    refetchInterval: 30000, // Refresh every 30 seconds to check for updates
  });

  // Fetch real-time data including tag values
  const { data: realtimeData } = useQuery<{ tagValues?: Record<string, { value: number | string; unit?: string }> } | null>({
    queryKey: ['/api/dashboard/realtime'],
    refetchInterval: isSimulating && !isDemoMode ? 3000 : false,
    enabled: !isDemoMode,
  });

  // Fetch PLC tags for this facility
  const { data: plcTags = [] } = useQuery<PlcTag[]>({
    queryKey: ['/api/plc-tags'],
    queryFn: async () => {
      const response = await fetch('/api/plc-tags', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch PLC tags');
      return response.json();
    },
    enabled: !isDemoMode,
  });

  // Start the backend simulator for gateway data synchronization
  const startGatewaySync = async () => {
    try {
      setIsSimulating(true);
      setSyncStatus(prev => ({ 
        ...prev, 
        status: 'syncing',
        lastSync: new Date()
      }));

      // Call backend simulator toggle endpoint to start
      const response = await apiRequest('POST', '/api/simulator/toggle');
      const data = await response.json();

      if (data.success && data.isRunning) {
        setSyncStatus(prev => ({ 
          ...prev, 
          status: 'connected',
          tagsCount: plcTags.length,
          bandwidth: 45 + Math.random() * 30,
          lastSync: data.lastUpdate ? new Date(data.lastUpdate) : new Date()
        }));
        toast({
          title: "Gateway Sync Started",
          description: `Successfully connected to the backend simulator. Monitoring ${plcTags.length} tags.`,
          variant: "default",
        });
      } else {
        // If failed to start, revert the status
        setIsSimulating(false);
        setSyncStatus(prev => ({ 
          ...prev, 
          status: 'error',
          errorCount: prev.errorCount + 1
        }));
        console.error('Failed to start simulator:', data.message);
        toast({
          title: "Failed to Start Gateway Sync",
          description: data.message || "Could not start the backend simulator. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error starting gateway sync:', error);
      setIsSimulating(false);
      setSyncStatus(prev => ({ 
        ...prev, 
        status: 'error',
        errorCount: prev.errorCount + 1
      }));
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect to the backend simulator. Please check your connection.",
        variant: "destructive",
      });
    }
  };

  // Stop the backend simulator
  const stopGatewaySync = async () => {
    try {
      // Call backend simulator toggle endpoint to stop
      const response = await apiRequest('POST', '/api/simulator/toggle');
      const data = await response.json();

      if (data.success && !data.isRunning) {
        setIsSimulating(false);
        setSyncStatus(prev => ({ 
          ...prev, 
          status: 'idle',
          bandwidth: 0
        }));
        toast({
          title: "Gateway Sync Stopped",
          description: "Successfully disconnected from the backend simulator.",
          variant: "default",
        });
      } else {
        console.error('Failed to stop simulator:', data.message);
        toast({
          title: "Failed to Stop Gateway Sync",
          description: data.message || "Could not stop the backend simulator. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error stopping gateway sync:', error);
      // Even if error, stop the UI simulation
      setIsSimulating(false);
      setSyncStatus(prev => ({ 
        ...prev, 
        status: 'idle',
        bandwidth: 0
      }));
      toast({
        title: "Error Stopping Sync",
        description: error.message || "An error occurred while stopping the gateway sync.",
        variant: "destructive",
      });
    }
  };

  // Check simulator status on mount and sync the UI
  useEffect(() => {
    const checkSimulatorStatus = async () => {
      if (isDemoMode) return;
      
      try {
        const response = await apiRequest('GET', '/api/simulator/status');
        const data = await response.json();
        
        if (data.isRunning) {
          setIsSimulating(true);
          setSyncStatus(prev => ({
            ...prev,
            status: 'connected',
            tagsCount: plcTags.length,
            bandwidth: 45 + Math.random() * 30,
            lastSync: data.lastUpdate ? new Date(data.lastUpdate) : null
          }));
        }
      } catch (error) {
        // Silently ignore - simulator status endpoint might not be accessible
        console.debug('Could not check simulator status:', error);
      }
    };
    
    checkSimulatorStatus();
  }, [isDemoMode, plcTags.length]);

  // Update sync status based on active gateways
  useEffect(() => {
    if (activeGateways && activeGateways.length > 0) {
      const activeGateway = activeGateways.find(g => g.connectionStatus === 'active');
      if (activeGateway) {
        setSyncStatus(prev => ({
          ...prev,
          status: 'connected',
          lastSync: activeGateway.lastHeartbeat ? new Date(activeGateway.lastHeartbeat) : null,
          tagsCount: activeGateway.tagsMonitored,
          dataPointsToday: activeGateway.syncCount || 0,
        }));
      } else {
        const staleGateway = activeGateways.find(g => g.connectionStatus === 'stale');
        if (staleGateway) {
          setSyncStatus(prev => ({
            ...prev,
            status: 'error',
            lastSync: staleGateway.lastHeartbeat ? new Date(staleGateway.lastHeartbeat) : null,
            tagsCount: staleGateway.tagsMonitored,
            dataPointsToday: staleGateway.syncCount || 0,
          }));
        } else {
          setSyncStatus(prev => ({
            ...prev,
            status: 'idle',
            lastSync: null,
          }));
        }
      }
    } else {
      setSyncStatus(prev => ({
        ...prev,
        status: 'idle',
        lastSync: null,
      }));
    }
  }, [activeGateways]);

  // Update data points counter when syncing
  useEffect(() => {
    if (isSimulating && syncStatus.status === 'connected') {
      const interval = setInterval(() => {
        setSyncStatus(prev => ({
          ...prev,
          dataPointsToday: prev.dataPointsToday + plcTags.length,
          bandwidth: 30 + Math.random() * 50,
          lastSync: new Date()
        }));
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isSimulating, syncStatus.status, plcTags.length]);

  const getStatusIcon = () => {
    switch (syncStatus.status) {
      case 'connected':
        return <Wifi className="h-5 w-5 text-green-400 animate-pulse" />;
      case 'syncing':
        return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />;
      case 'error':
        return <WifiOff className="h-5 w-5 text-red-400" />;
      default:
        return <WifiOff className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (syncStatus.status) {
      case 'connected':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case 'syncing':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500">
            <XCircle className="h-3 w-3 mr-1" />
            Offline
          </Badge>
        );
    }
  };

  const formatDataSize = (points: number) => {
    const bytesPerPoint = 24; // Approximate size per data point
    const bytes = points * bytesPerPoint;
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Card className="bg-slate-900/80 border-cyan-500/30">
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server className="h-4 w-4 text-cyan-400" />
            <div>
              <CardTitle className="text-sm text-cyan-300">Gateway Data Synchronization</CardTitle>
              <p className="text-xs text-slate-400">
                Local gateway connection for {facilityName}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-2">
        {/* Compact Connection Status */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-slate-800/50 rounded p-2 border border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Connection</span>
              {getStatusIcon()}
            </div>
            <div className="text-sm font-bold text-white">
              {syncStatus.status === 'connected' ? 'Active' : 
               syncStatus.status === 'syncing' ? 'Connecting...' : 'Offline'}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded p-2 border border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Tags Monitored</span>
              <Database className="h-3 w-3 text-blue-400" />
            </div>
            <div className="text-sm font-bold text-white">{plcTags.length}</div>
          </div>

          <div className="bg-slate-800/50 rounded p-2 border border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Data Points Today</span>
              <TrendingUp className="h-3 w-3 text-green-400" />
            </div>
            <div className="text-sm font-bold text-white">
              {syncStatus.dataPointsToday.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded p-2 border border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Bandwidth</span>
              <Activity className="h-3 w-3 text-cyan-400" />
            </div>
            <div className="text-sm font-bold text-white">
              {syncStatus.bandwidth.toFixed(1)} KB/s
            </div>
          </div>
        </div>

        {/* Compact Data Transfer Progress */}
        {syncStatus.status === 'connected' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Data Transfer Rate</span>
              <span className="text-cyan-400">{formatDataSize(syncStatus.dataPointsToday)}</span>
            </div>
            <Progress value={syncStatus.bandwidth} className="h-1" />
          </div>
        )}

        {/* Compact Sync Control */}
        <div className="space-y-2">
          {!isSimulating ? (
            <>
              <Alert className="border-cyan-500/30 bg-cyan-500/10 p-2">
                <Info className="h-3 w-3 text-cyan-400" />
                <AlertDescription className="text-xs text-white ml-1">
                  Start gateway synchronization to begin collecting data from PLC tags. Data will be collected every 3 seconds.
                </AlertDescription>
              </Alert>
              
              <Button
                onClick={startGatewaySync}
                size="sm"
                className="w-full h-8 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              >
                <Wifi className="h-3 w-3 mr-1" />
                Start Gateway Sync
              </Button>
            </>
          ) : (
            <>
              <Alert className="border-green-500/30 bg-green-500/10 p-2">
                <CheckCircle2 className="h-3 w-3 text-green-400" />
                <AlertDescription className="text-xs text-white ml-1">
                  Gateway is actively synchronizing data. {plcTags.length} tags are being monitored.
                </AlertDescription>
              </Alert>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopGatewaySync}
                  className="flex-1 h-7 text-xs border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                >
                  <WifiOff className="h-3 w-3 mr-1" />
                  Stop Sync
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-white"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export Data
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Compact Gateway Info */}
        <div className="pt-2 border-t border-cyan-500/20">
          {activeGateways && activeGateways.filter(g => g.connectionStatus === 'active').length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-cyan-300">Active Gateways</h3>
              <div className="space-y-2">
                {activeGateways.filter(gateway => gateway.connectionStatus === 'active').map((gateway) => (
                  <div key={gateway.id} className="bg-slate-800/50 rounded p-2 border border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1">
                        <Server className="h-3 w-3 text-cyan-400" />
                        <span className="text-white text-xs font-medium">{gateway.name}</span>
                      </div>
                      {gateway.connectionStatus === 'active' && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500 text-xs py-0">
                          <CheckCircle2 className="h-2 w-2 mr-0.5" />
                          Active
                        </Badge>
                      )}
                      {gateway.connectionStatus === 'stale' && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500 text-xs py-0">
                          <AlertTriangle className="h-2 w-2 mr-0.5" />
                          Stale
                        </Badge>
                      )}
                      {gateway.connectionStatus === 'disconnected' && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500 text-xs py-0">
                          <XCircle className="h-2 w-2 mr-0.5" />
                          Disconnected
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div>
                        <span className="text-slate-400">Gateway ID:</span>
                        <span className="text-white ml-1 font-mono text-xs">{gateway.id}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Tags:</span>
                        <span className="text-white ml-1">{gateway.tagsMonitored}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Last Heartbeat:</span>
                        <span className="text-white ml-1">
                          {gateway.lastHeartbeat 
                            ? new Date(gateway.lastHeartbeat).toLocaleTimeString()
                            : 'Never'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Sync Count:</span>
                        <span className="text-white ml-1">{gateway.syncCount}</span>
                      </div>
                      {gateway.gatewayInfo?.os && (
                        <div>
                          <span className="text-slate-400">OS:</span>
                          <span className="text-white ml-1 text-xs">{gateway.gatewayInfo.os} {gateway.gatewayInfo.osVersion}</span>
                        </div>
                      )}
                      {gateway.gatewayInfo?.cpu && (
                        <div>
                          <span className="text-slate-400">CPU:</span>
                          <span className="text-white ml-1 text-xs">{gateway.gatewayInfo.cpu}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3 p-2 bg-slate-800/30 rounded">
              <WifiOff className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <div className="text-left">
                <h3 className="text-xs font-semibold text-gray-400">No Gateway Connected</h3>
                <p className="text-xs text-gray-500">
                  No active gateway connection detected. Generate and use an activation code from the Gateway Management page to connect a gateway.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}