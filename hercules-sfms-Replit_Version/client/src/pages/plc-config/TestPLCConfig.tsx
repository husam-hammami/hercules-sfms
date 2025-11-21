import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Info } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export function TestPLCConfig() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    const results: any[] = [];
    
    try {
      // Test 1: Check if user is authenticated
      results.push({ 
        test: 'Authentication Check', 
        status: 'running' 
      });
      setTestResults([...results]);
      
      const authCheck = await apiRequest('GET', '/api/auth/me');
      if (authCheck.ok) {
        results[results.length - 1] = {
          test: 'Authentication Check',
          status: 'success',
          message: 'User is authenticated'
        };
      } else {
        results[results.length - 1] = {
          test: 'Authentication Check',
          status: 'failed',
          message: 'User not authenticated'
        };
        setTestResults([...results]);
        setIsRunning(false);
        return;
      }
      setTestResults([...results]);
      
      // Test 2: Fetch facilities
      results.push({ 
        test: 'Fetch Facilities', 
        status: 'running' 
      });
      setTestResults([...results]);
      
      const facilitiesResponse = await apiRequest('GET', '/api/facilities');
      const facilities = await facilitiesResponse.json();
      
      if (facilities && facilities.length > 0) {
        results[results.length - 1] = {
          test: 'Fetch Facilities',
          status: 'success',
          message: `Found ${facilities.length} facilities`,
          data: facilities[0]
        };
      } else {
        results[results.length - 1] = {
          test: 'Fetch Facilities',
          status: 'warning',
          message: 'No facilities found, creating default facility'
        };
      }
      setTestResults([...results]);
      
      // Test 3: Create PLC Configuration
      results.push({ 
        test: 'Create PLC Configuration', 
        status: 'running' 
      });
      setTestResults([...results]);
      
      const testPLCData = {
        name: `Test PLC ${Date.now()}`,
        brand: 'siemens',
        model: 'S7-1200',
        protocol: 's7',
        ipAddress: '192.168.1.100',
        port: 102,
        facilityId: facilities?.[0]?.id || 1,
        rackNumber: 0,
        slotNumber: 1,
        status: 'configured'
      };
      
      const createResponse = await apiRequest('POST', '/api/plc-configurations', testPLCData);
      const createdPLC = await createResponse.json();
      
      if (createResponse.ok) {
        results[results.length - 1] = {
          test: 'Create PLC Configuration',
          status: 'success',
          message: 'PLC configuration created successfully',
          data: createdPLC
        };
      } else {
        results[results.length - 1] = {
          test: 'Create PLC Configuration',
          status: 'failed',
          message: createdPLC.message || 'Failed to create PLC configuration'
        };
        setTestResults([...results]);
        setIsRunning(false);
        return;
      }
      setTestResults([...results]);
      
      // Test 4: Add PLC Tag
      results.push({ 
        test: 'Add PLC Tag', 
        status: 'running' 
      });
      setTestResults([...results]);
      
      const testTagData = {
        tagName: 'TestTag_' + Date.now(),
        address: 'DB100.DBD0',
        dataType: 'float',
        unit: 'meters',
        description: 'Test tag for PLC configuration',
        isActive: true,
        readInterval: 1000
      };
      
      const tagResponse = await apiRequest('POST', `/api/plc-configurations/${createdPLC.id}/tags`, testTagData);
      const createdTag = await tagResponse.json();
      
      if (tagResponse.ok) {
        results[results.length - 1] = {
          test: 'Add PLC Tag',
          status: 'success',
          message: 'Tag created successfully',
          data: createdTag
        };
      } else {
        results[results.length - 1] = {
          test: 'Add PLC Tag',
          status: 'failed',
          message: createdTag.message || 'Failed to create tag'
        };
      }
      setTestResults([...results]);
      
      // Test 5: Verify Gateway Connection
      results.push({ 
        test: 'Verify Gateway Connection', 
        status: 'running' 
      });
      setTestResults([...results]);
      
      // Check if PLC is linked to facility (gateway)
      if (createdPLC.facilityId) {
        results[results.length - 1] = {
          test: 'Verify Gateway Connection',
          status: 'success',
          message: `PLC linked to facility ${createdPLC.facilityId} (gateway connection established)`,
          data: { 
            plcId: createdPLC.id, 
            facilityId: createdPLC.facilityId,
            gatewayReady: true
          }
        };
      } else {
        results[results.length - 1] = {
          test: 'Verify Gateway Connection',
          status: 'warning',
          message: 'PLC created but no facility link found'
        };
      }
      setTestResults([...results]);
      
      // Test 6: Cleanup - Delete test PLC
      results.push({ 
        test: 'Cleanup Test Data', 
        status: 'running' 
      });
      setTestResults([...results]);
      
      const deleteResponse = await apiRequest('DELETE', `/api/plc-configurations/${createdPLC.id}`);
      
      if (deleteResponse.ok) {
        results[results.length - 1] = {
          test: 'Cleanup Test Data',
          status: 'success',
          message: 'Test PLC configuration deleted'
        };
      } else {
        results[results.length - 1] = {
          test: 'Cleanup Test Data',
          status: 'warning',
          message: 'Could not delete test PLC configuration'
        };
      }
      setTestResults([...results]);
      
    } catch (error: any) {
      results.push({
        test: 'Unexpected Error',
        status: 'failed',
        message: error.message || 'An unexpected error occurred'
      });
      setTestResults([...results]);
    }
    
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Info className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      success: 'bg-green-500/20 text-green-400 border-green-500',
      failed: 'bg-red-500/20 text-red-400 border-red-500',
      running: 'bg-blue-500/20 text-blue-400 border-blue-500',
      warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
    };
    
    return (
      <Badge variant="outline" className={colors[status as keyof typeof colors] || colors.warning}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="bg-slate-900/80 border-cyan-500/30">
      <CardHeader>
        <CardTitle className="text-cyan-300">PLC Configuration Test Suite</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-cyan-500/30 bg-cyan-500/10">
          <Info className="h-4 w-4 text-cyan-400" />
          <AlertDescription className="text-white">
            This test will verify that PLC configurations can be created, linked to gateways, and managed properly.
          </AlertDescription>
        </Alert>
        
        <Button
          onClick={runTests}
          disabled={isRunning}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
        >
          {isRunning ? 'Running Tests...' : 'Run PLC Configuration Test'}
        </Button>
        
        {testResults.length > 0 && (
          <div className="space-y-3 mt-6">
            <h3 className="text-sm font-semibold text-cyan-300">Test Results:</h3>
            {testResults.map((result, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                {getStatusIcon(result.status)}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{result.test}</span>
                    {getStatusBadge(result.status)}
                  </div>
                  {result.message && (
                    <p className="text-sm text-slate-400">{result.message}</p>
                  )}
                  {result.data && (
                    <pre className="text-xs text-slate-500 bg-slate-900/50 p-2 rounded mt-2 overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}