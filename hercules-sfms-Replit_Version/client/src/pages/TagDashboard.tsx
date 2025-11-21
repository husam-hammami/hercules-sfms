import { useState, useEffect } from 'react';
import { globalSimulator, validateAddress, getAddressExamples } from '@/lib/plc-data-simulator';
import { useQuery } from '@tanstack/react-query';
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Tag, Activity, TrendingUp, TrendingDown, Minus, 
  RefreshCw, AlertTriangle, CheckCircle, XCircle, Search,
  Filter, Download, Gauge, Database, Plus, Edit, Trash2,
  ChevronDown, ChevronRight, Server, Settings, Loader2, Zap
} from 'lucide-react';
import { useDemo } from '@/contexts/DemoContext';
import { useDemoData } from '@/contexts/DemoDataContext';

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
};

interface TagData {
  id: string;
  tagName: string;
  plcId: string;
  plcName?: string;
  address: string;
  dataType: string;
  accessType: string;
  unit?: string;
  description?: string;
  isEnabled: boolean;
  lastValue: number | boolean | null;
  lastReadTime?: Date;
  quality: 'good' | 'bad' | 'uncertain';
  trend?: 'up' | 'down' | 'stable';
}

// Tag form schema
const tagFormSchema = z.object({
  tagName: z.string().min(1, 'Tag name is required'),
  plcId: z.string().min(1, 'PLC selection is required'),
  address: z.string().min(1, 'Address is required'),
  dataType: z.enum(['BOOL', 'INT', 'REAL', 'STRING']),
  accessType: z.enum(['read', 'write', 'read-write']),
  unit: z.string().optional(),
  description: z.string().optional(),
  isEnabled: z.boolean().default(true),
});

type TagFormData = z.infer<typeof tagFormSchema>;

// Mock data for demo mode
const mockPLCConfigs = [
  {
    id: '1',
    name: 'Main Production Line',
    brand: 'Siemens',
    model: 'S7-1200',
    ipAddress: '192.168.1.100',
    connectionStatus: 'connected',
    isActive: true
  },
  {
    id: '2',
    name: 'Water Treatment PLC',
    brand: 'Allen Bradley',
    model: 'CompactLogix',
    ipAddress: '192.168.1.101',
    connectionStatus: 'connected',
    isActive: true
  },
  {
    id: '3',
    name: 'Chemical Dosing PLC',
    brand: 'Schneider',
    model: 'Modicon M580',
    ipAddress: '192.168.1.102',
    connectionStatus: 'connected',
    isActive: true
  }
];

const mockTags: TagData[] = [
  {
    id: '1',
    tagName: 'Tank_Level_1',
    plcId: '1',
    plcName: 'Main Production Line',
    address: 'DB100.DBD0',
    dataType: 'REAL',
    accessType: 'read',
    unit: 'm³',
    description: 'Water tank level sensor',
    isEnabled: true,
    lastValue: 75.5,
    lastReadTime: new Date(),
    quality: 'good',
    trend: 'up'
  },
  {
    id: '2',
    tagName: 'Pump_Status',
    plcId: '1',
    plcName: 'Main Production Line',
    address: 'M10.0',
    dataType: 'BOOL',
    accessType: 'read-write',
    description: 'Main pump running status',
    isEnabled: true,
    lastValue: true,
    lastReadTime: new Date(),
    quality: 'good',
    trend: 'stable'
  },
  {
    id: '3',
    tagName: 'Flow_Rate',
    plcId: '2',
    plcName: 'Water Treatment PLC',
    address: 'N7:10',
    dataType: 'REAL',
    accessType: 'read',
    unit: 'L/min',
    description: 'Water flow rate',
    isEnabled: true,
    lastValue: 120.3,
    lastReadTime: new Date(),
    quality: 'good',
    trend: 'stable'
  }
];

export default function TagDashboard() {
  const { isDemoMode } = useDemo();
  const demoData = isDemoMode ? useDemoData() : null;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterQuality, setFilterQuality] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagData | null>(null);
  const [expandedPLCs, setExpandedPLCs] = useState<Set<string>>(new Set());
  const [simulatedData, setSimulatedData] = useState<any[]>([]);
  
  const queryClient = useQueryClient();

  // Fetch tags
