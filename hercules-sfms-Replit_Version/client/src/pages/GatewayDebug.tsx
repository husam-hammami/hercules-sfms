import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Activity, AlertCircle, CheckCircle2, XCircle, Clock, 
  Server, Wifi, WifiOff, Download, Upload, RefreshCw, 
  Terminal, Database, Search, Filter, Trash2, FileDown,
  Zap, TrendingUp, TrendingDown, AlertTriangle, Shield,
  Network, HardDrive, Cpu, Timer, Hash, Calendar,
  ChevronRight, ChevronDown, Eye, EyeOff, Gauge,
  Ban, Lock, Unlock, Key, Info, Copy, Check,
  BarChart, PieChart, AlertOctagon, Play, Pause, Book
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

// Helper function to build query strings with proper URL encoding
function buildQueryString(baseUrl: string, params: Record<string, any>): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
  return filtered.length > 0 ? `${baseUrl}?${filtered.join('&')}` : baseUrl;
}

interface GatewayInfo {
  id: string;
  userId: string;
  machineId: string;
  status: 'active' | 'inactive' | 'stale' | 'disconnected';
  lastIp: string;
  lastActivity?: string;
  lastHeartbeat?: string;
  tokenExpiresAt?: string;
  os?: string;
  osVersion?: string;
  cpu?: string;
  memory?: string;
  schemaVersion?: string;
  syncCount?: number;
  errorCount?: number;
  avgResponseTime?: number;
}

interface ApiActivity {
  id: string;
  timestamp: string;
  gatewayId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestSize?: number;
  responseSize?: number;
  error?: string;
  ip?: string;
  category?: string;
  severity?: string;
}

interface DetailedLog {
  id: string;
  timestamp: string;
  gatewayId: string;
  userId?: string;
  endpoint: string;
  method: string;
  ipAddress?: string;
  userAgent?: string;
  responseStatus: number;
  requestSize?: number;
  responseSize?: number;
  errorMessage?: string;
  errorCode?: string;
  errorStack?: string;
  processingDuration?: number;
  machineId?: string;
  schemaVersion?: string;
  gatewayVersion?: string;
  isRateLimited?: boolean;
  rateLimitReason?: string;
  category?: string;
  severity?: string;
  requestHeaders?: any;
  requestBody?: any;
  responseHeaders?: any;
  responseBody?: any;
}

interface TableStatus {
  tableName: string;
  rowCount: number;
  sizeBytes?: number;
  lastSync?: string;
  status: 'synced' | 'pending' | 'error';
  error?: string;
}

interface GatewayStats {
  totalGateways: number;
  activeGateways: number;
  totalRequests: number;
  errorCount: number;
  warningCount?: number;
  criticalCount?: number;
  avgResponseTime: number;
  maxResponseTime?: number;
  errorRate: number;
  requestsPerMinute: number;
  rateLimitedCount?: number;
  failedActivationAttempts?: number;
  mostActiveGateways?: Array<{
    gatewayId: string;
    requestCount: number;
    errorCount: number;
  }>;
}

