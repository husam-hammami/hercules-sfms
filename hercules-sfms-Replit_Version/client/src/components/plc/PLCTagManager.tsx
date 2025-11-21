import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useDemo } from '@/contexts/DemoContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Tag, Plus, Edit2, Trash2, Activity, Database, AlertTriangle, 
  CheckCircle2, XCircle, Loader2, Gauge, TrendingUp, Clock,
  Wifi, WifiOff, Info, Settings, BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PLCTag {
  id: string;
  plcId: string;
  tagName: string;
  address: string;
  dataType: string;
  unit?: string;
  description?: string;
  scaleFactor: number;
  offset: number;
  minValue?: number;
  maxValue?: number;
  alarmLow?: number;
  alarmHigh?: number;
  isActive: boolean;
  readInterval: number;
  lastValue?: number;
  lastReadTime?: Date;
  quality?: string;
}

interface PLCTagManagerProps {
  plcId: string;
  plcName: string;
  facilityId: string;
  plcType?: string;
  plcBrand?: string;
  plcModel?: string;
  isGatewayConnected?: boolean;
}

// PLC address format hints based on type
const PLC_ADDRESS_FORMATS: Record<string, { format: string; examples: string; validation?: RegExp }> = {
  siemens_s7: {
    format: 'DB[num].DB[X/B/W/D][offset].[bit]',
    examples: 'DB100.DBD0, DB1.DBW10, DB2.DBX0.0, M0.0, I0.0, Q0.1',
    validation: /^(DB\d+\.DB[XBWD]\d+(\.\d+)?|[MIQ]\d+\.\d+)$/
  },
  siemens: {
    format: 'DB[num].DB[X/B/W/D][offset].[bit]',
    examples: 'DB100.DBD0, DB1.DBW10, DB2.DBX0.0, M0.0',
    validation: /^(DB\d+\.DB[XBWD]\d+(\.\d+)?|[MIQ]\d+\.\d+)$/
  },
  allen_bradley: {
    format: 'Tag_Name or File:Element',
    examples: 'N7:10, F8:5, B3:0/1, Tank_Level, Pump_Speed',
    validation: /^([A-Z]\d+:\d+(\/\d+)?|[A-Za-z_][A-Za-z0-9_]*)$/
  },
  schneider: {
    format: '%M[type][address]',
    examples: '%MW100, %MD200, %MX300.5, %M100',
    validation: /^%M[XBWD]?\d+(\.\d+)?$/
  },
  mitsubishi: {
    format: '[Device][Number]',
    examples: 'D100, D200, M0, X0, Y0',
    validation: /^[DMXYSR]\d+$/
  },
  omron: {
    format: '[Area][Address]',
    examples: 'D100, CIO200, W300, H100',
    validation: /^(D|CIO|W|H|A|T|C)\d+$/
  },
  default: {
    format: 'Enter PLC address',
    examples: 'Consult PLC documentation',
  }
};

