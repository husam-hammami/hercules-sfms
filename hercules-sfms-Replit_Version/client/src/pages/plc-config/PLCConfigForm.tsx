import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Info, TestTube, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Schema for PLC configuration form
const plcConfigFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  protocol: z.enum(['modbus-tcp', 'ethernet-ip', 's7', 'opc-ua']),
  ipAddress: z.string().ip('Invalid IP address'),
  port: z.number().int().min(1).max(65535),
  rackNumber: z.number().int().optional(),
  slotNumber: z.number().int().optional(),
  unitId: z.number().int().optional(),
});

export type PlcConfigFormData = z.infer<typeof plcConfigFormSchema>;

interface PlcBrandConfig {
  name: string;
  models: string[];
  defaultProtocol: PlcConfigFormData['protocol'];
  defaultPort: number;
  requiresRackSlot?: boolean;
  requiresUnitId?: boolean;
}

interface PlcConfigFormProps {
  onSubmit: (data: PlcConfigFormData) => void;
  defaultValues?: Partial<PlcConfigFormData>;
  isLoading?: boolean;
}

// PLC models and their default settings
const PLC_BRANDS: Record<string, PlcBrandConfig> = {
  siemens: {
    name: 'Siemens',
    models: ['S7-1200', 'S7-1500', 'S7-300', 'S7-400'],
    defaultProtocol: 's7',
    defaultPort: 102,
    requiresRackSlot: true,
  },
  'allen-bradley': {
    name: 'Allen-Bradley',
    models: ['ControlLogix', 'CompactLogix', 'MicroLogix', 'PLC-5'],
    defaultProtocol: 'ethernet-ip',
    defaultPort: 44818,
    requiresRackSlot: false,
  },
  schneider: {
    name: 'Schneider Electric',
    models: ['Modicon M580', 'Modicon M340', 'Modicon M221'],
    defaultProtocol: 'modbus-tcp',
    defaultPort: 502,
    requiresUnitId: true,
  },
  mitsubishi: {
    name: 'Mitsubishi',
    models: ['FX Series', 'Q Series', 'iQ-R Series'],
    defaultProtocol: 'modbus-tcp',
    defaultPort: 5007,
    requiresUnitId: true,
  },
  omron: {
    name: 'Omron',
    models: ['CP1E', 'CJ2M', 'NX Series'],
    defaultProtocol: 'modbus-tcp',
    defaultPort: 9600,
    requiresUnitId: true,
  },
} as const;

const PROTOCOLS = {
  'modbus-tcp': { name: 'Modbus TCP', port: 502 },
  's7': { name: 'Siemens S7', port: 102 },
  'ethernet-ip': { name: 'Ethernet/IP', port: 44818 },
  'opc-ua': { name: 'OPC UA', port: 4840 },
};

