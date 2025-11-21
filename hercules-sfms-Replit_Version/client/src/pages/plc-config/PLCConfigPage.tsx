import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout';
import { insertPlcDeviceSchema, insertPlcTagSchema, type InsertPlcDevice, type InsertPlcTag } from '@shared/schema';
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
import { 
  Settings, Plus, Edit2, Trash2, Power, WifiOff, Wifi, 
  Database, Tag, Clock, Eye, EyeOff, Loader2, CheckCircle2,
  AlertTriangle, XCircle, Cable, Cpu, HelpCircle, Info,
  Search, BookOpen, Zap, Network, Router, Sparkles, Activity, Server, Archive, Pencil
} from 'lucide-react';
import { GatewayDataSync } from '@/components/plc/GatewayDataSync';
import { useDemo } from '@/contexts/DemoContext';

interface PlcConfiguration {
  id: number;
  name: string;
  plcType: string;
  ipAddress: string;
  port: number;
  connectionStatus: string;
  connectionType?: string;
  protocol?: string;
  isActive: boolean;
}

interface PlcTag {
  id: number;
  name: string;
  address: string;
  dataType: string;
  accessType?: string;
  unit?: string;
  description?: string;
  enabled: boolean;
}

// PLC brands and models reference data (keep for UI dropdown purposes only)
const PLC_BRANDS = {
  siemens: {
    name: 'Siemens',
    models: ['S7-1200', 'S7-1500', 'S7-300', 'S7-400'],
    defaultPort: 102,
    defaultProtocol: 's7'
  },
  'allen-bradley': {
    name: 'Allen-Bradley',
    models: ['ControlLogix', 'CompactLogix', 'MicroLogix', 'PLC-5'],
    defaultPort: 44818,
    defaultProtocol: 'ethernet_ip'
  },
  schneider: {
    name: 'Schneider Electric',
    models: ['Modicon M580', 'Modicon M340', 'Modicon M221'],
    defaultPort: 502,
    defaultProtocol: 'modbus_tcp'
  },
  mitsubishi: {
    name: 'Mitsubishi',
    models: ['FX Series', 'Q Series', 'iQ-R Series'],
    defaultPort: 5007,
    defaultProtocol: 'modbus_tcp'
  },
  omron: {
    name: 'Omron',
    models: ['CP1E', 'CJ2M', 'NX Series'],
    defaultPort: 9600,
    defaultProtocol: 'modbus_tcp'
  }
};

const PROTOCOL_INFO = {
  modbus_tcp: { name: 'Modbus TCP', port: 502, description: 'Universal industrial protocol over Ethernet' },
  s7: { name: 'Siemens S7', port: 102, description: 'Native Siemens communication protocol' },
  ethernet_ip: { name: 'Ethernet/IP', port: 44818, description: 'Common Industrial Protocol over Ethernet' },
  opc_ua: { name: 'OPC UA', port: 4840, description: 'Modern secure industrial communication' }
};