export function PLCTagManager({ plcId, plcName, facilityId, plcType, plcBrand, plcModel, isGatewayConnected = false }: PLCTagManagerProps) {
  const { isDemoMode } = useDemo();
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<PLCTag | null>(null);
  const [formData, setFormData] = useState({
    tagName: '',
    address: '',
    dataType: 'float',
    unit: '',
    description: '',
    scaleFactor: 1,
    offset: 0,
    minValue: undefined as number | undefined,
    maxValue: undefined as number | undefined,
    alarmLow: undefined as number | undefined,
    alarmHigh: undefined as number | undefined,
    readInterval: 1000,
    isActive: true,
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch tags for this PLC
  const { data: tags = [], isLoading } = useQuery({
    queryKey: [`/api/plc-configurations/${plcId}/tags`],
    queryFn: isDemoMode ? async () => [] : undefined,
    enabled: !!plcId,
  });

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (isDemoMode) {
        // In demo mode, return mock data
        return { id: Date.now().toString(), ...data, plcId };
      }
      const response = await apiRequest('POST', `/api/plc-configurations/${plcId}/tags`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/plc-configurations/${plcId}/tags`] });
      queryClient.invalidateQueries({ queryKey: ['/api/plc-tags'] }); // Update global tags list
      setShowTagDialog(false);
      resetForm();
      toast({
        title: 'Tag Created',
        description: 'PLC tag has been created successfully',
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

  // Update tag mutation
  const updateTagMutation = useMutation({
    mutationFn: async (data: { id: string; updates: typeof formData }) => {
      if (isDemoMode) {
        // In demo mode, return updated data
        return { ...data.updates, id: data.id };
      }
      const response = await apiRequest('PUT', `/api/plc-tags/${data.id}`, data.updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/plc-configurations/${plcId}/tags`] });
      queryClient.invalidateQueries({ queryKey: ['/api/plc-tags'] });
      setShowTagDialog(false);
      setEditingTag(null);
      resetForm();
      toast({
        title: 'Tag Updated',
        description: 'PLC tag has been updated successfully',
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

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      if (isDemoMode) {
        // In demo mode, just return success
        return { success: true };
      }
      const response = await apiRequest('DELETE', `/api/plc-tags/${tagId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/plc-configurations/${plcId}/tags`] });
      queryClient.invalidateQueries({ queryKey: ['/api/plc-tags'] });
      toast({
        title: 'Tag Deleted',
        description: 'PLC tag has been deleted successfully',
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

  const resetForm = () => {
    setFormData({
      tagName: '',
      address: '',
      dataType: 'float',
      unit: '',
      description: '',
      scaleFactor: 1,
      offset: 0,
      minValue: undefined,
      maxValue: undefined,
      alarmLow: undefined,
      alarmHigh: undefined,
      readInterval: 1000,
      isActive: true,
    });
  };

  const handleEdit = (tag: PLCTag) => {
    setEditingTag(tag);
    setFormData({
      tagName: tag.tagName,
      address: tag.address,
      dataType: tag.dataType,
      unit: tag.unit || '',
      description: tag.description || '',
      scaleFactor: tag.scaleFactor,
      offset: tag.offset,
      minValue: tag.minValue,
      maxValue: tag.maxValue,
      alarmLow: tag.alarmLow,
      alarmHigh: tag.alarmHigh,
      readInterval: tag.readInterval,
      isActive: tag.isActive,
    });
    setShowTagDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTag) {
      updateTagMutation.mutate({ id: editingTag.id, updates: formData });
    } else {
      createTagMutation.mutate(formData);
    }
  };

  const getQualityBadge = (quality?: string) => {
    switch (quality) {
      case 'good':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500">Good</Badge>;
      case 'bad':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500">Bad</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500">Uncertain</Badge>;
    }
  };

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType) {
      case 'bool':
        return <Activity className="h-4 w-4 text-green-400" />;
      case 'float':
      case 'real':
        return <TrendingUp className="h-4 w-4 text-blue-400" />;
      case 'int':
      case 'int16':
      case 'int32':
        return <Database className="h-4 w-4 text-cyan-400" />;
      default:
        return <Tag className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="bg-slate-900/80 border-cyan-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Tag className="h-5 w-5 text-cyan-400" />
            <div>
              <CardTitle className="text-cyan-300">PLC Tags Configuration</CardTitle>
              <p className="text-sm text-slate-400 mt-1">
                Configure data points for {plcName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {isGatewayConnected ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500">
                <Wifi className="h-3 w-3 mr-1" />
                Gateway Connected
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-400 border-red-500">
                <WifiOff className="h-3 w-3 mr-1" />
                Gateway Offline
              </Badge>
            )}
            
            <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    setEditingTag(null);
                    resetForm();
                  }}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tag
                </Button>
              </DialogTrigger>
              
              <DialogContent className="bg-slate-900 border-cyan-500/30 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-cyan-300">
                    {editingTag ? 'Edit PLC Tag' : 'Add New PLC Tag'}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <Tabs defaultValue="basic" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                      <TabsTrigger value="basic">Basic</TabsTrigger>
                      <TabsTrigger value="scaling">Scaling</TabsTrigger>
                      <TabsTrigger value="alarms">Alarms</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tagName" className="text-cyan-300">Tag Name</Label>
                          <Input
                            id="tagName"
                            value={formData.tagName}
                            onChange={(e) => setFormData({ ...formData, tagName: e.target.value })}
                            placeholder="Tank_Level_1"
                            className="bg-slate-800 border-cyan-500/30 text-white"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="address" className="text-cyan-300">Memory Address</Label>
                          <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => {
                              const value = e.target.value;
                              setFormData({ ...formData, address: value });
                              
                              // Validate address format if PLC type is known
                              const formatInfo = PLC_ADDRESS_FORMATS[plcType || plcBrand || 'default'];
                              if (formatInfo?.validation && value) {
                                if (!formatInfo.validation.test(value)) {
                                  // Address doesn't match expected format
                                  e.target.setCustomValidity(`Invalid address format for ${plcBrand || plcType}`);
                                } else {
                                  e.target.setCustomValidity('');
                                }
                              }
                            }}
                            placeholder={PLC_ADDRESS_FORMATS[plcType || plcBrand || 'default']?.examples?.split(', ')[0] || "DB100.DBD0"}
                            className="bg-slate-800 border-cyan-500/30 text-white font-mono"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dataType" className="text-cyan-300">Data Type</Label>
                          <Select 
                            value={formData.dataType} 
                            onValueChange={(value) => setFormData({ ...formData, dataType: value })}
                          >
                            <SelectTrigger className="bg-slate-800 border-cyan-500/30 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-cyan-500/30">
                              <SelectItem value="bool">Boolean</SelectItem>
                              <SelectItem value="int16">Int16</SelectItem>
                              <SelectItem value="int32">Int32</SelectItem>
                              <SelectItem value="float">Float/Real</SelectItem>
                              <SelectItem value="string">String</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="unit" className="text-cyan-300">Unit</Label>
                          <Input
                            id="unit"
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                            placeholder="°C, PSI, L/s, etc."
                            className="bg-slate-800 border-cyan-500/30 text-white"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-cyan-300">Description</Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Main tank level sensor"
                          className="bg-slate-800 border-cyan-500/30 text-white"
                        />
                      </div>
                      
                      {/* Address Format Helper */}
                      {(plcType || plcBrand) && (
                        <Alert className="border-cyan-500/30 bg-cyan-500/10">
                          <Info className="h-4 w-4 text-cyan-400" />
                          <AlertDescription className="text-white">
                            <div className="space-y-1">
                              <div>
                                <span className="text-cyan-300 font-semibold">
                                  Address Format for {plcBrand || plcType || 'PLC'}:
                                </span>
                              </div>
                              <div className="font-mono text-sm">
                                {PLC_ADDRESS_FORMATS[plcType || plcBrand || 'default']?.format || PLC_ADDRESS_FORMATS.default.format}
                              </div>
                              <div className="text-sm">
                                <span className="text-slate-400">Examples: </span>
                                <span className="text-cyan-200 font-mono">
                                  {PLC_ADDRESS_FORMATS[plcType || plcBrand || 'default']?.examples || PLC_ADDRESS_FORMATS.default.examples}
                                </span>
                              </div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="readInterval" className="text-cyan-300">
                            Read Interval (ms)
                          </Label>
                          <Input
                            id="readInterval"
                            type="number"
                            value={formData.readInterval}
                            onChange={(e) => setFormData({ ...formData, readInterval: parseInt(e.target.value) })}
                            className="bg-slate-800 border-cyan-500/30 text-white"
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-8">
                          <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="isActive" className="text-cyan-300 cursor-pointer">
                            Active (Enable reading)
                          </Label>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="scaling" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="scaleFactor" className="text-cyan-300">Scale Factor</Label>
                          <Input
                            id="scaleFactor"
                            type="number"
                            step="0.01"
                            value={formData.scaleFactor}
                            onChange={(e) => setFormData({ ...formData, scaleFactor: parseFloat(e.target.value) })}
                            className="bg-slate-800 border-cyan-500/30 text-white"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="offset" className="text-cyan-300">Offset</Label>
                          <Input
                            id="offset"
                            type="number"
                            step="0.01"
                            value={formData.offset}
                            onChange={(e) => setFormData({ ...formData, offset: parseFloat(e.target.value) })}
                            className="bg-slate-800 border-cyan-500/30 text-white"
                          />
                        </div>
                      </div>
                      
                      <Alert className="border-cyan-500/30 bg-cyan-500/10">
                        <Info className="h-4 w-4 text-cyan-400" />
                        <AlertDescription className="text-white">
                          Final Value = (Raw Value × Scale Factor) + Offset
                        </AlertDescription>
                      </Alert>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="minValue" className="text-cyan-300">Min Value</Label>
                          <Input
                            id="minValue"
                            type="number"
                            step="0.01"
                            value={formData.minValue || ''}
                            onChange={(e) => setFormData({ ...formData, minValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder="Optional"
                            className="bg-slate-800 border-cyan-500/30 text-white"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="maxValue" className="text-cyan-300">Max Value</Label>
                          <Input
                            id="maxValue"
                            type="number"
                            step="0.01"
                            value={formData.maxValue || ''}
                            onChange={(e) => setFormData({ ...formData, maxValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder="Optional"
                            className="bg-slate-800 border-cyan-500/30 text-white"
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="alarms" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="alarmLow" className="text-cyan-300">Low Alarm Threshold</Label>
                          <Input
                            id="alarmLow"
                            type="number"
                            step="0.01"
                            value={formData.alarmLow || ''}
                            onChange={(e) => setFormData({ ...formData, alarmLow: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder="Optional"
                            className="bg-slate-800 border-cyan-500/30 text-white"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="alarmHigh" className="text-cyan-300">High Alarm Threshold</Label>
                          <Input
                            id="alarmHigh"
                            type="number"
                            step="0.01"
                            value={formData.alarmHigh || ''}
                            onChange={(e) => setFormData({ ...formData, alarmHigh: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder="Optional"
                            className="bg-slate-800 border-cyan-500/30 text-white"
                          />
                        </div>
                      </div>
                      
                      <Alert className="border-yellow-500/30 bg-yellow-500/10">
                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                        <AlertDescription className="text-white">
                          Alarms will trigger notifications when values exceed these thresholds
                        </AlertDescription>
                      </Alert>
                    </TabsContent>
                  </Tabs>
                  
                  <div className="flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowTagDialog(false);
                        setEditingTag(null);
                        resetForm();
                      }}
                      className="border-cyan-500 text-cyan-400"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createTagMutation.isPending || updateTagMutation.isPending}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600"
                    >
                      {createTagMutation.isPending || updateTagMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : editingTag ? (
                        'Update Tag'
                      ) : (
                        'Create Tag'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
          </div>
        ) : tags.length === 0 ? (
          <Alert className="border-cyan-500/30 bg-cyan-500/10">
            <Info className="h-4 w-4 text-cyan-400" />
            <AlertDescription className="text-white">
              No tags configured yet. Click "Add Tag" to create your first PLC data point.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-cyan-500/30">
                  <TableHead className="text-cyan-300">Tag Name</TableHead>
                  <TableHead className="text-cyan-300">Address</TableHead>
                  <TableHead className="text-cyan-300">Type</TableHead>
                  <TableHead className="text-cyan-300">Unit</TableHead>
                  <TableHead className="text-cyan-300">Last Value</TableHead>
                  <TableHead className="text-cyan-300">Quality</TableHead>
                  <TableHead className="text-cyan-300">Status</TableHead>
                  <TableHead className="text-cyan-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag: PLCTag) => (
                  <TableRow key={tag.id} className="border-cyan-500/20">
                    <TableCell className="text-white font-mono">{tag.tagName}</TableCell>
                    <TableCell className="text-slate-400 font-mono text-sm">{tag.address}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getDataTypeIcon(tag.dataType)}
                        <span className="text-slate-400">{tag.dataType}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400">{tag.unit || '-'}</TableCell>
                    <TableCell className="text-white">
                      {tag.lastValue !== undefined ? (
                        <span className="font-mono">{tag.lastValue} {tag.unit}</span>
                      ) : (
                        <span className="text-slate-500">No data</span>
                      )}
                    </TableCell>
                    <TableCell>{getQualityBadge(tag.quality)}</TableCell>
                    <TableCell>
                      {tag.isActive ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(tag)}
                          className="text-cyan-400 hover:text-cyan-300"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this tag?')) {
                              deleteTagMutation.mutate(tag.id);
                            }
                          }}
                          className="text-red-400 hover:text-red-300"
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
        
        {tags.length > 0 && (
          <div className="mt-6 pt-6 border-t border-cyan-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm text-slate-400">
                    Total Tags: <span className="text-white font-bold">{tags.length}</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-slate-400">
                    Active: <span className="text-white font-bold">{tags.filter((t: PLCTag) => t.isActive).length}</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-slate-400">
                    Avg Interval: <span className="text-white font-bold">1000ms</span>
                  </span>
                </div>
              </div>
              
              <Button
                variant="outline"
                className="border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-white"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View in Dashboard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}