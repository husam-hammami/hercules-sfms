import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

// PLC address validation patterns
const PLC_ADDRESS_VALIDATORS: Record<string, { pattern: RegExp; description: string; examples: string[] }> = {
  siemens_s7: {
    pattern: /^(DB\d+\.DB[XBWD]\d+(\.\d+)?|[MIQ]\d+\.\d+)$/,
    description: 'Siemens S7 format: DB blocks, Memory, Input/Output',
    examples: ['DB100.DBD0', 'DB1.DBW10', 'DB2.DBX0.0', 'M0.0', 'I0.0', 'Q0.1']
  },
  allen_bradley: {
    pattern: /^([A-Z]\d+:\d+(\/\d+)?|[A-Za-z_][A-Za-z0-9_]*)$/,
    description: 'Allen Bradley format: File:Element or Tag name',
    examples: ['N7:10', 'F8:5', 'B3:0/1', 'Tank_Level', 'Pump_Speed_1']
  },
  schneider: {
    pattern: /^%M[XBWD]?\d+(\.\d+)?$/,
    description: 'Schneider format: %M prefix with type and address',
    examples: ['%MW100', '%MD200', '%MX300.5', '%M100']
  },
  mitsubishi: {
    pattern: /^[DMXYSR]\d+$/,
    description: 'Mitsubishi format: Device letter + number',
    examples: ['D100', 'D200', 'M0', 'X0', 'Y0', 'R100']
  },
  omron: {
    pattern: /^(D|CIO|W|H|A|T|C)\d+$/,
    description: 'Omron format: Area prefix + address',
    examples: ['D100', 'CIO200', 'W300', 'H100', 'A50']
  }
};

export function TestAddressFormat() {
  const [selectedPLC, setSelectedPLC] = useState('siemens_s7');
  const [testAddress, setTestAddress] = useState('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);

  const validateAddress = () => {
    if (!testAddress) {
      setValidationResult({ valid: false, message: 'Please enter an address to test' });
      return;
    }

    const validator = PLC_ADDRESS_VALIDATORS[selectedPLC];
    if (!validator) {
      setValidationResult({ valid: false, message: 'Unknown PLC type' });
      return;
    }

    const isValid = validator.pattern.test(testAddress);
    setValidationResult({
      valid: isValid,
      message: isValid 
        ? `✓ Valid ${selectedPLC} address format!`
        : `✗ Invalid format. ${validator.description}`
    });
  };

  const tryExample = (example: string) => {
    setTestAddress(example);
    const validator = PLC_ADDRESS_VALIDATORS[selectedPLC];
    const isValid = validator.pattern.test(example);
    setValidationResult({
      valid: isValid,
      message: `Example "${example}" is ${isValid ? 'valid' : 'invalid'} for ${selectedPLC}`
    });
  };

  return (
    <Card className="bg-slate-900/80 border-cyan-500/30">
      <CardHeader>
        <CardTitle className="text-cyan-300">Address Format Validator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="plcType" className="text-cyan-300">Select PLC Type</Label>
          <Select value={selectedPLC} onValueChange={setSelectedPLC}>
            <SelectTrigger className="bg-slate-800 border-cyan-500/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-cyan-500/30">
              <SelectItem value="siemens_s7">Siemens S7</SelectItem>
              <SelectItem value="allen_bradley">Allen Bradley</SelectItem>
              <SelectItem value="schneider">Schneider</SelectItem>
              <SelectItem value="mitsubishi">Mitsubishi</SelectItem>
              <SelectItem value="omron">Omron</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Alert className="border-cyan-500/30 bg-cyan-500/10">
          <Info className="h-4 w-4 text-cyan-400" />
          <AlertDescription className="text-white">
            <div className="space-y-2">
              <div className="font-semibold text-cyan-300">
                {PLC_ADDRESS_VALIDATORS[selectedPLC].description}
              </div>
              <div className="space-y-1">
                <div className="text-sm text-slate-400">Valid examples (click to test):</div>
                <div className="flex flex-wrap gap-2">
                  {PLC_ADDRESS_VALIDATORS[selectedPLC].examples.map((example) => (
                    <Button
                      key={example}
                      variant="outline"
                      size="sm"
                      onClick={() => tryExample(example)}
                      className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/20 font-mono text-xs"
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="testAddress" className="text-cyan-300">Test Address</Label>
          <div className="flex space-x-2">
            <Input
              id="testAddress"
              value={testAddress}
              onChange={(e) => {
                setTestAddress(e.target.value);
                setValidationResult(null);
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  validateAddress();
                }
              }}
              placeholder={`Enter ${selectedPLC} address to validate`}
              className="bg-slate-800 border-cyan-500/30 text-white font-mono"
            />
            <Button
              onClick={validateAddress}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              Validate
            </Button>
          </div>
        </div>

        {validationResult && (
          <Alert className={validationResult.valid 
            ? "border-green-500/30 bg-green-500/10" 
            : "border-red-500/30 bg-red-500/10"
          }>
            {validationResult.valid ? (
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
            <AlertDescription className="text-white">
              {validationResult.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-4 border-t border-cyan-500/20">
          <h4 className="text-sm font-semibold text-cyan-300 mb-2">Address Format Reference</h4>
          <div className="space-y-2 text-sm">
            {Object.entries(PLC_ADDRESS_VALIDATORS).map(([key, value]) => (
              <div key={key} className="flex items-start space-x-2">
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
                  {key.replace('_', ' ').toUpperCase()}
                </Badge>
                <span className="text-slate-400 flex-1">{value.description}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}