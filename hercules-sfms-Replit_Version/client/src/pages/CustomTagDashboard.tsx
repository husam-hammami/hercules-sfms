import { useState, useEffect, useRef } from 'react';
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout';
import { globalSimulator } from '@/lib/plc-data-simulator';
import { useDemo } from '@/contexts/DemoContext';
import { useDemoData } from '@/contexts/DemoDataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { 
  Plus, X, ChevronRight, ChevronDown, RefreshCw, Settings,
  Activity, Gauge, TrendingUp, BarChart3, PieChart, Edit, Save,
  Move, Maximize2, Trash2, Palette, CheckSquare, Square, Calculator,
  Calendar, Clock
} from 'lucide-react';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import { formatNumber, formatPercentage } from '@/utils/formatNumber';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ResponsiveGridLayout = WidthProvider(Responsive);

// Widget types user can create
type WidgetType = 'kpi' | 'gauge' | 'trend' | 'bar' | 'horizontalBar' | 'donut' | 'radar';

// Time aggregation types for charts
type TimeAggregation = 'none' | 'hourly' | 'daily' | 'weekly';
type AxisType = 'time' | 'tag' | 'index';

interface CustomWidget {
  id: string;
  type: WidgetType;
  title: string;
  tagIds: string[];
  colors?: string[];
  formula?: string; // For KPI cards
  unit?: string; // For KPI cards
  xAxisType?: AxisType; // What to show on X axis
  xAxisTagId?: string; // If xAxisType is 'tag', which tag to use
  yAxisTagIds?: string[]; // Which tags to show on Y axis (defaults to tagIds)
  timeAggregation?: TimeAggregation; // How to aggregate time-based data
  showTimeRange?: boolean; // Whether to show time range selector
}

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

// Extended color palette - 20 unique colors
const DEFAULT_COLORS = [
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#a855f7', // purple-500
  '#ef4444', // red-500
  '#3b82f6', // blue-500
  '#84cc16', // lime-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#8b5cf6', // violet-500
  '#22c55e', // green-500
  '#eab308', // yellow-500
  '#0ea5e9', // sky-500
  '#d946ef', // fuchsia-500
  '#f43f5e', // rose-500
  '#64748b', // slate-500
  '#6366f1', // indigo-500
  '#78716c', // stone-500
  '#737373', // neutral-500
];

// Helper function to aggregate time-based data
function aggregateTimeData(data: any[], aggregation: TimeAggregation) {
  if (aggregation === 'none' || !data || data.length === 0) {
    return data;
  }
  
  const aggregated = new Map<string, { values: number[], timestamp: Date }>();
  
  data.forEach(point => {
    let key: string;
    const date = new Date(point.timestamp);
    
    switch (aggregation) {
      case 'hourly':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
        break;
      case 'daily':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        break;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
        break;
      default:
        return;
    }
    
    if (!aggregated.has(key)) {
      aggregated.set(key, { values: [], timestamp: date });
    }
    aggregated.get(key)!.values.push(point.value);
  });
  
  // Calculate averages
  return Array.from(aggregated.values()).map(group => ({
    value: group.values.reduce((a, b) => a + b, 0) / group.values.length,
    timestamp: group.timestamp,
    quality: 192 // Good quality
  }));
}

// Format time labels based on aggregation
function formatTimeLabel(date: Date, aggregation: TimeAggregation) {
  switch (aggregation) {
    case 'hourly':
      return `${date.getHours()}:00`;
    case 'daily':
      return `${date.getMonth() + 1}/${date.getDate()}`;
    case 'weekly':
      return `Week ${Math.ceil(date.getDate() / 7)}`;
    default:
      return '';
  }
}

// Futuristic 3D Gauge component with animations - with custom color support
function FuturisticGauge({ tagId, tagData, tags, color }: any) {
  const stringId = String(tagId);
  const tag = tags.find((t: any) => String(t.id) === stringId);
  const data = tagData.get(stringId);
  const value = typeof data?.value === 'number' ? data.value : 0;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  // Use provided color or default cyan
  const primaryColor = color || '#06b6d4';
  
  // Determine max based on tag type
  let max = 100;
  if (tag?.tagName?.includes('Level')) max = 100;
  else if (tag?.tagName?.includes('Flow')) max = 200;
  else if (tag?.tagName?.includes('Pressure')) max = 150;
  else if (tag?.tagName?.includes('Temperature')) max = 100;
  else if (tag?.tagName?.includes('Speed')) max = 3000;
  
  const percentage = Math.min(100, (value / max) * 100);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 20;
    
    let rotation = 0;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Convert hex to RGB for opacity
      const r = parseInt(primaryColor.slice(1, 3), 16);
      const g = parseInt(primaryColor.slice(3, 5), 16);
      const b = parseInt(primaryColor.slice(5, 7), 16);
      
      // Create 3D depth effect with multiple layers
      for (let depth = 3; depth >= 0; depth--) {
        const depthOffset = depth * 2;
        const opacity = 1 - (depth * 0.2);
        
        // Background ring with 3D effect
        ctx.beginPath();
        ctx.arc(centerX + depthOffset/2, centerY + depthOffset/2, radius - depth, 
                -Math.PI * 0.75, Math.PI * 0.75);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.1 * opacity})`;
        ctx.lineWidth = 12 - depth;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      
      // Animated scanning line
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      
      const gradient = ctx.createLinearGradient(-radius, 0, radius, 0);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
      gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.3)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius, 0);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      
      // Progress arc with gradient
      const progressGradient = ctx.createLinearGradient(
        centerX - radius, centerY,
        centerX + radius, centerY
      );
      
      // Create lighter version of color for gradient
      progressGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.6)`);
      progressGradient.addColorStop(0.5, primaryColor);
      progressGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.8)`);
      
      ctx.beginPath();
      const startAngle = -Math.PI * 0.75;
      const endAngle = startAngle + (Math.PI * 1.5 * percentage / 100);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = progressGradient;
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      // Glowing tip
      const tipAngle = endAngle;
      const tipX = centerX + Math.cos(tipAngle) * radius;
      const tipY = centerY + Math.sin(tipAngle) * radius;
      
      const glowGradient = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 15);
      glowGradient.addColorStop(0, primaryColor);
      glowGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.5)`);
      glowGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      
      ctx.beginPath();
      ctx.arc(tipX, tipY, 8, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();
      
      // Inner glow effect
      const innerGlow = ctx.createRadialGradient(
        centerX, centerY, radius * 0.5,
        centerX, centerY, radius * 0.8
      );
      innerGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.1)`);
      innerGlow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = innerGlow;
      ctx.fill();
      
      // Center display with holographic effect
      ctx.save();
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 20;
      
      // Value text
      const fontSize = Math.min(24, radius / 3);
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        typeof value === 'boolean' ? (value ? 'ON' : 'OFF') : value.toFixed(1),
        centerX, centerY - fontSize/3
      );
      
      // Unit text
      ctx.font = `${fontSize/2}px monospace`;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(tag?.unit || '', centerX, centerY + fontSize/3);
      
      ctx.restore();
      
      rotation += 0.02;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, percentage, tag, primaryColor]);
  
  return (
    <div className="flex flex-col items-center justify-center h-full relative p-2">
      <canvas 
        ref={canvasRef} 
        width={160} 
        height={160}
        className="drop-shadow-[0_0_30px_rgba(6,182,212,0.5)] w-full h-full max-w-[160px] max-h-[160px]"
        style={{ width: '100%', height: 'auto', aspectRatio: '1' }}
      />
      <div className="text-xs text-cyan-400 mt-2 font-mono uppercase tracking-wider text-center">
        {tag?.tagName}
      </div>
    </div>
  );
}

// Multiple Gauges Display for multiple tags with individual colors
function MultipleGauges({ tagIds, tagData, tags, colors }: any) {
  const numGauges = tagIds.length;
  const cols = Math.ceil(Math.sqrt(numGauges));
  
  return (
    <div 
      className="grid gap-2 h-full p-2"
      style={{ 
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${Math.ceil(numGauges / cols)}, 1fr)`
      }}
    >
      {tagIds.map((tagId: string, idx: number) => (
        <div key={tagId} className="min-h-0">
          <FuturisticGauge 
            tagId={tagId} 
            tagData={tagData} 
            tags={tags}
            color={colors?.[idx] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
          />
        </div>
      ))}
    </div>
  );
}

