import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { WaterSystemLayout } from "@/components/water-system/WaterSystemLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { formatNumber, formatPercentage, formatWithUnit } from "@/utils/formatNumber";
import { useMemo, useState, useEffect } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { XCircle, Plus, RotateCcw, Edit3, Trash2, BarChart2 } from "lucide-react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

// Set default Chart.js options for crisp text rendering
ChartJS.defaults.responsive = true;
ChartJS.defaults.maintainAspectRatio = false;
ChartJS.defaults.font = {
  family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  size: 14,
  lineHeight: 1.2,
  weight: 600
};

// Plugin-specific font settings
ChartJS.defaults.plugins.legend.labels = {
  ...ChartJS.defaults.plugins.legend.labels,
  font: {
    size: 14,
    weight: 600,
    family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  padding: 12,
  usePointStyle: false,
  boxWidth: 40,
  boxHeight: 12
};

ChartJS.defaults.plugins.tooltip.titleFont = {
  size: 14,
  weight: 600
};

ChartJS.defaults.plugins.tooltip.bodyFont = {
  size: 14,
  weight: 600
};

// --- MOCK DATA ---
const productionData = {
  weekTotal: 7720,
  weekPlan: 8000,
  planAttainment: 96.5,
  byProduct: [
    { product: "Broiler Starter", tons: 2150, plan: 2200 },
    { product: "Layer Grower", tons: 1980, plan: 2000 },
    { product: "Ruminant Feed", tons: 1890, plan: 1900 },
    { product: "Broiler Finisher", tons: 1700, plan: 1900 }
  ],
};
const energyData = {
  sec: 22.4, secTarget: 20.0,
  secTrend: [21.5, 22.1, 23.2, 22.8, 21.9, 22.4, 23.1],
  demand: Array.from({ length: 12 }, (_, i) => ({
    time: `${String(i * 2).padStart(2, "0")}:00`,
    value: 180 + Math.sin(i / 2.2) * 40 + Math.random() * 20
  })),
  peak: 245
};

const ResponsiveGridLayout = WidthProvider(Responsive);

// Widget types and default layouts
interface WidgetConfig {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export function DemoDashboard() {
  const { theme: currentTheme } = useTheme();
  const isLightMode = currentTheme === 'light';

  // Cyberpunk color scheme
  const colors = {
    bg: isLightMode ? "#f8fafc" : "#0a1628",
    cardBg: isLightMode ? "#ffffff" : "#0f1e33",
    primary: "#00bcd4", // Cyan
    secondary: isLightMode ? "#2563eb" : "#8b5cf6", // Blue/Purple
    success: "#00E676", // Bright green
    warning: "#FFB020", // Orange/Gold
    error: "#FF5252", // Red
    text: isLightMode ? "#0f172a" : "#e2e8f0",
    textSecondary: isLightMode ? "#475569" : "#94a3b8",
    border: isLightMode ? "#cbd5e1" : "#1e3a5f",
    borderGlow: isLightMode ? "rgba(0, 188, 212, 0.3)" : "rgba(0, 188, 212, 0.5)"
  };

  // Default widget configurations (using numbered IDs for consistency) - reduced height for no scrolling
  const defaultWidgets: WidgetConfig[] = [
    { i: "production-1", x: 0, y: 0, w: 4, h: 2.5, minW: 3, minH: 2 },
    { i: "energy-1", x: 4, y: 0, w: 4, h: 2.5, minW: 3, minH: 2 },
    { i: "steam-1", x: 8, y: 0, w: 4, h: 2.5, minW: 3, minH: 2 },
    { i: "availability-1", x: 0, y: 2.5, w: 4, h: 2.5, minW: 3, minH: 2 },
    { i: "quality-1", x: 4, y: 2.5, w: 4, h: 2.5, minW: 3, minH: 2 },
    { i: "recipe-1", x: 8, y: 2.5, w: 4, h: 2.5, minW: 3, minH: 2 },
    { i: "silos-1", x: 0, y: 5, w: 4, h: 2.5, minW: 3, minH: 2 },
    { i: "downtime-1", x: 4, y: 5, w: 4, h: 2.5, minW: 3, minH: 2 },
    { i: "packaging-1", x: 8, y: 5, w: 4, h: 2.5, minW: 3, minH: 2 },
  ];
  
  // Widget type templates (without instance numbers) - reduced height for no scrolling
  const widgetTemplates = [
    { id: "production", w: 4, h: 2.5, minW: 3, minH: 2 },
    { id: "energy", w: 4, h: 2.5, minW: 3, minH: 2 },
    { id: "steam", w: 4, h: 2.5, minW: 3, minH: 2 },
    { id: "availability", w: 4, h: 2.5, minW: 3, minH: 2 },
    { id: "quality", w: 4, h: 2.5, minW: 3, minH: 2 },
    { id: "recipe", w: 4, h: 2.5, minW: 3, minH: 2 },
    { id: "silos", w: 4, h: 2.5, minW: 3, minH: 2 },
    { id: "downtime", w: 4, h: 2.5, minW: 3, minH: 2 },
    { id: "packaging", w: 4, h: 2.5, minW: 3, minH: 2 },
  ];

  // State for layout and widgets
  const [layout, setLayout] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem("demo-dashboard-layout");
    return saved ? JSON.parse(saved) : defaultWidgets;
  });
  
  const [addChartOpen, setAddChartOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Save layout to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("demo-dashboard-layout", JSON.stringify(layout));
  }, [layout]);

  // Handle layout change from drag/resize
  const handleLayoutChange = (newLayout: Layout[]) => {
    const updatedLayout = newLayout.map(item => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: layout.find(w => w.i === item.i)?.minW,
      minH: layout.find(w => w.i === item.i)?.minH,
    }));
    setLayout(updatedLayout);
  };

  // Remove widget
  const handleRemoveWidget = (widgetId: string) => {
    setLayout(prev => prev.filter(w => w.i !== widgetId));
  };

  // Reset layout
  const handleResetLayout = () => {
    setLayout(defaultWidgets);
    localStorage.setItem("demo-dashboard-layout", JSON.stringify(defaultWidgets));
  };

  // Clear all widgets
  const handleClearAll = () => {
    setLayout([]);
    localStorage.setItem("demo-dashboard-layout", JSON.stringify([]));
  };

  // Add widget - allows unlimited duplicates
  const handleAddWidget = (widgetType: string) => {
    const template = widgetTemplates.find(w => w.id === widgetType);
    if (!template) return;

    // Generate unique ID by finding the highest suffix number and adding 1
    const existingInstances = layout.filter(w => w.i.startsWith(widgetType + '-'));
    const suffixNumbers = existingInstances.map(w => {
      const match = w.i.match(/-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxSuffix = suffixNumbers.length > 0 ? Math.max(...suffixNumbers) : 0;
    const uniqueId = `${widgetType}-${maxSuffix + 1}`;

    const maxY = Math.max(...layout.map(w => w.y + w.h), 0);
    const newWidget = { 
      i: uniqueId, 
      x: 0, 
      y: maxY, 
      w: template.w, 
      h: template.h,
      minW: template.minW,
      minH: template.minH
    };
    setLayout(prev => [...prev, newWidget]);
    setAddChartOpen(false);
  };

  // Render individual widget
  const renderWidget = (widgetId: string) => {
    // Extract base widget type (e.g., "production" from "production-1")
    const baseWidgetType = widgetId.includes('-') 
      ? widgetId.substring(0, widgetId.lastIndexOf('-'))
      : widgetId;

    const commonPaperStyle = {
      bgcolor: colors.cardBg,
      border: `1px solid ${colors.border}`,
      borderRadius: "8px",
      boxShadow: isLightMode ? "0 4px 6px rgba(0,0,0,0.07)" : `0 0 20px ${colors.borderGlow}`,
      p: 2,
      height: "100%",
      display: "flex",
      flexDirection: "column" as const,
      position: "relative" as const,
      overflow: "hidden"
    };

    const removeButton = editMode ? (
      <IconButton
        onClick={() => handleRemoveWidget(widgetId)}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 10,
          bgcolor: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.4)",
          "&:hover": { bgcolor: isLightMode ? "rgba(0,0,0,0.1)" : "rgba(220,38,38,0.2)" },
          padding: "4px"
        }}
        size="small"
        data-testid={`button-remove-${widgetId}`}
      >
        <XCircle size={18} style={{ color: colors.error }} />
      </IconButton>
    ) : null;

    const dragHandle = editMode ? (
      <Box 
        className="drag-handle"
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 40,
          height: "40px",
          cursor: "grab",
          "&:active": { cursor: "grabbing" },
          zIndex: 5
        }}
      />
    ) : null;

    switch (baseWidgetType) {
      case "production":
        return (
          <Paper elevation={0} sx={commonPaperStyle}>
            {dragHandle}
            {removeButton}
            <Typography variant="subtitle1" sx={{ color: colors.primary, fontSize: "0.95rem", mb: 2, fontWeight: 500 }}>
              Production Summary
            </Typography>
            <div className="flex-1 transform-gpu" style={{ 
              backfaceVisibility: 'hidden',
              WebkitFontSmoothing: 'subpixel-antialiased'
            }}>
              <Line
                data={{
                  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                  datasets: [{
                    label: "Production Output",
                    data: [1.0, 1.8, 2.4, 2.8, 3.2, 2.6, 3.0],
                    borderColor: colors.primary,
                    backgroundColor: isLightMode ? "rgba(0,188,212,0.1)" : "rgba(0,188,212,0.2)",
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { 
                      display: true,
                      position: "bottom",
                      labels: { color: colors.textSecondary, font: { size: 14, weight: 600 }, padding: 10 } 
                    } 
                  },
                  scales: {
                    x: { 
                      ticks: { color: colors.textSecondary, font: { size: 14, weight: 600 } }, 
                      grid: { color: isLightMode ? "#e2e8f0" : "#1a2332" } 
                    },
                    y: { 
                      ticks: { color: colors.textSecondary, font: { size: 14, weight: 600 } }, 
                      grid: { color: isLightMode ? "#e2e8f0" : "#1a2332" } 
                    }
                  }
                }}
              />
            </div>
          </Paper>
        );
      
      case "energy":
        return (
          <Paper elevation={0} sx={commonPaperStyle}>
            {dragHandle}
            {removeButton}
            <Typography variant="subtitle1" sx={{ color: colors.primary, fontSize: "0.95rem", mb: 2, fontWeight: 500 }}>
              Energy Consumption
            </Typography>
            <div className="flex-1 transform-gpu" style={{ 
              backfaceVisibility: 'hidden',
              WebkitFontSmoothing: 'subpixel-antialiased'
            }}>
              <Line
                data={{
                  labels: energyData.demand.map(x => x.time),
                  datasets: [{
                    label: "Energy Consumption",
                    data: energyData.demand.map(x => x.value),
                    borderColor: colors.warning,
                    backgroundColor: isLightMode ? "rgba(255,176,32,0.1)" : "rgba(255,176,32,0.2)",
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { 
                      display: true,
                      position: "bottom",
                      labels: { color: colors.textSecondary, font: { size: 14, weight: 600 }, padding: 10 } 
                    } 
                  },
                  scales: {
                    x: { 
                      ticks: { color: colors.textSecondary, font: { size: 14, weight: 600 } }, 
                      grid: { color: isLightMode ? "#e2e8f0" : "#1a2332" } 
                    },
                    y: { 
                      ticks: { color: colors.textSecondary, font: { size: 14, weight: 600 } }, 
                      grid: { color: isLightMode ? "#e2e8f0" : "#1a2332" } 
                    }
                  }
                }}
              />
            </div>
          </Paper>
        );

      case "steam":
        return (
          <Paper elevation={0} sx={commonPaperStyle}>
            {dragHandle}
            {removeButton}
            <Typography variant="subtitle1" sx={{ color: colors.primary, fontSize: "0.95rem", mb: 2, fontWeight: 500 }}>
              Facility Efficiency
            </Typography>
            <div className="flex-1 transform-gpu" style={{ 
              backfaceVisibility: 'hidden',
              WebkitFontSmoothing: 'subpixel-antialiased'
            }}>
              <Bar
                data={{
                  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                  datasets: [{
                    label: "Facility Efficiency",
                    data: [96, 97, 98, 97, 98, 99, 98],
                    backgroundColor: colors.success,
                    borderRadius: 4
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { 
                      display: true,
                      position: "bottom",
                      labels: { color: colors.textSecondary, font: { size: 14, weight: 600 }, padding: 10 } 
                    } 
                  },
                  scales: {
                    x: { 
                      ticks: { color: colors.textSecondary, font: { size: 14, weight: 600 } }, 
                      grid: { color: isLightMode ? "#e2e8f0" : "#1a2332" } 
                    },
                    y: { 
                      ticks: { color: colors.textSecondary, font: { size: 14, weight: 600 } }, 
                      grid: { color: isLightMode ? "#e2e8f0" : "#1a2332" },
                      min: 90
                    }
                  }
                }}
              />
            </div>
          </Paper>
        );

      case "availability":
        return (
          <Paper elevation={0} sx={{ ...commonPaperStyle, alignItems: "center", justifyContent: "center" }}>
            {dragHandle}
            {removeButton}
            <Typography sx={{ color: colors.primary, fontSize: "0.95rem", mb: 2, fontWeight: 500 }}>
              Water Quality Distribution
            </Typography>
            <div className="transform-gpu" style={{ 
              width: "80%", 
              maxWidth: "250px", 
              height: "180px",
              backfaceVisibility: 'hidden',
              WebkitFontSmoothing: 'subpixel-antialiased'
            }}>
              <Doughnut
                data={{
                  labels: ["Excellent", "Good", "Fair", "Poor"],
                  datasets: [{
                    data: [45, 30, 20, 5],
                    backgroundColor: [colors.success, colors.primary, colors.warning, colors.error],
                    borderWidth: 0
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { 
                      position: "right",
                      labels: { 
                        color: colors.textSecondary, 
                        font: { size: 14, weight: 600 },
                        padding: 8,
                        boxWidth: 12,
                        boxHeight: 12
                      } 
                    } 
                  }
                }}
              />
            </div>
          </Paper>
        );

      case "quality":
        return (
          <Paper elevation={0} sx={commonPaperStyle}>
            {dragHandle}
            {removeButton}
            <Typography variant="subtitle1" sx={{ color: colors.primary, fontSize: "0.95rem", mb: 2, fontWeight: 500 }}>
              Activity Basis
            </Typography>
            <div className="flex-1 transform-gpu" style={{ 
              backfaceVisibility: 'hidden',
              WebkitFontSmoothing: 'subpixel-antialiased'
            }}>
              <Bar
                data={{
                  labels: ["Q1", "Q2", "Q3", "Q4"],
                  datasets: [{
                    label: "Activity",
                    data: [8, 9, 3, 2],
                    backgroundColor: colors.primary,
                    borderRadius: 4
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { display: false } 
                  },
                  scales: {
                    x: { 
                      ticks: { color: colors.textSecondary, font: { size: 14, weight: 600 } }, 
                      grid: { color: isLightMode ? "#e2e8f0" : "#1a2332" } 
                    },
                    y: { 
                      ticks: { color: colors.textSecondary, font: { size: 14, weight: 600 } }, 
                      grid: { color: isLightMode ? "#e2e8f0" : "#1a2332" } 
                    }
                  }
                }}
              />
            </div>
          </Paper>
        );

      case "recipe":
        return (
          <Paper elevation={0} sx={commonPaperStyle}>
            {dragHandle}
            {removeButton}
            <Typography variant="subtitle1" sx={{ color: colors.primary, fontSize: "0.95rem", mb: 2, fontWeight: 500 }}>
              Maintenance Alerts
            </Typography>
            <div className="flex-1 transform-gpu" style={{ 
              backfaceVisibility: 'hidden',
              WebkitFontSmoothing: 'subpixel-antialiased'
            }}>
              <Bar
                data={{
                  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                  datasets: [{
                    label: "Maintenance Alerts",
                    data: [12, 8, 15, 10, 18, 7],
                    backgroundColor: colors.error,
                    borderRadius: 4
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { 
                      display: true,
                      position: "bottom",
                      labels: { color: colors.textSecondary, font: { size: 14, weight: 600 }, padding: 10 } 
                    } 
                  },
                  scales: {
                    x: { 
                      ticks: { color: colors.textSecondary, font: { size: 14, weight: 600 } }, 
                      grid: { color: isLightMode ? "#e2e8f0" : "#1a2332" } 
                    },
                    y: { 
                      ticks: { color: colors.textSecondary, font: { size: 14, weight: 600 } }, 
                      grid: { color: isLightMode ? "#e2e8f0" : "#1a2332" } 
                    }
                  }
                }}
              />
            </div>
          </Paper>
        );

      case "silos":
        return (
          <Paper elevation={0} sx={commonPaperStyle}>
            {dragHandle}
            {removeButton}
            <Typography variant="subtitle1" sx={{ color: colors.primary, fontSize: "0.95rem", mb: 2, fontWeight: 500 }}>
              Flow Rate Monitoring
            </Typography>
            <div className="flex-1 transform-gpu" style={{ 
              backfaceVisibility: 'hidden',
              WebkitFontSmoothing: 'subpixel-antialiased'
            }}>
              <Line
                data={{
                  labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
                  datasets: [{
                    label: "Flow Rate",
                    data: [65, 72, 68, 75, 70, 73],
                    borderColor: "#8b5cf6",
                    backgroundColor: isLightMode ? "rgba(139,92,246,0.1)" : "rgba(139,92,246,0.2)",
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { 
                      display: true,
                      position: "bottom",
                      labels: { color: colors.textSecondary, font: { size: 14, weight: 600 }, padding: 10 } 
                    } 
                  },
                  scales: {
                    x: { 
                      ticks: { color: colors.textSecondary, font: { size: 14, weight: 600 } }, 
                      grid: { color: isLightMode ? "#e2e8f0" : "#1a2332" } 
                    },
                    y: { 
                      ticks: { color: colors.textSecondary, font: { size: 14, weight: 600 } }, 
                      grid: { color: isLightMode ? "#e2e8f0" : "#1a2332" } 
                    }
                  }
                }}
              />
            </div>
          </Paper>
        );

      case "downtime":
        return (
          <Paper elevation={0} sx={commonPaperStyle}>
            {dragHandle}
            {removeButton}
            <Typography variant="subtitle1" sx={{ color: colors.primary, fontSize: "0.95rem", mb: 2, fontWeight: 500 }}>
              Quality Intelligence Indicators
            </Typography>
            <Box sx={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 2, pt: 1 }}>
              <Box sx={{ flex: "1 1 45%", textAlign: "center" }}>
                <Typography sx={{ fontSize: "1.8rem", fontWeight: 600, color: colors.success }}>94%</Typography>
                <Typography sx={{ fontSize: "0.75rem", color: colors.textSecondary }}>Pass Rate</Typography>
              </Box>
              <Box sx={{ flex: "1 1 45%", textAlign: "center" }}>
                <Typography sx={{ fontSize: "1.8rem", fontWeight: 600, color: colors.warning }}>3.2%</Typography>
                <Typography sx={{ fontSize: "0.75rem", color: colors.textSecondary }}>Failure Rate</Typography>
              </Box>
              <Box sx={{ flex: "1 1 45%", textAlign: "center" }}>
                <Typography sx={{ fontSize: "1.8rem", fontWeight: 600, color: colors.primary }}>2.8%</Typography>
                <Typography sx={{ fontSize: "0.75rem", color: colors.textSecondary }}>Pending</Typography>
              </Box>
              <Box sx={{ flex: "1 1 45%", textAlign: "center" }}>
                <Typography sx={{ fontSize: "1.8rem", fontWeight: 600, color: colors.text }}>142</Typography>
                <Typography sx={{ fontSize: "0.75rem", color: colors.textSecondary }}>Total Tests</Typography>
              </Box>
            </Box>
          </Paper>
        );

      case "packaging":
        return (
          <Paper elevation={0} sx={commonPaperStyle}>
            {dragHandle}
            {removeButton}
            <Typography variant="subtitle1" sx={{ color: colors.primary, fontSize: "0.95rem", mb: 2, fontWeight: 500 }}>
              System Activity Score
            </Typography>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 2 }}>
              <Typography sx={{ fontSize: "3rem", fontWeight: 700, color: colors.success }}>97</Typography>
              <Typography sx={{ fontSize: "0.85rem", color: colors.textSecondary }}>System Health Score</Typography>
              <Box sx={{ width: "100%", bgcolor: isLightMode ? "#e2e8f0" : "#1a2332", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
                <Box sx={{ width: "97%", bgcolor: colors.success, height: "100%" }} />
              </Box>
            </Box>
          </Paper>
        );

      default:
        return null;
    }
  };

  return (
    <WaterSystemLayout title="Customizable Dashboard" subtitle="Hover over charts and drag using the grid handle • Logical auto-zoom">
      {/* Action Bar with Buttons - Positioned at top */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mb: 3 }}>
        <Button
          onClick={() => setEditMode(!editMode)}
          variant={editMode ? "contained" : "outlined"}
          startIcon={<Edit3 size={18} />}
          sx={{
            bgcolor: editMode ? colors.primary : "transparent",
            borderColor: editMode ? colors.primary : colors.border,
            color: editMode ? "white" : colors.text,
            "&:hover": { 
              bgcolor: editMode ? "#0097A7" : `${colors.primary}20`,
              borderColor: colors.primary
            },
            textTransform: "none",
            px: 3
          }}
          data-testid="button-edit-layout"
        >
          {editMode ? "Done Editing" : "Edit Layout"}
        </Button>
        <Button
          onClick={() => setAddChartOpen(true)}
          variant="contained"
          startIcon={<BarChart2 size={18} />}
          sx={{
            bgcolor: colors.primary,
            color: "white",
            "&:hover": { bgcolor: "#0097A7" },
            textTransform: "none",
            px: 3
          }}
          data-testid="button-add-chart"
        >
          Chart
        </Button>
        <Button
          onClick={() => setAddChartOpen(true)}
          variant="contained"
          startIcon={<Plus size={18} />}
          sx={{
            bgcolor: colors.primary,
            color: "white",
            "&:hover": { bgcolor: "#0097A7" },
            textTransform: "none",
            px: 3
          }}
          data-testid="button-add-widget"
        >
          Add Widget
        </Button>
        <Button
          onClick={handleClearAll}
          variant="outlined"
          startIcon={<Trash2 size={18} />}
          sx={{
            borderColor: colors.border,
            color: colors.error,
            "&:hover": { borderColor: colors.error, bgcolor: `${colors.error}20` },
            textTransform: "none",
            px: 3
          }}
          data-testid="button-clear-all"
        >
          Clear All
        </Button>
        <Button
          onClick={handleResetLayout}
          variant="outlined"
          startIcon={<RotateCcw size={18} />}
          sx={{
            borderColor: colors.border,
            color: colors.text,
            "&:hover": { borderColor: colors.primary, color: colors.primary },
            textTransform: "none",
            px: 3
          }}
          data-testid="button-reset-layout"
        >
          Reset
        </Button>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 2, mb: 3 }}>
        <Paper elevation={0} sx={{
          bgcolor: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: "8px",
          boxShadow: isLightMode ? "0 4px 6px rgba(0,0,0,0.07)" : `0 0 20px ${colors.borderGlow}`,
          p: 2
        }}>
          <Typography sx={{ fontSize: "0.85rem", color: colors.textSecondary, mb: 1 }}>Total Production</Typography>
          <Typography sx={{ fontSize: "2rem", fontWeight: 700, color: colors.primary }}>7,720</Typography>
          <Typography sx={{ fontSize: "0.75rem", color: colors.success }}>↑ 96.5% Plan Attainment</Typography>
        </Paper>
        
        <Paper elevation={0} sx={{
          bgcolor: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: "8px",
          boxShadow: isLightMode ? "0 4px 6px rgba(0,0,0,0.07)" : `0 0 20px ${colors.borderGlow}`,
          p: 2
        }}>
          <Typography sx={{ fontSize: "0.85rem", color: colors.textSecondary, mb: 1 }}>Energy Consumption</Typography>
          <Typography sx={{ fontSize: "2rem", fontWeight: 700, color: colors.warning }}>22.4</Typography>
          <Typography sx={{ fontSize: "0.75rem", color: colors.error }}>↑ 12% Above Target</Typography>
        </Paper>
        
        <Paper elevation={0} sx={{
          bgcolor: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: "8px",
          boxShadow: isLightMode ? "0 4px 6px rgba(0,0,0,0.07)" : `0 0 20px ${colors.borderGlow}`,
          p: 2
        }}>
          <Typography sx={{ fontSize: "0.85rem", color: colors.textSecondary, mb: 1 }}>System Efficiency</Typography>
          <Typography sx={{ fontSize: "2rem", fontWeight: 700, color: colors.success }}>97.8%</Typography>
          <Typography sx={{ fontSize: "0.75rem", color: colors.success }}>↑ Optimal Performance</Typography>
        </Paper>
        
        <Paper elevation={0} sx={{
          bgcolor: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: "8px",
          boxShadow: isLightMode ? "0 4px 6px rgba(0,0,0,0.07)" : `0 0 20px ${colors.borderGlow}`,
          p: 2
        }}>
          <Typography sx={{ fontSize: "0.85rem", color: colors.textSecondary, mb: 1 }}>Active Alerts</Typography>
          <Typography sx={{ fontSize: "2rem", fontWeight: 700, color: colors.error }}>3</Typography>
          <Typography sx={{ fontSize: "0.75rem", color: colors.textSecondary }}>2 Critical, 1 Warning</Typography>
        </Paper>
      </Box>

      {/* Dashboard Grid */}
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layout }}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={70}
        isDraggable={editMode}
        isResizable={editMode}
        draggableHandle=".drag-handle"
      >
        {layout.map((widget) => (
          <div key={widget.i} data-grid={widget}>
            {renderWidget(widget.i)}
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Add Widget Dialog */}
      <Dialog 
        open={addChartOpen} 
        onClose={() => setAddChartOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: colors.cardBg,
            color: colors.text,
            minWidth: "400px"
          }
        }}
      >
        <DialogTitle sx={{ color: colors.primary }}>Add New Widget</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            {widgetTemplates.map((template) => (
              <Button
                key={template.id}
                onClick={() => handleAddWidget(template.id)}
                variant="outlined"
                sx={{
                  borderColor: colors.border,
                  color: colors.text,
                  "&:hover": { borderColor: colors.primary, bgcolor: `${colors.primary}20` },
                  textTransform: "none",
                  justifyContent: "flex-start",
                  px: 3,
                  py: 1.5
                }}
                data-testid={`button-add-${template.id}`}
              >
                {template.id.charAt(0).toUpperCase() + template.id.slice(1)}
              </Button>
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </WaterSystemLayout>
  );
}
