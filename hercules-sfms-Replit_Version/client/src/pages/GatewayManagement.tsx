import { useState, useEffect } from 'react';
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Server, Shield, Clock, Copy, Check, X, 
  Activity, Download, AlertCircle, RefreshCw,
  Sparkles, Key, Zap, CheckCircle2, Info, Trash2
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useDemo } from '@/contexts/DemoContext';

interface GatewayCode {
  id: number;
  code: string;
  userId: string;
  gatewayId?: string;
  gatewayToken?: string;
  createdAt: string;
  expiresAt: string;
  activatedAt?: string;
  lastSyncAt?: string;
  status: 'pending' | 'active' | 'expired' | 'revoked';
  activationIp?: string;
  gatewayInfo?: any;
  syncCount?: number;
}

export default function GatewayManagement() {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { isDemoMode } = useDemo();

  // Demo gateway codes
  const demoGatewayCodes: GatewayCode[] = [
    {
      id: 1,
      code: 'HERC-3JKQ-37AC-ANA8',
      userId: 'demo-user',
      gatewayId: 'gw_4ea3364b-6adc39e438b6b040',
      gatewayToken: 'demo-token-xxx',
      createdAt: '10/21/2025, 11:40:32 AM',
      expiresAt: '11/20/2025, 11:40:32 AM',
      activatedAt: '10/21/2025, 9:40:34 PM',
      lastSyncAt: new Date().toISOString(),
      status: 'active',
      gatewayInfo: { os: 'Windows 10.0.20348', version: '2.0.0' },
      syncCount: 5723
    },
    {
      id: 2,
      code: 'HERC-2XKQ-4D86-V98D',
      userId: 'demo-user',
      createdAt: '10/17/2025, 11:30:00 AM',
      expiresAt: '11/17/2025, 11:30:00 AM',
      status: 'pending'
    }
  ];

  // Fetch gateway codes - use demo data in demo mode
  const { data: apiGatewayCodes = [], isLoading, refetch } = useQuery<GatewayCode[]>({
    queryKey: ['/api/gateway/codes'],
    enabled: !isDemoMode
  });

  const gatewayCodes = isDemoMode ? demoGatewayCodes : apiGatewayCodes;

  // Generate new gateway code
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/gateway/generate-code');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gateway/codes'] });
      toast({
        title: 'Success',
        description: 'Gateway activation code generated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate gateway code',
        variant: 'destructive',
      });
    },
  });

  // Revoke gateway
  const revokeGatewayMutation = useMutation({
    mutationFn: async (gatewayId: string) => {
      const res = await apiRequest('DELETE', `/api/gateway/${gatewayId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gateway/codes'] });
      toast({
        title: 'Success',
        description: 'Gateway revoked successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke gateway',
        variant: 'destructive',
      });
    },
  });

  // Delete gateway code
  const deleteCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest('DELETE', `/api/gateway/codes/${code}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gateway/codes'] });
      toast({
        title: 'Success',
        description: 'Activation code deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete activation code',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: 'Copied',
      description: 'Gateway code copied to clipboard',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/50';
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/50';
      case 'expired': return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-500/50';
      case 'revoked': return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/50';
      default: return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-500/50';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  // Active gateways count
  const activeGateways = gatewayCodes.filter(gc => gc.status === 'active').length;
  const pendingCodes = gatewayCodes.filter(gc => gc.status === 'pending').length;

  return (
    <WaterSystemLayout 
      title="Gateway Management" 
      subtitle="Manage gateway activation codes and monitor connected gateways"
    >
      <div className="space-y-2">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-cyan-200 dark:border-slate-700 p-3">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 rounded-full blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  Gateway Control Center
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-300 max-w-xl">
                  Manage your industrial gateway connections with secure one-time activation codes.
                </p>
              </div>
              <Button
                onClick={() => generateCodeMutation.mutate()}
                disabled={generateCodeMutation.isPending}
                size="sm"
                className="h-7 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              >
                {generateCodeMutation.isPending ? (
                  <>
                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1 h-3 w-3" />
                    Generate Code
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Card className="bg-white dark:bg-slate-900/50 border-gray-200 dark:border-slate-700">
            <CardHeader className="p-2">
              <CardTitle className="text-sm flex items-center text-gray-900 dark:text-white">
                <div className="p-1 bg-green-100 dark:bg-green-500/20 rounded mr-2">
                  <Server className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                Active Gateways
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{activeGateways}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Connected and syncing
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900/50 border-gray-200 dark:border-slate-700">
            <CardHeader className="p-2">
              <CardTitle className="text-sm flex items-center text-gray-900 dark:text-white">
                <div className="p-1 bg-yellow-100 dark:bg-yellow-500/20 rounded mr-2">
                  <Clock className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                </div>
                Pending Codes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{pendingCodes}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Waiting for activation
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900/50 border-gray-200 dark:border-slate-700">
            <CardHeader className="p-2">
              <CardTitle className="text-sm flex items-center text-gray-900 dark:text-white">
                <div className="p-1 bg-cyan-100 dark:bg-cyan-500/20 rounded mr-2">
                  <Key className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                </div>
                Total Codes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{gatewayCodes.length}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Generated codes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Security Notice */}
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-2">
          <Shield className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-xs text-gray-700 dark:text-gray-300">
            <strong className="text-gray-900 dark:text-white">Enhanced Security:</strong> Each activation code is single-use only and permanently tied to your account. Codes expire after 15 days if not activated.
          </AlertDescription>
        </Alert>

        {/* Gateway Codes List */}
        <Card className="bg-white dark:bg-slate-900/50 border-gray-200 dark:border-slate-700">
          <CardHeader className="p-2">
            <CardTitle className="text-sm text-gray-900 dark:text-white">Activation Codes</CardTitle>
            <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
              View and manage your gateway activation codes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Loading gateway codes...</p>
              </div>
            ) : gatewayCodes.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <Server className="h-6 w-6 text-gray-400 dark:text-gray-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No Gateway Codes Yet</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Generate your first secure one-time activation code
                </p>
                <Button
                  onClick={() => generateCodeMutation.mutate()}
                  disabled={generateCodeMutation.isPending}
                  size="sm"
                  className="h-7 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  Generate Secure Code
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {gatewayCodes.map((gateway) => (
                  <div
                    key={gateway.id}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg p-2 
                             hover:border-cyan-400 dark:hover:border-cyan-500 transition-all duration-200
                             bg-gradient-to-r from-white to-gray-50 dark:from-slate-900 dark:to-slate-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="bg-gray-100 dark:bg-slate-800 rounded px-2 py-1 border border-gray-300 dark:border-slate-600">
                            <code className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                              {gateway.code}
                            </code>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(gateway.code)}
                            className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-slate-700"
                          >
                            {copiedCode === gateway.code ? (
                              <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                            ) : (
                              <Copy className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                            )}
                          </Button>
                          <Badge className={`${getStatusColor(gateway.status)} border text-xs py-0 px-1`}>
                            {gateway.status === 'active' && <CheckCircle2 className="h-2 w-2 mr-1" />}
                            {gateway.status === 'pending' && <Clock className="h-2 w-2 mr-1" />}
                            {gateway.status === 'revoked' && <X className="h-2 w-2 mr-1" />}
                            {gateway.status.toUpperCase()}
                            {gateway.status === 'active' && ' (USED)'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Created:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{formatDate(gateway.createdAt)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Expires:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatDate(gateway.expiresAt)}
                              {gateway.status === 'pending' && (
                                <span className="text-xs text-yellow-600 dark:text-yellow-400 block">
                                  {getDaysRemaining(gateway.expiresAt)} days remaining
                                </span>
                              )}
                            </p>
                          </div>
                          {gateway.activatedAt && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Activated:</span>
                              <p className="font-medium text-gray-900 dark:text-white">{formatDate(gateway.activatedAt)}</p>
                            </div>
                          )}
                          {gateway.lastSyncAt && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Last Sync:</span>
                              <p className="font-medium text-gray-900 dark:text-white">{formatDate(gateway.lastSyncAt)}</p>
                            </div>
                          )}
                        </div>

                        {gateway.gatewayInfo && (
                          <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gateway Information</span>
                            <div className="grid grid-cols-3 gap-3 mt-2">
                              <div className="text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Platform:</span>
                                <p className="font-medium text-gray-900 dark:text-white">{gateway.gatewayInfo.platform}</p>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Version:</span>
                                <p className="font-medium text-gray-900 dark:text-white">{gateway.gatewayInfo.version}</p>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Hostname:</span>
                                <p className="font-medium text-gray-900 dark:text-white">{gateway.gatewayInfo.hostname}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {gateway.status === 'active' && gateway.syncCount !== undefined && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              <Activity className="h-4 w-4" />
                              <span className="font-medium">{gateway.syncCount} successful syncs</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-start gap-1">
                        {gateway.status === 'active' && gateway.gatewayId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revokeGatewayMutation.mutate(gateway.gatewayId!)}
                            disabled={revokeGatewayMutation.isPending}
                            className="h-6 text-xs px-2 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Revoke
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete this activation code: ${gateway.code}?`)) {
                              deleteCodeMutation.mutate(gateway.code);
                            }
                          }}
                          disabled={deleteCodeMutation.isPending}
                          className="h-6 text-xs px-2 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Installation Guide */}
        <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 border-cyan-200 dark:border-slate-700">
          <CardHeader className="p-2">
            <CardTitle className="flex items-center text-sm text-gray-900 dark:text-white">
              <div className="p-1 bg-white dark:bg-slate-800 rounded mr-2">
                <Download className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
              </div>
              Quick Installation Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                { step: '1', title: 'Download', desc: 'Get gateway software', icon: Download },
                { step: '2', title: 'Install', desc: 'Run installer', icon: Server },
                { step: '3', title: 'Activate', desc: 'Enter code', icon: Key },
                { step: '4', title: 'Monitor', desc: 'View status', icon: Activity }
              ].map((item, index) => (
                <div key={index} className="relative">
                  <div className="bg-white dark:bg-slate-800 rounded p-2 border border-gray-200 dark:border-slate-600">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {item.step}
                      </div>
                      <item.icon className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <h4 className="font-semibold text-xs text-gray-900 dark:text-white">{item.title}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{item.desc}</p>
                  </div>
                  {index < 3 && (
                    <div className="hidden lg:block absolute top-1/2 -right-1 transform -translate-y-1/2">
                      <CheckCircle2 className="h-3 w-3 text-cyan-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </WaterSystemLayout>
  );
}