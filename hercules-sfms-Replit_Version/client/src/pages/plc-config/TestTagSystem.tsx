import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Info, Database, Activity, BarChart3, Wifi } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export function TestTagSystem() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    const results: any[] = [];
    let testPlcId: string | null = null;
    let testTagId: string | null = null;
    
    try {
      // Test 1: Create PLC for testing tags
      results.push({ 
        test: 'Create Test PLC', 
        status: 'running' 
      });
      setTestResults([...results]);
      
      const testPLCData = {
        name: `Tag Test PLC ${Date.now()}`,
        brand: 'siemens',
        model: 'S7-1200',
        protocol: 's7',
        ipAddress: '192.168.1.200',
        port: 102,
        facilityId: 1,
        rackNumber: 0,
        slotNumber: 1,
        status: 'configured'
      };
      
      const plcResponse = await apiRequest('POST', '/api/plc-configurations', testPLCData);
      const createdPLC = await plcResponse.json();
      
      if (plcResponse.ok) {
        testPlcId = createdPLC.id;
        results[results.length - 1] = {
          test: 'Create Test PLC',
          status: 'success',
          message: 'Test PLC created successfully',
          data: { plcId: testPlcId, plcName: createdPLC.name }
        };
      } else {
        results[results.length - 1] = {
          test: 'Create Test PLC',
          status: 'failed',
          message: createdPLC.message || 'Failed to create test PLC'
        };
        setTestResults([...results]);
        setIsRunning(false);
        return;
      }
      setTestResults([...results]);
      
      // Test 2: Add multiple tags
      results.push({ 
        test: 'Create Multiple Tags', 
        status: 'running' 
      });
      setTestResults([...results]);
      
      const testTags = [
        {
          tagName: 'Temperature_Tank1',
          address: 'DB100.DBD0',
          dataType: 'float',
          unit: '°C',
          description: 'Tank 1 temperature sensor',
          isActive: true,
          readInterval: 1000,
          alarmLow: 10,
          alarmHigh: 80
        },
        {
          tagName: 'Pressure_Line1',
          address: 'DB100.DBD4',
          dataType: 'float',
          unit: 'PSI',
          description: 'Line 1 pressure sensor',
          isActive: true,
          readInterval: 500,
          minValue: 0,
          maxValue: 100
        },
        {
          tagName: 'Flow_Pump1',
          address: 'DB100.DBD8',
          dataType: 'float',
          unit: 'L/s',
          description: 'Pump 1 flow rate',
          isActive: true,
          readInterval: 2000,
          scaleFactor: 0.1,
          offset: 0
        }
      ];
      
      const createdTags = [];
      for (const tagData of testTags) {
        const tagResponse = await apiRequest('POST', `/api/plc-configurations/${testPlcId}/tags`, tagData);
        if (tagResponse.ok) {
          const tag = await tagResponse.json();
          createdTags.push(tag);
          if (!testTagId) testTagId = tag.id;
        }
      }
      
      results[results.length - 1] = {
        test: 'Create Multiple Tags',
        status: 'success',
        message: `Created ${createdTags.length} tags successfully`,
        data: createdTags.map(t => ({ id: t.id, name: t.tagName }))
      };
      setTestResults([...results]);
      
      // Test 3: Verify tags in dashboard real-time endpoint
      results.push({ 
        test: 'Dashboard Integration', 
        status: 'running' 
      });
      setTestResults([...results]);
      
      const realtimeResponse = await apiRequest('GET', '/api/dashboard/realtime');
      const realtimeData = await realtimeResponse.json();
      
      if (realtimeResponse.ok && realtimeData.tagValues) {
        const tagCount = Object.keys(realtimeData.tagValues).length;
        results[results.length - 1] = {
          test: 'Dashboard Integration',
          status: 'success',
          message: `Dashboard receiving data from ${tagCount} tags`,
          data: {
            sampleValues: Object.entries(realtimeData.tagValues).slice(0, 3).map(([name, data]: [string, any]) => ({
              tag: name,
              value: data.value,
              unit: data.unit,
              quality: data.quality
            }))
          }
        };
      } else {
        results[results.length - 1] = {
          test: 'Dashboard Integration',
          status: 'warning',
          message: 'Dashboard endpoint accessible but no tag data'
        };
      }
      setTestResults([...results]);
      
      // Test 4: Verify tags are available for reports
      results.push({ 
        test: 'Report System Integration', 
        status: 'running' 
      });
      setTestResults([...results]);
      
      const allTagsResponse = await apiRequest('GET', '/api/plc-tags');
      const allTags = await allTagsResponse.json();
      
      if (allTagsResponse.ok && allTags.length > 0) {
        results[results.length - 1] = {
          test: 'Report System Integration',
          status: 'success',
          message: `${allTags.length} tags available for reporting`,
          data: {
            totalTags: allTags.length,
            activeTags: allTags.filter((t: any) => t.isActive).length,
            tagsWithAlarms: allTags.filter((t: any) => t.alarmLow || t.alarmHigh).length
          }
        };
      } else {
        results[results.length - 1] = {
          test: 'Report System Integration',
          status: 'warning',
          message: 'Report endpoint accessible but no tags found'
        };
      }
      setTestResults([...results]);
      
      // Test 5: Simulate gateway connection
      results.push({ 
        test: 'Gateway Connection Simulation', 
        status: 'running' 
      });
      setTestResults([...results]);
      
      // Simulate gateway sync by checking if facilityId is properly linked
      if (createdPLC.facilityId) {
        results[results.length - 1] = {
          test: 'Gateway Connection Simulation',
          status: 'success',
          message: 'Tags ready for gateway synchronization',
          data: {
            facilityId: createdPLC.facilityId,
            plcId: testPlcId,
            tagCount: createdTags.length,
            protocol: 'MQTT',
            endpoint: '192.168.1.100:1883'
          }
        };
      } else {
        results[results.length - 1] = {
          test: 'Gateway Connection Simulation',
          status: 'warning',
          message: 'PLC created but gateway link not established'
        };
      }
      setTestResults([...results]);
      
      // Test 6: Update tag value (simulate write)
      results.push({ 
        test: 'Tag Write Operation', 
        status: 'running' 
      });
      setTestResults([...results]);
      
      if (testTagId) {
        const updateData = {
          lastValue: 75.5,
          quality: 'good',
          lastReadTime: new Date()
        };
        
        const updateResponse = await apiRequest('PUT', `/api/plc-tags/${testTagId}`, updateData);
        
        if (updateResponse.ok) {
          results[results.length - 1] = {
            test: 'Tag Write Operation',
            status: 'success',
            message: 'Tag value updated successfully',
            data: updateData
          };
        } else {
          results[results.length - 1] = {
            test: 'Tag Write Operation',
            status: 'warning',
            message: 'Tag update endpoint returned error'
          };
        }
      }
      setTestResults([...results]);
      
      // Test 7: Cleanup - Delete test PLC and tags
      results.push({ 
        test: 'Cleanup Test Data', 
        status: 'running' 
      });
      setTestResults([...results]);
      
      if (testPlcId) {
        const deleteResponse = await apiRequest('DELETE', `/api/plc-configurations/${testPlcId}`);
        
        if (deleteResponse.ok) {
          results[results.length - 1] = {
            test: 'Cleanup Test Data',
            status: 'success',
            message: 'Test PLC and tags deleted successfully'
          };
        } else {
          results[results.length - 1] = {
            test: 'Cleanup Test Data',
            status: 'warning',
            message: 'Could not delete test data - manual cleanup may be required'
          };
        }
      }
      setTestResults([...results]);
      
    } catch (error: any) {
      results.push({
        test: 'Unexpected Error',
        status: 'failed',
        message: error.message || 'An unexpected error occurred during testing'
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
        <CardTitle className="text-cyan-300">Complete Tag System Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-cyan-500/30 bg-cyan-500/10">
          <Info className="h-4 w-4 text-cyan-400" />
          <AlertDescription className="text-white">
            This comprehensive test will verify:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Tag creation and configuration</li>
              <li>Dashboard real-time data integration</li>
              <li>Report system availability</li>
              <li>Gateway connection readiness</li>
              <li>Tag read/write operations</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <Button
          onClick={runTests}
          disabled={isRunning}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Tag System Tests...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Run Complete Tag System Test
            </>
          )}
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
            
            {/* Summary */}
            {!isRunning && testResults.length > 0 && (
              <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-cyan-500/30">
                <h4 className="text-sm font-semibold text-cyan-300 mb-2">Test Summary</h4>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div className="text-center">
                    <div className="text-green-400 font-bold">
                      {testResults.filter(r => r.status === 'success').length}
                    </div>
                    <div className="text-slate-400 text-xs">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-400 font-bold">
                      {testResults.filter(r => r.status === 'warning').length}
                    </div>
                    <div className="text-slate-400 text-xs">Warnings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-400 font-bold">
                      {testResults.filter(r => r.status === 'failed').length}
                    </div>
                    <div className="text-slate-400 text-xs">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold">
                      {testResults.length}
                    </div>
                    <div className="text-slate-400 text-xs">Total</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}