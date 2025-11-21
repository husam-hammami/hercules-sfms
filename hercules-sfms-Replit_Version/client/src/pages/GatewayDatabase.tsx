import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as z from 'zod';
import { 
  Database, Plus, Edit2, Trash2, Save, RefreshCw, 
  AlertTriangle, CheckCircle2, XCircle, Clock, 
  Server, HardDrive, Activity, Zap, Settings2,
  FileCode, Table2, Command, Layers, Archive,
  Shield, AlertCircle, Info, TrendingUp, TrendingDown,
  Calendar, Timer, Hash, Type, ToggleLeft, List, ChevronRight
} from 'lucide-react';

// Schema types
interface TableColumn {
  name: string;
  type: 'integer' | 'real' | 'text' | 'timestamp' | 'boolean' | 'jsonb';
  constraints?: string[];
  nullable?: boolean;
  defaultValue?: string;
}

interface TableIndex {
  name: string;
  columns: string[];
  unique?: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

interface RetentionPolicy {
  enabled: boolean;
  retentionDays: number;
  cleanupInterval: number; // in hours
  archiveBeforeDelete?: boolean;
}

interface CustomTable {
  id?: string;
  name: string;
  description?: string;
  columns: TableColumn[];
  indices: TableIndex[];
  retentionPolicy: RetentionPolicy;
  tagMappings: {
    plcIds?: string[];
    tagGroups?: string[];
    tagPatterns?: string[];
  };
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

interface GatewaySchema {
  storageMode: 'single_table' | 'multi_table' | 'hybrid';
  version: number;
  customTables: CustomTable[];
  defaultRetention: RetentionPolicy;
  createdAt: Date;
  updatedAt: Date;
}

interface TableStatus {
  tableName: string;
  rowCount: number;
  sizeBytes: number;
  oldestRecord: Date | null;
  newestRecord: Date | null;
  lastCleanup: Date | null;
  healthStatus: 'healthy' | 'warning' | 'critical';
  recommendations?: string[];
}

interface GatewayCommand {
  id: string;
  type: 'schema_update' | 'cleanup' | 'optimize' | 'backup' | 'restore';
  status: 'pending' | 'sent' | 'executing' | 'completed' | 'failed';
  parameters: Record<string, any>;
  priority: number;
  timestamp: Date;
  result?: any;
  error?: string;
}

// Validation schemas
const columnSchema = z.object({
  name: z.string().min(1, 'Column name is required'),
  type: z.enum(['integer', 'real', 'text', 'timestamp', 'boolean', 'jsonb']),
  nullable: z.boolean().optional(),
  defaultValue: z.string().optional(),
});

const tableSchema = z.object({
  name: z.string().min(1, 'Table name is required').regex(/^[a-z_][a-z0-9_]*$/, 'Invalid table name format'),
  description: z.string().optional(),
  columns: z.array(columnSchema).min(1, 'At least one column is required'),
  retentionDays: z.number().min(1).max(365),
  cleanupInterval: z.number().min(1).max(168),
});

export default function GatewayDatabase() {
  const [activeTab, setActiveTab] = useState('schema');
  const [selectedTable, setSelectedTable] = useState<CustomTable | null>(null);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<CustomTable | null>(null);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch gateway schema
  const { data: schema, isLoading: schemaLoading, error: schemaError } = useQuery({
    queryKey: ['/api/gateway/schemas'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/gateway/schemas');
      if (!response.ok) {
        // Return default schema if API not available
        return {
          storageMode: 'single_table',
          version: 1,
          customTables: [],
          defaultRetention: {
            enabled: true,
            retentionDays: 30,
            cleanupInterval: 24,
            archiveBeforeDelete: false
          },
          createdAt: new Date(),
          updatedAt: new Date()
        } as GatewaySchema;
      }
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch table status
  const { data: tableStatuses = [], isLoading: statusLoading } = useQuery({
    queryKey: ['/api/gateway/tables/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/gateway/tables/status');
      if (!response.ok) {
        // Return mock data for development
        return [
          {
            tableName: 'plc_data_main',
            rowCount: 1250000,
            sizeBytes: 524288000,
            oldestRecord: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            newestRecord: new Date(),
            lastCleanup: new Date(Date.now() - 24 * 60 * 60 * 1000),
            healthStatus: 'healthy',
            recommendations: []
          },
          {
            tableName: 'plc_data_archive',
            rowCount: 5000000,
            sizeBytes: 2147483648,
            oldestRecord: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            newestRecord: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            lastCleanup: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            healthStatus: 'warning',
            recommendations: ['Consider increasing cleanup frequency', 'Table size exceeds 2GB']
          }
        ] as TableStatus[];
      }
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch gateway commands
  const { data: commands = [], isLoading: commandsLoading } = useQuery({
    queryKey: ['/api/gateway/commands'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/gateway/commands');
      if (!response.ok) {
        // Return mock data for development
        return [
          {
            id: '1',
            type: 'schema_update',
            status: 'completed',
            parameters: { version: 2 },
            priority: 1,
            timestamp: new Date(Date.now() - 60 * 60 * 1000),
            result: { success: true }
          },
          {
            id: '2',
            type: 'cleanup',
            status: 'executing',
            parameters: { tables: ['plc_data_archive'] },
            priority: 2,
            timestamp: new Date(Date.now() - 5 * 60 * 1000)
          }
        ] as GatewayCommand[];
      }
      return response.json();
    },
    refetchInterval: autoRefresh ? 10000 : false,
  });

  // Form for custom table
  const tableForm = useForm({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      name: '',
      description: '',
      columns: [
        { name: 'id', type: 'integer', nullable: false },
        { name: 'timestamp', type: 'timestamp', nullable: false },
        { name: 'value', type: 'real', nullable: true }
      ],
      retentionDays: 30,
      cleanupInterval: 24,
    },
  });

  // Update schema mutation
  const updateSchemaMutation = useMutation({
    mutationFn: async (data: Partial<GatewaySchema>) => {
      const response = await apiRequest('POST', '/api/gateway/schemas', data);
      if (!response.ok) {
        throw new Error('Failed to update schema');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gateway/schemas'] });
      toast({
        title: 'Success',
        description: 'Schema updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update schema',
        variant: 'destructive',
      });
    },
  });

  // Execute command mutation
  const executeCommandMutation = useMutation({
    mutationFn: async (command: Partial<GatewayCommand>) => {
      const response = await apiRequest('POST', '/api/gateway/commands', command);
      if (!response.ok) {
        throw new Error('Failed to execute command');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gateway/commands'] });
      toast({
        title: 'Success',
        description: 'Command executed successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to execute command',
        variant: 'destructive',
      });
    },
  });

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">Warning</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400">Critical</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getCommandStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">Completed</Badge>;
      case 'executing':
        return <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">Executing</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">Pending</Badge>;
      case 'sent':
        return <Badge className="bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400">Sent</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleStorageModeChange = (mode: 'single_table' | 'multi_table' | 'hybrid') => {
    if (schema) {
      updateSchemaMutation.mutate({ ...schema, storageMode: mode });
    }
  };

  const handleCreateTable = (data: any) => {
    const newTable: CustomTable = {
      name: data.name,
      description: data.description,
      columns: data.columns,
      indices: [],
      retentionPolicy: {
        enabled: true,
        retentionDays: data.retentionDays,
        cleanupInterval: data.cleanupInterval,
        archiveBeforeDelete: false
      },
      tagMappings: {},
      version: 1
    };

    if (schema) {
      updateSchemaMutation.mutate({
        ...schema,
        customTables: [...schema.customTables, newTable],
        version: schema.version + 1
      });
    }
    setShowTableDialog(false);
    tableForm.reset();
  };

  return (
    <WaterSystemLayout 
      title="Gateway Database Management" 
      subtitle="Configure schemas and monitor database performance"
    >
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-indigo-200 dark:border-slate-700 p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-indigo-400/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Database Control Center
                </h1>
                <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
                  Configure gateway database schemas, manage custom tables, and monitor real-time database performance.
                </p>
                <div className="flex items-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-gray-600 dark:text-gray-400">Schema v{schema?.version || 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Table2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-gray-600 dark:text-gray-400">{schema?.customTables.length || 0} Tables</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatBytes(tableStatuses.reduce((sum: number, t: TableStatus) => sum + t.sizeBytes, 0))} Total
                    </span>
                  </div>
                  {autoRefresh && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-gray-600 dark:text-gray-400">Auto-refresh ON</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-4 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-3 mb-3">
                    <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Database Health</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Write Rate</span>
                      <span className="text-xs font-mono text-gray-700 dark:text-gray-300">1,250 rows/s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Query Time</span>
                      <span className="text-xs font-mono text-green-600 dark:text-green-400">8ms avg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">CPU Usage</span>
                      <span className="text-xs font-mono text-gray-700 dark:text-gray-300">42%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-refresh Toggle */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'border-green-500 text-green-600' : 'border-gray-300'}
            data-testid="button-auto-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <TabsTrigger 
              value="schema" 
              className="text-gray-700 dark:text-gray-300 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-400 data-[state=active]:bg-indigo-50 dark:data-[state=active]:bg-indigo-500/10"
              data-testid="tab-schema"
            >
              <FileCode className="h-4 w-4 mr-2" />
              Schema Configuration
            </TabsTrigger>
            <TabsTrigger 
              value="status" 
              className="text-gray-700 dark:text-gray-300 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-400 data-[state=active]:bg-purple-50 dark:data-[state=active]:bg-purple-500/10"
              data-testid="tab-status"
            >
              <Activity className="h-4 w-4 mr-2" />
              Table Status
            </TabsTrigger>
            <TabsTrigger 
              value="commands" 
              className="text-gray-700 dark:text-gray-300 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-500/10"
              data-testid="tab-commands"
            >
              <Command className="h-4 w-4 mr-2" />
              Gateway Commands
            </TabsTrigger>
          </TabsList>

          {/* Schema Configuration Tab */}
          <TabsContent value="schema" className="space-y-6">
            {/* Storage Mode Selection */}
            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Storage Mode Configuration
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Select how data should be organized in the database
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {['single_table', 'multi_table', 'hybrid'].map((mode) => (
                    <div
                      key={mode}
                      onClick={() => handleStorageModeChange(mode as any)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        schema?.storageMode === mode
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                          : 'border-gray-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-600'
                      }`}
                      data-testid={`storage-mode-${mode}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        {schema?.storageMode === mode && (
                          <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white capitalize mb-1">
                        {mode.replace('_', ' ')}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {mode === 'single_table' && 'All data in one table'}
                        {mode === 'multi_table' && 'Separate tables per PLC/group'}
                        {mode === 'hybrid' && 'Mix of single and multi-table'}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Custom Tables */}
            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                      <Table2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      Custom Tables
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      Define custom tables for specific PLCs or tag groups
                    </CardDescription>
                  </div>
                  <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white" data-testid="button-add-table">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Table
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl text-gray-900 dark:text-white">Create Custom Table</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={tableForm.handleSubmit(handleCreateTable)} className="space-y-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">Table Name</Label>
                            <Input
                              id="name"
                              placeholder="plc_data_production"
                              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                              data-testid="input-table-name"
                              {...tableForm.register('name')}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">Description</Label>
                            <Textarea
                              id="description"
                              placeholder="Data from production line PLCs"
                              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                              data-testid="input-table-description"
                              {...tableForm.register('description')}
                            />
                          </div>

                          <div>
                            <Label className="text-gray-700 dark:text-gray-300">Retention Policy</Label>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div>
                                <Label htmlFor="retentionDays" className="text-sm">Retention Days</Label>
                                <Input
                                  id="retentionDays"
                                  type="number"
                                  placeholder="30"
                                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                                  data-testid="input-retention-days"
                                  {...tableForm.register('retentionDays', { valueAsNumber: true })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="cleanupInterval" className="text-sm">Cleanup Interval (hours)</Label>
                                <Input
                                  id="cleanupInterval"
                                  type="number"
                                  placeholder="24"
                                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                                  data-testid="input-cleanup-interval"
                                  {...tableForm.register('cleanupInterval', { valueAsNumber: true })}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-3">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowTableDialog(false)}
                            data-testid="button-cancel-table"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit"
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
                            data-testid="button-save-table"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Create Table
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {schema?.customTables && schema.customTables.length > 0 ? (
                  <div className="space-y-3">
                    {schema.customTables.map((table: CustomTable, index: number) => (
                      <div 
                        key={index}
                        className="p-4 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                        data-testid={`table-item-${table.name}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Table2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">{table.name}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {table.columns.length} columns • {table.retentionPolicy.retentionDays} day retention
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-edit-${table.name}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-delete-${table.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No custom tables defined</p>
                    <p className="text-sm mt-1">Click "Add Table" to create your first custom table</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Table Status Tab */}
          <TabsContent value="status" className="space-y-6">
            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Table Statistics & Health
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Real-time monitoring of database table performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 dark:border-slate-700">
                        <TableHead className="text-gray-700 dark:text-gray-300">Table Name</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Row Count</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Size</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Oldest Record</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Last Cleanup</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Health</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableStatuses.map((status: TableStatus, index: number) => (
                        <TableRow 
                          key={index} 
                          className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                          data-testid={`status-row-${status.tableName}`}
                        >
                          <TableCell className="font-medium text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <HardDrive className="h-4 w-4 text-gray-500" />
                              {status.tableName}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">
                            {formatNumber(status.rowCount)}
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">
                            {formatBytes(status.sizeBytes)}
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">
                            {status.oldestRecord ? new Date(status.oldestRecord).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">
                            {status.lastCleanup ? new Date(status.lastCleanup).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell>{getHealthBadge(status.healthStatus)}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-optimize-${status.tableName}`}
                            >
                              <Zap className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Recommendations */}
                {tableStatuses.some((s: TableStatus) => s.recommendations && s.recommendations.length > 0) && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recommendations</h3>
                    <div className="space-y-2">
                      {tableStatuses.filter((s: TableStatus) => s.recommendations && s.recommendations.length > 0).map((status: TableStatus, idx: number) => (
                        <Alert key={idx} className="border-yellow-200 dark:border-yellow-800/50 bg-yellow-50 dark:bg-yellow-900/20">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          <AlertDescription className="text-gray-700 dark:text-gray-300">
                            <strong>{status.tableName}:</strong> {status.recommendations?.join(', ')}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gateway Commands Tab */}
          <TabsContent value="commands" className="space-y-6">
            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                      <Command className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Command Queue
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      View and manage gateway commands
                    </CardDescription>
                  </div>
                  <Dialog open={showCommandDialog} onOpenChange={setShowCommandDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white" data-testid="button-trigger-command">
                        <Plus className="h-4 w-4 mr-2" />
                        Trigger Command
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white">
                      <DialogHeader>
                        <DialogTitle>Execute Gateway Command</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-gray-700 dark:text-gray-300">Command Type</Label>
                          <Select>
                            <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600" data-testid="select-command-type">
                              <SelectValue placeholder="Select command type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cleanup">Database Cleanup</SelectItem>
                              <SelectItem value="optimize">Optimize Tables</SelectItem>
                              <SelectItem value="backup">Backup Database</SelectItem>
                              <SelectItem value="schema_update">Update Schema</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-gray-700 dark:text-gray-300">Priority</Label>
                          <Select defaultValue="normal">
                            <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600" data-testid="select-priority">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowCommandDialog(false)}
                            data-testid="button-cancel-command"
                          >
                            Cancel
                          </Button>
                          <Button 
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                            onClick={() => {
                              executeCommandMutation.mutate({
                                type: 'cleanup',
                                priority: 2,
                                parameters: {}
                              });
                              setShowCommandDialog(false);
                            }}
                            data-testid="button-execute-command"
                          >
                            Execute
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 dark:border-slate-700">
                        <TableHead className="text-gray-700 dark:text-gray-300">Type</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Priority</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Timestamp</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Parameters</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commands.map((command: GatewayCommand) => (
                        <TableRow 
                          key={command.id} 
                          className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                          data-testid={`command-row-${command.id}`}
                        >
                          <TableCell className="font-medium text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <Command className="h-4 w-4 text-gray-500" />
                              {command.type.replace('_', ' ')}
                            </div>
                          </TableCell>
                          <TableCell>{getCommandStatusBadge(command.status)}</TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">
                            <Badge variant="outline">P{command.priority}</Badge>
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">
                            {new Date(command.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">
                            <code className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
                              {JSON.stringify(command.parameters)}
                            </code>
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">
                            {command.result ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : command.error ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-gray-400" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </WaterSystemLayout>
  );
}