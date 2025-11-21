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
import { globalSimulator } from '@/lib/plc-data-simulator';
import { useDemo } from '@/contexts/DemoContext';
import { useDemoData } from '@/contexts/DemoDataContext';
import { useQuery } from '@tanstack/react-query';
import { 
  Download, FileSpreadsheet, Printer, Calendar, Search, X,
  Activity, Clock, ChevronDown, ChevronRight, RefreshCw, Play, Pause
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { LiveDataOscilloscope, Sparkline } from '@/components/charts/LiveDataOscilloscope';
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

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
};

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

interface TagReportData {
  tagId: string;
  tagName: string;
  plcName: string;
  plcId: string;
  timestamp: Date;
  value: number | string | boolean;
  unit?: string;
  dataType: string;
  quality: string;
  // For aggregated data
  batches?: number;
  sumSetpoint?: number;
  sumActual?: number;
  errorKg?: number;
  errorPercent?: number;
  avgValue?: number;
  minValue?: number;
  maxValue?: number;
}

export default function TagReports() {
  const { isDemoMode } = useDemo();
  const demoData = isDemoMode ? useDemoData() : null;
  const [reportData, setReportData] = useState<TagReportData[]>([]);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveUpdateInterval, setLiveUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  const [expandedPlcs, setExpandedPlcs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showVisualization, setShowVisualization] = useState(true);
  const [chartMode, setChartMode] = useState<'oscilloscope' | 'radar' | 'line'>('line');
  const [tagSparklines, setTagSparklines] = useState<Record<string, number[]>>({});
  // Store historical values for real-time chart display
  const [tagHistoricalData, setTagHistoricalData] = useState<Record<string, { value: number, timestamp: Date }[]>>({});
  
  const [filters, setFilters] = useState({
    dataMode: 'live' as 'live' | 'historical',  // Default to live mode for real-time data
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    selectedTags: [] as string[],
    aggregationType: 'none' as 'none' | 'hourly' | 'daily' | 'weekly',
    reportType: 'raw' as 'raw' | 'summary'
  });

  // Fetch PLCs and tags for authenticated users
  const { data: apiPlcs = [] } = useQuery<any[]>({
    queryKey: ['/api/plc-configurations'],
    queryFn: () => fetchJson<any[]>('/api/plc-configurations'),
    enabled: !isDemoMode
  });
  
  const { data: apiTags = [] } = useQuery<any[]>({
    queryKey: ['/api/plc-tags'],
    queryFn: () => fetchJson<any[]>('/api/plc-tags'),
    enabled: !isDemoMode
  });
  
  // Fetch real-time data from gateway endpoint
  const { data: gatewayData, refetch: refetchGatewayData, isLoading: isLoadingGatewayData } = useQuery({
    queryKey: ['/api/gateway/data', filters.selectedTags],
    queryFn: async () => {
      if (filters.selectedTags.length === 0) {
        return { tagData: [] };
      }
      const params = new URLSearchParams();
      params.append('tagIds', filters.selectedTags.join(','));
      const url = `/api/gateway/data?${params}`;
      return fetchJson<{ tagData: any[]; timestamp?: string }>(url);
    },
    enabled: filters.dataMode === 'live' && filters.selectedTags.length > 0 && !isDemoMode,
    refetchInterval: isLiveMode ? 1000 : false,
    staleTime: 0,
    gcTime: 0
  });
  
  // Debug logging for component state
  console.log('[TagReports] Component state:', {
    isDemoMode,
    dataMode: filters.dataMode,
    isLiveMode,
    selectedTagsCount: filters.selectedTags.length,
    gatewayDataAvailable: !!gatewayData,
    gatewayDataLength: gatewayData?.tagData?.length || 0
  });

  // Get all tags based on mode
  let allTags: any[] = [];
  if (isDemoMode && demoData) {
    allTags = demoData.plcTags || [];
  } else {
    // For authenticated users, enhance tags with PLC names and map name to tagName
    allTags = apiTags.map((tag: any) => {
      const plc = apiPlcs.find((p: any) => p.id === tag.plcId);
      return { 
        ...tag, 
        tagName: tag.name || tag.tagName || `${tag.dataType} + ${tag.unit || ''}`, // Map name to tagName
        plcName: plc?.name || 'Unknown PLC' 
      };
    });
  }

  // Get filtered tags
  const filteredTags = allTags.filter(tag => {
    const matchesSearch = searchTerm === '' || 
      tag.tagName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tag.plcName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Group tags by PLC
  const tagsByPlc = filteredTags.reduce<Record<string, TagReportData[]>>((acc, tag) => {
    const plcKey = tag.plcId || tag.plcName || 'Unknown';
    if (!acc[plcKey]) acc[plcKey] = [];
    acc[plcKey].push(tag);
    return acc;
  }, {});

  // Generate data function
  const generateData = async () => {
    console.log('[generateData] Starting with filters:', {
      dataMode: filters.dataMode,
      selectedTagsCount: filters.selectedTags.length,
      selectedTags: filters.selectedTags
    });
    
    if (filters.selectedTags.length === 0) {
      console.log('[generateData] No tags selected, clearing data');
      setReportData([]);
      return;
    }

    const data: TagReportData[] = [];
    const selectedTagObjects = allTags.filter((tag: any) => filters.selectedTags.includes(tag.id));
    console.log('[generateData] Selected tag objects:', selectedTagObjects);

    if (filters.dataMode === 'live') {
      // Use gateway data for authenticated users, simulator for demo mode
      console.log('[generateData] Live mode check:', {
        isDemoMode,
        hasGatewayData: !!gatewayData,
        hasTagData: !!gatewayData?.tagData,
        tagDataLength: gatewayData?.tagData?.length || 0
      });
      
      // IMPORTANT: Authenticated users should ALWAYS use API data, never simulator
      if (!isDemoMode) {
        // Authenticated user - use real gateway data ONLY
        if (gatewayData && gatewayData.tagData && Array.isArray(gatewayData.tagData)) {
          console.log('[generateData] Using real gateway data for authenticated user');
          console.log('[generateData] Gateway data sample:', gatewayData.tagData[0]);
          
          // Process whatever the API returns - including empty arrays or bad quality data
          if (gatewayData.tagData.length > 0) {
            gatewayData.tagData.forEach((item: any) => {
              console.log(`[generateData] Processing tag ${item.tagName}: value=${item.value}, quality=${item.quality}, type=${typeof item.value}`);
              
              // Log the exact value being stored
              const dataPoint = {
                tagId: item.tagId,
                tagName: item.tagName,
                plcName: item.plcName,
                plcId: item.plcId,
                timestamp: new Date(item.timestamp),
                value: item.value, // Use exact value from API (including 0)
                unit: item.unit,
                dataType: item.dataType,
                quality: item.quality // Use exact quality from API (including 'bad')
              };
              
              console.log(`[generateData] Storing data point:`, JSON.stringify(dataPoint));
              data.push(dataPoint);
            });
            console.log('[generateData] Processed', data.length, 'gateway data points');
            console.log('[generateData] Final data array:', JSON.stringify(data));
          } else {
            console.log('[generateData] Gateway returned empty tagData array - no data available');
            // Don't generate any fallback data for authenticated users
          }
        } else {
          console.log('[generateData] Waiting for gateway data response...');
          // Don't generate any fallback data - wait for API response
        }
      } else if (isDemoMode && demoData) {
        // Use simulator for demo mode only
        selectedTagObjects.forEach(tag => {
          // Ensure tag exists in simulator
          globalSimulator.ensureTagExists({
            tagId: tag.id,
            tagName: tag.tagName,
            plcId: tag.plcId || 'Unknown',
            address: tag.address || 'DB0.DBD0',
            dataType: tag.dataType || 'REAL'
          });
          
          const currentValues = globalSimulator.getCurrentValues();
          const tagValue = currentValues[tag.id];
          
          if (tagValue) {
            data.push({
              tagId: tag.id,
              tagName: tag.tagName,
              plcName: tag.plcName || 'Unknown',
              plcId: tag.plcId || tag.plcName || 'Unknown',
              timestamp: tagValue.timestamp,
              value: tagValue.value,
              unit: tag.unit,
              dataType: tag.dataType,
              quality: tagValue.quality
            });
          } else {
            // Fallback if tag still doesn't have data
            data.push({
              tagId: tag.id,
              tagName: tag.tagName,
              plcName: tag.plcName || 'Unknown',
              plcId: tag.plcId || tag.plcName || 'Unknown',
              timestamp: new Date(),
              value: Math.random() * 100,
              unit: tag.unit,
              dataType: tag.dataType,
              quality: 'good'
            });
          }
        });
      }
      setReportData(data);
    } else {
      // Historical data mode
      const startDateTime = new Date(filters.startDate);
      const endDateTime = new Date(filters.endDate);
      
      // For authenticated users, fetch historical data from the API
      if (!isDemoMode) {
        try {
          const params = new URLSearchParams();
          params.append('tagIds', filters.selectedTags.join(','));
          params.append('startDate', filters.startDate);
          params.append('endDate', filters.endDate);
          params.append('aggregationType', filters.aggregationType);
          
          const url = `/api/gateway/data?${params}`;
          console.log('[generateData] Fetching historical data from gateway API:', url);
          
          // Get session ID from localStorage and include credentials
          const sessionId = localStorage.getItem('sessionId');
          const headers: any = {};
          if (sessionId) {
            headers['X-Session-Id'] = sessionId;
          }
          
          const response = await fetch(url, {
            headers,
            credentials: 'include'  // Important: include cookies
          });
          console.log('[generateData] Gateway API response status:', response.status);
          
          if (response.ok) {
            const result = await response.json();
            console.log('[generateData] Gateway API response:', {
              hasTagData: !!result.tagData,
              tagDataLength: result.tagData?.length || 0,
              isHistorical: result.isHistorical,
              message: result.message
            });
            
            // IMPORTANT: Historical data now comes directly from gateway, not portal DB
            // The portal API returns the data exactly as received from gateway
            if (result.tagData && result.tagData.length > 0) {
              // Use real historical data from the gateway
              result.tagData.forEach((item: any) => {
                data.push({
                  tagId: item.tagId,
                  tagName: item.tagName,
                  plcName: item.plcName,
                  plcId: item.plcId,
                  timestamp: new Date(item.timestamp),
                  value: item.value,
                  unit: item.unit || '',
                  dataType: item.dataType,
                  quality: item.quality,
                  avgValue: item.avgValue,
                  minValue: item.minValue,
                  maxValue: item.maxValue,
                  batches: item.dataPoints || item.batches
                });
              });
              console.log('[generateData] Processed', data.length, 'historical data points from gateway');
              setReportData(data);
              return;
            } else {
              // No historical data available from gateway
              // This is expected behavior - historical data must come from gateway
              console.log('[generateData] No historical data from gateway (not using portal DB)');
              console.log('[generateData] Message:', result.message);
              
              // Set empty data to clear any existing data
              setReportData([]);
              
              // Note: In production, the gateway would push historical data
              // For now, we return empty data to ensure no portal DB usage
              return;
            }
          } else {
            console.error('[generateData] Gateway API response not ok:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('[generateData] Error response body:', errorText);
            setReportData([]);
          }
        } catch (error) {
          console.error('[generateData] Failed to fetch historical data from gateway API:', error);
          setReportData([]);
        }
      }
      
      // Fall back to simulator for demo mode or if API call fails
      if (isDemoMode) {
        const hours = Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60));
        
        selectedTagObjects.forEach(tag => {
          // Ensure tag exists in simulator for historical data generation
          globalSimulator.ensureTagExists({
            tagId: tag.id,
            tagName: tag.tagName,
            plcId: tag.plcId || 'Unknown',
            address: tag.address || 'DB0.DBD0',
            dataType: tag.dataType || 'REAL'
          });
          
          const historicalData = globalSimulator.generateHistoricalData(tag.id, hours, 24);
          
          if (filters.aggregationType === 'none') {
            historicalData.forEach((point, index) => {
              const timestamp = new Date(startDateTime.getTime() + (index * (endDateTime.getTime() - startDateTime.getTime()) / historicalData.length));
              data.push({
                tagId: tag.id,
                tagName: tag.tagName,
                plcName: tag.plcName || 'Unknown',
                plcId: tag.plcId || tag.plcName || 'Unknown',
                timestamp,
                value: point.value,
                unit: tag.unit,
                dataType: tag.dataType,
                quality: point.quality
              });
            });
          } else {
            // Aggregated data
            const values = historicalData.map(h => typeof h.value === 'number' ? h.value : 0);
            const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
            const minValue = Math.min(...values);
            const maxValue = Math.max(...values);
            
            data.push({
              tagId: tag.id,
              tagName: tag.tagName,
              plcName: tag.plcName || 'Unknown',
              plcId: tag.plcId || tag.plcName || 'Unknown',
              timestamp: startDateTime,
              value: avgValue,
              unit: tag.unit,
              dataType: tag.dataType,
              quality: 'aggregated',
              avgValue: Math.round(avgValue * 100) / 100,
              minValue: Math.round(minValue * 100) / 100,
              maxValue: Math.round(maxValue * 100) / 100,
              batches: Math.floor(Math.random() * 10) + 1
            });
          }
        });
        setReportData(data);
      }
    }
  };

  // Wrapper function to handle async generateData with error logging
  const handleGenerateData = async () => {
    try {
      console.log('[TagReports] Generating data with filters:', {
        dataMode: filters.dataMode,
        selectedTags: filters.selectedTags,
        startDate: filters.startDate,
        endDate: filters.endDate,
        aggregationType: filters.aggregationType
      });
      await generateData();
      console.log('[TagReports] Data generation completed, reportData length:', reportData.length);
    } catch (error) {
      console.error('[TagReports] Error generating data:', error);
      // Still set empty data on error to clear any stale data
      setReportData([]);
    }
  };

  // Handle live updates
  useEffect(() => {
    if (filters.dataMode === 'live' && isLiveMode && filters.selectedTags.length > 0) {
      // For demo mode, use interval to update simulator data
      if (isDemoMode) {
        handleGenerateData(); // Generate immediately for demo mode
        const interval = setInterval(() => {
          handleGenerateData();
        }, 1000); // Update every second for smoother animation
        setLiveUpdateInterval(interval);
        return () => clearInterval(interval);
      }
      // For authenticated users, data is handled by the gateway data useEffect
      // The react-query refetchInterval handles automatic updates
    } else {
      if (liveUpdateInterval) {
        clearInterval(liveUpdateInterval);
        setLiveUpdateInterval(null);
      }
      if (filters.dataMode === 'live' && filters.selectedTags.length === 0) {
        setReportData([]);
      }
    }
  }, [isLiveMode, filters.dataMode, filters.selectedTags, isDemoMode]);
  
  // Update report data when gateway data changes
  useEffect(() => {
    if (filters.dataMode === 'live' && !isDemoMode && gatewayData && gatewayData.tagData) {
      console.log('[TagReports] Gateway data changed, updating visualization');
      console.log('[TagReports] Gateway data available:', {
        hasTagData: !!gatewayData.tagData,
        tagDataLength: gatewayData.tagData?.length || 0,
        sampleData: gatewayData.tagData?.[0]
      });
      
      // Directly process the gateway data here instead of calling generateData
      // This ensures we use the fresh gateway data immediately
      const data: TagReportData[] = [];
      
      if (Array.isArray(gatewayData.tagData) && gatewayData.tagData.length > 0) {
        gatewayData.tagData.forEach((item: any) => {
          console.log(`[TagReports] Processing tag ${item.tagName}: value=${item.value}, quality=${item.quality}`);
          
          data.push({
            tagId: item.tagId,
            tagName: item.tagName,
            plcName: item.plcName,
            plcId: item.plcId,
            timestamp: new Date(item.timestamp),
            value: item.value, // Use exact value from API
            unit: item.unit,
            dataType: item.dataType,
            quality: item.quality // Use exact quality from API
          });
        });
        
        console.log('[TagReports] Setting reportData with', data.length, 'items');
        setReportData(data);
        
        // Update historical data for chart display
        const newHistoricalData = { ...tagHistoricalData };
        gatewayData.tagData.forEach((item: any) => {
          if (!newHistoricalData[item.tagId]) {
            newHistoricalData[item.tagId] = [];
          }
          
          // Parse the value to ensure it's a number
          let numericValue = 0;
          if (typeof item.value === 'number') {
            numericValue = item.value;
          } else if (typeof item.value === 'string') {
            numericValue = parseFloat(item.value);
          } else if (typeof item.value === 'boolean') {
            numericValue = item.value ? 1 : 0;
          }
          
          // Add new data point
          newHistoricalData[item.tagId].push({
            value: numericValue,
            timestamp: new Date(item.timestamp)
          });
          
          // Keep only last 30 data points for each tag
          if (newHistoricalData[item.tagId].length > 30) {
            newHistoricalData[item.tagId].shift();
          }
          
          console.log(`[TagReports] Updated historical data for ${item.tagName}: latest value = ${numericValue}`);
        });
        setTagHistoricalData(newHistoricalData);
      } else {
        console.log('[TagReports] Gateway data is empty or invalid, clearing report data');
        setReportData([]);
      }
    }
  }, [gatewayData, filters.dataMode, isDemoMode, tagHistoricalData]);
  
  // Update sparklines for live data
  useEffect(() => {
    if (filters.dataMode === 'live' && reportData.length > 0) {
      const newSparklines = { ...tagSparklines };
      
      reportData.forEach(item => {
        if (!newSparklines[item.tagId]) {
          newSparklines[item.tagId] = [];
        }
        
        if (typeof item.value === 'number') {
          newSparklines[item.tagId].push(item.value);
          // Keep only last 20 points for sparkline
          if (newSparklines[item.tagId].length > 20) {
            newSparklines[item.tagId].shift();
          }
        }
      });
      
      setTagSparklines(newSparklines);
    }
  }, [reportData, filters.dataMode]);

  // Clear data when no tags selected or mode changes
  useEffect(() => {
    if (filters.dataMode === 'historical' && filters.selectedTags.length === 0) {
      console.log('[TagReports] Historical mode - no tags selected, clearing data');
      setReportData([]);
    }
    
    // Clear historical data when switching modes or when no tags are selected
    if (filters.dataMode === 'historical' || filters.selectedTags.length === 0) {
      console.log('[TagReports] Clearing historical chart data');
      setTagHistoricalData({});
    }
    // Note: In historical mode, data generation is now triggered manually via the "Generate Report" button
    // This prevents unnecessary API calls and gives users explicit control
  }, [filters.selectedTags, filters.dataMode]);
  
  // Force refetch when tags are selected in live mode
  useEffect(() => {
    if (filters.dataMode === 'live' && filters.selectedTags.length > 0 && !isDemoMode) {
      console.log('[TagReports] Tags selected in live mode, triggering gateway data refetch');
      refetchGatewayData();
    }
  }, [filters.selectedTags, filters.dataMode, refetchGatewayData, isDemoMode]);

  // Toggle PLC expansion
  const togglePlcExpansion = (plcId: string) => {
    setExpandedPlcs(prev => {
      const prevArray = Array.from(prev);
      const newSet = new Set(prevArray);
      if (newSet.has(plcId)) {
        newSet.delete(plcId);
      } else {
        newSet.add(plcId);
      }
      return newSet;
    });
  };

  // Toggle all tags in PLC
  const togglePlcTags = (plcId: string) => {
    const plcTags = tagsByPlc[plcId]?.map(t => t.id) || [];
    const allSelected = plcTags.every(id => filters.selectedTags.includes(id));
    
    setFilters(prev => ({
      ...prev,
      selectedTags: allSelected 
        ? prev.selectedTags.filter(id => !plcTags.includes(id))
        : Array.from(new Set([...prev.selectedTags, ...plcTags]))
    }));
  };

  // Export functions
  const exportToCSV = () => {
    if (reportData.length === 0) return;
    
    const headers = filters.aggregationType === 'none' 
      ? ['Tag Name', 'PLC', 'Timestamp', 'Value', 'Unit', 'Quality']
      : ['Tag Name', 'PLC', 'Avg', 'Min', 'Max', 'Batches'];
    
    const csvData = [headers];
    
    reportData.forEach(row => {
      if (filters.aggregationType === 'none') {
        csvData.push([
          row.tagName,
          row.plcName,
          row.timestamp.toISOString(),
          row.value.toString(),
          row.unit || '',
          row.quality
        ]);
      } else {
        csvData.push([
          row.tagName,
          row.plcName,
          row.avgValue?.toString() || '',
          row.minValue?.toString() || '',
          row.maxValue?.toString() || '',
          row.batches?.toString() || ''
        ]);
      }
    });
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `tag_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Tag Report', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
    
    const tableData = reportData.slice(0, 50).map(row => 
      filters.aggregationType === 'none'
        ? [row.tagName.substring(0, 20), row.plcName.substring(0, 15), row.value.toString(), row.quality]
        : [row.tagName.substring(0, 20), row.plcName.substring(0, 15), row.avgValue?.toString() || '-', row.minValue?.toString() || '-', row.maxValue?.toString() || '-']
    );
    
    autoTable(doc, {
      head: [filters.aggregationType === 'none' ? ['Tag', 'PLC', 'Value', 'Quality'] : ['Tag', 'PLC', 'Avg', 'Min', 'Max']],
      body: tableData,
      startY: 40,
      headStyles: { fillColor: [6, 182, 212] },
      styles: { fontSize: 8 }
    });
    
    doc.save(`tag_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <WaterSystemLayout
      title="Tag Reports"
      subtitle="Real-time and historical tag data reporting">
      
      {/* Compact Control Bar */}
      <div className="bg-slate-900/80 border border-cyan-500/30 rounded-lg p-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Data Mode Toggle */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filters.dataMode === 'live' ? 'default' : 'outline'}
              onClick={() => {
                setFilters(prev => ({ ...prev, dataMode: 'live' }));
                setIsLiveMode(true);
              }}
              className={filters.dataMode === 'live' ? 'bg-cyan-600 h-8' : 'border-cyan-500/50 text-cyan-300 h-8'}
            >
              <Activity className="h-3 w-3 mr-1" />
              Live
            </Button>
            <Button
              size="sm"
              variant={filters.dataMode === 'historical' ? 'default' : 'outline'}
              onClick={() => {
                setFilters(prev => ({ ...prev, dataMode: 'historical' }));
                setIsLiveMode(false);
              }}
              className={filters.dataMode === 'historical' ? 'bg-cyan-600 h-8' : 'border-cyan-500/50 text-cyan-300 h-8'}
            >
              <Clock className="h-3 w-3 mr-1" />
              Historical
            </Button>
          </div>

          {/* Live Controls */}
          {filters.dataMode === 'live' && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isLiveMode ? 'destructive' : 'default'}
                onClick={() => setIsLiveMode(!isLiveMode)}
                className="h-8"
              >
                {isLiveMode ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
              {isLiveMode && (
                <Badge className="bg-green-900/30 text-green-300 animate-pulse">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Live
                </Badge>
              )}
            </div>
          )}

          {/* Historical Date Range */}
          {filters.dataMode === 'historical' && (
            <>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="h-8 w-36 bg-slate-800 border-slate-600 text-white text-sm"
                />
                <span className="text-slate-400 text-sm">to</span>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="h-8 w-36 bg-slate-800 border-slate-600 text-white text-sm"
                />
              </div>
              
              <Select 
                value={filters.aggregationType} 
                onValueChange={(value: any) => setFilters(prev => ({ ...prev, aggregationType: value }))}
              >
                <SelectTrigger className="h-8 w-32 bg-slate-800 border-slate-600 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="none" className="text-white text-sm">Raw Data</SelectItem>
                  <SelectItem value="hourly" className="text-white text-sm">Hourly</SelectItem>
                  <SelectItem value="daily" className="text-white text-sm">Daily</SelectItem>
                  <SelectItem value="weekly" className="text-white text-sm">Weekly</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                size="sm"
                onClick={handleGenerateData}
                disabled={filters.selectedTags.length === 0}
                className="h-8 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Generate Report
              </Button>
            </>
          )}

          {/* Search */}
          <div className="flex-1 max-w-xs">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />
              <Input
                placeholder="Search tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 pr-7 h-8 bg-slate-800 border-slate-600 text-white text-sm"
              />
              {searchTerm && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-0 top-0 h-8 w-8 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {filters.selectedTags.length > 0 && (
              <Badge className="bg-cyan-900/30 text-cyan-300">
                {filters.selectedTags.length} tags
              </Badge>
            )}
            <Button
              size="sm"
              onClick={() => setShowVisualization(!showVisualization)}
              className="h-8 bg-slate-600 hover:bg-slate-700"
            >
              {showVisualization ? 'Hide' : 'Show'} Chart
            </Button>
            {filters.dataMode === 'live' && showVisualization && (
              <Select
                value={chartMode}
                onValueChange={(value: any) => setChartMode(value)}>
                <SelectTrigger className="w-28 h-8 bg-slate-800 border-cyan-500/50 text-cyan-300 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-cyan-500/50">
                  <SelectItem value="oscilloscope">Oscilloscope</SelectItem>
                  <SelectItem value="radar">Radar</SelectItem>
                  <SelectItem value="line">Line</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button size="sm" onClick={exportToCSV} className="h-8 bg-cyan-600 hover:bg-cyan-700">
              <FileSpreadsheet className="h-3 w-3" />
            </Button>
            <Button size="sm" onClick={exportToPDF} className="h-8 bg-blue-600 hover:bg-blue-700">
              <Download className="h-3 w-3" />
            </Button>
            <Button size="sm" onClick={() => window.print()} className="h-8 bg-slate-600 hover:bg-slate-700">
              <Printer className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Tag Selection Panel */}
        <div className="col-span-3">
          <Card className="bg-slate-900/80 border-cyan-500/30 h-[calc(100vh-280px)]">
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-cyan-300">Tag Selection</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <ScrollArea className="h-[calc(100vh-360px)]">
                {Object.entries(tagsByPlc).map(([plcId, tags]) => {
                  const plcName = tags[0]?.plcName || plcId;
                  const isExpanded = expandedPlcs.has(plcId);
                  const selectedCount = tags.filter(t => filters.selectedTags.includes(t.id)).length;
                  
                  return (
                    <div key={plcId} className="mb-2">
                      <div className="flex items-center gap-1 p-1 rounded hover:bg-slate-800/50 cursor-pointer">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => togglePlcExpansion(plcId)}
                          className="p-0 h-5 w-5"
                        >
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </Button>
                        <Checkbox
                          checked={selectedCount === tags.length && selectedCount > 0}
                          onCheckedChange={() => togglePlcTags(plcId)}
                          className="h-4 w-4 border-cyan-500"
                        />
                        <div className="flex-1 text-xs text-white" onClick={() => togglePlcExpansion(plcId)}>
                          {plcName}
                        </div>
                        {selectedCount > 0 && (
                          <Badge className="bg-cyan-900/30 text-cyan-300 text-xs h-5 px-1">
                            {selectedCount}
                          </Badge>
                        )}
                      </div>
                      
                      {isExpanded && (
                        <div className="ml-6 mt-1">
                          {tags.map(tag => (
                            <label
                              key={tag.id}
                              className="flex items-center gap-2 p-1 hover:bg-slate-800/30 cursor-pointer"
                            >
                              <Checkbox
                                checked={filters.selectedTags.includes(tag.id)}
                                onCheckedChange={(checked) => {
                                  setFilters(prev => ({
                                    ...prev,
                                    selectedTags: checked 
                                      ? [...prev.selectedTags, tag.id]
                                      : prev.selectedTags.filter(id => id !== tag.id)
                                  }));
                                }}
                                className="h-3 w-3 border-cyan-500"
                              />
                              <div className="flex-1">
                                <div className="text-xs text-white">{tag.tagName}</div>
                                <div className="text-xs text-slate-500">{tag.dataType} • {tag.unit}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Data Display Area */}
        <div className="col-span-9">
          {showVisualization && reportData.length > 0 ? (
            <Card className="bg-slate-900/80 border-cyan-500/30 mb-4">
              <CardHeader className="py-2 pb-1">
                <CardTitle className="text-sm text-cyan-300">
                  {filters.dataMode === 'live' ? 'Live Data Visualization' : 'Historical Trend Chart'}
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  {filters.dataMode === 'live' 
                    ? 'Real-time data with multiple visualization modes' 
                    : 'Line chart showing historical data trends over time'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {filters.dataMode === 'live' && chartMode !== 'line' ? (
                  <div>
                    <LiveDataOscilloscope
                      data={reportData.map(d => ({
                        tagId: d.tagId,
                        tagName: d.tagName,
                        value: typeof d.value === 'number' ? d.value : 0,
                        timestamp: new Date(d.timestamp)
                      }))}
                      mode={chartMode as 'oscilloscope' | 'radar'}
                      height={256}
                    />
                    {/* Oscilloscope Legend */}
                    {chartMode === 'oscilloscope' && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {Array.from(new Set(reportData.map(d => d.tagId))).slice(0, 5).map((tagId, index) => {
                          const colors = ['rgb(6, 182, 212)', 'rgb(34, 197, 94)', 'rgb(168, 85, 247)', 'rgb(251, 146, 60)', 'rgb(250, 204, 21)'];
                          const color = colors[index % colors.length];
                          const tagData = reportData.find(d => d.tagId === tagId);
                          return (
                            <div key={tagId} className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                              />
                              <span className="text-xs text-white">{tagData?.tagName}</span>
                              <span className="text-xs text-slate-400">({tagData?.unit || 'units'})</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                <div className="h-64">
                  {(() => {
                    const tagGroups = reportData.reduce((acc, item) => {
                      if (!acc[item.tagId]) acc[item.tagId] = [];
                      acc[item.tagId].push(item);
                      return acc;
                    }, {} as Record<string, typeof reportData>);
                    
                    // Create unique colors for each dataset
                    const colors = ['rgb(6, 182, 212)', 'rgb(34, 197, 94)', 'rgb(168, 85, 247)', 'rgb(251, 146, 60)', 'rgb(250, 204, 21)'];
                    
                    const datasets = Object.entries(tagGroups).slice(0, 5).map(([tagId, data], index) => {
                      const color = colors[index % colors.length];
                      
                      let values: number[] = [];
                      let isBooleanData = false;
                      let label = '';
                      let displayLabel = '';
                      
                      if (filters.dataMode === 'live') {
                        // For live mode, get the current value and historical data
                        const latestValue = data[data.length - 1];
                        if (latestValue) {
                          isBooleanData = typeof latestValue.value === 'boolean';
                          
                          // For authenticated users, use real historical data
                          if (!isDemoMode && tagHistoricalData[latestValue.tagId]) {
                            const historicalPoints = tagHistoricalData[latestValue.tagId];
                            console.log(`[Chart] Using real historical data for ${latestValue.tagName}: ${historicalPoints.length} points`);
                            
                            // Use actual historical values
                            values = historicalPoints.map(point => point.value);
                            
                            // If we don't have enough points yet, pad with the current value at the beginning
                            while (values.length < 20) {
                              values.unshift(values[0] || 0);
                            }
                            
                            // Keep only last 20 points
                            if (values.length > 20) {
                              values = values.slice(-20);
                            }
                            
                            label = latestValue.tagName || 'Unknown';
                            displayLabel = isBooleanData ? `${label} (On/Off)` : label;
                            
                            console.log(`[Chart] Displaying values for ${label}: [${values.slice(-5).join(', ')}...]`);
                          } else if (isDemoMode) {
                            // For demo mode, create synthetic patterns
                            let currentValue: number;
                            
                            if (typeof latestValue.value === 'boolean') {
                              currentValue = latestValue.value ? 100 : 0;
                            } else if (typeof latestValue.value === 'number') {
                              currentValue = latestValue.value;
                            } else {
                              const parsed = parseFloat(latestValue.value as string);
                              currentValue = isNaN(parsed) ? 0 : parsed;
                            }
                            
                            // Create realistic oscillating patterns based on tag type
                            const timePoints = 20;
                            const baseValue = currentValue;
                            const tagNameLower = latestValue.tagName.toLowerCase();
                            
                            // Determine measurement type and create appropriate pattern
                            let amplitude, frequency, patternType;
                            
                            if (tagNameLower.includes('temp') || tagNameLower.includes('temperature')) {
                              // Temperature: slow changes, medium amplitude
                              amplitude = baseValue * 0.25;
                              frequency = 0.2;
                              patternType = 'sine';
                            } else if (tagNameLower.includes('pressure') || tagNameLower.includes('psi')) {
                              // Pressure: quick fluctuations, high amplitude
                              amplitude = baseValue * 0.4;
                              frequency = 1.2;
                              patternType = 'sawtooth';
                            } else if (tagNameLower.includes('flow') || tagNameLower.includes('rate')) {
                              // Flow: irregular spikes, medium frequency
                              amplitude = baseValue * 0.35;
                              frequency = 0.8;
                              patternType = 'irregular';
                            } else if (tagNameLower.includes('level') || tagNameLower.includes('tank')) {
                              // Level: gradual changes, low frequency
                              amplitude = baseValue * 0.2;
                              frequency = 0.15;
                              patternType = 'triangle';
                            } else if (tagNameLower.includes('speed') || tagNameLower.includes('rpm')) {
                              // Speed: rapid oscillations, high frequency
                              amplitude = baseValue * 0.3;
                              frequency = 1.8;
                              patternType = 'square';
                            } else if (tagNameLower.includes('ph') || tagNameLower.includes('chemical')) {
                              // Chemical: precise control, small variations
                              amplitude = baseValue * 0.15;
                              frequency = 0.4;
                              patternType = 'sine';
                            } else {
                              // Default: moderate oscillation
                              amplitude = baseValue * 0.25;
                              frequency = 0.5 + (index * 0.3);
                              patternType = 'sine';
                            }
                            
                            const phase = index * Math.PI / 2; // Phase shift per tag
                            
                            values = Array.from({ length: timePoints }, (_, i) => {
                              const t = i / timePoints * 4 * Math.PI;
                              let oscillation = 0;
                              
                              switch (patternType) {
                                case 'sine':
                                  oscillation = Math.sin(t * frequency + phase) * amplitude;
                                  break;
                                case 'sawtooth':
                                  oscillation = ((t * frequency + phase) % (2 * Math.PI) / Math.PI - 1) * amplitude;
                                  break;
                                case 'triangle':
                                  const trianglePhase = (t * frequency + phase) % (2 * Math.PI);
                                  oscillation = trianglePhase < Math.PI 
                                    ? (trianglePhase / Math.PI * 2 - 1) * amplitude
                                    : (2 - trianglePhase / Math.PI * 2 - 1) * amplitude;
                                  break;
                                case 'square':
                                  oscillation = Math.sign(Math.sin(t * frequency + phase)) * amplitude * 0.8;
                                  break;
                                case 'irregular':
                                  oscillation = (Math.sin(t * frequency + phase) + 
                                               Math.sin(t * frequency * 2.3 + phase) * 0.3 +
                                               Math.sin(t * frequency * 0.7 + phase) * 0.5) * amplitude * 0.6;
                                  break;
                              }
                              
                              const noise = (Math.random() - 0.5) * (baseValue * 0.02);
                              return Math.max(0, baseValue + oscillation + noise);
                            });
                            
                            label = latestValue.tagName || 'Unknown';
                            displayLabel = isBooleanData ? `${label} (On/Off)` : label;
                          } else {
                            // For authenticated users with no historical data yet, show current value
                            let currentValue: number;
                            
                            if (typeof latestValue.value === 'boolean') {
                              currentValue = latestValue.value ? 100 : 0;
                            } else if (typeof latestValue.value === 'number') {
                              currentValue = latestValue.value;
                            } else {
                              const parsed = parseFloat(latestValue.value as string);
                              currentValue = isNaN(parsed) ? 0 : parsed;
                            }
                            
                            // Just show the current value repeated
                            values = Array(20).fill(currentValue);
                            label = latestValue.tagName || 'Unknown';
                            displayLabel = isBooleanData ? `${label} (On/Off)` : label;
                            
                            console.log(`[Chart] No historical data yet for ${label}, showing current value: ${currentValue}`);
                          }
                        }
                      } else {
                        // For historical mode, use actual sorted data
                        const sortedData = data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).slice(0, 50);
                        
                        values = sortedData.map(d => {
                          if (typeof d.value === 'boolean') {
                            return d.value ? 100 : 0;
                          } else if (typeof d.value === 'number') {
                            return d.value;
                          } else {
                            const parsed = parseFloat(d.value as string);
                            return isNaN(parsed) ? 0 : parsed;
                          }
                        });
                        
                        isBooleanData = typeof data[0]?.value === 'boolean';
                        label = data[0]?.tagName || 'Unknown';
                        displayLabel = isBooleanData ? `${label} (On/Off)` : label;
                      }
                      
                      return {
                        label: displayLabel,
                        data: values,
                        borderColor: color,
                        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
                        tension: 0.4,
                        pointRadius: filters.dataMode === 'live' ? 3 : 2,
                        pointHoverRadius: filters.dataMode === 'live' ? 5 : 4,
                        borderWidth: filters.dataMode === 'live' ? 3 : 2,
                        fill: false,
                        showLine: true,
                        spanGaps: true,
                        yAxisID: isBooleanData ? 'y1' : 'y'
                      };
                    });
                    
                    // Get time labels - for live mode, use a consistent time sequence
                    let labels: string[] = [];
                    if (filters.dataMode === 'live') {
                      // For live data, create a consistent time sequence
                      const now = new Date();
                      const timePoints = 20; // Show last 20 time points
                      labels = Array.from({ length: timePoints }, (_, i) => {
                        const time = new Date(now.getTime() - (timePoints - 1 - i) * 1000);
                        return time.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          second: '2-digit' 
                        });
                      });
                    } else {
                      // For historical data, use actual timestamps
                      const firstDataset = Object.values(tagGroups)[0];
                      labels = firstDataset ? firstDataset.slice(0, 50).map(d => {
                        const date = new Date(d.timestamp);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }) : [];
                    }
                    
                    const chartData = {
                      labels,
                      datasets
                    };
                    
                    const chartOptions = {
                      responsive: true,
                      maintainAspectRatio: false,
                      elements: {
                        line: {
                          borderJoinStyle: 'round' as const,
                          borderCapStyle: 'round' as const,
                        },
                        point: {
                          hoverRadius: 6
                        }
                      },
                      plugins: {
                        legend: { 
                          display: true, 
                          labels: { 
                            color: 'white', 
                            font: { size: 10 },
                            padding: 10,
                            usePointStyle: true
                          },
                          position: 'top' as const
                        },
                        title: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => {
                              const label = context.dataset.label || '';
                              const value = context.parsed.y;
                              return `${label}: ${value.toFixed(2)}`;
                            }
                          }
                        }
                      },
                      scales: {
                        x: { 
                          display: true,
                          ticks: { 
                            color: 'rgb(148, 163, 184)', 
                            font: { size: 10 },
                            maxRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: filters.dataMode === 'live' ? 20 : 10
                          },
                          grid: { color: 'rgba(148, 163, 184, 0.1)' }
                        },
                        y: {
                          type: 'linear' as const,
                          display: true,
                          position: 'left' as const,
                          ticks: { 
                            color: 'rgb(148, 163, 184)', 
                            font: { size: 10 }
                          },
                          grid: { color: 'rgba(148, 163, 184, 0.1)' },
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Values',
                            color: 'rgb(148, 163, 184)',
                            font: { size: 10 }
                          }
                        },
                        y1: {
                          type: 'linear' as const,
                          display: true,
                          position: 'right' as const,
                          ticks: { 
                            color: 'rgb(34, 197, 94)', 
                            font: { size: 10 },
                            callback: function(value: any) {
                              return value >= 50 ? 'ON' : 'OFF';
                            }
                          },
                          grid: { drawOnChartArea: false },
                          min: -10,
                          max: 110,
                          title: {
                            display: true,
                            text: 'Status',
                            color: 'rgb(34, 197, 94)',
                            font: { size: 10 }
                          }
                        }
                      }
                    };
                    
                    return <Line data={chartData} options={chartOptions} />;
                  })()}
                </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card className="bg-slate-900/80 border-cyan-500/30 h-[calc(100vh-280px)]">
            <CardContent className="p-0">
              <div className="overflow-auto h-[calc(100vh-300px)]">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-900 z-10">
                    <TableRow className="border-slate-700">
                      {filters.dataMode === 'live' || filters.aggregationType === 'none' ? (
                        <>
                          <TableHead className="text-cyan-300 text-xs font-semibold">Tag</TableHead>
                          <TableHead className="text-cyan-300 text-xs font-semibold">PLC</TableHead>
                          <TableHead className="text-cyan-300 text-xs font-semibold">Time</TableHead>
                          <TableHead className="text-cyan-300 text-xs font-semibold">Value</TableHead>
                          {filters.dataMode === 'live' && (
                            <TableHead className="text-cyan-300 text-xs font-semibold">Trend</TableHead>
                          )}
                          <TableHead className="text-cyan-300 text-xs font-semibold">Quality</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-cyan-300 text-xs font-semibold">Tag</TableHead>
                          <TableHead className="text-cyan-300 text-xs font-semibold">PLC</TableHead>
                          <TableHead className="text-cyan-300 text-xs font-semibold">Avg</TableHead>
                          <TableHead className="text-cyan-300 text-xs font-semibold">Min</TableHead>
                          <TableHead className="text-cyan-300 text-xs font-semibold">Max</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <p className="text-slate-400 text-sm">
                            {filters.dataMode === 'live' 
                              ? 'Select tags to view live data'
                              : 'Select tags and configure filters to generate report'}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData.slice(0, 200).map((row, index) => (
                        <TableRow key={index} className="border-slate-700 hover:bg-slate-800/30">
                          {filters.dataMode === 'live' || filters.aggregationType === 'none' ? (
                            <>
                              <TableCell className="text-xs text-white py-1">{row.tagName}</TableCell>
                              <TableCell className="text-xs text-cyan-300 py-1">{row.plcName}</TableCell>
                              <TableCell className="text-xs text-slate-300 py-1">
                                {filters.dataMode === 'live' 
                                  ? new Date(row.timestamp).toLocaleTimeString()
                                  : new Date(row.timestamp).toLocaleString()}
                              </TableCell>
                              <TableCell className={`text-xs py-1 ${
                                row.quality === 'bad' ? 'text-red-400' :
                                row.quality === 'uncertain' ? 'text-yellow-400' :
                                'text-green-400'
                              }`}>
                                <span className="flex items-center gap-1">
                                  {row.quality === 'bad' && <span className="text-red-500">⚠</span>}
                                  {row.quality === 'uncertain' && <span className="text-yellow-500">⚠</span>}
                                  {typeof row.value === 'number' ? row.value.toFixed(2) : row.value.toString()} {row.unit}
                                </span>
                              </TableCell>
                              {filters.dataMode === 'live' && (
                                <TableCell className="py-1">
                                  {tagSparklines[row.tagId] && tagSparklines[row.tagId].length > 1 ? (
                                    <Sparkline
                                      values={tagSparklines[row.tagId]}
                                      width={80}
                                      height={24}
                                      color="rgb(6, 182, 212)"
                                    />
                                  ) : (
                                    <span className="text-xs text-slate-500">Loading...</span>
                                  )}
                                </TableCell>
                              )}
                              <TableCell className="py-1">
                                <Badge className={`text-xs h-5 ${
                                  row.quality === 'good' ? 'bg-green-900/30 text-green-300' :
                                  row.quality === 'uncertain' ? 'bg-yellow-900/30 text-yellow-300' :
                                  'bg-red-900/30 text-red-300'
                                }`}>
                                  {row.quality}
                                </Badge>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-xs text-white py-1">{row.tagName}</TableCell>
                              <TableCell className="text-xs text-cyan-300 py-1">{row.plcName}</TableCell>
                              <TableCell className="text-xs text-green-400 py-1">
                                {row.avgValue} {row.unit}
                              </TableCell>
                              <TableCell className="text-xs text-slate-300 py-1">
                                {row.minValue} {row.unit}
                              </TableCell>
                              <TableCell className="text-xs text-slate-300 py-1">
                                {row.maxValue} {row.unit}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </WaterSystemLayout>
  );
}