export function PlcConfigForm({ onSubmit, defaultValues, isLoading }: PlcConfigFormProps) {
  const [selectedBrand, setSelectedBrand] = useState<string>(defaultValues?.brand || '');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  const form = useForm<PlcConfigFormData>({
    resolver: zodResolver(plcConfigFormSchema),
    defaultValues: {
      name: '',
      brand: '',
      model: '',
      protocol: 'modbus-tcp',
      ipAddress: '',
      port: 502,
      rackNumber: 0,
      slotNumber: 1,
      unitId: 1,
      ...defaultValues,
    },
  });

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    form.setValue('brand', brand);
    
    const brandConfig = PLC_BRANDS[brand as keyof typeof PLC_BRANDS];
    if (brandConfig) {
      form.setValue('protocol', brandConfig.defaultProtocol as any);
      form.setValue('port', brandConfig.defaultPort);
      form.setValue('model', brandConfig.models[0]);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Random success/failure for demo
    const success = Math.random() > 0.3;
    setTestStatus(success ? 'success' : 'failed');
    
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  const brandConfig = selectedBrand ? PLC_BRANDS[selectedBrand as keyof typeof PLC_BRANDS] : null;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-cyan-300">Configuration Name</Label>
          <Input
            id="name"
            placeholder="Main Production PLC"
            className="bg-slate-800 border-cyan-500/30 text-white"
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="text-red-400 text-sm">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand" className="text-cyan-300 flex items-center">
            PLC Brand
            <Info className="h-4 w-4 ml-2 text-slate-400" />
          </Label>
          <Select value={selectedBrand} onValueChange={handleBrandChange}>
            <SelectTrigger className="bg-slate-800 border-cyan-500/30 text-white">
              <SelectValue placeholder="Select PLC brand" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-cyan-500/30">
              {Object.entries(PLC_BRANDS).map(([key, config]) => (
                <SelectItem key={key} value={key} className="text-white hover:bg-cyan-600/20">
                  {config.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {brandConfig && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="model" className="text-cyan-300">PLC Model</Label>
            <Select value={form.watch('model')} onValueChange={(value) => form.setValue('model', value)}>
              <SelectTrigger className="bg-slate-800 border-cyan-500/30 text-white">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-cyan-500/30">
                {brandConfig.models.map((model) => (
                  <SelectItem key={model} value={model} className="text-white hover:bg-cyan-600/20">
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="protocol" className="text-cyan-300">Communication Protocol</Label>
            <Select value={form.watch('protocol')} onValueChange={(value: any) => form.setValue('protocol', value)}>
              <SelectTrigger className="bg-slate-800 border-cyan-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-cyan-500/30">
                {Object.entries(PROTOCOLS).map(([key, config]) => (
                  <SelectItem key={key} value={key} className="text-white hover:bg-cyan-600/20">
                    {config.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ipAddress" className="text-cyan-300">IP Address</Label>
          <Input
            id="ipAddress"
            placeholder="192.168.1.100"
            className="bg-slate-800 border-cyan-500/30 text-white"
            {...form.register('ipAddress')}
          />
          {form.formState.errors.ipAddress && (
            <p className="text-red-400 text-sm">{form.formState.errors.ipAddress.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="port" className="text-cyan-300">Port</Label>
          <Input
            id="port"
            type="number"
            className="bg-slate-800 border-cyan-500/30 text-white"
            {...form.register('port', { valueAsNumber: true })}
          />
        </div>
      </div>

      {brandConfig?.requiresRackSlot && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rackNumber" className="text-cyan-300">Rack Number</Label>
            <Input
              id="rackNumber"
              type="number"
              className="bg-slate-800 border-cyan-500/30 text-white"
              {...form.register('rackNumber', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slotNumber" className="text-cyan-300">Slot Number</Label>
            <Input
              id="slotNumber"
              type="number"
              className="bg-slate-800 border-cyan-500/30 text-white"
              {...form.register('slotNumber', { valueAsNumber: true })}
            />
          </div>
        </div>
      )}

      {brandConfig?.requiresUnitId && (
        <div className="space-y-2">
          <Label htmlFor="unitId" className="text-cyan-300">Unit ID</Label>
          <Input
            id="unitId"
            type="number"
            placeholder="1"
            className="bg-slate-800 border-cyan-500/30 text-white"
            {...form.register('unitId', { valueAsNumber: true })}
          />
        </div>
      )}

      {testStatus !== 'idle' && (
        <Alert className={`
          ${testStatus === 'testing' ? 'border-blue-500 bg-blue-500/10' : ''}
          ${testStatus === 'success' ? 'border-green-500 bg-green-500/10' : ''}
          ${testStatus === 'failed' ? 'border-red-500 bg-red-500/10' : ''}
        `}>
          {testStatus === 'testing' && <TestTube className="h-4 w-4 text-blue-400 animate-pulse" />}
          {testStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-green-400" />}
          {testStatus === 'failed' && <AlertTriangle className="h-4 w-4 text-red-400" />}
          <AlertDescription className="text-white">
            {testStatus === 'testing' && 'Testing connection to PLC...'}
            {testStatus === 'success' && 'Connection successful! PLC is reachable.'}
            {testStatus === 'failed' && 'Connection failed. Please check IP address and network settings.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleTestConnection}
          disabled={!form.watch('ipAddress') || testStatus === 'testing'}
          className="border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-white"
        >
          <TestTube className="h-4 w-4 mr-2" />
          {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
        </Button>

        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
        >
          {isLoading ? 'Creating...' : 'Create Configuration'}
        </Button>
      </div>
    </form>
  );
}