// KPI Card with formula support
function KPICard({ widget, tagData, tags }: any) {
  const calculateValue = () => {
    if (!widget.formula || widget.tagIds.length === 0) {
      // If no formula, just show first tag value - ensure string ID
      const firstTagId = String(widget.tagIds[0]);
      const data = tagData.get(firstTagId);
      return data?.value || 0;
    }
    
    // Replace tag placeholders with actual values
    let formula = widget.formula;
    widget.tagIds.forEach((tagId: string, index: number) => {
      const stringId = String(tagId);
      const data = tagData.get(stringId);
      const value = typeof data?.value === 'number' ? data.value : 0;
      // Support both T1, T2, etc. and tag names
      formula = formula.replace(new RegExp(`T${index + 1}`, 'g'), value.toString());
      
      const tag = tags.find((t: any) => String(t.id) === stringId);
      if (tag) {
        formula = formula.replace(new RegExp(tag.tagName, 'g'), value.toString());
      }
    });
    
    try {
      // Safely evaluate the formula
      const result = Function('"use strict"; return (' + formula + ')')();
      return typeof result === 'number' ? result : 0;
    } catch (e) {
      console.error('Formula evaluation error:', e);
      return 0;
    }
  };
  
  const value = calculateValue();
  const primaryColor = widget.colors?.[0] || '#06b6d4';
  
  return (
    <div className="h-full p-4 flex flex-col">
      <div className="text-sm text-cyan-300 uppercase tracking-wider mb-2 font-mono text-center">
        {widget.title}
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          {/* Background glow effect */}
          <div 
            className="absolute inset-0 blur-3xl opacity-30 rounded-full"
            style={{ backgroundColor: primaryColor }}
          />
          
          {/* Main KPI display */}
          <div className="relative bg-slate-900/90 rounded-xl border border-cyan-500/30 p-8
                          backdrop-blur-xl shadow-2xl min-w-[200px] text-center">
            <div className="text-6xl font-bold text-white mb-2
                            bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent
                            drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              {typeof value === 'number' ? value.toFixed(2) : value}
            </div>
            
            {widget.unit && (
              <div className="text-xl text-cyan-300/80 font-mono uppercase tracking-wider">
                {widget.unit}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// API client helper functions
const dashboardApi = {
  async loadDashboards() {
    const response = await fetch('/api/user-dashboards');
    if (!response.ok) throw new Error('Failed to load dashboards');
    return response.json();
  },
  
  async saveDashboard(id: number | null, widgets: CustomWidget[], layouts: any) {
    if (id) {
      // Update existing dashboard
      const response = await fetch(`/api/user-dashboards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgets,
          layouts,
          name: 'My Dashboard'
        })
      });
      if (!response.ok) throw new Error('Failed to update dashboard');
      return response.json();
    } else {
      // Create new dashboard
      const response = await fetch('/api/user-dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgets,
          layouts,
          name: 'My Dashboard',
          isDefault: true
        })
      });
      if (!response.ok) throw new Error('Failed to create dashboard');
      return response.json();
    }
  },
  
  async deleteDashboard(id: number) {
    const response = await fetch(`/api/user-dashboards/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete dashboard');
  }
};

export default function CustomTagDashboard() {
  const { isDemoMode } = useDemo();
  const { theme } = useTheme();
  const demoData = isDemoMode ? useDemoData() : null;
  const [tagData, setTagData] = useState<Map<string, any>>(new Map());
  const [historicalData, setHistoricalData] = useState<Map<string, any[]>>(new Map());
  
  // Theme-aware colors
  const getThemeColors = () => {
    const isLight = theme === 'light';
    return {
      tooltipBg: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)',
      tooltipBorder: isLight ? '#3b82f6' : '#06b6d4',
      tooltipTitle: isLight ? '#1e40af' : '#06b6d4',
      tooltipBody: isLight ? '#475569' : '#94a3b8',
      gridColor: isLight ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.1)',
      textColor: isLight ? '#1e293b' : '#94a3b8',
      labelColor: isLight ? '#475569' : '#94a3b8',
      tickColor: isLight ? '#64748b' : '#94a3b8',
    };
  };
  
  // Date range filter state for historical data (always historical mode)
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const [startDate, setStartDate] = useState<string>(weekAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(today.toISOString().split('T')[0]);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);
  
  // Dashboard state
  const [currentDashboardId, setCurrentDashboardId] = useState<number | null>(null);
  const [widgets, setWidgets] = useState<CustomWidget[]>([]);
  const [layouts, setLayouts] = useState<{ lg: Layout[] }>({ lg: [] });
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isSavingDashboard, setIsSavingDashboard] = useState(false);
  
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [widgetTitle, setWidgetTitle] = useState('');
  const [widgetType, setWidgetType] = useState<WidgetType>('kpi');
  const [widgetFormula, setWidgetFormula] = useState('');
  const [widgetUnit, setWidgetUnit] = useState('');
  const [expandedPlcs, setExpandedPlcs] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  
  // New axis configuration states
  const [xAxisType, setXAxisType] = useState<AxisType>('time');
  const [xAxisTagId, setXAxisTagId] = useState<string>('');
  const [yAxisTagIds, setYAxisTagIds] = useState<string[]>([]);
  const [timeAggregation, setTimeAggregation] = useState<TimeAggregation>('none');
  const [showTimeRange, setShowTimeRange] = useState(false);
  
  // Fetch PLCs and tags for authenticated users
  const { data: apiPlcs = [] } = useQuery<any[]>({
    queryKey: ['/api/plc-configurations'],
    enabled: !isDemoMode
  });
  
  const { data: apiTags = [] } = useQuery<any[]>({
    queryKey: ['/api/plc-tags'],
    enabled: !isDemoMode
  });
  
  // Get all tag IDs from widgets for fetching real-time data
  const allWidgetTagIds = widgets.reduce((acc: string[], widget) => {
    return [...acc, ...widget.tagIds];
  }, []);
  
  // Fetch real-time data from gateway endpoint
  const { data: gatewayData } = useQuery({
    queryKey: ['/api/gateway/data', allWidgetTagIds],
    queryFn: async () => {
      if (allWidgetTagIds.length === 0) {
        return { tagData: [] };
      }
      const params = new URLSearchParams();
      params.append('tagIds', allWidgetTagIds.join(','));
      const response = await fetch(`/api/gateway/data?${params}`);
      if (!response.ok) throw new Error('Failed to fetch gateway data');
      return response.json();
    },
    enabled: !isDemoMode && allWidgetTagIds.length > 0,
    refetchInterval: 1000 // Refresh every second for real-time updates
  });
  
  // Get all tags grouped by PLC
  let tagsByPlc: any = {};
  let allTags: any[] = [];
  
  if (isDemoMode && demoData) {
    // Demo mode: use demo data
    tagsByPlc = demoData.plcTags.reduce((acc: any, tag: any) => {
      const plcName = tag.plcName || 'Unknown';
      if (!acc[plcName]) acc[plcName] = [];
      acc[plcName].push(tag);
      return acc;
    }, {}) || {};
    allTags = Object.values(tagsByPlc).flat() as any[];
  } else {
    // Authenticated mode: use API data and map name to tagName
    tagsByPlc = apiTags.reduce((acc: any, tag: any) => {
      const plc = apiPlcs.find((p: any) => p.id === tag.plcId);
      const plcName = plc?.name || 'Unknown PLC';
      if (!acc[plcName]) acc[plcName] = [];
      acc[plcName].push({ 
        ...tag, 
        tagName: tag.name || tag.tagName || `${tag.dataType} + ${tag.unit || ''}`, // Map name to tagName
        plcName 
      });
      return acc;
    }, {});
    allTags = Object.values(tagsByPlc).flat() as any[];
  }
  
  // Load dashboard on mount
  useEffect(() => {
    const loadDashboard = async () => {
      if (isDemoMode) {
        setIsLoadingDashboard(false);
        return;
      }
      
      try {
        const dashboards = await dashboardApi.loadDashboards();
        if (dashboards && dashboards.length > 0) {
          // Load the first dashboard (or the default one)
          const defaultDashboard = dashboards.find((d: any) => d.isDefault) || dashboards[0];
          setCurrentDashboardId(defaultDashboard.id);
          setWidgets(defaultDashboard.widgets || []);
          setLayouts(defaultDashboard.layouts || { lg: [] });
        } else {
          // No dashboards exist, create a new one
          const newDashboard = await dashboardApi.saveDashboard(null, [], { lg: [] });
          setCurrentDashboardId(newDashboard.id);
        }
      } catch (error) {
        console.error('Failed to load dashboard:', error);
        // Fall back to empty dashboard
      } finally {
        setIsLoadingDashboard(false);
      }
    };
    
    loadDashboard();
  }, [isDemoMode]);
  
  // Save dashboard whenever widgets or layouts change
  useEffect(() => {
    // Skip saving during initial load or demo mode
    if (isLoadingDashboard || isDemoMode || !currentDashboardId) return;
    
    const saveTimer = setTimeout(async () => {
      try {
        setIsSavingDashboard(true);
        await dashboardApi.saveDashboard(currentDashboardId, widgets, layouts);
      } catch (error) {
        console.error('Failed to save dashboard:', error);
      } finally {
        setIsSavingDashboard(false);
      }
    }, 1000); // Debounce saving by 1 second
    
    return () => clearTimeout(saveTimer);
  }, [widgets, layouts, currentDashboardId, isLoadingDashboard, isDemoMode]);
  
  // Load historical data on mount and when widgets change
  useEffect(() => {
    // Always load historical data since we're in historical-only mode
    if (widgets.length > 0 && startDate && endDate) {
      fetchHistoricalData();
    }
  }, [widgets.length, startDate, endDate]);
  
  // No longer subscribe to real-time updates - historical only
  useEffect(() => {
    // Skip all real-time updates - dashboard is historical only
    return;
    
    if (isDemoMode && demoData) {
      // Demo mode: use simulator
      const unsubscribe = globalSimulator.subscribe((simTags) => {
        const newData = new Map();
        simTags.forEach(tag => {
          newData.set(tag.tagId, {
            value: tag.value,
            quality: tag.quality,
            trend: tag.trend,
            timestamp: tag.timestamp
          });
        });
        setTagData(newData);
      });
      
      // Generate historical data for live mode visualization
      demoData?.plcTags?.forEach(tag => {
        const history = globalSimulator.generateHistoricalData(tag.id, 24, 60);
        setHistoricalData(prev => new Map(prev).set(tag.id, history));
      });
      
      return () => unsubscribe();
    } else if (!isDemoMode && gatewayData?.tagData) {
      // Authenticated mode: use gateway data
      const newData = new Map();
      gatewayData.tagData.forEach((item: any) => {
        // Map tag data by both ID and name since gateway might send either
        const tagId = item.tagId || item.id;
        const tagName = item.tagName || item.name;
        
        // Find the tag in our allTags array to get the correct ID
        const matchingTag = allTags.find(t => 
          t.id === tagId || 
          t.name === tagName || 
          t.tagName === tagName ||
          t.name === tagId // In case gateway sends name as ID
        );
        
        if (matchingTag) {
          // Use the tag's actual ID for the map key
          newData.set(matchingTag.id, {
            value: item.value,
            quality: item.quality,
            timestamp: new Date(item.timestamp),
            trend: 'steady' // You could calculate trend based on historical values
          });
        } else if (tagId) {
          // Fallback: use whatever ID we have
          newData.set(tagId, {
            value: item.value,
            quality: item.quality,
            timestamp: new Date(item.timestamp),
            trend: 'steady'
          });
        }
      });
      setTagData(newData);
      
      // For authenticated users, use current value for historical data visualization
      // Since we only store lastValue, not full history, we'll show the current value over time
      allWidgetTagIds.forEach(tagId => {
        const currentData = newData.get(tagId);
        if (currentData && !historicalData.has(tagId)) {
          // Create history with current value repeated (since we don't store historical data)
          const history = Array.from({ length: 60 }, (_, i) => ({
            value: currentData.value,
            quality: currentData.quality,
            timestamp: new Date(Date.now() - (60 - i) * 60000)
          }));
          setHistoricalData(prev => new Map(prev).set(tagId, history));
        } else if (currentData) {
          // Update the last value in history with current data
          setHistoricalData(prev => {
            const history = prev.get(tagId) || [];
            const newHistory = [...history.slice(-59), {
              value: currentData.value,
              quality: currentData.quality,
              timestamp: currentData.timestamp
            }];
            return new Map(prev).set(tagId, newHistory);
          });
        }
      });
    }
  }, [isDemoMode, demoData, gatewayData, allWidgetTagIds]);
  
  const togglePlcExpansion = (plcName: string) => {
    setExpandedPlcs(prev => {
      const newSet = new Set(Array.from(prev));
      if (newSet.has(plcName)) {
        newSet.delete(plcName);
      } else {
        newSet.add(plcName);
      }
      return newSet;
    });
  };
  
  const selectAllPlcTags = (plcName: string) => {
    const plcTags = tagsByPlc[plcName] as any[];
    const plcTagIds = plcTags.map(t => String(t.id));
    
    // Check if all tags from this PLC are already selected
    const allSelected = plcTagIds.every(id => selectedTags.includes(id));
    
    if (allSelected) {
      // Deselect all tags from this PLC
      setSelectedTags(selectedTags.filter(id => !plcTagIds.includes(id)));
    } else {
      // Select all tags from this PLC
      const newSelectedTags = new Set([...selectedTags, ...plcTagIds]);
      setSelectedTags(Array.from(newSelectedTags));
    }
  };
  
  const addColorSlot = () => {
    setCustomColors([...customColors, DEFAULT_COLORS[customColors.length % DEFAULT_COLORS.length]]);
  };
  
  const updateColor = (index: number, color: string) => {
    const newColors = [...customColors];
    newColors[index] = color;
    setCustomColors(newColors);
  };
  
  const removeColorSlot = (index: number) => {
    setCustomColors(customColors.filter((_, i) => i !== index));
  };
  
  const addWidget = () => {
    if (selectedTags.length === 0 || !widgetTitle) return;
    
    // Generate unique colors for the widget
    const widgetColors = customColors.length > 0 
      ? [...customColors]
      : selectedTags.map((_, idx) => DEFAULT_COLORS[idx % DEFAULT_COLORS.length]);
    
    const newWidget: CustomWidget = {
      id: Date.now().toString(),
      type: widgetType,
      title: widgetTitle,
      tagIds: [...selectedTags],
      colors: widgetColors,
      formula: widgetType === 'kpi' ? widgetFormula : undefined,
      unit: widgetType === 'kpi' ? widgetUnit : undefined,
      xAxisType: ['trend', 'bar', 'horizontalBar'].includes(widgetType) ? xAxisType : undefined,
      xAxisTagId: xAxisType === 'tag' ? xAxisTagId : undefined,
      yAxisTagIds: yAxisTagIds.length > 0 ? yAxisTagIds : [...selectedTags],
      timeAggregation: xAxisType === 'time' ? timeAggregation : undefined,
      showTimeRange: xAxisType === 'time' ? showTimeRange : undefined
    };
    
    // Calculate default size based on widget type
    const defaultSizes = {
      kpi: { w: 3, h: 2, minW: 2, minH: 2 },
      gauge: { 
        w: selectedTags.length > 1 ? 4 : 2, 
        h: selectedTags.length > 1 ? 3 : 2, 
        minW: 2, 
        minH: 2 
      },
      trend: { w: 4, h: 2, minW: 3, minH: 2 },
      bar: { w: 3, h: 2, minW: 2, minH: 2 },
      horizontalBar: { w: 4, h: 3, minW: 3, minH: 2 },
      donut: { w: 2, h: 2, minW: 2, minH: 2 },
      radar: { w: 3, h: 3, minW: 3, minH: 3 }
    };
    
    const size = defaultSizes[widgetType];
    
    // Find available position
    const existingLayouts = layouts.lg || [];
    let y = 0;
    if (existingLayouts.length > 0) {
      y = Math.max(...existingLayouts.map(l => l.y + l.h));
    }
    
    const newLayout: LayoutItem = {
      i: newWidget.id,
      x: 0,
      y: y,
      ...size
    };
    
    setWidgets([...widgets, newWidget]);
    setLayouts({ lg: [...existingLayouts, newLayout] });
    setShowAddWidget(false);
    setSelectedTags([]);
    setWidgetTitle('');
    setWidgetFormula('');
    setWidgetUnit('');
    setCustomColors([]);
    setXAxisType('time');
    setXAxisTagId('');
    setYAxisTagIds([]);
    setTimeAggregation('none');
    setShowTimeRange(false);
  };
  
  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
    setLayouts({ lg: layouts.lg.filter(l => l.i !== id) });
    setSelectedWidget(null);
  };
  
  const clearAllWidgets = () => {
    setWidgets([]);
    setLayouts({ lg: [] });
    setSelectedWidget(null);
  };
  
  // Fetch historical data from the API
  const fetchHistoricalData = async () => {
    if (!startDate || !endDate || widgets.length === 0) return;
    
    setIsLoadingHistorical(true);
    
    try {
      // Collect all tag IDs from widgets - ensure they are strings
      const allTagIds = new Set<string>();
      widgets.forEach(widget => {
        widget.tagIds.forEach(id => allTagIds.add(String(id)));
      });
      
      // Fetch historical data from the API
      const response = await fetch('/api/gateway/historical-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          tagIds: Array.from(allTagIds),
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate + 'T23:59:59').toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch historical data: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Process historical data and group by tag
      const newHistoricalData = new Map<string, any[]>();
      const latestValues = new Map<string, any>();
      
      if (result.data && Array.isArray(result.data)) {
        console.log(`[CUSTOM_DASHBOARD] Processing ${result.data.length} historical data points`);
        
        // Group data by tag_id
        result.data.forEach((dataPoint: any) => {
          // Ensure we handle both string and numeric IDs
          const tagId = String(dataPoint.tag_id);
          
          if (!newHistoricalData.has(tagId)) {
            newHistoricalData.set(tagId, []);
          }
          
          const point = {
            value: parseFloat(dataPoint.value) || 0,
            quality: dataPoint.quality || 192,
            timestamp: new Date(dataPoint.timestamp || dataPoint.received_at)
          };
          
          newHistoricalData.get(tagId)!.push(point);
          
          // Track latest value for current display
          if (!latestValues.has(tagId) || point.timestamp > latestValues.get(tagId).timestamp) {
            latestValues.set(tagId, {
              value: point.value,
              quality: point.quality,
              timestamp: point.timestamp,
              trend: 'steady'
            });
          }
        });
        
        // Sort each tag's data by timestamp
        newHistoricalData.forEach((data, tagId) => {
          data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        });
        
        // Debug: log what we're storing
        console.log('[CUSTOM_DASHBOARD] Latest values map:', Array.from(latestValues.entries()));
        console.log('[CUSTOM_DASHBOARD] Historical data tags:', Array.from(newHistoricalData.keys()));
      }
      
      // Update state with historical data
      setHistoricalData(newHistoricalData);
      setTagData(latestValues);
      
      console.log(`[CUSTOM_DASHBOARD] Fetched ${result.data?.length || 0} historical data points for ${newHistoricalData.size} tags`);
      
    } catch (error) {
      console.error('[CUSTOM_DASHBOARD] Error fetching historical data:', error);
    } finally {
      setIsLoadingHistorical(false);
    }
  };
  
  const onLayoutChange = (layout: Layout[]) => {
    setLayouts({ lg: layout });
  };
  
  const renderWidget = (widget: CustomWidget) => {
    // Ensure we're using string IDs consistently
    const firstTagId = String(widget.tagIds[0]);
    const firstTag = allTags.find(t => String(t.id) === firstTagId);
    const data = tagData.get(firstTagId);
    const history = historicalData.get(firstTagId) || [];
    
    const isSelected = selectedWidget === widget.id && editMode;
    const widgetColors = widget.colors || DEFAULT_COLORS;
    
    const widgetContent = (
      <div className="relative h-full">
        {isSelected && (
          <div className="absolute inset-0 border-2 border-cyan-400 rounded-lg pointer-events-none z-20" />
        )}
        
        {editMode && (
          <div 
            className="absolute top-1 right-1 z-50 flex gap-1 pointer-events-auto"
            style={{ zIndex: 9999 }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="ghost"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeWidget(widget.id);
              }}
              className="h-10 w-10 p-0 bg-red-600/90 hover:bg-red-500 text-white 
                         border-2 border-red-400/70 hover:border-red-300
                         shadow-xl hover:shadow-red-500/30 transition-all duration-200
                         hover:scale-105 backdrop-blur-sm cursor-pointer
                         flex items-center justify-center"
              title="Delete widget"
              style={{ 
                pointerEvents: 'auto',
                position: 'relative',
                zIndex: 9999
              }}
            >
              <X className="h-5 w-5 pointer-events-none" />
            </Button>
          </div>
        )}
        
        <div className="h-full">
          {(() => {
            switch (widget.type) {
              case 'kpi':
                return <KPICard widget={widget} tagData={tagData} tags={allTags} />;
                
              case 'gauge':
                return (
                  <div className="p-2 h-full group">
                    <div className="text-xs text-cyan-700 dark:text-cyan-400 uppercase tracking-wider mb-1 font-mono truncate">
                      {widget.title}
                    </div>
                    <div className="transform-gpu transition-all duration-300 ease-out 
                                    group-hover:scale-105 group-hover:-translate-y-1 
                                    group-hover:[transform:perspective(1000px)_rotateX(-5deg)_rotateY(5deg)]
                                    group-hover:shadow-2xl">
                      {widget.tagIds.length > 1 ? (
                        <MultipleGauges 
                          tagIds={widget.tagIds} 
                          tagData={tagData} 
                          tags={allTags}
                          colors={widgetColors}
                        />
                      ) : (
                        <FuturisticGauge 
                          tagId={widget.tagIds[0]} 
                          tagData={tagData} 
                          tags={allTags}
                          color={widgetColors[0]}
                        />
                      )}
                    </div>
                  </div>
                );
                
              case 'trend':
                // Debug logging for trend chart
                console.log('[TREND_CHART] Widget:', widget);
                console.log('[TREND_CHART] Historical data keys:', Array.from(historicalData.keys()));
                
                // Determine which tags to display on Y-axis
                const yTags = widget.yAxisTagIds || widget.tagIds;
                const xType = widget.xAxisType || 'time';
                const timeAgg = widget.timeAggregation || 'none';
                
                // Get history for labels - use first tag's history or create default
                const firstTagHistory = historicalData.get(String(yTags[0])) || [];
                const aggregatedHistory = aggregateTimeData(firstTagHistory, timeAgg);
                const labelCount = Math.max(aggregatedHistory.length, 30);
                
                // Generate labels based on x-axis type
                let chartLabels: string[];
                if (xType === 'time') {
                  chartLabels = aggregatedHistory.slice(-30).map(d => 
                    formatTimeLabel(new Date(d.timestamp), timeAgg)
                  );
                  if (chartLabels.length === 0) {
                    chartLabels = Array.from({ length: 30 }, () => '');
                  }
                } else {
                  chartLabels = Array.from({ length: Math.min(labelCount, 30) }, (_, i) => '');
                }
                
                return (
                  <div className="p-3 h-full relative group">
                    {/* Animated background grid */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10" />
                    </div>
                    
                    <div className="relative z-10 h-full flex flex-col">
                      <div className="text-xs text-cyan-700 dark:text-cyan-300 uppercase tracking-wider mb-2 font-mono truncate">
                        {widget.title}
                        {timeAgg !== 'none' && <span className="ml-2 text-cyan-600/70 dark:text-cyan-500/70">({timeAgg})</span>}
                      </div>
                      <div className="flex-1 min-h-0 transform-gpu transition-all duration-300 ease-out 
                                      group-hover:scale-105 group-hover:-translate-y-1 
                                      group-hover:[transform:perspective(1000px)_rotateX(-5deg)_rotateY(5deg)]
                                      group-hover:shadow-2xl">
                        <Line
                          data={{
                            labels: chartLabels,
                            datasets: yTags.map((tagId, idx) => {
                              const stringId = String(tagId);
                              const tag = allTags.find(t => String(t.id) === stringId);
                              const tagHistory = historicalData.get(stringId) || [];
                              const aggregatedData = aggregateTimeData(tagHistory, timeAgg);
                              const color = widgetColors[idx % widgetColors.length];
                              
                              console.log(`[TREND_CHART] Tag ${stringId}: aggregated length=${aggregatedData.length}, tag=`, tag);
                              
                              return {
                                label: tag ? `${tag.tagName}${tag.unit ? ` (${tag.unit})` : ''}` : 'Unknown',
                                data: aggregatedData.slice(-30).map(d => d.value),
                                borderColor: color,
                                backgroundColor: `${color}20`,
                                tension: 0.4,
                                pointRadius: timeAgg !== 'none' ? 3 : 0,
                                pointHoverRadius: 6,
                                pointHoverBackgroundColor: color,
                                pointHoverBorderColor: '#fff',
                                pointHoverBorderWidth: 2,
                                borderWidth: 2,
                                fill: true
                              };
                            })
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: {
                              mode: 'index',
                              intersect: false
                            },
                            plugins: { 
                              legend: { 
                                display: true,  // Always show legend to display tag name and unit
                                position: 'bottom',
                                labels: {
                                  color: getThemeColors().labelColor,
                                  font: { size: 9, family: 'monospace' },
                                  boxWidth: 10,
                                  padding: 5
                                }
                              },
                              tooltip: {
                                backgroundColor: getThemeColors().tooltipBg,
                                borderColor: getThemeColors().tooltipBorder,
                                borderWidth: 1,
                                titleColor: getThemeColors().tooltipTitle,
                                bodyColor: getThemeColors().tooltipBody,
                                padding: 8,
                                displayColors: true
                              }
                            },
                            scales: {
                              x: { 
                                display: xType === 'time' && timeAgg !== 'none',
                                grid: { display: false },
                                ticks: {
                                  color: getThemeColors().tickColor,
                                  font: { size: 8, family: 'monospace' },
                                  maxRotation: 45,
                                  minRotation: 0
                                }
                              },
                              y: { 
                                display: true,
                                ticks: {
                                  color: getThemeColors().tickColor,
                                  font: { size: 9, family: 'monospace' },
                                  padding: 4
                                },
                                grid: {
                                  color: getThemeColors().gridColor
                                }
                              }
                            },
                            animation: {
                              duration: 750,
                              easing: 'easeInOutQuart'
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
                
              case 'bar':
                // Get axis configuration
                const barXType = widget.xAxisType || 'time';
                const barTimeAgg = widget.timeAggregation || 'none';
                const barYTags = widget.yAxisTagIds && widget.yAxisTagIds.length > 0 ? widget.yAxisTagIds : widget.tagIds;
                
                // Generate labels and datasets based on axis configuration
                let barLabels: string[] = [];
                let barDatasets: any[] = [];
                
                if (barXType === 'time') {
                  // Time-based bar chart - show bars for different time periods
                  // Use first tag's history for time labels
                  const firstBarTagHistory = historicalData.get(String(barYTags[0])) || [];
                  const aggregatedBarHistory = aggregateTimeData(firstBarTagHistory, barTimeAgg);
                  
                  // Generate time labels
                  barLabels = aggregatedBarHistory.slice(-20).map(d => 
                    formatTimeLabel(new Date(d.timestamp), barTimeAgg)
                  );
                  
                  if (barLabels.length === 0) {
                    barLabels = ['No Data'];
                  }
                  
                  // Create dataset for each selected tag
                  barDatasets = barYTags.map((tagId, idx) => {
                    const stringId = String(tagId);
                    const tag = allTags.find(t => String(t.id) === stringId);
                    const tagHistory = historicalData.get(stringId) || [];
                    const aggregatedData = aggregateTimeData(tagHistory, barTimeAgg);
                    const color = widgetColors[idx % widgetColors.length];
                    
                    console.log(`[BAR_CHART] Tag ${stringId}: aggregated length=${aggregatedData.length}, tag=`, tag);
                    
                    return {
                      label: tag ? `${tag.tagName}${tag.unit ? ` (${tag.unit})` : ''}` : 'Unknown',
                      data: aggregatedData.slice(-20).map(d => d.value),
                      backgroundColor: color ? (color.startsWith('#') ? color + '80' : color) : 'rgba(6, 182, 212, 0.5)',
                      borderColor: color || '#06b6d4',
                      borderWidth: 2,
                      borderRadius: 6,
                      borderSkipped: false
                    };
                  });
                } else {
                  // Tag-based or category-based bar chart - show current values
                  const barChartData = barYTags.map(id => {
                    const stringId = String(id);
                    const d = tagData.get(stringId);
                    const value = typeof d?.value === 'number' ? d.value : 0;
                    console.log(`[BAR_CHART] Tag ${stringId}: value=${value}, data=`, d);
                    return value;
                  });
                  
                  barLabels = barYTags.map(id => {
                    const stringId = String(id);
                    const tag = allTags.find(t => String(t.id) === stringId);
                    return tag ? `${tag.tagName}${tag.unit ? ` (${tag.unit})` : ''}` : 'Unknown';
                  });
                  
                  barDatasets = [{
                    label: 'Current Value',
                    data: barChartData,
                    backgroundColor: barYTags.map((_, idx) => {
                      const color = widgetColors[idx % widgetColors.length];
                      if (!color) return 'rgba(6, 182, 212, 0.5)';
                      if (color.startsWith('rgba')) return color;
                      if (color.startsWith('rgb')) return color.replace('rgb', 'rgba').replace(')', ', 0.5)');
                      return color.startsWith('#') ? color + '80' : '#06b6d480';
                    }),
                    borderColor: barYTags.map((_, idx) => {
                      const color = widgetColors[idx % widgetColors.length];
                      if (!color) return '#06b6d4';
                      return color;
                    }),
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                  }];
                }
                
                console.log('[BAR_CHART] Labels:', barLabels);
                console.log('[BAR_CHART] Datasets:', barDatasets);
                
                return (
                  <div className="p-3 h-full relative group">
                    <div className="relative z-10 h-full flex flex-col">
                      <div className="text-xs text-cyan-700 dark:text-cyan-400 uppercase tracking-wider mb-2 font-mono truncate">
                        {widget.title}
                        {barTimeAgg !== 'none' && <span className="ml-2 text-cyan-600/70 dark:text-cyan-500/70">({barTimeAgg})</span>}
                      </div>
                      <div className="flex-1 min-h-0 transform-gpu transition-all duration-300 ease-out 
                                      group-hover:scale-105 group-hover:-translate-y-1 
                                      group-hover:[transform:perspective(1000px)_rotateX(-5deg)_rotateY(5deg)]
                                      group-hover:shadow-2xl">
                        <Bar
                          data={{
                            labels: barLabels,
                            datasets: barDatasets
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { 
                              legend: { display: false },
                              tooltip: {
                                backgroundColor: getThemeColors().tooltipBg,
                                borderColor: getThemeColors().tooltipBorder,
                                borderWidth: 1,
                                titleColor: getThemeColors().tooltipTitle,
                                bodyColor: getThemeColors().tooltipBody
                              }
                            },
                            scales: {
                              x: { 
                                display: true,
                                ticks: {
                                  color: getThemeColors().tickColor,
                                  font: { size: 9, family: 'monospace' }
                                },
                                grid: { display: false }
                              },
                              y: { 
                                display: true,
                                beginAtZero: true,  // Ensure bars start from zero
                                ticks: {
                                  color: getThemeColors().tickColor,
                                  font: { size: 9, family: 'monospace' }
                                },
                                grid: {
                                  color: getThemeColors().gridColor
                                }
                              }
                            },
                            animation: {
                              duration: 1000,
                              easing: 'easeInOutBack'
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
                
              case 'horizontalBar':
                // Get axis configuration for horizontal bar
                const hBarXType = widget.xAxisType || 'time';
                const hBarTimeAgg = widget.timeAggregation || 'none';
                const hBarYTags = widget.yAxisTagIds && widget.yAxisTagIds.length > 0 ? widget.yAxisTagIds : widget.tagIds;
                
                // Generate labels and datasets based on axis configuration
                let hBarLabels: string[] = [];
                let hBarDatasets: any[] = [];
                
                if (hBarXType === 'time') {
                  // Time-based horizontal bar chart
                  const firstHBarTagHistory = historicalData.get(String(hBarYTags[0])) || [];
                  const aggregatedHBarHistory = aggregateTimeData(firstHBarTagHistory, hBarTimeAgg);
                  
                  // Generate time labels
                  hBarLabels = aggregatedHBarHistory.slice(-15).map(d => 
                    formatTimeLabel(new Date(d.timestamp), hBarTimeAgg)
                  );
                  
                  if (hBarLabels.length === 0) {
                    hBarLabels = ['No Data'];
                  }
                  
                  // Create dataset for each selected tag
                  hBarDatasets = hBarYTags.map((tagId, idx) => {
                    const stringId = String(tagId);
                    const tag = allTags.find(t => String(t.id) === stringId);
                    const tagHistory = historicalData.get(stringId) || [];
                    const aggregatedData = aggregateTimeData(tagHistory, hBarTimeAgg);
                    const color = widgetColors[idx % widgetColors.length];
                    
                    console.log(`[HBAR_CHART] Tag ${stringId}: aggregated length=${aggregatedData.length}, tag=`, tag);
                    
                    return {
                      label: tag ? `${tag.tagName}${tag.unit ? ` (${tag.unit})` : ''}` : 'Unknown',
                      data: aggregatedData.slice(-15).map(d => d.value),
                      backgroundColor: color ? (color.startsWith('#') ? color + 'CC' : color) : 'rgba(6, 182, 212, 0.8)',
                      borderColor: color || '#06b6d4',
                      borderWidth: 1,
                      borderRadius: 4,
                      barThickness: 30,
                      maxBarThickness: 40
                    };
                  });
                } else {
                  // Tag-based or category-based horizontal bar chart
                  const hBarChartData = hBarYTags.map(id => {
                    const stringId = String(id);
                    const d = tagData.get(stringId);
                    const value = typeof d?.value === 'number' ? d.value : 0;
                    console.log(`[HBAR_CHART] Tag ${stringId}: value=${value}, data=`, d);
                    return value;
                  });
                  
                  hBarLabels = hBarYTags.map(id => {
                    const stringId = String(id);
                    const tag = allTags.find(t => String(t.id) === stringId);
                    return tag ? `${tag.tagName}${tag.unit ? ` (${tag.unit})` : ''}` : 'Unknown';
                  });
                  
                  hBarDatasets = [{
                    label: 'Current Value',
                    data: hBarChartData,
                    backgroundColor: hBarYTags.map((_, idx) => {
                      const color = widgetColors[idx % widgetColors.length];
                      if (!color) return 'rgba(6, 182, 212, 0.8)';
                      if (color.startsWith('rgba')) return color;
                      if (color.startsWith('rgb')) return color.replace('rgb', 'rgba').replace(')', ', 0.8)');
                      return color.startsWith('#') ? color + 'CC' : 'rgba(6, 182, 212, 0.8)';
                    }),
                    borderColor: hBarYTags.map((_, idx) => {
                      const color = widgetColors[idx % widgetColors.length];
                      return color || '#06b6d4';
                    }),
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 30,
                    maxBarThickness: 40
                  }];
                }
                
                return (
                  <div className="p-3 h-full relative group">
                    <div className="relative z-10 h-full flex flex-col">
                      <div className="text-xs text-cyan-700 dark:text-cyan-400 uppercase tracking-wider mb-2 font-mono truncate">
                        {widget.title}
                        {hBarTimeAgg !== 'none' && <span className="ml-2 text-cyan-600/70 dark:text-cyan-500/70">({hBarTimeAgg})</span>}
                      </div>
                      <div className="flex-1 min-h-0 transform-gpu transition-all duration-300 ease-out 
                                      group-hover:scale-105 group-hover:-translate-y-1 
                                      group-hover:[transform:perspective(1000px)_rotateX(-5deg)_rotateY(5deg)]
                                      group-hover:shadow-2xl">
                        <Bar
                          data={{
                            labels: hBarLabels,
                            datasets: hBarDatasets
                          }}
                          options={{
                            indexAxis: 'y', // This makes the bar chart horizontal
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { 
                              legend: { display: false },
                              tooltip: {
                                backgroundColor: getThemeColors().tooltipBg,
                                borderColor: getThemeColors().tooltipBorder,
                                borderWidth: 1,
                                titleColor: getThemeColors().tooltipTitle,
                                bodyColor: getThemeColors().tooltipBody,
                                callbacks: {
                                  label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed.x || 0;
                                    return `${label}: ${value.toFixed(2)}`;
                                  }
                                }
                              }
                            },
                            scales: {
                              x: { 
                                display: true,
                                beginAtZero: true,
                                ticks: {
                                  color: getThemeColors().tickColor,
                                  font: { size: 9, family: 'monospace' }
                                },
                                grid: {
                                  color: getThemeColors().gridColor
                                }
                              },
                              y: { 
                                display: true,
                                ticks: {
                                  color: getThemeColors().tickColor,
                                  font: { size: 9, family: 'monospace' }
                                },
                                grid: { display: false }
                              }
                            },
                            animation: {
                              duration: 1000,
                              easing: 'easeInOutBack'
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
                
              case 'donut':
                // Debug logging for donut chart data - ensure string IDs
                const donutChartData = widget.tagIds.map(id => {
                  const stringId = String(id);
                  const d = tagData.get(stringId);
                  const value = typeof d?.value === 'number' ? Math.abs(d.value) : 0;
                  console.log(`[DONUT_CHART] Tag ${stringId}: value=${value}, data=`, d);
                  return value;
                });
                console.log('[DONUT_CHART] Final data array:', donutChartData);
                console.log('[DONUT_CHART] Widget colors:', widgetColors);
                console.log('[DONUT_CHART] Has data:', donutChartData.some(v => v > 0));
                
                return (
                  <div className="p-3 h-full relative group">
                    <div className="relative z-10 h-full flex flex-col">
                      <div className="text-xs text-cyan-700 dark:text-cyan-400 uppercase tracking-wider mb-2 font-mono truncate text-center">
                        {widget.title}
                      </div>
                      
                      <div className="flex-1 min-h-0 relative">
                        <div className="h-full transform-gpu transition-all duration-300 ease-out 
                                        group-hover:scale-105 group-hover:-translate-y-1 
                                        group-hover:[transform:perspective(1000px)_rotateX(-5deg)_rotateY(5deg)]
                                        group-hover:shadow-2xl">
                          <Doughnut
                            data={{
                              labels: widget.tagIds.map(id => {
                                const stringId = String(id);
                                const tag = allTags.find(t => String(t.id) === stringId);
                                return tag ? `${tag.tagName}${tag.unit ? ` (${tag.unit})` : ''}` : 'Unknown';
                              }),
                              datasets: [{
                                data: donutChartData,
                                backgroundColor: widget.tagIds.map((_, idx) => {
                                  const color = widgetColors[idx % widgetColors.length];
                                  // Ensure color is valid and add transparency correctly
                                  if (!color) return 'rgba(6, 182, 212, 0.9)'; // Fallback color with high opacity
                                  // If it's already an rgba, return as-is, otherwise add transparency
                                  if (color.startsWith('rgba')) return color;
                                  if (color.startsWith('rgb')) return color.replace('rgb', 'rgba').replace(')', ', 0.9)');
                                  // For hex colors, add transparency (90 = 56% opacity)
                                  return color.startsWith('#') ? color + '90' : '#06b6d490';
                                }),
                                borderColor: widget.tagIds.map((_, idx) => {
                                  const color = widgetColors[idx % widgetColors.length];
                                  if (!color) return '#06b6d4'; // Fallback color
                                  return color;
                                }),
                                borderWidth: 2,
                                hoverOffset: 25,
                                hoverBorderWidth: 4
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: { 
                                legend: { 
                                  display: true,
                                  position: 'right',
                                  labels: {
                                    color: getThemeColors().labelColor,
                                    font: { size: 9, family: 'monospace' },
                                    boxWidth: 10,
                                    padding: 5
                                  }
                                },
                                tooltip: {
                                  enabled: true,
                                  backgroundColor: getThemeColors().tooltipBg,
                                  borderColor: getThemeColors().tooltipBorder,
                                  borderWidth: 2,
                                  titleColor: getThemeColors().tooltipTitle,
                                  bodyColor: getThemeColors().tooltipBody,
                                  padding: 12,
                                  cornerRadius: 8,
                                  displayColors: true,
                                  callbacks: {
                                    label: function(context) {
                                      const label = context.label || '';
                                      const value = context.parsed || 0;
                                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                      const percentage = ((value / total) * 100).toFixed(1);
                                      return `${label}: ${value} (${percentage}%)`;
                                    }
                                  }
                                }
                              },
                              animation: {
                                animateRotate: true,
                                animateScale: true,
                                duration: 1500,
                                easing: 'easeInOutCubic'
                              },
                              onHover: (event, elements) => {
                                const canvas = event?.native?.target as HTMLCanvasElement;
                                if (canvas && elements.length > 0) {
                                  canvas.style.transform = 'scale(1.05) translateZ(30px)';
                                  canvas.style.filter = 'drop-shadow(0 10px 20px rgba(6,182,212,0.3))';
                                  canvas.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                                } else if (canvas) {
                                  canvas.style.transform = 'scale(1) translateZ(0)';
                                  canvas.style.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))';
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
                
              case 'radar':
                return (
                  <div className="p-3 h-full relative group">
                    {/* Animated rotating background */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 rounded-full border border-cyan-500/20" />
                      <div className="absolute w-40 h-40 rounded-full border border-purple-500/20" />
                    </div>
                    
                    <div className="relative z-10 h-full flex flex-col">
                      <div className="text-xs text-cyan-700 dark:text-cyan-300 uppercase tracking-wider mb-2 font-mono truncate">
                        {widget.title}
                      </div>
                      <div className="flex-1 min-h-0 transform-gpu transition-all duration-300 ease-out 
                                      group-hover:scale-105 group-hover:-translate-y-1 
                                      group-hover:[transform:perspective(1000px)_rotateX(-5deg)_rotateY(5deg)]
                                      group-hover:shadow-2xl">
                        <Radar
                          data={{
                            labels: widget.tagIds.map(id => {
                              const tag = allTags.find(t => t.id === id);
                              return tag ? `${tag.tagName}${tag.unit ? ` (${tag.unit})` : ''}` : 'Unknown';
                            }),
                            datasets: [{
                              label: 'Current',
                              data: widget.tagIds.map(id => {
                                const d = tagData.get(id);
                                return typeof d?.value === 'number' ? d.value : 0;
                              }),
                              backgroundColor: widgetColors[0] + '20',
                              borderColor: widgetColors[0],
                              borderWidth: 2,
                              pointBackgroundColor: widgetColors[0],
                              pointBorderColor: '#fff',
                              pointHoverBackgroundColor: '#fff',
                              pointHoverBorderColor: widgetColors[0],
                              pointRadius: 4,
                              pointHoverRadius: 6
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { 
                              legend: { display: false },
                              tooltip: {
                                backgroundColor: getThemeColors().tooltipBg,
                                borderColor: getThemeColors().tooltipBorder,
                                borderWidth: 1,
                                titleColor: getThemeColors().tooltipTitle,
                                bodyColor: getThemeColors().tooltipBody
                              }
                            },
                            scales: {
                              r: {
                                angleLines: {
                                  color: getThemeColors().gridColor
                                },
                                grid: {
                                  color: getThemeColors().gridColor
                                },
                                pointLabels: {
                                  color: getThemeColors().labelColor,
                                  font: { size: 10, family: 'monospace' }
                                },
                                ticks: {
                                  color: getThemeColors().tickColor,
                                  font: { size: 8, family: 'monospace' },
                                  backdropColor: 'transparent'
                                }
                              }
                            },
                            animation: {
                              duration: 2000,
                              easing: 'easeInOutQuart'
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
                
              default:
                return null;
            }
          })()}
        </div>
      </div>
    );
    
    return widgetContent;
  };
  
  // Show loading state while fetching dashboard from database
  if (isLoadingDashboard && !isDemoMode) {
    return (
      <WaterSystemLayout
        title="Dashboard"
        subtitle="Live & historical data visualization for your PLC tags">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 dark:border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </WaterSystemLayout>
    );
  }
  
  // Show saving indicator
  const savingIndicator = isSavingDashboard && !isDemoMode && (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2 z-50">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-600 dark:border-cyan-400"></div>
      <span className="text-sm text-cyan-700 dark:text-cyan-400">Saving...</span>
    </div>
  );
  
  return (
    <WaterSystemLayout
      title="Dashboard"
      subtitle="Live & historical data visualization for your PLC tags">
      
      <div className="space-y-2">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-base font-bold text-transparent bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text">
            Dashboard
          </h1>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setEditMode(!editMode)}
              variant={editMode ? "default" : "outline"}
              className={editMode 
                ? "bg-cyan-600 hover:bg-cyan-700" 
                : "border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"}
            >
              {editMode ? (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  Done Editing
                </>
              ) : (
                <>
                  <Edit className="h-3 w-3 mr-1" />
                  Edit Layout
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddWidget(true)}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 
                         shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]
                         transition-all duration-300"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Widget
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearAllWidgets}
              className="border-red-500/50 text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          </div>
        </div>
        
        {/* Date Range Filter - Historical Only */}
        <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-cyan-500/30 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <span className="text-sm text-slate-700 dark:text-cyan-300">Historical Data:</span>
              </div>
              
              {/* Date Range Inputs */}
              <div className="flex items-center gap-2">
                <Label className="text-sm text-slate-700 dark:text-cyan-300">From:</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-cyan-500/30 text-slate-900 dark:text-white h-8 w-40"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-sm text-slate-700 dark:text-cyan-300">To:</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-cyan-500/30 text-slate-900 dark:text-white h-8 w-40"
                />
              </div>
              
              <Button
                size="sm"
                onClick={fetchHistoricalData}
                disabled={!startDate || !endDate || isLoadingHistorical}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
              >
                {isLoadingHistorical ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Load Data
                  </>
                )}
              </Button>
            </div>
            
            {/* Status Badge */}
            <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              {startDate && endDate 
                ? `${startDate} to ${endDate}` 
                : 'Select Date Range'}
            </Badge>
          </div>
        </Card>
        
        {editMode && (
          <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-cyan-500/30 p-3">
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-cyan-300">
              <Move className="h-4 w-4" />
              <span>Drag widgets to reposition</span>
              <Maximize2 className="h-4 w-4 ml-4" />
              <span>Drag corners to resize</span>
              <X className="h-4 w-4 ml-4" />
              <span>Click X to delete widget</span>
            </div>
          </Card>
        )}
        
        {/* Widgets Grid */}
        {widgets.length === 0 ? (
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/80 dark:to-slate-800/80 border-slate-200 dark:border-cyan-500/30 p-16 
                          backdrop-blur-xl shadow-lg dark:shadow-[0_0_50px_rgba(6,182,212,0.2)]">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full
                                shadow-lg dark:shadow-[0_0_40px_rgba(6,182,212,0.4)]">
                  <Settings className="h-12 w-12 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-transparent bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text mb-2">
                No Widgets Added
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                Start by adding widgets to monitor your configured tags and build your custom dashboard.
              </p>
              <Button
                onClick={() => setShowAddWidget(true)}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700
                           shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]
                           transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Widget
              </Button>
            </div>
          </Card>
        ) : (
          <div className="h-[calc(100vh-320px)] max-h-[800px]">
            <ResponsiveGridLayout
              className="layout h-full"
              layouts={layouts}
              onLayoutChange={onLayoutChange}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={70}
              isDraggable={editMode}
              isResizable={editMode}
              compactType="vertical"
              preventCollision={false}
              autoSize={false}
            >
              {widgets.map(widget => (
                <div 
                  key={widget.id}
                  className={`bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/90 dark:to-slate-800/90 
                             border border-slate-200 dark:border-cyan-500/30 
                             rounded-lg overflow-hidden backdrop-blur-xl
                             shadow-lg dark:shadow-[0_0_30px_rgba(6,182,212,0.2)] hover:shadow-xl dark:hover:shadow-[0_0_40px_rgba(6,182,212,0.4)]
                             transition-all duration-300 ${editMode ? 'cursor-move' : ''}`}
                  onClick={() => editMode && setSelectedWidget(widget.id)}
                >
                  {renderWidget(widget)}
                </div>
              ))}
            </ResponsiveGridLayout>
          </div>
        )}
        
        {/* Tag Selection Dialog */}
        <Dialog open={showAddWidget} onOpenChange={setShowAddWidget}>
          <DialogContent className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 
                                    border-slate-200 dark:border-cyan-500/30 max-w-4xl max-h-[90vh] overflow-y-auto
                                    backdrop-blur-xl shadow-lg dark:shadow-[0_0_50px_rgba(6,182,212,0.3)]">
            <DialogHeader>
              <DialogTitle className="text-transparent bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text">
                Add Widget
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                Select tags from your configured PLCs to create custom dashboard widgets
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Tag Selection */}
              <div className="space-y-4">
                <Label className="text-sm text-cyan-600 dark:text-cyan-300">Tag Selection</Label>
                <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-cyan-500/20 shadow-sm dark:shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                  <CardHeader className="p-3">
                    <CardTitle className="text-xs text-cyan-600 dark:text-cyan-300">Available Tags</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-64">
                      {Object.entries(tagsByPlc).map(([plcName, tags]) => {
                        const isExpanded = expandedPlcs.has(plcName);
                        const plcTags = tags as any[];
                        const plcTagIds = plcTags.map(t => t.id);
                        const allSelected = plcTagIds.every(id => selectedTags.includes(id));
                        const someSelected = plcTagIds.some(id => selectedTags.includes(id));
                        
                        return (
                          <div key={plcName} className="border-b border-slate-200 dark:border-slate-700 last:border-0">
                            <div className="flex items-center gap-2 p-3">
                              <button
                                className="hover:bg-cyan-100 dark:hover:bg-cyan-500/10 rounded p-1 transition-colors"
                                onClick={() => togglePlcExpansion(plcName)}
                              >
                                {isExpanded ? 
                                  <ChevronDown className="h-3 w-3 text-cyan-600 dark:text-cyan-400" /> : 
                                  <ChevronRight className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                                }
                              </button>
                              <span className="text-sm font-semibold text-slate-900 dark:text-white flex-1">{plcName}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => selectAllPlcTags(plcName)}
                                className="h-6 px-2 text-xs hover:bg-cyan-100 dark:hover:bg-cyan-500/10"
                              >
                                {allSelected ? (
                                  <>
                                    <CheckSquare className="h-3 w-3 mr-1" />
                                    Deselect All
                                  </>
                                ) : (
                                  <>
                                    <Square className="h-3 w-3 mr-1" />
                                    Select All
                                  </>
                                )}
                              </Button>
                            </div>
                            
                            {isExpanded && (
                              <div className="pb-2">
                                {plcTags.map((tag: any) => (
                                  <label
                                    key={tag.id}
                                    className="flex items-center gap-2 px-8 py-2 hover:bg-cyan-50 dark:hover:bg-cyan-500/5 cursor-pointer transition-colors"
                                  >
                                    <Checkbox
                                      checked={selectedTags.includes(String(tag.id))}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedTags([...selectedTags, String(tag.id)]);
                                        } else {
                                          setSelectedTags(selectedTags.filter(id => id !== String(tag.id)));
                                        }
                                      }}
                                      className="h-3 w-3 border-cyan-600 dark:border-cyan-500"
                                    />
                                    <div className="flex-1">
                                      <div className="text-sm text-slate-900 dark:text-white">{tag.tagName}</div>
                                      <div className="text-xs text-slate-500 dark:text-slate-500">
                                        {tag.dataType} • {tag.unit || 'No unit'}
                                      </div>
                                    </div>
                                    <div className="text-xs">
                                      <Badge className={`${
                                        tagData.get(tag.id)?.quality === 'good' 
                                          ? 'bg-green-900/30 text-green-300' 
                                          : 'bg-yellow-900/30 text-yellow-300'
                                      }`}>
                                        {tagData.get(tag.id)?.value?.toString() || '-'}
                                      </Badge>
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
                
                {selectedTags.length > 0 && (
                  <p className="text-xs text-cyan-600 dark:text-cyan-300">
                    {selectedTags.length} tag(s) selected
                  </p>
                )}
              </div>
              
              {/* Widget Configuration */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-cyan-600 dark:text-cyan-300">Widget Title</Label>
                  <Input
                    value={widgetTitle}
                    onChange={(e) => setWidgetTitle(e.target.value)}
                    placeholder="Enter widget title..."
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-cyan-500/30 text-slate-900 dark:text-white mt-1 
                               focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20"
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-cyan-600 dark:text-cyan-300">Widget Type</Label>
                  <Select value={widgetType} onValueChange={(v: WidgetType) => setWidgetType(v)}>
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-cyan-500/30 text-slate-900 dark:text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-cyan-500/30">
                      <SelectItem value="kpi">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-3 w-3" />
                          <span>KPI Card</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="gauge">
                        <div className="flex items-center gap-2">
                          <Gauge className="h-3 w-3" />
                          <span>Gauge Chart{selectedTags.length > 1 && ' (Multiple)'}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="trend">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-3 w-3" />
                          <span>Line Chart</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="bar">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-3 w-3" />
                          <span>Bar Chart</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="horizontalBar">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-3 w-3 rotate-90" />
                          <span>Horizontal Bar Chart</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="donut">
                        <div className="flex items-center gap-2">
                          <PieChart className="h-3 w-3" />
                          <span>Donut Chart</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="radar">
                        <div className="flex items-center gap-2">
                          <Activity className="h-3 w-3" />
                          <span>Radar Chart</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Chart Axis Configuration */}
                {['trend', 'bar', 'horizontalBar'].includes(widgetType) && (
                  <div className="space-y-4 p-4 bg-slate-100 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-cyan-500/20">
                    <div className="text-sm font-medium text-cyan-600 dark:text-cyan-300 mb-3">
                      Chart Configuration
                    </div>
                    
                    {/* X-Axis Configuration */}
                    <div>
                      <Label className="text-sm text-slate-700 dark:text-slate-300">X-Axis Type</Label>
                      <Select value={xAxisType} onValueChange={(v: AxisType) => setXAxisType(v)}>
                        <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-cyan-500/30 text-slate-900 dark:text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-cyan-500/30">
                          <SelectItem value="time">Time</SelectItem>
                          <SelectItem value="index">Index/Category</SelectItem>
                          <SelectItem value="tag">Tag Value</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Time Aggregation (if X-axis is Time) */}
                    {xAxisType === 'time' && (
                      <div>
                        <Label className="text-sm text-slate-700 dark:text-slate-300">Time Aggregation</Label>
                        <Select value={timeAggregation} onValueChange={(v: TimeAggregation) => setTimeAggregation(v)}>
                          <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-cyan-500/30 text-slate-900 dark:text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-cyan-500/30">
                            <SelectItem value="none">Raw Data</SelectItem>
                            <SelectItem value="hourly">Hourly Average</SelectItem>
                            <SelectItem value="daily">Daily Average</SelectItem>
                            <SelectItem value="weekly">Weekly Average</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {/* X-Axis Tag Selection (if X-axis is Tag) */}
                    {xAxisType === 'tag' && selectedTags.length > 0 && (
                      <div>
                        <Label className="text-sm text-slate-700 dark:text-slate-300">X-Axis Tag</Label>
                        <Select value={xAxisTagId} onValueChange={setXAxisTagId}>
                          <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-cyan-500/30 text-slate-900 dark:text-white mt-1">
                            <SelectValue placeholder="Select tag for X-axis" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-cyan-500/30">
                            {selectedTags.map(tagId => {
                              const tag = allTags.find(t => t.id === tagId);
                              return (
                                <SelectItem key={tagId} value={tagId}>
                                  {tag?.tagName || 'Unknown Tag'}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {/* Y-Axis Tags Selection */}
                    {selectedTags.length > 1 && (
                      <div>
                        <Label className="text-sm text-slate-700 dark:text-slate-300">Y-Axis Tags</Label>
                        <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                          {selectedTags.map(tagId => {
                            const tag = allTags.find(t => t.id === tagId);
                            return (
                              <label key={tagId} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={yAxisTagIds.includes(tagId) || yAxisTagIds.length === 0}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setYAxisTagIds([...yAxisTagIds, tagId]);
                                    } else {
                                      setYAxisTagIds(yAxisTagIds.filter(id => id !== tagId));
                                    }
                                  }}
                                  className="rounded text-cyan-600 focus:ring-cyan-500"
                                />
                                <span className="text-slate-700 dark:text-slate-300">
                                  {tag?.tagName || 'Unknown'} {tag?.unit ? `(${tag.unit})` : ''}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          Select which tags to display on Y-axis
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* KPI Formula Configuration */}
                {widgetType === 'kpi' && (
                  <>
                    <div>
                      <Label className="text-sm text-cyan-600 dark:text-cyan-300">Formula (Optional)</Label>
                      <Input
                        value={widgetFormula}
                        onChange={(e) => setWidgetFormula(e.target.value)}
                        placeholder="e.g., T1 + T2 * 0.5 or (T1 - T2) / T3"
                        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-cyan-500/30 text-slate-900 dark:text-white mt-1 
                                   focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20"
                      />
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Use T1, T2, T3... to reference selected tags in order
                      </p>
                      
                      {/* Tag Reference Legend */}
                      {selectedTags.length > 0 && (
                        <Card className="bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-cyan-500/20 p-3 mt-2">
                          <div className="text-xs text-cyan-600 dark:text-cyan-300 mb-2">Tag Reference:</div>
                          <div className="space-y-1">
                            {selectedTags.map((tagId, idx) => {
                              const tag = allTags.find(t => t.id === tagId);
                              const data = tagData.get(tagId);
                              return (
                                <div key={tagId} className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                                  <span className="text-cyan-600 dark:text-cyan-400">T{idx + 1}</span> = {tag?.tagName} 
                                  <span className="text-slate-500 dark:text-slate-500 ml-2">
                                    (current: {data?.value || 0})
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </Card>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-sm text-cyan-600 dark:text-cyan-300">Unit (Optional)</Label>
                      <Input
                        value={widgetUnit}
                        onChange={(e) => setWidgetUnit(e.target.value)}
                        placeholder="e.g., m³/h, PSI, °C"
                        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-cyan-500/30 text-slate-900 dark:text-white mt-1 
                                   focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20"
                      />
                    </div>
                  </>
                )}
                
                {/* Color Customization */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm text-cyan-600 dark:text-cyan-300">Custom Colors (Optional)</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={addColorSlot}
                      className="h-6 px-2 text-xs hover:bg-cyan-100 dark:hover:bg-cyan-500/10"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Color
                    </Button>
                  </div>
                  {customColors.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {customColors.map((color, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs text-slate-600 dark:text-slate-400 w-8">
                            {widgetType === 'gauge' && selectedTags.length > 1 
                              ? `G${idx + 1}` 
                              : `C${idx + 1}`}
                          </span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-10 h-10 p-0 border-slate-300 dark:border-slate-600"
                                style={{ backgroundColor: color }}
                              />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-0">
                              <HexColorPicker
                                color={color}
                                onChange={(newColor) => updateColor(idx, newColor)}
                              />
                            </PopoverContent>
                          </Popover>
                          <Input
                            value={color}
                            onChange={(e) => updateColor(idx, e.target.value)}
                            className="bg-white dark:bg-slate-800 border-slate-300 dark:border-cyan-500/30 text-slate-900 dark:text-white text-xs h-8"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeColorSlot(idx)}
                            className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-500/10"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {widgetType === 'gauge' && selectedTags.length > 1 
                      ? 'Each color will be applied to individual gauges' 
                      : 'Leave empty to use default unique colors'}
                  </p>
                </div>
                
                {/* Preview */}
                <div>
                  <Label className="text-sm text-cyan-600 dark:text-cyan-300">Preview</Label>
                  <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-cyan-500/20 h-32 mt-1 
                                   shadow-sm dark:shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                    <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                      <div className="text-cyan-600 dark:text-cyan-400 mb-2">
                        {widgetType === 'kpi' && <Calculator className="h-8 w-8" />}
                        {widgetType === 'gauge' && <Gauge className="h-8 w-8" />}
                        {widgetType === 'trend' && <TrendingUp className="h-8 w-8" />}
                        {widgetType === 'bar' && <BarChart3 className="h-8 w-8" />}
                        {widgetType === 'donut' && <PieChart className="h-8 w-8" />}
                        {widgetType === 'radar' && <Activity className="h-8 w-8" />}
                      </div>
                      <div className="text-xs text-center text-slate-600 dark:text-slate-400">
                        {widgetType === 'kpi' && 'KPI Card'}
                        {widgetType === 'gauge' && 'Gauge Chart'}
                        {widgetType === 'trend' && 'Line Chart'}
                        {widgetType === 'bar' && 'Bar Chart'}
                        {widgetType === 'donut' && 'Donut Chart'}
                        {widgetType === 'radar' && 'Radar Chart'}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Button
                  onClick={addWidget}
                  disabled={selectedTags.length === 0 || !widgetTitle}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700
                             shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]
                             transition-all duration-300"
                >
                  Create Widget
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Saving indicator */}
        {savingIndicator}
      </div>
    </WaterSystemLayout>
  );
}