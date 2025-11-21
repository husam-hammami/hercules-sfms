import { useState, useEffect } from 'react';
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDemo } from '@/contexts/DemoContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { 
  Download, FileSpreadsheet, Printer, Calendar, Search, X,
  Clock, ChevronDown, ChevronRight, RefreshCw, History
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { formatNumber, formatPercentage } from '@/utils/formatNumber';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HistoricalTagData {
  tagId: string;
  tagName: string;
  plcName: string;
  plcId: string;
  timestamp: Date;
  value: number | string | boolean;
  unit?: string;
  dataType: string;
  quality: string;
  avgValue?: number;
  minValue?: number;
  maxValue?: number;
}

export default function HistoricalData() {
  const { isDemoMode } = useDemo();
  const { theme } = useTheme();
  const [reportData, setReportData] = useState<HistoricalTagData[]>([]);
  const [expandedPlcs, setExpandedPlcs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showVisualization, setShowVisualization] = useState(true);
  const [isLoadingHistoricalData, setIsLoadingHistoricalData] = useState(false);
  
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 24 hours
    endDate: new Date().toISOString().split('T')[0],
    selectedTags: [] as string[],
    aggregationType: 'hourly' as 'none' | 'hourly' | 'daily' | 'weekly', // Default to hourly
    reportType: 'raw' as 'raw' | 'summary'
  });

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
  const plcs = isDemoMode ? demoPlcs : apiPlcs;
  const tags = isDemoMode ? demoTags : apiTags;

  // Group tags by PLC
  const tagsByPlc = tags.reduce((acc: Record<string, typeof tags>, tag) => {
    const plcId = String(tag.plcId);
    if (!acc[plcId]) {
      acc[plcId] = [];
    }
    acc[plcId].push(tag);
    return acc;
  }, {});

  // Automatically select ALL tags and fetch data on page load
  useEffect(() => {
    if (tags.length > 0 && filters.selectedTags.length === 0) {
      // Select ALL available tags
      const allTagIds = tags.map(tag => String(tag.id));
      setFilters(prev => ({
        ...prev,
        selectedTags: allTagIds
      }));
    }
  }, [tags]);

  // Automatically fetch historical data when a tag is selected
  useEffect(() => {
    if (filters.selectedTags.length > 0 && reportData.length === 0) {
      fetchHistoricalData();
    }
  }, [filters.selectedTags]);

  // Generate demo historical data
  const generateDemoHistoricalData = () => {
    const demoData: HistoricalTagData[] = [];
    const startTime = new Date(filters.startDate).getTime();
    const endTime = new Date(filters.endDate + 'T23:59:59').getTime();
    const hourInMs = 60 * 60 * 1000;
    
    // Generate data points for each selected tag
    filters.selectedTags.forEach(tagId => {
      const tag = demoTags.find(t => t.id === tagId);
      if (!tag) return;
      
      const plc = demoPlcs.find(p => p.id === tag.plcId);
      
      // Generate hourly data points
      for (let time = startTime; time <= endTime; time += hourInMs) {
        let value = 0;
        
        // Generate different patterns for different tag types
        if (tag.name === 'Temperature') {
          value = 65 + Math.sin(time / (8 * hourInMs)) * 10 + Math.random() * 5;
        } else if (tag.name === 'Pressure') {
          value = 100 + Math.sin(time / (6 * hourInMs)) * 15 + Math.random() * 8;
        } else if (tag.name === 'Flow Rate') {
          value = 50 + Math.sin(time / (4 * hourInMs)) * 20 + Math.random() * 10;
        } else if (tag.name === 'Energy Consumption') {
          value = 200 + Math.sin(time / (12 * hourInMs)) * 50 + Math.random() * 20;
        } else if (tag.name === 'Power Factor') {
          value = 0.85 + Math.sin(time / (10 * hourInMs)) * 0.1 + Math.random() * 0.05;
        }
        
        demoData.push({
          tagId: tag.id,
          tagName: tag.name,
          plcName: plc?.name || 'Unknown PLC',
          plcId: tag.plcId,
          timestamp: new Date(time),
          value: Math.max(0, value),
          quality: 'Good',
          dataType: tag.dataType,
          unit: tag.name === 'Temperature' ? '°C' : tag.name === 'Pressure' ? 'PSI' : tag.name === 'Flow Rate' ? 'L/min' : tag.name === 'Energy Consumption' ? 'kWh' : ''
        });
      }
    });
    
    return demoData;
  };

  // Fetch historical data from gateway API or generate demo data
  const fetchHistoricalData = async () => {
    if (filters.selectedTags.length === 0) {
      console.log('[HistoricalData] No tags selected');
      return;
    }

    setIsLoadingHistoricalData(true);
    
    // Use demo data in demo mode
    if (isDemoMode) {
      setTimeout(() => {
        const demoData = generateDemoHistoricalData();
        setReportData(demoData);
        console.log(`[HistoricalData] Generated ${demoData.length} demo data points`);
        setIsLoadingHistoricalData(false);
      }, 500); // Simulate network delay
      return;
    }
    
    try {
      // Use the POST endpoint to request historical data
      const response = await fetch('/api/gateway/historical-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          tagIds: filters.selectedTags,
          start_date: new Date(filters.startDate).toISOString(),
          end_date: new Date(filters.endDate + 'T23:59:59').toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch historical data: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[HistoricalData] Received response:', result);

      // If the request is pending, we might need to poll for the results
      if (result.status === 'pending' && result.command_id) {
        console.log('[HistoricalData] Request is pending, command_id:', result.command_id);
        // For now, we'll just show a message - in production you'd implement polling
        setReportData([]);
        return;
      }

      // Process the historical data if available
      if (result.data && Array.isArray(result.data)) {
        const formattedData = result.data.map((item: any) => ({
          tagId: item.tag_id,
          tagName: item.tag_name || 'Unknown',
          plcName: `PLC ${item.plc_id}`,
          plcId: item.plc_id,
          timestamp: new Date(item.timestamp || item.received_at),
          value: item.value,
          quality: item.quality === 192 ? 'Good' : 'Bad',
          dataType: 'REAL',
          unit: ''
        }));

        setReportData(formattedData);
        console.log(`[HistoricalData] Processed ${formattedData.length} data points`);
      }
    } catch (error) {
      console.error('[HistoricalData] Error fetching historical data:', error);
    } finally {
      setIsLoadingHistoricalData(false);
    }
  };

  const handleGenerateReport = () => {
    fetchHistoricalData();
  };

  const handleTagSelection = (tagId: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      selectedTags: checked 
        ? [...prev.selectedTags, tagId]
        : prev.selectedTags.filter(id => id !== tagId)
    }));
  };

  const handleSelectAllPLCTags = (plcId: string) => {
    const plcTags = tagsByPlc[plcId] || [];
    const allSelected = plcTags.every(tag => filters.selectedTags.includes(String(tag.id)));
    
    setFilters(prev => ({
      ...prev,
      selectedTags: allSelected
        ? prev.selectedTags.filter(id => !plcTags.some(tag => String(tag.id) === id))
        : [...prev.selectedTags, ...plcTags.map(tag => String(tag.id))]
    }));
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

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Historical Data Report', 14, 22);
    doc.setFontSize(12);
    doc.text(`Date Range: ${filters.startDate} to ${filters.endDate}`, 14, 32);

    const tableData = reportData.map(row => [
      row.tagName,
      row.plcName,
      new Date(row.timestamp).toLocaleString(),
      String(row.value),
      row.quality
    ]);

    autoTable(doc, {
      head: [['Tag Name', 'PLC', 'Timestamp', 'Value', 'Quality']],
      body: tableData,
      startY: 40
    });

    doc.save('historical_report.pdf');
  };

  const exportToCSV = () => {
    const headers = ['Tag Name', 'PLC', 'Timestamp', 'Value', 'Quality'];
    const rows = reportData.map(row => [
      row.tagName,
      row.plcName,
      new Date(row.timestamp).toISOString(),
      String(row.value),
      row.quality
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historical_report.csv';
    a.click();
  };

  // Function to aggregate data by hour
  const aggregateDataByHour = (data: HistoricalTagData[]) => {
    if (filters.aggregationType === 'none') return data;

    const aggregated: Record<string, HistoricalTagData[]> = {};
    
    data.forEach(item => {
      const date = new Date(item.timestamp);
      let key: string;
      
      if (filters.aggregationType === 'hourly') {
        // Round to the nearest hour
        date.setMinutes(0, 0, 0);
        key = `${item.tagId}_${date.toISOString()}`;
      } else if (filters.aggregationType === 'daily') {
        // Round to the start of day
        date.setHours(0, 0, 0, 0);
        key = `${item.tagId}_${date.toISOString()}`;
      } else if (filters.aggregationType === 'weekly') {
        // Round to start of week
        const dayOfWeek = date.getDay();
        date.setDate(date.getDate() - dayOfWeek);
        date.setHours(0, 0, 0, 0);
        key = `${item.tagId}_${date.toISOString()}`;
      } else {
        key = `${item.tagId}_${item.timestamp}`;
      }
      
      if (!aggregated[key]) {
        aggregated[key] = [];
      }
      aggregated[key].push(item);
    });
    
    // Calculate averages for each group
    const result: HistoricalTagData[] = [];
    Object.values(aggregated).forEach(group => {
      if (group.length > 0) {
        const numericValues = group
          .filter(item => typeof item.value === 'number')
          .map(item => item.value as number);
        
        const avgValue = numericValues.length > 0
          ? numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length
          : group[0].value;
        
        result.push({
          ...group[0],
          value: avgValue,
          avgValue: avgValue as number,
          minValue: Math.min(...numericValues),
          maxValue: Math.max(...numericValues)
        });
      }
    });
    
    return result.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  // Prepare chart data with aggregation - only show actual data points, no empty hours
  const aggregatedData = aggregateDataByHour(reportData);
  
  // Get all unique timestamps that have actual data (sorted)
  const allTimestamps = Array.from(new Set(
    aggregatedData.map(d => new Date(d.timestamp).toISOString())
  )).sort();
  
  // Take only the most recent data points (last 24 hours worth)
  const recentTimestamps = allTimestamps.slice(-24);
  
  const chartData = {
    labels: recentTimestamps.map(ts => {
      const date = new Date(ts);
      if (filters.aggregationType === 'hourly') {
        return date.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (filters.aggregationType === 'daily') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (filters.aggregationType === 'weekly') {
        return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }
      return date.toLocaleTimeString();
    }),
    datasets: filters.selectedTags.map((tagId, index) => {
      const tagData = aggregatedData.filter(d => d.tagId === tagId);
      const tagInfo = tags.find(t => String(t.id) === tagId);
      
      // Extended color palette to support many tags
      const colors = [
        '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#6366f1',
        '#a855f7', '#0ea5e9', '#22c55e', '#facc15', '#f87171',
        '#c084fc', '#2dd4bf', '#fb923c', '#a3e635', '#818cf8',
        '#e879f9', '#38bdf8', '#4ade80', '#fde047', '#fca5a5',
        '#d8b4fe', '#5eead4'
      ];
      
      // Map data to matching timestamps - only show actual values
      const mappedData = recentTimestamps.map(ts => {
        const point = tagData.find(d => {
          const dTimestamp = new Date(d.timestamp).toISOString();
          return dTimestamp === ts;
        });
        return point ? (typeof point.value === 'number' ? point.value : parseFloat(String(point.value))) : null;
      });
      
      return {
        label: tagInfo?.name || tagInfo?.tagName || tagData[0]?.tagName || `Tag ${tagId}`,
        data: mappedData,
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        tension: 0.4,
        spanGaps: false, // Don't connect lines when there's missing data
        pointRadius: 3,
        pointHoverRadius: 5
      };
    })
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: theme === 'dark' ? '#94a3b8' : '#6b7280' }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: theme === 'dark' ? '#cbd5e1' : '#111827',
        bodyColor: theme === 'dark' ? '#94a3b8' : '#4b5563',
        borderColor: theme === 'dark' ? '#334155' : '#d1d5db',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        display: true,
        grid: { color: theme === 'dark' ? '#1e293b' : '#e5e7eb' },
        ticks: { color: theme === 'dark' ? '#94a3b8' : '#6b7280' }
      },
      y: {
        display: true,
        grid: { color: theme === 'dark' ? '#1e293b' : '#e5e7eb' },
        ticks: { color: theme === 'dark' ? '#94a3b8' : '#6b7280' }
      }
    }
  };

  return (
    <WaterSystemLayout 
      title="Historical Data"
      subtitle="View and analyze historical tag data">
      <div className="p-2 space-y-2">
        {/* Header */}
        <div className={`flex items-center justify-between p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-700'}`}>
          <div className="flex items-center space-x-2">
            <History className="h-5 w-5 text-cyan-400" />
            <div>
              <h1 className="text-base font-bold text-white">Historical Data</h1>
              <p className="text-xs text-gray-200">View and analyze historical tag data</p>
            </div>
          </div>
        </div>

        {/* First Row: Report Configuration + Historical Trend */}
        <div className="grid grid-cols-12 gap-2">
          {/* Report Configuration - 4 columns */}
          <Card className={`${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} col-span-12 lg:col-span-4`}>
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-cyan-400 text-sm">Report Configuration</CardTitle>
              <CardDescription className="text-xs">Select tags and date range for historical data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-2 pt-0">
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="startDate" className="text-xs">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} text-xs h-8`}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-xs">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} text-xs h-8`}
                  />
                </div>
              </div>

              {/* Tag Selection */}
              <div>
                <Label className="text-xs">Select Tags</Label>
                <ScrollArea className={`h-40 border rounded-md p-2 mt-1 ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}`}>
                {Object.entries(tagsByPlc).map(([plcId, plcTags]) => {
                  const plc = plcs.find(p => String(p.id) === plcId);
                  if (!plc) return null;
                  
                  const isExpanded = expandedPlcs.has(plcId);
                  const allSelected = plcTags.every(tag => filters.selectedTags.includes(String(tag.id)));
                  const someSelected = plcTags.some(tag => filters.selectedTags.includes(String(tag.id)));
                  
                  return (
                    <div key={plcId} className="mb-3">
                      <div className={`flex items-center space-x-2 p-2 rounded ${theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'}`}>
                        <button
                          onClick={() => togglePlcExpansion(plcId)}
                          className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={() => handleSelectAllPLCTags(plcId)}
                          className={`${theme === 'light' ? 'border border-gray-400' : ''} ${someSelected && !allSelected ? 'data-[state=checked]:bg-cyan-600' : ''}`}
                        />
                        <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{plc.name}</span>
                        <Badge 
                          variant="secondary" 
                          className={`ml-auto ${theme === 'light' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-800 text-gray-300'}`}
                        >
                          {plcTags.length} tags
                        </Badge>
                      </div>
                      
                      {isExpanded && (
                        <div className="ml-8 mt-1 space-y-1">
                          {plcTags.map(tag => (
                            <div key={tag.id} className={`flex items-center space-x-2 p-1 rounded ${theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-100'}`}>
                              <Checkbox
                                checked={filters.selectedTags.includes(String(tag.id))}
                                onCheckedChange={(checked) => handleTagSelection(String(tag.id), checked as boolean)}
                                className={theme === 'light' ? 'border border-gray-400' : ''}
                              />
                              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{tag.name || tag.tagName}</span>
                              <span className={`text-xs ml-auto ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{tag.address}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </ScrollArea>
            </div>

              {/* Aggregation Options */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="aggregation" className="text-xs">Aggregation</Label>
                  <Select 
                    value={filters.aggregationType}
                    onValueChange={(value: any) => setFilters(prev => ({ ...prev, aggregationType: value }))}
                  >
                    <SelectTrigger className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} text-xs h-8`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Raw Data)</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reportType" className="text-xs">Report Type</Label>
                  <Select 
                    value={filters.reportType}
                    onValueChange={(value: any) => setFilters(prev => ({ ...prev, reportType: value }))}
                  >
                    <SelectTrigger className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} text-xs h-8`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw">Raw Data</SelectItem>
                      <SelectItem value="summary">Summary Statistics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex items-center justify-between pt-2">
                <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-blue-600'}`}>
                  {filters.selectedTags.length} tags selected
                </div>
                <Button 
                  onClick={handleGenerateReport}
                  disabled={filters.selectedTags.length === 0 || isLoadingHistoricalData}
                  className="bg-cyan-600 hover:bg-cyan-700 text-xs h-8 px-3"
                >
                  {isLoadingHistoricalData ? (
                    <>
                      <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <History className="mr-1 h-3 w-3" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Historical Trend - 8 columns */}
          <Card className={`${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} col-span-12 lg:col-span-8`}>
            <CardHeader>
              <CardTitle className="text-cyan-400">Historical Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {showVisualization && reportData.length > 0 ? (
                  <Line data={chartData} options={chartOptions} />
                ) : (
                  <div className={`flex items-center justify-center h-full ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    <div className="text-center">
                      <History className="h-16 w-16 mx-auto mb-4 opacity-30" />
                      <p className="text-sm">Select tags and generate a report to view the historical trend</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Results */}
        {reportData.length > 0 && (
          <Card className={`${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-cyan-400">Report Results</CardTitle>
                <CardDescription>
                  {reportData.length} records found
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportToCSV}
                  className={theme === 'light' ? 'text-gray-700 border-gray-300 hover:bg-gray-100' : ''}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportToPDF}
                  className={theme === 'light' ? 'text-gray-700 border-gray-300 hover:bg-gray-100' : ''}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow className={theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}>
                      <TableHead>Tag Name</TableHead>
                      <TableHead>PLC</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Quality</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((row, index) => (
                      <TableRow key={index} className="border-gray-700">
                        <TableCell className="font-mono text-xs">
                          {row.tagName}
                        </TableCell>
                        <TableCell>{row.plcName}</TableCell>
                        <TableCell className="text-xs">
                          {new Date(row.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.quality === 'Good' ? 'default' : 'destructive'}>
                            {formatNumber(row.value)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={row.quality === 'Good' ? 'default' : 'destructive'}
                            className={row.quality === 'Good' ? 'bg-green-600' : 'bg-red-600'}
                          >
                            {row.quality}
                          </Badge>
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