export default function GatewayDebug() {
  const [selectedGateway, setSelectedGateway] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [endpointFilter, setEndpointFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('1h');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const activityLogRef = useRef<HTMLDivElement>(null);

  // Fetch gateway connections with enhanced stats
  const { data: gateways, refetch: refetchGateways } = useQuery<GatewayInfo[]>({
    queryKey: ['/api/debug/gateways'],
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Build URL with query parameters for gateway activity
  const activityUrl = buildQueryString('/api/debug/gateway-activity', {
    gateway: selectedGateway !== 'all' ? selectedGateway : undefined,
    timeRange,
    endpoint: endpointFilter !== 'all' ? endpointFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: searchTerm || undefined
  });

  // Fetch API activity with enhanced filtering
  const { data: apiActivity, refetch: refetchActivity } = useQuery<ApiActivity[]>({
    queryKey: [activityUrl, selectedGateway, timeRange, endpointFilter, statusFilter, searchTerm],
    refetchInterval: autoRefresh ? 1000 : false, // Fast refresh for real-time
  });

  // Build URL with query parameters for gateway logs
  const logsUrl = buildQueryString('/api/debug/gateway-logs', {
    gatewayId: selectedGateway !== 'all' ? selectedGateway : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    severity: severityFilter !== 'all' ? severityFilter : undefined,
    timeRange,
    includeBody: expandedLogId ? 'true' : 'false',
    limit: 200
  });

  // Fetch detailed logs
  const { data: detailedLogs, refetch: refetchLogs } = useQuery<{ logs: DetailedLog[], total: number }>({
    queryKey: [logsUrl, selectedGateway, categoryFilter, severityFilter, timeRange, expandedLogId],
    enabled: selectedTab === 'logs',
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Build URL with query parameters for table status
  const tablesUrl = buildQueryString('/api/debug/gateway-tables', {
    gatewayId: selectedGateway !== 'all' ? selectedGateway : undefined
  });

  // Fetch table status for selected gateway
  const { data: tableStatus } = useQuery<TableStatus[]>({
    queryKey: [tablesUrl, selectedGateway],
    enabled: selectedGateway !== 'all' && selectedTab === 'config',
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Build URL with query parameters for gateway stats
  const statsUrl = buildQueryString('/api/debug/gateway-stats', {
    timeRange
  });

  // Fetch enhanced statistics
  const { data: stats } = useQuery<GatewayStats>({
    queryKey: [statsUrl, timeRange],
    refetchInterval: autoRefresh ? 3000 : false,
  });

  // Auto-scroll to bottom when new activity arrives
  useEffect(() => {
    if (autoScroll && activityLogRef.current) {
      activityLogRef.current.scrollTop = activityLogRef.current.scrollHeight;
    }
  }, [apiActivity, autoScroll]);

  // Copy to clipboard function
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter activity based on search and filters
  const filteredActivity = apiActivity?.filter(activity => {
    const matchesSearch = searchTerm === '' || 
      activity.gatewayId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.endpoint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.error?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEndpoint = endpointFilter === 'all' || 
      activity.endpoint?.includes(endpointFilter);
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'success' && activity.statusCode >= 200 && activity.statusCode < 300) ||
      (statusFilter === 'warning' && activity.statusCode >= 400 && activity.statusCode < 500) ||
      (statusFilter === 'error' && activity.statusCode >= 500);
    
    const matchesSeverity = severityFilter === 'all' ||
      activity.severity === severityFilter;
    
    const matchesCategory = categoryFilter === 'all' ||
      activity.category === categoryFilter;
    
    return matchesSearch && matchesEndpoint && matchesStatus && matchesSeverity && matchesCategory;
  });

  // Get gateway status with enhanced indicators
  const getStatusIndicator = (status: string, lastActivity?: string, lastHeartbeat?: string) => {
    const now = new Date();
    const lastTime = lastActivity || lastHeartbeat;
    const lastBeat = lastTime ? new Date(lastTime) : null;
    const timeDiff = lastBeat ? (now.getTime() - lastBeat.getTime()) / 1000 : Infinity;

    if (status === 'disconnected' || timeDiff > 300) {
      return { 
        color: 'text-red-500 bg-red-500/10 border-red-500/50', 
        icon: <WifiOff className="h-4 w-4" />, 
        text: 'Disconnected',
        pulse: false 
      };
    } else if (timeDiff > 60) {
      return { 
        color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/50', 
        icon: <AlertTriangle className="h-4 w-4" />, 
        text: 'Stale',
        pulse: false 
      };
    } else if (timeDiff > 30) {
      return { 
        color: 'text-orange-500 bg-orange-500/10 border-orange-500/50', 
        icon: <Clock className="h-4 w-4" />, 
        text: 'Delayed',
        pulse: false 
      };
    } else {
      return { 
        color: 'text-green-500 bg-green-500/10 border-green-500/50', 
        icon: <Wifi className="h-4 w-4" />, 
        text: 'Connected',
        pulse: true 
      };
    }
  };

  // Enhanced status code color with background
  const getStatusCodeStyle = (code: number) => {
    if (code >= 200 && code < 300) return 'text-green-400 bg-green-500/10 border-green-500/30';
    if (code >= 300 && code < 400) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    if (code >= 400 && code < 500) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    if (code >= 500) return 'text-red-400 bg-red-500/10 border-red-500/30 animate-pulse';
    return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  };

  // Get severity badge style
  const getSeverityStyle = (severity?: string) => {
    switch(severity) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500';
      case 'error': return 'text-orange-500 bg-orange-500/10 border-orange-500';
      case 'warning': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500';
    }
  };

  // Export logs with more detail
  const exportLogs = () => {
    const exportData = {
      exportTime: new Date().toISOString(),
      timeRange,
      filters: {
        gateway: selectedGateway,
        endpoint: endpointFilter,
        status: statusFilter,
        severity: severityFilter,
        category: categoryFilter,
        search: searchTerm
      },
      stats: stats,
      logs: selectedTab === 'logs' ? detailedLogs?.logs : filteredActivity,
      totalEntries: selectedTab === 'logs' ? detailedLogs?.total : filteredActivity?.length
    };
    
    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gateway-debug-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear logs mutation
  const clearActivityMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/debug/clear-activity', { 
        gatewayId: selectedGateway 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/debug/gateway-activity'] });
      queryClient.invalidateQueries({ queryKey: ['/api/debug/gateway-logs'] });
    }
  });

  return (
    <WaterSystemLayout 
      title="Gateway Debug Console"
      subtitle="Comprehensive monitoring and debugging for all gateway operations"
    >
      <TooltipProvider>
        <div className="p-6 space-y-6 bg-gradient-to-b from-gray-950 via-gray-900 to-black">
          {/* Enhanced Header with Live Status */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 blur-3xl" />
            <div className="relative backdrop-blur-xl bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                    Gateway Debug Console
                  </h1>
                  <p className="text-gray-400 mt-2 flex items-center gap-2">
                    <Activity className={cn("h-4 w-4", autoRefresh ? "text-green-400 animate-pulse" : "text-gray-400")} />
                    {autoRefresh ? 'Live monitoring active' : 'Live monitoring paused'} • 
                    {stats?.totalGateways || 0} gateways • 
                    {stats?.activeGateways || 0} active
                  </p>
                </div>
                
                {/* Auto-refresh controls */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="autorefresh" className="text-gray-400 text-sm">Auto-refresh</Label>
                    <Switch
                      id="autorefresh"
                      checked={autoRefresh}
                      onCheckedChange={setAutoRefresh}
                    />
                  </div>
                  {autoRefresh && (
                    <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(parseInt(v))}>
                      <SelectTrigger className="w-24 bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1000">1s</SelectItem>
                        <SelectItem value="5000">5s</SelectItem>
                        <SelectItem value="10000">10s</SelectItem>
                        <SelectItem value="30000">30s</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      refetchGateways();
                      refetchActivity();
                      refetchLogs();
                    }}
                    className="border-cyan-600 text-cyan-400 hover:bg-cyan-600/10"
                  >
                    <RefreshCw className={cn("h-4 w-4", autoRefresh && "animate-spin")} />
                  </Button>
                </div>
              </div>
              
              {/* Enhanced Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-6">
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-cyan-400" />
                      <div>
                        <div className="text-xs text-gray-400">Req/min</div>
                        <div className="text-lg font-bold text-white">{stats?.requestsPerMinute || 0}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Timer className="h-5 w-5 text-green-400" />
                      <div>
                        <div className="text-xs text-gray-400">Avg Time</div>
                        <div className="text-lg font-bold text-white">{stats?.avgResponseTime || 0}ms</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                      <div>
                        <div className="text-xs text-gray-400">Errors</div>
                        <div className="text-lg font-bold text-white">{stats?.errorCount || 0}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-400" />
                      <div>
                        <div className="text-xs text-gray-400">Error Rate</div>
                        <div className="text-lg font-bold text-white">{(stats?.errorRate || 0).toFixed(1)}%</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Ban className="h-5 w-5 text-orange-400" />
                      <div>
                        <div className="text-xs text-gray-400">Rate Limited</div>
                        <div className="text-lg font-bold text-white">{stats?.rateLimitedCount || 0}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <div>
                        <div className="text-xs text-gray-400">Failed Auth</div>
                        <div className="text-lg font-bold text-white">{stats?.failedActivationAttempts || 0}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <AlertOctagon className="h-5 w-5 text-purple-400" />
                      <div>
                        <div className="text-xs text-gray-400">Critical</div>
                        <div className="text-lg font-bold text-white">{stats?.criticalCount || 0}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Error Alerts */}
              {stats && stats.errorRate > 10 && (
                <Alert className="mt-4 border-red-600 bg-red-500/10">
                  <AlertOctagon className="h-4 w-4 text-red-500" />
                  <AlertTitle>High Error Rate Detected</AlertTitle>
                  <AlertDescription>
                    Current error rate is {stats.errorRate.toFixed(1)}% - {stats.errorCount} errors in the last {timeRange}
                  </AlertDescription>
                </Alert>
              )}
              
              {stats && stats.rateLimitedCount && stats.rateLimitedCount > 0 && (
                <Alert className="mt-4 border-orange-600 bg-orange-500/10">
                  <Ban className="h-4 w-4 text-orange-500" />
                  <AlertTitle>Rate Limiting Active</AlertTitle>
                  <AlertDescription>
                    {stats.rateLimitedCount} requests have been rate limited in the last {timeRange}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Enhanced Filters Bar */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search gateway ID, endpoint, or error..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                
                <Select value={selectedGateway} onValueChange={setSelectedGateway}>
                  <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select Gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Gateways</SelectItem>
                    <Separator className="my-1" />
                    {gateways?.map((gw) => {
                      const status = getStatusIndicator(gw.status, gw.lastActivity, gw.lastHeartbeat);
                      return (
                        <SelectItem key={gw.id} value={gw.id}>
                          <div className="flex items-center gap-2">
                            {status.icon}
                            <span>{gw.id.substring(0, 12)}...</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="activation">Activation</SelectItem>
                    <SelectItem value="heartbeat">Heartbeat</SelectItem>
                    <SelectItem value="data_sync">Data Sync</SelectItem>
                    <SelectItem value="config">Config</SelectItem>
                    <SelectItem value="command">Command</SelectItem>
                    <SelectItem value="refresh">Refresh</SelectItem>
                    <SelectItem value="tables">Tables</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success (2xx)</SelectItem>
                    <SelectItem value="warning">Warning (4xx)</SelectItem>
                    <SelectItem value="error">Error (5xx)</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-36 bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5m">Last 5m</SelectItem>
                    <SelectItem value="15m">Last 15m</SelectItem>
                    <SelectItem value="1h">Last 1h</SelectItem>
                    <SelectItem value="6h">Last 6h</SelectItem>
                    <SelectItem value="24h">Last 24h</SelectItem>
                    <SelectItem value="7d">Last 7d</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportLogs}
                  className="border-cyan-600 text-cyan-400 hover:bg-cyan-600/10"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export
                </Button>
                
                {process.env.NODE_ENV !== 'production' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearActivityMutation.mutate()}
                    disabled={clearActivityMutation.isPending}
                    className="border-red-600 text-red-400 hover:bg-red-600/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Main Content Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
            <TabsList className="bg-gray-900 border border-gray-800 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gray-800">
                <BarChart className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="connections" className="data-[state=active]:bg-gray-800">
                <Server className="h-4 w-4 mr-2" />
                Gateways ({gateways?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-gray-800">
                <Activity className="h-4 w-4 mr-2" />
                Live Activity
                {filteredActivity && filteredActivity.length > 0 && (
                  <Badge className="ml-2 bg-cyan-600/20 text-cyan-400">{filteredActivity.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="logs" className="data-[state=active]:bg-gray-800">
                <Terminal className="h-4 w-4 mr-2" />
                Debug Logs
                {detailedLogs?.total && (
                  <Badge className="ml-2 bg-purple-600/20 text-purple-400">{detailedLogs.total}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="config" className="data-[state=active]:bg-gray-800">
                <Database className="h-4 w-4 mr-2" />
                Config & Tables
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab - Most Active Gateways and Errors */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Most Active Gateways */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-cyan-400" />
                      Most Active Gateways
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats?.mostActiveGateways?.map((gw, idx) => (
                        <div key={gw.gatewayId} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-cyan-600/20 text-cyan-400">#{idx + 1}</Badge>
                            <div>
                              <div className="text-white font-medium">{gw.gatewayId}</div>
                              <div className="text-xs text-gray-400">
                                {gw.requestCount} requests • {gw.errorCount} errors
                              </div>
                            </div>
                          </div>
                          {gw.errorCount > 0 && (
                            <Badge className={cn(
                              "ml-2",
                              gw.errorCount > 10 ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                            )}>
                              {((gw.errorCount / gw.requestCount) * 100).toFixed(0)}% errors
                            </Badge>
                          )}
                        </div>
                      )) || (
                        <div className="text-center text-gray-500 py-8">No gateway activity in selected period</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Errors with Enhanced Troubleshooting */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <AlertOctagon className="h-5 w-5 text-red-400" />
                      Recent Errors & Issues with Troubleshooting
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {filteredActivity?.filter(a => a.statusCode >= 400)
                          .slice(0, 10)
                          .map((activity) => {
                            const isExpanded = expandedLogId === activity.id;
                            const severityLevel = activity.statusCode >= 500 ? 'critical' : 
                                                activity.statusCode >= 400 ? 'warning' : 'info';
                            
                            return (
                              <div 
                                key={activity.id} 
                                className={cn(
                                  "rounded-lg border transition-all duration-200",
                                  severityLevel === 'critical' 
                                    ? "bg-red-500/10 border-red-500/30 shadow-red-500/20 shadow-sm" 
                                    : severityLevel === 'warning'
                                    ? "bg-yellow-500/10 border-yellow-500/30 shadow-yellow-500/20 shadow-sm"
                                    : "bg-blue-500/10 border-blue-500/30 shadow-blue-500/20 shadow-sm",
                                  isExpanded && "ring-2 ring-cyan-500/50"
                                )}
                              >
                                <div className="p-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {/* Severity Indicator */}
                                        <Badge className={cn(
                                          "font-bold animate-pulse",
                                          severityLevel === 'critical' 
                                            ? "bg-red-500/20 text-red-400 border-red-500" 
                                            : severityLevel === 'warning'
                                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500"
                                            : "bg-blue-500/20 text-blue-400 border-blue-500"
                                        )}>
                                          {severityLevel === 'critical' && <AlertOctagon className="h-3 w-3 mr-1" />}
                                          {severityLevel === 'warning' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                          {severityLevel === 'info' && <Info className="h-3 w-3 mr-1" />}
                                          {activity.statusCode}
                                        </Badge>
                                        
                                        {/* Error Code with Copy Button */}
                                        {activity.category && (
                                          <Badge 
                                            className="bg-purple-500/20 text-purple-400 border-purple-500 cursor-pointer hover:bg-purple-500/30"
                                            onClick={() => copyToClipboard(activity.category || '', activity.id)}
                                          >
                                            {copiedId === activity.id ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                                            {activity.category}
                                          </Badge>
                                        )}
                                        
                                        {/* Timestamp */}
                                        <span className="text-xs text-gray-400">
                                          {format(new Date(activity.timestamp), 'HH:mm:ss.SSS')}
                                        </span>
                                      </div>
                                      
                                      {/* Endpoint */}
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-white font-mono">{activity.endpoint}</span>
                                        <span className="text-xs text-gray-500">({activity.responseTime}ms)</span>
                                      </div>
                                      
                                      {/* Error Message */}
                                      {activity.error && (
                                        <div className={cn(
                                          "text-sm p-2 rounded bg-black/30 border",
                                          severityLevel === 'critical' ? "text-red-400 border-red-500/20" : 
                                          severityLevel === 'warning' ? "text-yellow-400 border-yellow-500/20" : 
                                          "text-blue-400 border-blue-500/20"
                                        )}>
                                          <XCircle className="h-3 w-3 inline mr-1" />
                                          {activity.error}
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1 ml-2">
                                      {/* Gateway ID */}
                                      <Badge className="text-xs bg-gray-700/50" title={activity.gatewayId}>
                                        {activity.gatewayId?.substring(0, 6)}...
                                      </Badge>
                                      
                                      {/* Expand/Collapse Button */}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setExpandedLogId(isExpanded ? null : activity.id)}
                                        className="h-6 w-6 p-0"
                                      >
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {/* Expandable Troubleshooting Section */}
                                  {isExpanded && (
                                    <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
                                      {/* Quick Actions */}
                                      <div className="flex gap-2 flex-wrap">
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          className="text-xs border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                                          onClick={() => window.open(`https://docs.herculesv2.com/gateway/errors/${activity.category?.toLowerCase()}`, '_blank')}
                                        >
                                          <Book className="h-3 w-3 mr-1" />
                                          View Documentation
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          className="text-xs border-green-500/50 text-green-400 hover:bg-green-500/10"
                                          onClick={() => copyToClipboard(`Error: ${activity.error || 'Unknown'}\nCode: ${activity.statusCode}\nEndpoint: ${activity.endpoint}\nTime: ${activity.timestamp}`, `full-${activity.id}`)}
                                        >
                                          {copiedId === `full-${activity.id}` ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                                          Copy Full Details
                                        </Button>
                                      </div>
                                      
                                      {/* Troubleshooting Steps */}
                                      <div className="bg-black/40 rounded p-3 space-y-2">
                                        <div className="text-xs font-semibold text-cyan-400 flex items-center gap-1">
                                          <Zap className="h-3 w-3" />
                                          Quick Troubleshooting:
                                        </div>
                                        <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                                          {activity.category === 'activation' && (
                                            <>
                                              <li>Check activation code format (HERC-XXXX-XXXX-XXXX-XXXX)</li>
                                              <li>Verify code hasn't expired or been used</li>
                                              <li>Ensure machine ID matches the original</li>
                                            </>
                                          )}
                                          {activity.category === 'authentication' && (
                                            <>
                                              <li>Token may have expired - use /api/gateway/refresh</li>
                                              <li>Check if gateway needs reactivation</li>
                                              <li>Verify system clock is synchronized</li>
                                            </>
                                          )}
                                          {activity.category === 'config' && (
                                            <>
                                              <li>Configure PLC devices in the portal</li>
                                              <li>Add tags to PLC devices</li>
                                              <li>Verify gateway-facility mapping</li>
                                            </>
                                          )}
                                          {activity.category === 'data_sync' && (
                                            <>
                                              <li>Check data format and required fields</li>
                                              <li>Verify batch size limits</li>
                                              <li>Ensure timestamps are valid</li>
                                            </>
                                          )}
                                          {!activity.category && (
                                            <>
                                              <li>Check network connectivity</li>
                                              <li>Verify request format and headers</li>
                                              <li>Contact support if issue persists</li>
                                            </>
                                          )}
                                        </ul>
                                      </div>
                                      
                                      {/* Additional Details */}
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                          <span className="text-gray-500">Support ID:</span>
                                          <div className="text-white font-mono">SUP-{activity.id.substring(0, 8)}</div>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">IP Address:</span>
                                          <div className="text-white">{activity.ip || 'Unknown'}</div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }) || (
                            <div className="text-center text-gray-500 py-8">
                              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                              <p>No errors detected</p>
                              <p className="text-xs mt-1">System operating normally</p>
                            </div>
                          )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Gateway Connections Panel - Enhanced */}
            <TabsContent value="connections" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {gateways?.map((gateway) => {
                  const status = getStatusIndicator(gateway.status, gateway.lastActivity, gateway.lastHeartbeat);
                  return (
                    <Card 
                      key={gateway.id} 
                      className={cn(
                        "bg-gray-900/50 border-gray-800 hover:border-cyan-600/50 transition-all duration-200",
                        status.pulse && "shadow-lg shadow-green-500/10"
                      )}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className="truncate">{gateway.id.substring(0, 12)}...</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{gateway.id}</p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(gateway.id, gateway.id)}
                                    className="mt-1"
                                  >
                                    {copiedId === gateway.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                  </Button>
                                </TooltipContent>
                              </Tooltip>
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-500">
                              Machine: {gateway.machineId.substring(0, 8)}...
                            </CardDescription>
                          </div>
                          <Badge className={cn(status.color, "border")} variant="outline">
                            {status.icon}
                            <span className="ml-1">{status.text}</span>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">IP:</span>
                            <div className="text-white font-mono">{gateway.lastIp || 'Unknown'}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Schema:</span>
                            <div className="text-white">{gateway.schemaVersion || 'v1'}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Last Active:</span>
                            <div className="text-white">
                              {gateway.lastActivity 
                                ? formatDistanceToNow(new Date(gateway.lastActivity), { addSuffix: true })
                                : 'Never'}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">OS:</span>
                            <div className="text-white">{gateway.os || 'Unknown'}</div>
                          </div>
                        </div>
                        
                        <Separator className="my-2 bg-gray-800" />
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center">
                            <div className="text-lg font-bold text-cyan-400">{gateway.syncCount || 0}</div>
                            <div className="text-xs text-gray-500">Requests</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-400">{gateway.errorCount || 0}</div>
                            <div className="text-xs text-gray-500">Errors</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-400">
                              {gateway.avgResponseTime ? `${gateway.avgResponseTime}ms` : '-'}
                            </div>
                            <div className="text-xs text-gray-500">Avg Time</div>
                          </div>
                        </div>
                        
                        {gateway.tokenExpiresAt && (
                          <div className="mt-2 p-2 bg-gray-800/50 rounded">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">Token Expires:</span>
                              <span className={cn(
                                "text-white",
                                new Date(gateway.tokenExpiresAt) < new Date(Date.now() + 86400000) && "text-yellow-400"
                              )}>
                                {format(new Date(gateway.tokenExpiresAt), 'MMM dd HH:mm')}
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                
                {(!gateways || gateways.length === 0) && (
                  <Card className="bg-gray-900/50 border-gray-800 col-span-full">
                    <CardContent className="p-12 text-center">
                      <WifiOff className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <div className="text-gray-400">No gateways detected</div>
                      <div className="text-sm text-gray-500 mt-2">Waiting for gateway connections...</div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Live Activity Log - Enhanced */}
            <TabsContent value="activity" className="space-y-4">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-white">Live API Activity Stream</CardTitle>
                      <CardDescription>
                        {filteredActivity?.length || 0} entries matching filters
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="autoscroll" className="text-gray-400 text-sm">Auto-scroll</Label>
                        <Switch
                          id="autoscroll"
                          checked={autoScroll}
                          onCheckedChange={setAutoScroll}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] bg-gray-950 rounded-lg" ref={activityLogRef}>
                    <div className="p-4 space-y-1">
                      {filteredActivity?.map((activity) => (
                        <div
                          key={activity.id}
                          className={cn(
                            "group relative p-3 rounded-lg border transition-all duration-200",
                            "hover:bg-gray-900/50 cursor-pointer",
                            activity.statusCode >= 500 
                              ? "bg-red-950/20 border-red-900/50 hover:border-red-600/50" 
                              : activity.statusCode >= 400
                              ? "bg-yellow-950/20 border-yellow-900/50 hover:border-yellow-600/50"
                              : "bg-gray-900/20 border-gray-800 hover:border-cyan-600/50"
                          )}
                          onClick={() => setExpandedLogId(expandedLogId === activity.id ? null : activity.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {expandedLogId === activity.id ? (
                                <ChevronDown className="h-4 w-4 text-cyan-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-cyan-400" />
                              )}
                            </div>
                            
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-xs text-gray-400 font-mono">
                                  {format(new Date(activity.timestamp), 'HH:mm:ss.SSS')}
                                </span>
                                
                                <Badge variant="outline" className={cn("text-xs", getStatusCodeStyle(activity.statusCode))}>
                                  {activity.statusCode}
                                </Badge>
                                
                                <Badge className="text-xs bg-blue-600/20 text-blue-400 border-blue-600/50">
                                  {activity.method}
                                </Badge>
                                
                                <span className="text-sm text-white font-mono">{activity.endpoint}</span>
                                
                                {activity.responseTime && (
                                  <Badge className={cn(
                                    "text-xs",
                                    activity.responseTime > 1000 
                                      ? "bg-red-600/20 text-red-400" 
                                      : activity.responseTime > 500
                                      ? "bg-yellow-600/20 text-yellow-400"
                                      : "bg-green-600/20 text-green-400"
                                  )}>
                                    {activity.responseTime}ms
                                  </Badge>
                                )}
                                
                                {activity.category && (
                                  <Badge className="text-xs bg-purple-600/20 text-purple-400">
                                    {activity.category}
                                  </Badge>
                                )}
                                
                                {activity.severity && activity.severity !== 'info' && (
                                  <Badge className={cn("text-xs", getSeverityStyle(activity.severity))}>
                                    {activity.severity}
                                  </Badge>
                                )}
                              </div>
                              
                              {activity.error && (
                                <Alert className="border-red-600/50 bg-red-500/10 py-2">
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                  <AlertDescription className="text-red-400 text-sm">
                                    {activity.error}
                                  </AlertDescription>
                                </Alert>
                              )}
                              
                              {expandedLogId === activity.id && (
                                <div className="mt-3 p-3 bg-gray-800/50 rounded-lg space-y-2 text-sm">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-gray-400">Gateway ID:</span>
                                      <div className="text-white font-mono mt-1">{activity.gatewayId || 'Unknown'}</div>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">IP Address:</span>
                                      <div className="text-white font-mono mt-1">{activity.ip || 'Unknown'}</div>
                                    </div>
                                    {activity.requestSize && (
                                      <div>
                                        <span className="text-gray-400">Request Size:</span>
                                        <div className="text-white mt-1">{activity.requestSize} bytes</div>
                                      </div>
                                    )}
                                    {activity.responseSize && (
                                      <div>
                                        <span className="text-gray-400">Response Size:</span>
                                        <div className="text-white mt-1">{activity.responseSize} bytes</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {(!filteredActivity || filteredActivity.length === 0) && (
                        <div className="text-center py-12">
                          <Activity className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                          <div className="text-gray-400">No activity matching current filters</div>
                          <div className="text-sm text-gray-500 mt-2">Adjust filters or wait for new activity</div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Debug Logs Tab - Detailed Logs */}
            <TabsContent value="logs" className="space-y-4">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Detailed Debug Logs</CardTitle>
                  <CardDescription>
                    Complete request/response logs with full error details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] bg-gray-950 rounded-lg p-4">
                    <div className="space-y-2">
                      {detailedLogs?.logs?.map((log) => (
                        <div 
                          key={log.id}
                          className={cn(
                            "p-4 rounded-lg border font-mono text-xs",
                            log.severity === 'critical' 
                              ? "bg-red-950/30 border-red-900"
                              : log.severity === 'error'
                              ? "bg-orange-950/30 border-orange-900" 
                              : log.responseStatus >= 400
                              ? "bg-yellow-950/30 border-yellow-900"
                              : "bg-gray-900/30 border-gray-800"
                          )}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-gray-400">
                                  {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS')}
                                </span>
                                <Badge className={getStatusCodeStyle(log.responseStatus)}>
                                  {log.responseStatus}
                                </Badge>
                                <span className="text-cyan-400">{log.method}</span>
                                <span className="text-white">{log.endpoint}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                              >
                                {expandedLogId === log.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                            </div>
                            
                            {log.errorMessage && (
                              <Alert className="border-red-600/50 bg-red-500/10">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  <div className="font-bold mb-1">Error: {log.errorCode || 'UNKNOWN'}</div>
                                  <div>{log.errorMessage}</div>
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            {log.isRateLimited && (
                              <Alert className="border-orange-600/50 bg-orange-500/10">
                                <Ban className="h-4 w-4" />
                                <AlertDescription>
                                  Rate Limited: {log.rateLimitReason}
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            {expandedLogId === log.id && (
                              <div className="mt-3 space-y-3">
                                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-800/50 rounded">
                                  <div>
                                    <div className="text-gray-400 mb-1">Gateway</div>
                                    <div className="text-white">{log.gatewayId || 'None'}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-400 mb-1">User</div>
                                    <div className="text-white">{log.userId || 'None'}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-400 mb-1">Machine ID</div>
                                    <div className="text-white">{log.machineId || 'None'}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-400 mb-1">Processing Time</div>
                                    <div className="text-white">{log.processingDuration}ms</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-400 mb-1">IP Address</div>
                                    <div className="text-white">{log.ipAddress || 'Unknown'}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-400 mb-1">Gateway Version</div>
                                    <div className="text-white">{log.gatewayVersion || 'Unknown'}</div>
                                  </div>
                                </div>
                                
                                {log.errorStack && (
                                  <div className="p-3 bg-red-950/30 rounded border border-red-900">
                                    <div className="text-red-400 mb-2">Stack Trace:</div>
                                    <pre className="text-red-300 text-xs overflow-x-auto">{log.errorStack}</pre>
                                  </div>
                                )}
                                
                                {log.requestBody && (
                                  <div className="p-3 bg-gray-800/50 rounded">
                                    <div className="text-gray-400 mb-2">Request Body:</div>
                                    <pre className="text-gray-300 text-xs overflow-x-auto">
                                      {JSON.stringify(log.requestBody, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                
                                {log.responseBody && (
                                  <div className="p-3 bg-gray-800/50 rounded">
                                    <div className="text-gray-400 mb-2">Response Body:</div>
                                    <pre className="text-gray-300 text-xs overflow-x-auto">
                                      {JSON.stringify(log.responseBody, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {(!detailedLogs?.logs || detailedLogs.logs.length === 0) && (
                        <div className="text-center py-12">
                          <Terminal className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                          <div className="text-gray-400">No logs found</div>
                          <div className="text-sm text-gray-500 mt-2">Adjust filters to see more logs</div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Configuration Sync Status - Enhanced */}
            <TabsContent value="config" className="space-y-4">
              {selectedGateway === 'all' ? (
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-12 text-center">
                    <Database className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <div className="text-gray-400">Select a gateway to view configuration</div>
                    <div className="text-sm text-gray-500 mt-2">
                      Choose a specific gateway from the filter dropdown above
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Gateway Schema Info */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white text-sm">Schema Version</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-cyan-400">
                          {gateways?.find(g => g.id === selectedGateway)?.schemaVersion || 'v1'}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white text-sm">Total Syncs</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-400">
                          {gateways?.find(g => g.id === selectedGateway)?.syncCount || 0}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white text-sm">Last Sync</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg font-medium text-white">
                          {gateways?.find(g => g.id === selectedGateway)?.lastActivity 
                            ? formatDistanceToNow(new Date(gateways.find(g => g.id === selectedGateway)!.lastActivity!), { addSuffix: true })
                            : 'Never'}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Table Status */}
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Table Synchronization Status</CardTitle>
                      <CardDescription>Database tables managed by this gateway</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {tableStatus && tableStatus.length > 0 ? (
                        <div className="space-y-2">
                          {tableStatus.map((table) => (
                            <div key={table.tableName} className="p-3 bg-gray-800/50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Database className={cn(
                                    "h-4 w-4",
                                    table.status === 'synced' ? "text-green-400" :
                                    table.status === 'pending' ? "text-yellow-400" :
                                    "text-red-400"
                                  )} />
                                  <span className="text-white font-medium">{table.tableName}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge className="text-xs">{table.rowCount} rows</Badge>
                                  {table.sizeBytes && (
                                    <Badge className="text-xs bg-gray-700">
                                      {(table.sizeBytes / 1024).toFixed(1)} KB
                                    </Badge>
                                  )}
                                  <Badge className={cn(
                                    "text-xs",
                                    table.status === 'synced' ? "bg-green-600/20 text-green-400" :
                                    table.status === 'pending' ? "bg-yellow-600/20 text-yellow-400" :
                                    "bg-red-600/20 text-red-400"
                                  )}>
                                    {table.status}
                                  </Badge>
                                </div>
                              </div>
                              {table.error && (
                                <Alert className="mt-2 border-red-600/50 bg-red-500/10">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription className="text-sm">{table.error}</AlertDescription>
                                </Alert>
                              )}
                              {table.lastSync && (
                                <div className="mt-2 text-xs text-gray-400">
                                  Last sync: {format(new Date(table.lastSync), 'MMM dd HH:mm:ss')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No table status available for this gateway
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </TooltipProvider>
    </WaterSystemLayout>
  );
}