import { useState, useEffect } from 'react';
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDemo } from '@/contexts/DemoContext';
import { useLiveData } from '@/contexts/LiveDataContext';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, Play, Pause, RefreshCw, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { LiveDataOscilloscope, Sparkline } from '@/components/charts/LiveDataOscilloscope';
import { Line, Bar } from 'react-chartjs-2';
import { formatNumber, formatPercentage, formatTemperature, formatPressure, formatFlowRate } from '@/utils/formatNumber';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function LiveData() {
  const { isDemoMode } = useDemo();
  const {
    liveData,
    selectedTags,
    isLiveMode,
    updateRate,
    tagHistoricalData,
    tagSparklines,
    setSelectedTags,
    setIsLiveMode,
    setUpdateRate,
    refreshData,
    isLoadingData
  } = useLiveData();
  
  const [expandedPlcs, setExpandedPlcs] = useState<Set<string>>(new Set());
  const [chartMode, setChartMode] = useState<'line' | 'bar' | 'voltage'>('line');
  
  // Fetch PLCs and tags for authenticated users
  const { data: apiPlcs = [] } = useQuery<any[]>({
    queryKey: ['/api/plc-configurations'],
    enabled: !isDemoMode
  });
  
  const { data: apiTags = [] } = useQuery<any[]>({
    queryKey: ['/api/plc-tags'],
    enabled: !isDemoMode
  });

  // Demo PLCs and tags for demo mode
  const demoPlcs = [
    { id: 'demo-plc-1', name: 'Production Line 1', ipAddress: '192.168.1.100', status: 'connected' },
    { id: 'demo-plc-2', name: 'Energy Monitor', ipAddress: '192.168.1.101', status: 'connected' }
  ];

  const demoTags = [
    { id: 'demo-tag-1', name: 'Temperature', plcId: 'demo-plc-1', dataType: 'REAL', address: 'DB1.DBD0' },
    { id: 'demo-tag-2', name: 'Pressure', plcId: 'demo-plc-1', dataType: 'REAL', address: 'DB1.DBD4' },
    { id: 'demo-tag-3', name: 'Flow Rate', plcId: 'demo-plc-1', dataType: 'REAL', address: 'DB1.DBD8' },
    { id: 'demo-tag-4', name: 'Energy Consumption', plcId: 'demo-plc-2', dataType: 'REAL', address: 'DB2.DBD0' },
    { id: 'demo-tag-5', name: 'Power Factor', plcId: 'demo-plc-2', dataType: 'REAL', address: 'DB2.DBD4' }
  ];

  // Combine API and demo data
  const plcsData = isDemoMode ? demoPlcs : apiPlcs;
  const tags = isDemoMode ? demoTags : apiTags;
  const tagsByPlc = tags.reduce((acc: Record<string, typeof tags>, tag) => {
    const plcId = String(tag.plcId);
    if (!acc[plcId]) {
      acc[plcId] = [];
    }
    acc[plcId].push(tag);
    return acc;
  }, {});

  // Demo live data simulation - only in demo mode
  const [demoLiveData, setDemoLiveData] = useState<any[]>([]);
  const [demoHistoricalData, setDemoHistoricalData] = useState<Record<string, any[]>>({});
  
  // Generate demo value helper
  const generateDemoValue = (tagName: string, timestamp: number) => {
    if (tagName === 'Temperature') {
      return 65 + Math.sin(timestamp / 5000) * 10 + Math.random() * 5;
    } else if (tagName === 'Pressure') {
      return 100 + Math.sin(timestamp / 3000) * 15 + Math.random() * 8;
    } else if (tagName === 'Flow Rate') {
      return 50 + Math.sin(timestamp / 2000) * 20 + Math.random() * 10;
    } else if (tagName === 'Energy Consumption') {
      return 200 + Math.sin(timestamp / 8000) * 50 + Math.random() * 20;
    } else if (tagName === 'Power Factor') {
      return 0.85 + Math.sin(timestamp / 6000) * 0.1 + Math.random() * 0.05;
    }
    return 0;
  };
  
  useEffect(() => {
    if (!isDemoMode || !isLiveMode) return;
    
    const generateDemoData = () => {
      return selectedTags.map(tagId => {
        const tag = demoTags.find(t => t.id === tagId);
        if (!tag) return null;
        
        const plc = demoPlcs.find(p => p.id === tag.plcId);
        const value = generateDemoValue(tag.name, Date.now());
        
        return {
          tagId: tag.id,
          tagName: tag.name,
          plcName: plc?.name || 'Unknown PLC',
          plcId: tag.plcId,
          timestamp: new Date(),
          value: Math.max(0, value),
          quality: 'Good',
          trend: Math.random() > 0.5 ? 'up' : 'down'
        };
      }).filter(Boolean);
    };
    
    // Initial data
    setDemoLiveData(generateDemoData());
    
    // Update demo data and historical data at selected rate
    const interval = setInterval(() => {
      const newData = generateDemoData();
      setDemoLiveData(newData);
      
      // Update historical data for charts
      setDemoHistoricalData(prev => {
        const updated = { ...prev };
        selectedTags.forEach(tagId => {
          const tag = demoTags.find(t => t.id === tagId);
          if (!tag) return;
          
          const value = generateDemoValue(tag.name, Date.now());
          const newPoint = {
            timestamp: new Date(),
            value: Math.max(0, value),
            quality: 'Good'
          };
          
          // Keep last 50 points for chart
          const existing = updated[tagId] || [];
          updated[tagId] = [...existing, newPoint].slice(-50);
        });
        return updated;
      });
    }, updateRate);
    
    return () => clearInterval(interval);
  }, [isDemoMode, isLiveMode, selectedTags, updateRate]);

  // Use demo data in demo mode, otherwise use context data
  const displayData = isDemoMode ? demoLiveData : liveData;
  const displayHistoricalData = isDemoMode ? demoHistoricalData : tagHistoricalData;

  const handleTagSelection = (tagId: string, checked: boolean) => {
    const newTags = checked 
      ? [...selectedTags, tagId] 
      : selectedTags.filter(id => id !== tagId);
    setSelectedTags(newTags);
  };

  const handleSelectAllPLCTags = (plcId: string) => {
    const plcTags = tagsByPlc[plcId] || [];
    const allSelected = plcTags.every(tag => selectedTags.includes(String(tag.id)));
    
    const newTags = allSelected
      ? selectedTags.filter(id => !plcTags.some(tag => String(tag.id) === id))
      : [...selectedTags, ...plcTags.map(tag => String(tag.id)).filter(id => !selectedTags.includes(id))];
    
    setSelectedTags(newTags);
  };

  const togglePlcExpansion = (plcId: string) => {
    setExpandedPlcs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(plcId)) {
        newSet.delete(plcId);
      } else {
        newSet.add(plcId);
      }
      return newSet;
    });
  };

  const toggleLiveMode = () => {
    setIsLiveMode(!isLiveMode);
  };

  // Prepare chart data - stock market trend style
  const chartData = {
    labels: Array.from({ length: 50 }, (_, i) => ''),
    datasets: selectedTags.map((tagId, index) => {
      const history = displayHistoricalData[tagId] || [];
      // Vibrant stock market colors - green, red, blue, orange
      const colors = [
        '#22c55e', '#ef4444', '#3b82f6', '#f97316', 
        '#10b981', '#dc2626', '#06b6d4', '#eab308',
        '#14b8a6', '#f43f5e', '#8b5cf6', '#fb923c',
        '#84cc16', '#ec4899', '#0ea5e9', '#f59e0b',
        '#4ade80', '#ff6b6b', '#60a5fa', '#fbbf24',
        '#2dd4bf', '#ff5252', '#a78bfa', '#fde047'
      ];
      const tagInfo = tags.find(t => String(t.id) === tagId);
      
      return {
        label: tagInfo?.name || tagInfo?.tagName || `Tag ${tagId}`,
        data: history.slice(-50).map(h => h.value),
        borderColor: colors[index % colors.length],
        backgroundColor: 'transparent', // No fill - only lines
        tension: 0.1, // Sharp, jagged lines like stock market
        pointRadius: 1.5, // Small visible points
        pointBackgroundColor: colors[index % colors.length],
        pointBorderColor: colors[index % colors.length],
        pointHoverRadius: 4,
        borderWidth: 2.5,
        fill: false // Disable area fill - only lines
      };
    })
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0
    },
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: { 
          color: '#94a3b8',
          usePointStyle: true,
          pointStyle: 'line',
          padding: 10,
          font: { size: 10 }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#06b6d4',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        display: true,
        grid: { 
          color: 'rgba(148, 163, 184, 0.1)',
          lineWidth: 1
        },
        ticks: { 
          color: '#64748b',
          font: { size: 9 }
        }
      },
      y: {
        display: true,
        grid: { 
          color: 'rgba(148, 163, 184, 0.15)',
          lineWidth: 1
        },
        ticks: { 
          color: '#94a3b8',
          font: { size: 10 }
        }
      }
    }
  };

  return (
    <WaterSystemLayout title="Live Data" subtitle="Real-time tag monitoring and visualization">
      <div className="p-2 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            <div>
              <h1 className="text-lg font-bold text-white">Live Data</h1>
              <p className="text-gray-400 text-xs">Real-time tag monitoring and visualization</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Update Rate */}
            <Select 
              value={String(updateRate)}
              onValueChange={(value) => setUpdateRate(Number(value))}
            >
              <SelectTrigger className="w-24 h-7 text-xs bg-gray-800 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="500">0.5s</SelectItem>
                <SelectItem value="1000">1s</SelectItem>
                <SelectItem value="2000">2s</SelectItem>
                <SelectItem value="5000">5s</SelectItem>
                <SelectItem value="10000">10s</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Live Mode Toggle */}
            <Button
              variant={isLiveMode ? "default" : "outline"}
              onClick={toggleLiveMode}
              size="sm"
              className={`h-7 text-xs ${isLiveMode ? "bg-green-600 hover:bg-green-700" : ""}`}
            >
              {isLiveMode ? (
                <>
                  <Play className="mr-1 h-3 w-3" />
                  Live
                </>
              ) : (
                <>
                  <Pause className="mr-1 h-3 w-3" />
                  Paused
                </>
              )}
            </Button>
            
            {/* Manual Refresh */}
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => refreshData()}
              disabled={isLoadingData}
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingData ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* First Grid Row: Tag Selection and Live Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
          {/* Tag Selection - 3 columns */}
          <Card className="bg-gray-900/50 border-gray-800 lg:col-span-3">
            <CardHeader className="p-2">
              <CardTitle className="text-cyan-400 text-sm">Tag Selection</CardTitle>
              <CardDescription className="text-xs">Select tags to monitor in real-time</CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[280px] border border-gray-700 rounded-md bg-gray-800/50 p-1">
                {Object.entries(tagsByPlc).map(([plcId, plcTags]) => {
                  const plc = plcsData.find(p => String(p.id) === plcId);
                  if (!plc) return null;
                  
                  const isExpanded = expandedPlcs.has(plcId);
                  const allSelected = plcTags.every(tag => selectedTags.includes(String(tag.id)));
                  const someSelected = plcTags.some(tag => selectedTags.includes(String(tag.id)));
                  
                  return (
                    <div key={plcId} className="mb-2">
                      <div className="flex items-center space-x-1 p-1 hover:bg-gray-700/50 rounded text-xs">
                        <button
                          onClick={() => togglePlcExpansion(plcId)}
                          className="text-gray-400 hover:text-white"
                        >
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={() => handleSelectAllPLCTags(plcId)}
                          className={`h-3 w-3 ${someSelected && !allSelected ? 'data-[state=checked]:bg-cyan-600' : ''}`}
                        />
                        <span className="text-white font-medium text-xs">{plc.name}</span>
                        <Badge variant="secondary" className="ml-auto text-xs py-0 px-1">
                          {plcTags.length}
                        </Badge>
                      </div>
                      
                      {isExpanded && (
                        <div className="ml-5 mt-1 space-y-0.5">
                          {plcTags.map(tag => {
                            const liveValue = displayData.find(d => d.tagId === String(tag.id));
                            return (
                              <div key={tag.id} className="flex items-center space-x-1 p-0.5 hover:bg-gray-700/30 rounded">
                                <Checkbox
                                  checked={selectedTags.includes(String(tag.id))}
                                  onCheckedChange={(checked) => handleTagSelection(String(tag.id), checked as boolean)}
                                  className="h-3 w-3"
                                />
                                <span className="text-gray-300 text-xs truncate flex-1">{tag.name || tag.tagName}</span>
                                {liveValue && (
                                  <div className="ml-auto flex items-center space-x-1">
                                    <Badge 
                                      variant="secondary"
                                      className={`text-xs py-0 px-1 ${liveValue.quality === 'Good' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}
                                    >
                                      {formatNumber(liveValue.value)}
                                    </Badge>
                                    {liveValue.trend === 'up' && <TrendingUp className="h-2.5 w-2.5 text-green-400" />}
                                    {liveValue.trend === 'down' && <TrendingDown className="h-2.5 w-2.5 text-red-400" />}
                                    {liveValue.trend === 'stable' && <Minus className="h-2.5 w-2.5 text-gray-400" />}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Live Data Visualization - 9 columns */}
          <Card className="bg-gray-900/50 border-gray-800 lg:col-span-9">
            <CardHeader className="flex flex-row items-center justify-between p-2">
              <CardTitle className="text-cyan-400 text-sm">Live Trend</CardTitle>
              <div className="flex items-center space-x-2">
                <Select 
                  value={chartMode}
                  onValueChange={(value: any) => setChartMode(value)}
                >
                  <SelectTrigger className="w-28 h-7 text-xs bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="voltage">Sparklines</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              {selectedTags.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Select tags to view live trends</p>
                  </div>
                </div>
              ) : (
                <>
                  {chartMode === 'line' && (
                    <div className="h-[250px]">
                      <Line 
                        data={chartData} 
                        options={chartOptions}
                      />
                    </div>
                  )}
                  
                  {chartMode === 'bar' && (
                    <div className="h-[250px]">
                      <Bar 
                        data={{
                          labels: selectedTags.map(tagId => {
                            const tag = tags.find(t => String(t.id) === tagId);
                            return tag?.name || tag?.tagName || `Tag ${tagId}`;
                          }),
                          datasets: [{
                            label: 'Current Value',
                            data: selectedTags.map(tagId => {
                              const currentValue = displayData.find(d => d.tagId === tagId);
                              return currentValue ? currentValue.value : 0;
                            }),
                            backgroundColor: '#06b6d4',
                            borderColor: '#0891b2',
                            borderWidth: 1
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false
                            },
                            tooltip: {
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              titleColor: '#06b6d4',
                              bodyColor: '#fff',
                              borderColor: '#06b6d4',
                              borderWidth: 1
                            }
                          },
                          scales: {
                            x: {
                              grid: {
                                color: 'rgba(75, 85, 99, 0.2)',
                                display: true
                              },
                              ticks: {
                                color: '#9ca3af',
                                font: { size: 10 }
                              }
                            },
                            y: {
                              grid: {
                                color: 'rgba(75, 85, 99, 0.2)',
                                display: true
                              },
                              ticks: {
                                color: '#9ca3af',
                                font: { size: 10 }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  )}
                  
                  {chartMode === 'voltage' && (
                    <div className="h-[250px]">
                      <Line 
                        data={{
                          labels: chartData.labels,
                          datasets: selectedTags.map((tagId, index) => {
                            const tag = tags.find(t => String(t.id) === tagId);
                            const colors = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];
                            const history = displayHistoricalData[tagId] || [];
                            
                            return {
                              label: tag?.name || tag?.tagName || `Tag ${tagId}`,
                              data: history.slice(-50).map(h => h.value),
                              borderColor: colors[index % colors.length],
                              backgroundColor: colors[index % colors.length] + '20',
                              borderWidth: 2,
                              tension: 0.1,
                              fill: false,
                              pointRadius: 0,
                              pointHoverRadius: 4
                            };
                          })
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          interaction: {
                            mode: 'index' as const,
                            intersect: false
                          },
                          plugins: {
                            legend: {
                              display: true,
                              position: 'top' as const,
                              labels: {
                                color: '#9ca3af',
                                usePointStyle: true,
                                pointStyle: 'line',
                                boxHeight: 4,
                                padding: 15,
                                font: { size: 11 }
                              }
                            },
                            tooltip: {
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              titleColor: '#06b6d4',
                              bodyColor: '#fff',
                              borderColor: '#06b6d4',
                              borderWidth: 1
                            },
                            title: {
                              display: false
                            }
                          },
                          scales: {
                            x: {
                              grid: {
                                color: 'rgba(75, 85, 99, 0.2)',
                                display: true
                              },
                              ticks: {
                                color: '#9ca3af',
                                font: { size: 10 },
                                maxRotation: 0
                              },
                              title: {
                                display: true,
                                text: 'Time',
                                color: '#9ca3af',
                                font: { size: 11 }
                              }
                            },
                            y: {
                              grid: {
                                color: 'rgba(75, 85, 99, 0.2)',
                                display: true
                              },
                              ticks: {
                                color: '#9ca3af',
                                font: { size: 10 }
                              },
                              title: {
                                display: true,
                                text: 'Value',
                                color: '#9ca3af',
                                font: { size: 11 }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live Data Table */}
        {displayData.length > 0 && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="p-2">
              <CardTitle className="text-cyan-400 text-sm">Live Values</CardTitle>
              <CardDescription className="text-xs">
                {displayData.length} tags monitored • {isLiveMode ? 'Updating...' : 'Paused'} • Last updated: {new Date().toLocaleTimeString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-48">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-xs p-2">Tag Name</TableHead>
                      <TableHead className="text-xs p-2">PLC</TableHead>
                      <TableHead className="text-xs p-2">Value</TableHead>
                      <TableHead className="text-xs p-2">Quality</TableHead>
                      <TableHead className="text-xs p-2">Trend</TableHead>
                      <TableHead className="text-xs p-2">Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayData.map((row, index) => (
                      <TableRow key={index} className="border-gray-700">
                        <TableCell className="font-mono text-xs p-2">
                          {row.tagName}
                        </TableCell>
                        <TableCell className="text-xs p-2">{row.plcName}</TableCell>
                        <TableCell className="p-2">
                          <Badge variant="default" className="text-xs py-0 px-1">
                            {String(row.value)} {row.unit}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-2">
                          <Badge 
                            variant={row.quality === 'Good' ? 'default' : 'destructive'}
                            className={`text-xs py-0 px-1 ${row.quality === 'Good' ? 'bg-green-600' : 'bg-red-600'}`}
                          >
                            {row.quality}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-2">
                          <div className="flex items-center space-x-1">
                            {row.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-400" />}
                            {row.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-400" />}
                            {row.trend === 'stable' && <Minus className="h-3 w-3 text-gray-400" />}
                            <span className="text-xs text-gray-400">{row.trend}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs p-2">
                          {new Date(row.timestamp).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </WaterSystemLayout>
  );
}