export function PLCConfigPage() {
  const [activeTab, setActiveTab] = useState('plc-devices');
  const [selectedConfig, setSelectedConfig] = useState<PlcConfiguration | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PlcConfiguration | null>(null);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showEditTagDialog, setShowEditTagDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<PlcTag | null>(null);
  const [showIdentificationHelper, setShowIdentificationHelper] = useState(false);
  const [selectedPlcBrand, setSelectedPlcBrand] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useCustomAuth();
  const { toast } = useToast();
  const { isDemoMode } = useDemo();

  // Demo PLC configurations
  const demoPLCs: PlcConfiguration[] = [
    {
      id: 1,
      name: 'HerculesMill',
      plcType: 'siemens_s7',
      ipAddress: '127.0.0.1:102',
      port: 102,
      connectionStatus: 'connected',
      protocol: 's7',
      isActive: true
    }
  ];

  // Demo tags
  const demoTags: PlcTag[] = [
    { id: 1, name: 'temperature_01', address: 'DB1.DBD0', dataType: 'float', unit: '°C', description: 'Temperature Sensor 1', enabled: true },
    { id: 2, name: 'pressure_01', address: 'DB1.DBD4', dataType: 'float', unit: 'bar', description: 'Pressure Sensor 1', enabled: true },
    { id: 3, name: 'motor_speed', address: 'DB1.DBD8', dataType: 'float', unit: 'RPM', description: 'Motor Speed', enabled: true },
    { id: 4, name: 'conveyor_status', address: 'DB1.DBX12.0', dataType: 'bool', description: 'Conveyor Running Status', enabled: true },
    { id: 5, name: 'alarm_active', address: 'DB1.DBX12.1', dataType: 'bool', description: 'System Alarm Status', enabled: true },
  ];

  // Fetch PLC configurations - use demo data in demo mode
  const { data: apiPlcConfigs = [], isLoading: configsLoading, error: configError } = useQuery({
    queryKey: ['/api/plc-configurations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/plc-configurations');
      if (!response.ok) {
        // If 401 or 403, user is not authenticated properly
        if (response.status === 401 || response.status === 403) {
          console.warn('Not authenticated, returning empty configurations');
          return [];
        }
        throw new Error('Failed to fetch PLC configurations');
      }
      const data = await response.json();
      return data || [];
    },
    enabled: !isDemoMode,
  }) as { data: PlcConfiguration[], isLoading: boolean, error: Error | null };

  const plcConfigs = isDemoMode ? demoPLCs : apiPlcConfigs;

  // Fetch PLC tags for selected configuration - use demo data in demo mode
  const { data: apiPlcTags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ['/api/plc-tags', selectedConfig?.id],
    queryFn: async () => {
      if (!selectedConfig?.id) {
        return [];
      }
      
      const response = await apiRequest('GET', `/api/plc-tags?configId=${selectedConfig.id}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.warn('Not authenticated, returning empty tags');
          return [];
        }
        throw new Error('Failed to fetch PLC tags');
      }
      return response.json();
    },
    enabled: !!selectedConfig && !isDemoMode,
  });

  const plcTags = isDemoMode ? demoTags : apiPlcTags;

  // Form for PLC Configuration (Create)
  const configForm = useForm<any>({
    defaultValues: {
      name: '',
      brand: 'siemens',
      plcType: 'siemens_s7',
      ipAddress: '',
      port: 102,
      rackNumber: 0,
      slotNumber: 1,
      protocol: 's7',
      timeout: 5000,
      retryAttempts: 3,
      pollingRate: 1000,
      status: 'configured',
    },
  });

  // Separate form for Edit PLC Configuration  
  const editConfigForm = useForm<any>({
    defaultValues: {
      name: '',
      brand: 'siemens',
      plcType: 'siemens_s7',
      ipAddress: '',
      port: 102,
      rackNumber: 0,
      slotNumber: 1,
      protocol: 's7',
      timeout: 5000,
      retryAttempts: 3,
      pollingRate: 1000,
      status: 'configured',
    },
  });

  // Form for PLC Tag
  const tagForm = useForm<any>({
    resolver: zodResolver(insertPlcTagSchema.omit({ plcId: true })),
    defaultValues: {
      name: '',
      address: '',
      dataType: 'float',
      unit: '',
      description: '',
      enabled: true,
      scanRate: 1000,
      scaleFactor: 1,
      offset: 0,
    },
  });

  // Form for Edit Tag
  const editTagForm = useForm<any>({
    resolver: zodResolver(insertPlcTagSchema.omit({ plcId: true })),
    defaultValues: {
      name: '',
      address: '',
      dataType: 'float',
      unit: '',
      description: '',
      enabled: true,
      scanRate: 1000,
      scaleFactor: 1,
      offset: 0,
    },
  });

  // Create PLC Configuration Mutation
  const createConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      // Always make real API calls for authenticated users
      try {
        // Get the first facility for this tenant as default
        const facilitiesResponse = await apiRequest('GET', '/api/facilities');
        
        if (!facilitiesResponse.ok) {
          // If facilities request fails, try without facilityId
          const plcData = {
            ...data,
            facilityId: 1,
            brand: data.brand || data.plcType || 'siemens',
            model: data.model || selectedModel || 'S7-1200',
            protocol: data.protocol || 's7',
          };
          
          const response = await apiRequest('POST', '/api/plc-configurations', plcData);
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create PLC configuration');
          }
          return response.json();
        }
        
        const facilities = await facilitiesResponse.json();
        const defaultFacility = facilities[0];
        
        const plcData = {
          ...data,
          facilityId: defaultFacility?.id || 1,
          brand: data.brand || data.plcType || 'siemens',
          model: data.model || selectedModel || 'S7-1200',
          protocol: data.protocol || 's7',
        };
        
        const response = await apiRequest('POST', '/api/plc-configurations', plcData);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create PLC configuration');
        }
        return response.json();
      } catch (error: any) {
        console.error('Failed to create PLC configuration:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plc-configurations'] });
      setShowConfigDialog(false);
      configForm.reset();
      toast({
        title: 'Success',
        description: 'PLC configuration created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create PLC configuration',
        variant: 'destructive',
      });
    },
  });

  // Create/Update PLC Tag Mutation
  // Delete PLC configuration mutation
  const deleteConfigMutation = useMutation({
    mutationFn: async (plcId: number) => {
      const response = await apiRequest('DELETE', `/api/plc-configurations/${plcId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete PLC configuration');
      }
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "PLC configuration deleted successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plc-configurations'] });
      setSelectedConfig(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete PLC configuration",
        variant: "destructive",
      });
    }
  });

  // Update PLC configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      console.log('[updateConfigMutation] Starting update for ID:', id);
      console.log('[updateConfigMutation] Update data:', data);
      
      const response = await apiRequest('PUT', `/api/plc-configurations/${id}`, data);
      console.log('[updateConfigMutation] Response status:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('[updateConfigMutation] Error response:', error);
        throw new Error(error.message || 'Failed to update PLC configuration');
      }
      
      const result = await response.json();
      console.log('[updateConfigMutation] Success response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('[updateConfigMutation] onSuccess called with data:', data);
      toast({
        title: "Success",
        description: "PLC configuration updated successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plc-configurations'] });
      setShowEditDialog(false);
      setEditingConfig(null);
      editConfigForm.reset();
    },
    onError: (error: any) => {
      console.error('[updateConfigMutation] onError called with error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update PLC configuration",
        variant: "destructive",
      });
    }
  });

  const createTagMutation = useMutation({
    mutationFn: async (data: any) => {
      // Always make real API calls for authenticated users
      if (!selectedConfig?.id) {
        throw new Error('No PLC selected');
      }
      
      // Use the POST /api/plc-tags endpoint (now supports plcId in body)
      const response = await apiRequest('POST', '/api/plc-tags', {
        plcId: selectedConfig.id,
        name: data.name,  // Use 'name' field to match backend schema
        address: data.address,
        dataType: data.dataType || 'float',
        description: data.description,
        unit: data.unit,
        scaleFactor: data.scaleFactor || 1,
        offset: data.offset || 0,
        minValue: data.minValue,
        maxValue: data.maxValue,
        scanRate: data.scanRate || 1000,
        enabled: data.enabled !== false,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create tag');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plc-tags'] });
      setShowTagDialog(false);
      tagForm.reset();
      toast({
        title: 'Success',
        description: 'Tag created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create tag',
        variant: 'destructive',
      });
    },
  });

  // Update PLC Tag Mutation
  const updateTagMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PUT', `/api/plc-tags/${id}`, {
        name: data.name,
        address: data.address,
        dataType: data.dataType || 'float',
        description: data.description,
        unit: data.unit,
        scaleFactor: data.scaleFactor || 1,
        offset: data.offset || 0,
        minValue: data.minValue,
        maxValue: data.maxValue,
        scanRate: data.scanRate || 1000,
        enabled: data.enabled !== false,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update tag');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plc-tags'] });
      setShowEditTagDialog(false);
      setEditingTag(null);
      editTagForm.reset();
      toast({
        title: 'Success',
        description: 'Tag updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update tag',
        variant: 'destructive',
      });
    },
  });

  // Delete PLC Tag Mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      const response = await apiRequest('DELETE', `/api/plc-tags/${tagId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete tag');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plc-tags'] });
      toast({
        title: 'Success',
        description: 'Tag deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete tag',
        variant: 'destructive',
      });
    },
  });

  const handlePlcTypeChange = (value: string) => {
    setSelectedPlcBrand(value);
    setSelectedModel(null);
    configForm.setValue('brand', value);
    configForm.setValue('plcType', value);
    
    // Reset model-specific settings
    configForm.setValue('port', 102);
    configForm.setValue('protocol', 's7');
  };

  const handleModelSelection = (brand: string, model: string) => {
    setSelectedModel(model);
    configForm.setValue('model', model);
    
    // Find the brand and set appropriate defaults
    const brandData = PLC_BRANDS[brand as keyof typeof PLC_BRANDS];
    
    if (brandData) {
      configForm.setValue('port', brandData.defaultPort);
      configForm.setValue('protocol', brandData.defaultProtocol);
    }
  };

  const onCreateConfig = (data: any) => {
    createConfigMutation.mutate(data);
  };

  const onCreateTag = (data: any) => {
    createTagMutation.mutate(data);
  };

  const getConnectionStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConnectionStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/50">Connected</Badge>;
      case 'disconnected':
        return <Badge className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/50">Disconnected</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/50">Warning</Badge>;
      default:
        return <Badge className="bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-500/50">Unknown</Badge>;
    }
  };

  return (
    <WaterSystemLayout 
      title="PLC Configuration" 
      subtitle="Configure and manage industrial controllers"
    >
      <div className="space-y-2">
        {/* Compact Hero Section */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-cyan-200 dark:border-slate-700 p-3">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Control Center
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-300 max-w-2xl">
                  Connect and configure your PLCs, manage data tags, and monitor real-time communication with industrial controllers.
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-gray-600 dark:text-gray-400">{plcConfigs.filter(c => c.connectionStatus === 'connected').length} Connected</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Cpu className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-gray-600 dark:text-gray-400">{plcConfigs.length} Total PLCs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-600 dark:text-gray-400">{plcTags.length} Data Tags</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gateway Data Sync Component */}
        <GatewayDataSync facilityId="1" facilityName="Demo Facility" />

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2">
          <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <TabsTrigger 
              value="plc-devices" 
              className="text-gray-700 dark:text-gray-300 data-[state=active]:text-cyan-700 dark:data-[state=active]:text-cyan-400 data-[state=active]:bg-cyan-50 dark:data-[state=active]:bg-cyan-500/10"
            >
              <Cpu className="h-4 w-4 mr-2" />
              PLC Devices
            </TabsTrigger>
            <TabsTrigger 
              value="tag-management" 
              className="text-gray-700 dark:text-gray-300 data-[state=active]:text-cyan-700 dark:data-[state=active]:text-cyan-400 data-[state=active]:bg-cyan-50 dark:data-[state=active]:bg-cyan-500/10"
            >
              <Tag className="h-4 w-4 mr-2" />
              Tag Management
            </TabsTrigger>
          </TabsList>

          {/* PLC Devices Tab */}
          <TabsContent value="plc-devices" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">PLC Devices</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configure and manage industrial controllers</p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add PLC
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white max-w-4xl">
                    <DialogHeader>
                      <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl text-gray-900 dark:text-white">Add PLC Configuration</DialogTitle>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowIdentificationHelper(true)}
                          className="border-cyan-300 dark:border-cyan-500 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10"
                        >
                          <HelpCircle className="h-4 w-4 mr-2" />
                          Identify My PLC
                        </Button>
                      </div>
                    </DialogHeader>
                    
                    <Tabs defaultValue="configuration" className="space-y-6">
                      <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-slate-800">
                        <TabsTrigger value="configuration" className="text-gray-700 dark:text-gray-300">Configuration</TabsTrigger>
                        <TabsTrigger value="help" className="text-gray-700 dark:text-gray-300">Help & Guidance</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="configuration">
                        <form onSubmit={configForm.handleSubmit(onCreateConfig)} className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">Configuration Name</Label>
                              <Input
                                id="name"
                                placeholder="Main Production PLC"
                                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                                {...configForm.register('name')}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="brand" className="text-gray-700 dark:text-gray-300 flex items-center">
                                PLC Brand
                                <Info className="h-4 w-4 ml-2 text-gray-500 dark:text-gray-400" />
                              </Label>
                              <Select value={configForm.watch('brand') || configForm.watch('plcType')} onValueChange={handlePlcTypeChange}>
                                <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white">
                                  <SelectValue placeholder="Select your PLC brand" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                                  {Object.entries(PLC_BRANDS).map(([key, brand]) => (
                                    <SelectItem key={key} value={key}>
                                      <div className="flex items-center">
                                        <Cpu className="h-4 w-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                                        {brand.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {selectedPlcBrand && (
                                <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                                  <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">Select your model:</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {PLC_BRANDS[selectedPlcBrand as keyof typeof PLC_BRANDS]?.models.map((model) => (
                                      <Button
                                        key={model}
                                        type="button"
                                        variant={selectedModel === model ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleModelSelection(selectedPlcBrand, model)}
                                        className="text-xs"
                                      >
                                        {model}
                                      </Button>
                                    ))}
                                  </div>
                                  {selectedModel && (
                                    <div className="mt-3 p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded border border-cyan-200 dark:border-cyan-800">
                                      <div className="text-xs text-gray-600 dark:text-gray-400">Auto-configured settings:</div>
                                      <div className="text-xs text-cyan-700 dark:text-cyan-400 mt-1">
                                        Default Port: {configForm.watch('port')} | Default Protocol: {configForm.watch('protocol')}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        You can modify these settings below if needed
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Communication Protocol - Full Width Section */}
                          <div className="space-y-2 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border-2 border-cyan-500">
                            <Label htmlFor="protocol" className="text-gray-900 dark:text-white font-bold text-lg">Communication Protocol</Label>
                            <Select value={configForm.watch('protocol')} onValueChange={(value) => configForm.setValue('protocol', value)}>
                              <SelectTrigger className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white">
                                <SelectValue placeholder="Select protocol" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                                <SelectItem value="s7">
                                  <div className="flex items-center">
                                    <Network className="h-4 w-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                                    Siemens S7
                                  </div>
                                </SelectItem>
                                <SelectItem value="modbus_tcp">
                                  <div className="flex items-center">
                                    <Network className="h-4 w-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                                    Modbus TCP
                                  </div>
                                </SelectItem>
                                <SelectItem value="ethernet_ip">
                                  <div className="flex items-center">
                                    <Wifi className="h-4 w-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                                    Ethernet/IP
                                  </div>
                                </SelectItem>
                                <SelectItem value="opc_ua">
                                  <div className="flex items-center">
                                    <Server className="h-4 w-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                                    OPC UA
                                  </div>
                                </SelectItem>
                                <SelectItem value="profinet">
                                  <div className="flex items-center">
                                    <Cable className="h-4 w-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                                    Profinet
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="ipAddress" className="text-gray-700 dark:text-gray-300">IP Address</Label>
                              <Input
                                id="ipAddress"
                                placeholder="192.168.1.100"
                                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                                {...configForm.register('ipAddress')}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="port" className="text-gray-700 dark:text-gray-300">Port</Label>
                              <Input
                                id="port"
                                type="number"
                                placeholder="102"
                                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                                {...configForm.register('port', { valueAsNumber: true })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="rackNumber" className="text-gray-700 dark:text-gray-300">Rack Number</Label>
                              <Input
                                id="rackNumber"
                                type="number"
                                placeholder="0"
                                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                                {...configForm.register('rackNumber', { valueAsNumber: true })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="slotNumber" className="text-gray-700 dark:text-gray-300">Slot Number</Label>
                              <Input
                                id="slotNumber"
                                type="number"
                                placeholder="1"
                                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                                {...configForm.register('slotNumber', { valueAsNumber: true })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="timeout" className="text-gray-700 dark:text-gray-300">Timeout (ms)</Label>
                              <Input
                                id="timeout"
                                type="number"
                                placeholder="5000"
                                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                                {...configForm.register('timeout', { valueAsNumber: true })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="pollingRate" className="text-gray-700 dark:text-gray-300">Polling Rate (ms)</Label>
                              <Input
                                id="pollingRate"
                                type="number"
                                placeholder="1000"
                                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                                {...configForm.register('pollingRate', { valueAsNumber: true })}
                              />
                            </div>
                          </div>

                          {/* Database Table Assignment */}
                          <Separator className="my-6" />
                          <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                              <Database className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                              Database Configuration
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="databaseTable" className="text-gray-700 dark:text-gray-300">
                                  Target Table
                                  <Info className="inline h-3 w-3 ml-2 text-gray-500" />
                                </Label>
                                <Select defaultValue="plc_data_main" onValueChange={(value) => configForm.setValue('databaseTable', value)}>
                                  <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600">
                                    <SelectValue placeholder="Select target table" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="plc_data_main">Main Data Table</SelectItem>
                                    <SelectItem value="plc_data_archive">Archive Table</SelectItem>
                                    <SelectItem value="plc_data_production">Production Table</SelectItem>
                                    <SelectItem value="custom">Custom Table...</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="retentionDays" className="text-gray-700 dark:text-gray-300">
                                  Data Retention (days)
                                  <Info className="inline h-3 w-3 ml-2 text-gray-500" />
                                </Label>
                                <Input
                                  id="retentionDays"
                                  type="number"
                                  placeholder="30"
                                  defaultValue="30"
                                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                                  {...configForm.register('retentionDays', { valueAsNumber: true })}
                                />
                              </div>
                            </div>
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800/50">
                              <p className="text-xs text-purple-700 dark:text-purple-400">
                                <Info className="inline h-3 w-3 mr-1" />
                                Data from this PLC will be stored in the selected table. Configure custom tables in the Database Management section.
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-end space-x-3">
                            <Button type="button" variant="outline" onClick={() => setShowConfigDialog(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={createConfigMutation.isPending}>
                              {createConfigMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                'Create PLC'
                              )}
                            </Button>
                          </div>
                        </form>
                      </TabsContent>
                      
                      <TabsContent value="help">
                        <div className="space-y-6">
                          <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <AlertDescription className="text-gray-700 dark:text-gray-300">
                              Need help identifying your PLC? Use our visual guide below to match your hardware.
                            </AlertDescription>
                          </Alert>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(PLC_BRANDS).map(([key, brand]) => (
                              <Card key={key} className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm text-gray-900 dark:text-white flex items-center">
                                    <Cpu className="h-4 w-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                                    {brand.name}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div className="text-sm text-gray-700 dark:text-gray-300">
                                    <div className="font-semibold mb-2">Common Models:</div>
                                    {brand.models.map((model, idx) => (
                                      <div key={idx} className="text-xs mb-1">
                                        <span>• {model}</span>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <div className="p-2 bg-gray-50 dark:bg-slate-900 rounded">
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Default Settings:</div>
                                    <div className="text-xs text-cyan-700 dark:text-cyan-400 font-mono">
                                      Port: {brand.defaultPort} | Protocol: {brand.defaultProtocol}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          
                          <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <AlertDescription className="text-gray-700 dark:text-gray-300">
                              Still need help? Contact our support team with photos of your PLC labels for personalized assistance.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>

                {/* Edit PLC Configuration Dialog */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                  <DialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl text-gray-900 dark:text-white flex items-center">
                        <Settings className="h-5 w-5 mr-2 text-cyan-600 dark:text-cyan-400" />
                        Edit PLC Configuration
                      </DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={editConfigForm.handleSubmit((data) => {
                      console.log('[Edit Form] Form submitted with data:', data);
                      console.log('[Edit Form] Editing config:', editingConfig);
                      
                      if (!editingConfig) {
                        console.error('[Edit Form] No editing config set!');
                        return;
                      }
                      
                      const updateData = {
                        ...data,
                        brand: data.brand || data.plcType || 'siemens',
                        model: selectedModel || 'S7-1200',
                      };
                      
                      console.log('[Edit Form] Prepared update data:', updateData);
                      console.log('[Edit Form] Calling mutation with ID:', editingConfig.id);
                      
                      updateConfigMutation.mutate({ 
                        id: editingConfig.id, 
                        data: updateData 
                      });
                    })} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-name" className="text-gray-700 dark:text-gray-300">Configuration Name</Label>
                          <Input
                            id="edit-name"
                            placeholder="Main Production PLC"
                            className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                            {...editConfigForm.register('name')}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-ipAddress" className="text-gray-700 dark:text-gray-300">IP Address</Label>
                          <Input
                            id="edit-ipAddress"
                            placeholder="192.168.1.100"
                            className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                            {...editConfigForm.register('ipAddress')}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-protocol" className="text-gray-700 dark:text-gray-300">Communication Protocol</Label>
                          <Select value={editConfigForm.watch('protocol')} onValueChange={(value) => editConfigForm.setValue('protocol', value)}>
                            <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white">
                              <SelectValue placeholder="Select protocol" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                              <SelectItem value="s7">
                                <div className="flex items-center">
                                  <Network className="h-4 w-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                                  Siemens S7
                                </div>
                              </SelectItem>
                              <SelectItem value="modbus_tcp">
                                <div className="flex items-center">
                                  <Network className="h-4 w-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                                  Modbus TCP
                                </div>
                              </SelectItem>
                              <SelectItem value="ethernet_ip">
                                <div className="flex items-center">
                                  <Wifi className="h-4 w-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                                  Ethernet/IP
                                </div>
                              </SelectItem>
                              <SelectItem value="opc_ua">
                                <div className="flex items-center">
                                  <Server className="h-4 w-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                                  OPC UA
                                </div>
                              </SelectItem>
                              <SelectItem value="profinet">
                                <div className="flex items-center">
                                  <Cable className="h-4 w-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                                  Profinet
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-port" className="text-gray-700 dark:text-gray-300">Port</Label>
                          <Input
                            id="edit-port"
                            type="number"
                            placeholder="102"
                            className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                            {...editConfigForm.register('port', { valueAsNumber: true })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-timeout" className="text-gray-700 dark:text-gray-300">Timeout (ms)</Label>
                          <Input
                            id="edit-timeout"
                            type="number"
                            placeholder="5000"
                            className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                            {...editConfigForm.register('timeout', { valueAsNumber: true })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-pollingRate" className="text-gray-700 dark:text-gray-300">Polling Rate (ms)</Label>
                          <Input
                            id="edit-pollingRate"
                            type="number"
                            placeholder="1000"
                            className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                            {...editConfigForm.register('pollingRate', { valueAsNumber: true })}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3">
                        <Button type="button" variant="outline" onClick={() => {
                          setShowEditDialog(false);
                          setEditingConfig(null);
                        }}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          Update Configuration
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* PLC Configurations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {configsLoading ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12">
                  <div className="h-12 w-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Loading PLC configurations...</p>
                </div>
              ) : plcConfigs.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <Cable className="h-10 w-10 text-gray-400 dark:text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No PLC Configurations</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">Add your first PLC to start collecting data</p>
                  <Button 
                    onClick={() => setShowConfigDialog(true)}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Add First PLC
                  </Button>
                </div>
              ) : (
                plcConfigs.map((config: PlcConfiguration) => (
                  <Card 
                    key={config.id} 
                    className={`bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 transition-all hover:shadow-lg
                              ${selectedConfig?.id === config.id ? 'ring-2 ring-cyan-500 border-cyan-500' : 'hover:border-cyan-400 dark:hover:border-cyan-500'}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center">
                          {getConnectionStatusIcon(config.connectionStatus)}
                          <span className="ml-2">{config.name}</span>
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          {getConnectionStatusBadge(config.connectionStatus)}
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-700 dark:hover:text-blue-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingConfig(config);
                              editConfigForm.reset({
                                name: config.name,
                                brand: config.plcType || 'siemens_s7',
                                plcType: config.plcType,
                                ipAddress: config.ipAddress,
                                port: config.port,
                                protocol: config.protocol || 's7',
                                rackNumber: 0,
                                slotNumber: 1,
                                timeout: 5000,
                                retryAttempts: 3,
                                pollingRate: 1000,
                                status: 'configured',
                              });
                              setSelectedPlcBrand(config.plcType || 'siemens_s7');
                              setShowEditDialog(true);
                            }}
                            title="Edit PLC Configuration"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-700 dark:hover:text-red-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to delete "${config.name}"? This will also delete all associated tags.`)) {
                                deleteConfigMutation.mutate(config.id);
                              }
                            }}
                            title="Delete PLC Configuration"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="text-gray-600 dark:text-gray-400">
                        {(config.plcType || config.brand || config.protocol || 'SIEMENS S7').toUpperCase()} • {config.ipAddress}:{config.port}
                      </CardDescription>
                    </CardHeader>
                    <CardContent 
                      className="space-y-3 cursor-pointer"
                      onClick={() => setSelectedConfig(config)}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Protocol</span>
                        <span className="text-gray-900 dark:text-white font-medium">{config.protocol}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Status</span>
                        <div className="flex items-center space-x-2">
                          {config.isActive ? 
                            <Badge variant="outline" className="text-green-700 dark:text-green-400 border-green-300 dark:border-green-800">Active</Badge> :
                            <Badge variant="outline" className="text-red-700 dark:text-red-400 border-red-300 dark:border-red-800">Inactive</Badge>
                          }
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center">
                          <Database className="h-3 w-3 mr-1" />
                          Table
                        </span>
                        <Badge variant="outline" className="text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800">
                          {(config as any).databaseTable || 'plc_data_main'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center">
                          <Archive className="h-3 w-3 mr-1" />
                          Retention
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 text-xs">
                          {(config as any).retentionDays || 30} days
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Tag Management Tab */}
          <TabsContent value="tag-management" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tag Management</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configure data points from your PLC devices</p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Select value={selectedConfig?.id?.toString()} onValueChange={(value) => {
                  const config = plcConfigs.find((c: PlcConfiguration) => c.id.toString() === value);
                  setSelectedConfig(config || null);
                }}>
                  <SelectTrigger className="w-48 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select PLC Device" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    {plcConfigs.map((config: PlcConfiguration) => (
                      <SelectItem key={config.id} value={config.id.toString()}>
                        <div className="flex items-center">
                          {getConnectionStatusIcon(config.connectionStatus)}
                          <span className="ml-2">{config.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedConfig && (
                  <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Tag
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white">
                      <DialogHeader>
                        <DialogTitle className="text-xl text-gray-900 dark:text-white">Add PLC Tag</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={tagForm.handleSubmit(onCreateTag)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">Tag Name</Label>
                            <Input
                              id="name"
                              placeholder="TANK_LEVEL_01"
                              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                              {...tagForm.register('name')}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="address" className="text-gray-700 dark:text-gray-300">Address</Label>
                            <Input
                              id="address"
                              placeholder="DB100.DBD0"
                              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                              {...tagForm.register('address')}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="dataType" className="text-gray-700 dark:text-gray-300">Data Type</Label>
                            <Select value={tagForm.watch('dataType')} onValueChange={(value) => tagForm.setValue('dataType', value)}>
                              <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="integer">Integer</SelectItem>
                                <SelectItem value="float">Float</SelectItem>
                                <SelectItem value="string">String</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="unit" className="text-gray-700 dark:text-gray-300">Unit</Label>
                            <Input
                              id="unit"
                              placeholder="meters, °C, bar, etc."
                              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                              {...tagForm.register('unit')}
                            />
                          </div>

                          <div className="col-span-2 space-y-2">
                            <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">Description</Label>
                            <Input
                              id="description"
                              placeholder="Main tank level sensor"
                              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                              {...tagForm.register('description')}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                          <Button type="button" variant="outline" onClick={() => setShowTagDialog(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createTagMutation.isPending}>
                            {createTagMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              'Create Tag'
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Edit Tag Dialog */}
                {selectedConfig && (
                  <Dialog open={showEditTagDialog} onOpenChange={setShowEditTagDialog}>
                    <DialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white">
                      <DialogHeader>
                        <DialogTitle className="text-xl text-gray-900 dark:text-white">Edit PLC Tag</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={editTagForm.handleSubmit((data) => {
                        if (!editingTag) return;
                        updateTagMutation.mutate({ id: editingTag.id, data });
                      })} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-tag-name" className="text-gray-700 dark:text-gray-300">Tag Name</Label>
                            <Input
                              id="edit-tag-name"
                              placeholder="TANK_LEVEL_01"
                              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                              {...editTagForm.register('name')}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="edit-tag-address" className="text-gray-700 dark:text-gray-300">Address</Label>
                            <Input
                              id="edit-tag-address"
                              placeholder="DB100.DBD0"
                              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                              {...editTagForm.register('address')}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="edit-tag-dataType" className="text-gray-700 dark:text-gray-300">Data Type</Label>
                            <Select value={editTagForm.watch('dataType')} onValueChange={(value) => editTagForm.setValue('dataType', value)}>
                              <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="integer">Integer</SelectItem>
                                <SelectItem value="float">Float</SelectItem>
                                <SelectItem value="string">String</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="edit-tag-unit" className="text-gray-700 dark:text-gray-300">Unit</Label>
                            <Input
                              id="edit-tag-unit"
                              placeholder="meters, °C, bar, etc."
                              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                              {...editTagForm.register('unit')}
                            />
                          </div>

                          <div className="col-span-2 space-y-2">
                            <Label htmlFor="edit-tag-description" className="text-gray-700 dark:text-gray-300">Description</Label>
                            <Input
                              id="edit-tag-description"
                              placeholder="Main tank level sensor"
                              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                              {...editTagForm.register('description')}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                          <Button type="button" variant="outline" onClick={() => {
                            setShowEditTagDialog(false);
                            setEditingTag(null);
                          }}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={updateTagMutation.isPending}>
                            {updateTagMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              'Update Tag'
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            {/* Tags Table */}
            {selectedConfig ? (
              <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Tags for {selectedConfig.name}</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Configure and manage data points from this PLC
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tagsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-600 dark:text-cyan-400" />
                    </div>
                  ) : plcTags.length === 0 ? (
                    <div className="text-center py-12">
                      <Tag className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No tags configured for this PLC</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Add tags to start monitoring data points</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 dark:border-slate-700">
                            <TableHead className="text-gray-700 dark:text-gray-300">Tag Name</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300">Address</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300">Data Type</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300">Unit</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300">Description</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {plcTags.map((tag: any) => (
                            <TableRow key={tag.id} className="border-gray-200 dark:border-slate-700">
                              <TableCell className="font-mono text-sm text-gray-900 dark:text-white">{tag.name}</TableCell>
                              <TableCell className="font-mono text-sm text-gray-700 dark:text-gray-300">{tag.address}</TableCell>
                              <TableCell className="text-gray-700 dark:text-gray-300">{tag.dataType}</TableCell>
                              <TableCell className="text-gray-700 dark:text-gray-300">{tag.unit || '-'}</TableCell>
                              <TableCell className="text-gray-700 dark:text-gray-300">{tag.description || '-'}</TableCell>
                              <TableCell>
                                {tag.enabled ? (
                                  <Badge className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-0">
                                    <Eye className="h-3 w-3 mr-1" />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400 border-0">
                                    <EyeOff className="h-3 w-3 mr-1" />
                                    Disabled
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                    onClick={() => {
                                      setEditingTag(tag);
                                      editTagForm.reset({
                                        name: tag.name,
                                        address: tag.address,
                                        dataType: tag.dataType || 'float',
                                        unit: tag.unit,
                                        description: tag.description,
                                        enabled: tag.enabled !== false,
                                        scanRate: tag.scanRate || 1000,
                                        scaleFactor: tag.scaleFactor || 1,
                                        offset: tag.offset || 0,
                                        minValue: tag.minValue,
                                        maxValue: tag.maxValue,
                                      });
                                      setShowEditTagDialog(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete tag "${tag.name}"?`)) {
                                        deleteTagMutation.mutate(tag.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
                <CardContent className="text-center py-12">
                  <Database className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Select a PLC device to view and manage its tags</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </WaterSystemLayout>
  );
}