const normalizeTag = (tag: any): TagData => ({
  id: String(tag.id ?? tag.tagId ?? `tag-${Math.random().toString(36).slice(2)}`),
  tagName: tag.tagName ?? tag.name ?? 'Tag',
  plcId: String(tag.plcId ?? tag.plc_id ?? ''),
  plcName: tag.plcName ?? tag.plc_name ?? 'Unknown PLC',
  address: tag.address ?? 'N/A',
  dataType: tag.dataType ?? tag.data_type ?? 'REAL',
  accessType: tag.accessType ?? tag.access_type ?? 'read',
  unit: tag.unit ?? '',
  description: tag.description ?? '',
  isEnabled: tag.isEnabled ?? tag.enabled ?? true,
  lastValue: typeof tag.lastValue === 'number' || typeof tag.lastValue === 'boolean' ? tag.lastValue : null,
  lastReadTime: tag.lastReadTime ? new Date(tag.lastReadTime) : undefined,
  quality: tag.quality ?? 'good',
  trend: tag.trend,
});

const { data: apiTags = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/plc-tags'],
  queryFn: () => fetchJson<any[]>('/api/plc-tags'),
    refetchInterval: autoRefresh && !isDemoMode ? 5000 : false,
    enabled: !isDemoMode,
  });
  
  // Use shared demo tags in demo mode, API tags otherwise
const tags: TagData[] = isDemoMode
  ? (demoData?.plcTags || []).map(normalizeTag)
  : apiTags.map(normalizeTag);
  
  // Fetch available PLCs for tag creation
  const { data: apiPlcConfigs = [] } = useQuery<any[]>({
    queryKey: ['/api/plc-configurations'],
    queryFn: () => fetchJson<any[]>('/api/plc-configurations'),
    enabled: !isDemoMode,
  });
  
  // Use shared demo PLCs in demo mode, API configs otherwise
  const plcConfigs = isDemoMode ? (demoData?.plcConfigs || []) : apiPlcConfigs;
  
  // Fetch real-time data (skip in demo mode)
  const { data: realtimeData } = useQuery({
    queryKey: ['/api/dashboard/realtime'],
    queryFn: () => fetchJson<any>('/api/dashboard/realtime'),
    refetchInterval: autoRefresh && !isDemoMode ? 3000 : false,
    enabled: !isDemoMode,
    gcTime: 0,
  });
  
  // Filter tags
  const filteredTags = tags.filter(tag => {
    const matchesSearch = tag.tagName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tag.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tag.dataType === filterType;
    const matchesQuality = filterQuality === 'all' || tag.quality === filterQuality;
    return matchesSearch && matchesType && matchesQuality;
  });
  
  // Group tags by PLC with PLC info
  const groupedTags = filteredTags.reduce((acc, tag) => {
    const plcId = tag.plcId || 'unassigned';
    if (!acc[plcId]) {
      const plcInfo = plcConfigs.find(p => p.id === plcId);
      acc[plcId] = {
        plc: plcInfo || { id: plcId, name: 'Unknown PLC', brand: 'Unknown' },
        tags: []
      };
    }
    acc[plcId].tags.push(tag);
    return acc;
  }, {} as Record<string, { plc: any; tags: TagData[] }>);

  const togglePLCExpanded = (plcId: string) => {
    const newExpanded = new Set(expandedPLCs);
    if (newExpanded.has(plcId)) {
      newExpanded.delete(plcId);
    } else {
      newExpanded.add(plcId);
    }
    setExpandedPLCs(newExpanded);
  };
  
  // Calculate statistics
  const stats = {
    total: tags.length,
    active: tags.filter(t => t.isEnabled).length,
    good: tags.filter(t => t.quality === 'good').length,
    bad: tags.filter(t => t.quality === 'bad').length,
    uncertain: tags.filter(t => t.quality === 'uncertain').length,
  };
  
  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-400" />;
      default: return <Minus className="h-4 w-4 text-slate-400" />;
    }
  };
  
  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'good': return <Badge className="bg-green-900/30 text-green-300 border-green-500/50">Good</Badge>;
      case 'bad': return <Badge className="bg-red-900/30 text-red-300 border-red-500/50">Bad</Badge>;
      default: return <Badge className="bg-yellow-900/30 text-yellow-300 border-yellow-500/50">Uncertain</Badge>;
    }
  };
  
  const formatValue = (value: any, dataType: string, unit?: string) => {
    if (value === null || value === undefined) return '-';
    
    switch (dataType) {
      case 'BOOL':
        return value ? 'TRUE' : 'FALSE';
      case 'INT':
        return Math.round(value).toString() + (unit ? ` ${unit}` : '');
      case 'REAL':
        return value.toFixed(2) + (unit ? ` ${unit}` : '');
      default:
        return value.toString() + (unit ? ` ${unit}` : '');
    }
  };
  
  // Mutations for tag management
  const createTagMutation = useMutation({
    mutationFn: async (data: { plcId: string; tagData: Omit<TagFormData, 'plcId'> }) => {
      if (isDemoMode && demoData) {
        // Validate address format with warning for demo mode
        const plc = demoData.getPlcById(data.plcId);
        if (plc && !validateAddress(plc.brand, data.tagData.address)) {
          // In demo mode, show a warning but allow creation for testing
          console.warn(`Warning: Invalid address format for ${plc.brand}. Examples: ${getAddressExamples(plc.brand).join(', ')}`);
        }
        
        // In demo mode, add tag to shared demo data
        const newTag: any = {
          id: Date.now().toString(),
          tagName: data.tagData.tagName,
          plcId: data.plcId,
          plcName: plc?.name,
          address: data.tagData.address,
          dataType: data.tagData.dataType,
          accessType: data.tagData.accessType,
          unit: data.tagData.unit,
          description: data.tagData.description,
          isEnabled: data.tagData.isEnabled,
          lastValue: null,
          lastReadTime: new Date(),
          quality: 'uncertain',
          trend: 'stable'
        };
        
        demoData.addPlcTag(newTag);
        return newTag;
      }
      return apiRequest(`/api/plc-configurations/${data.plcId}/tags`, 'POST', data.tagData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plc-tags'] });
      setIsAddDialogOpen(false);
      setEditingTag(null);
    },
    onError: (error: any) => {
      alert(error.message || 'Failed to create tag');
    }
  });

  const updateTagMutation = useMutation({
    mutationFn: async (data: { tagId: string; tagData: Partial<TagFormData> }) => {
      if (isDemoMode && demoData) {
        // In demo mode, update tag in shared demo data
        demoData.updatePlcTag(data.tagId, data.tagData);
        return data;
      }
      return apiRequest(`/api/plc-tags/${data.tagId}`, 'PUT', data.tagData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plc-tags'] });
      setIsAddDialogOpen(false);
      setEditingTag(null);
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      if (isDemoMode && demoData) {
        // In demo mode, remove tag from shared demo data
        demoData.deletePlcTag(tagId);
        return { success: true };
      }
      return apiRequest(`/api/plc-tags/${tagId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plc-tags'] });
    },
  });

  // Initialize simulator with tags
  useEffect(() => {
    if (isDemoMode && tags.length > 0) {
      // Add tags to simulator
      tags.forEach(tag => {
        globalSimulator.addTag({
          tagId: tag.id,
          tagName: tag.tagName,
          plcId: tag.plcId,
          address: tag.address,
          dataType: tag.dataType
        });
      });
      
      // Start simulation
      globalSimulator.start(2000);
      
      // Subscribe to updates
      const unsubscribe = globalSimulator.subscribe((simTags) => {
        setSimulatedData(simTags);
        // Note: simulated data is displayed via simulatedData state
        // The actual tag configuration remains unchanged in demo data
      });
      
      return () => {
        globalSimulator.stop();
        unsubscribe();
      };
    } else if (!isDemoMode && realtimeData && (realtimeData as any).tagValues && tags.length > 0) {
      // Non-demo mode: update from API
      tags.forEach(tag => {
        const realtimeValue = (realtimeData as any).tagValues[tag.tagName];
        if (realtimeValue) {
          tag.lastValue = realtimeValue.value;
          tag.quality = realtimeValue.quality;
        }
      });
    }
  }, [isDemoMode, tags.length, realtimeData]);

  const handleEditTag = (tag: TagData) => {
    setEditingTag(tag);
    setIsAddDialogOpen(true);
  };

  const handleDeleteTag = (tagId: string) => {
    if (confirm('Are you sure you want to delete this tag?')) {
      deleteTagMutation.mutate(tagId);
    }
  };

  return (
    <WaterSystemLayout
      title="Tag Dashboard"
      subtitle="Real-time monitoring of all configured PLC tags">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cyan-300">Tag Dashboard</h1>
            <p className="!text-white mt-1" style={{ color: 'white !important' }}>Real-time monitoring of all configured PLC tags</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Tag
                </Button>
              </DialogTrigger>
              <TagFormDialog 
                plcConfigs={plcConfigs}
                onClose={() => setIsAddDialogOpen(false)}
                editingTag={editingTag}
                onClearEdit={() => setEditingTag(null)}
                createTagMutation={createTagMutation}
                updateTagMutation={updateTagMutation}
              />
            </Dialog>
            
            <Button
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
        
        {/* Statistics */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="bg-slate-900/50 border-cyan-500/30 hover:border-cyan-400/50 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Tags</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <Database className="h-10 w-10 text-cyan-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-cyan-500/30 hover:border-cyan-400/50 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Active Tags</p>
                  <p className="text-2xl font-bold text-cyan-300">{stats.active}</p>
                </div>
                <Activity className="h-10 w-10 text-cyan-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-green-500/30 hover:border-green-400/50 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Good Quality</p>
                  <p className="text-2xl font-bold text-green-400">{stats.good}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-red-500/30 hover:border-red-400/50 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Bad Quality</p>
                  <p className="text-2xl font-bold text-red-400">{stats.bad}</p>
                </div>
                <XCircle className="h-10 w-10 text-red-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-yellow-500/30 hover:border-yellow-400/50 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Uncertain</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.uncertain}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-yellow-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <Card className="bg-slate-900/50 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-300 flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search tags by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px] bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="BOOL">Boolean</SelectItem>
                  <SelectItem value="INT">Integer</SelectItem>
                  <SelectItem value="REAL">Real</SelectItem>
                  <SelectItem value="STRING">String</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterQuality} onValueChange={setFilterQuality}>
                <SelectTrigger className="w-[180px] bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Filter by quality" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="all">All Quality</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="bad">Bad</SelectItem>
                  <SelectItem value="uncertain">Uncertain</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Tag List */}
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-12 w-12 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading tags...</p>
          </div>
        ) : filteredTags.length === 0 ? (
          <Alert className="bg-slate-800 border-slate-600">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-slate-300">
              {tags.length === 0 ? 
                "No tags configured. Add tags in the PLC Configuration page." :
                "No tags match your filter criteria."
              }
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTags).map(([plcId, { plc, tags }]) => (
              <Card 
                key={plcId}
                className="bg-slate-900/50 border-cyan-500/30"
              >
                <Collapsible 
                  open={expandedPLCs.has(plcId)} 
                  onOpenChange={() => togglePLCExpanded(plcId)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-slate-700/20 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Server className="h-6 w-6 text-cyan-400" />
                          <div>
                            <CardTitle className="text-xl text-cyan-300">
                              {plc.name}
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                              {plc.brand} • {tags.length} tag{tags.length !== 1 ? 's' : ''} • 
                              {tags.filter(t => t.isEnabled).length} active
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-1">
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <span className="text-xs text-slate-400">{tags.filter(t => t.quality === 'good').length}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                              <span className="text-xs text-slate-400">{tags.filter(t => t.quality === 'bad').length}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                              <span className="text-xs text-slate-400">{tags.filter(t => t.quality === 'uncertain').length}</span>
                            </div>
                          </div>
                          {expandedPLCs.has(plcId) ? 
                            <ChevronDown className="h-5 w-5 text-slate-400" /> : 
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                          }
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {tags.map(tag => (
                          <Card 
                            key={tag.id} 
                            className="bg-slate-900/50 border-slate-700/50 hover:border-cyan-400/30 transition-all"
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg text-cyan-300 flex items-center">
                                    <Tag className="h-5 w-5 mr-2" />
                                    {tag.tagName}
                                  </CardTitle>
                                  {tag.description && (
                                    <CardDescription className="text-slate-400 text-sm mt-1">
                                      {tag.description}
                                    </CardDescription>
                                  )}
                                </div>
                                {getQualityBadge(tag.quality)}
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {/* Value Display */}
                                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <p className="text-xs text-slate-400 mb-1">Current Value</p>
                                      <p className="text-2xl font-bold text-white">
                                        {formatValue(tag.lastValue, tag.dataType, tag.unit)}
                                      </p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      {getTrendIcon(tag.trend)}
                                      <Gauge className="h-8 w-8 text-cyan-400 opacity-30 mt-2" />
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Tag Details */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-slate-500">Address:</span>
                                    <span className="text-slate-300 ml-1 font-mono">{tag.address}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Type:</span>
                                    <span className="text-slate-300 ml-1">{tag.dataType}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Access:</span>
                                    <span className="text-slate-300 ml-1">{tag.accessType}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Status:</span>
                                    <span className={`ml-1 ${tag.isEnabled ? 'text-green-400' : 'text-red-400'}`}>
                                      {tag.isEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Last Update */}
                                {tag.lastReadTime && (
                                  <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
                                    Last updated: {new Date(tag.lastReadTime).toLocaleTimeString()}
                                  </div>
                                )}
                                
                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-3 border-t border-slate-700">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                                    onClick={() => handleEditTag(tag)}
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/20"
                                    onClick={() => handleDeleteTag(tag.id)}
                                    disabled={deleteTagMutation.isPending}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
      </div>
    </WaterSystemLayout>
  );
}

// Tag Form Dialog Component
interface TagFormDialogProps {
  plcConfigs: any[];
  onClose: () => void;
  editingTag: TagData | null;
  onClearEdit: () => void;
  createTagMutation: any;
  updateTagMutation: any;
}

function TagFormDialog({ plcConfigs, onClose, editingTag, onClearEdit, createTagMutation, updateTagMutation }: TagFormDialogProps) {
  const [selectedPlcId, setSelectedPlcId] = useState<string>('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<'success' | 'error' | null>(null);
  
  const form = useForm<TagFormData>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: editingTag ? {
      tagName: editingTag.tagName,
      plcId: editingTag.plcId,
      address: editingTag.address,
      dataType: editingTag.dataType as any,
      accessType: editingTag.accessType as any,
      unit: editingTag.unit || '',
      description: editingTag.description || '',
      isEnabled: editingTag.isEnabled,
    } : {
      tagName: '',
      plcId: '',
      address: '',
      dataType: 'INT',
      accessType: 'read',
      unit: '',
      description: '',
      isEnabled: true,
    },
  });

  // Get selected PLC details
  const selectedPlc = plcConfigs.find(plc => plc.id === (selectedPlcId || form.getValues('plcId')));
  
  // Get address format hint based on PLC brand
  const getAddressFormatHint = () => {
    if (!selectedPlc) return 'Select a PLC first';
    
    const brand = selectedPlc.brand?.toLowerCase();
    
    if (brand?.includes('siemens')) {
      return 'Format: DB100.DBD0, M10.0, I0.0, Q0.0';
    } else if (brand?.includes('allen') || brand?.includes('bradley') || brand?.includes('rockwell')) {
      return 'Format: N7:10, B3:0/1, F8:20';
    } else if (brand?.includes('mitsubishi')) {
      return 'Format: D100, M100, X0, Y0';
    } else if (brand?.includes('omron')) {
      return 'Format: DM100, CIO100.00, W100';
    } else if (brand?.includes('schneider') || brand?.includes('modicon')) {
      return 'Format: %MW100, %M100, %I0.0';
    } else {
      return 'Enter PLC address based on manufacturer format';
    }
  };

  // Test connection function (simulated in demo mode)
  const testConnection = async () => {
    if (!selectedPlc || !form.getValues('address')) {
      return;
    }
    
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    
    // Simulate connection test
    setTimeout(() => {
      // Simulate success for valid address patterns
      const address = form.getValues('address');
      const isValid = address && address.length > 0;
      setConnectionTestResult(isValid ? 'success' : 'error');
      setIsTestingConnection(false);
      
      setTimeout(() => {
        setConnectionTestResult(null);
      }, 3000);
    }, 1500);
  };

  const onSubmit = (data: TagFormData) => {
    if (editingTag) {
      updateTagMutation.mutate({
        tagId: editingTag.id,
        tagData: data,
      });
    } else {
      const { plcId, ...tagData } = data;
      createTagMutation.mutate({ plcId, tagData });
    }
  };

  const handleClose = () => {
    onClose();
    onClearEdit();
    form.reset();
  };

  return (
    <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-700">
      <DialogHeader>
        <DialogTitle className="text-cyan-300">
          {editingTag ? 'Edit Tag' : 'Add New Tag'}
        </DialogTitle>
        <DialogDescription className="text-slate-400">
          {editingTag ? 'Update the tag configuration.' : 'Configure a new PLC tag for monitoring.'}
        </DialogDescription>
      </DialogHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tagName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Tag Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="bg-slate-800 border-slate-600 text-white"
                      placeholder="e.g., Temperature_01" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="plcId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">PLC</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedPlcId(value);
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue placeholder="Select PLC" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-slate-800 border-slate-600 text-white">
                      {plcConfigs && plcConfigs.length > 0 ? (
                        plcConfigs.map((plc) => (
                          <SelectItem 
                            key={plc.id} 
                            value={plc.id.toString()} 
                            className="text-white hover:bg-slate-700"
                          >
                            {plc.name} ({plc.brand})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled className="text-slate-400">
                          No PLCs available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">PLC Address</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-slate-800 border-slate-600 text-white flex-1"
                          placeholder={getAddressFormatHint()} 
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={testConnection}
                        disabled={!selectedPlc || !field.value || isTestingConnection}
                        className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/30"
                      >
                        {isTestingConnection ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Test
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400">{getAddressFormatHint()}</p>
                    {connectionTestResult === 'success' && (
                      <p className="text-xs text-green-400 flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connection successful
                      </p>
                    )}
                    {connectionTestResult === 'error' && (
                      <p className="text-xs text-red-400 flex items-center">
                        <XCircle className="h-3 w-3 mr-1" />
                        Connection failed - check address format
                      </p>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Unit (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="bg-slate-800 border-slate-600 text-white"
                      placeholder="e.g., °C, bar, %" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dataType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Data Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="BOOL">Boolean</SelectItem>
                      <SelectItem value="INT">Integer</SelectItem>
                      <SelectItem value="REAL">Real/Float</SelectItem>
                      <SelectItem value="STRING">String</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accessType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Access Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue placeholder="Select access" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="read">Read Only</SelectItem>
                      <SelectItem value="write">Write Only</SelectItem>
                      <SelectItem value="read-write">Read/Write</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-300">Description (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    className="bg-slate-800 border-slate-600 text-white"
                    placeholder="Describe what this tag monitors..." 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-slate-300">Enable Tag</FormLabel>
                  <FormDescription className="text-slate-500">
                    Enable data collection for this tag
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="border-slate-600 text-slate-400"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-cyan-600 hover:bg-cyan-700"
              disabled={createTagMutation.isPending || updateTagMutation.isPending}
            >
              {createTagMutation.isPending || updateTagMutation.isPending ? 'Saving...' : 
               editingTag ? 'Update Tag' : 'Create Tag'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}