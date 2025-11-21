import React, { useState, useEffect, useMemo } from 'react';
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout';
import { Box, Paper, Typography, Chip, LinearProgress, Card, CardContent, Grid, Alert, AlertTitle, IconButton, Tooltip, Divider, Stack, Switch, FormControlLabel } from '@mui/material';
import { Activity, Gauge, Factory, Zap, TrendingUp, AlertTriangle, Package, Thermometer, Droplets, Maximize2, RotateCw, Settings, Eye, Ship, Truck, Anchor, Warehouse, AlertCircle, CheckCircle, Wind, Boxes, PackageCheck, Loader, Wifi, DollarSign, Wheat, Droplet, Scale, BarChart3, Cpu, ShieldCheck, Timer, Wrench, Sparkles } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { DigitalTwin3D } from '@/components/digital-twin/DigitalTwin3D';

// Simplified Material types - Only 4 essential materials
interface RawMaterial {
  type: 'Wheat' | 'Corn' | 'Barley' | 'Soy';
  level: number;
  capacity: number;
  tonnage: number;
  moistureLevel: number;
  targetMoisture: number;
  costPerTon: number;
}

// Recipe definition
interface Recipe {
  id: string;
  name: string;
  materials: { type: string; percentage: number }[];
  targetOutput: number;
  active: boolean;
}

// IoT Sensor data
interface IoTSensor {
  id: string;
  type: 'moisture' | 'temperature' | 'pressure' | 'level' | 'flow' | 'vibration';
  location: string;
  value: number;
  unit: string;
  status: 'online' | 'offline' | 'warning';
  lastUpdate: Date;
}

interface PlantData {
  // Marine Terminal
  shipDocked: boolean;
  shipUnloadingProgress: number;
  shipCapacity: number;
  shipUnloadingRate: number; // tons/hr
  currentMaterial: string;
  
  // Raw Material Intake - Simplified to 4 essential materials
  intakeMaterials: RawMaterial[];
  intakeConveyorSpeed: number;
  
  // Moisture Control System
  moistureSensors: {
    intake: number;
    processing: number;
    output: number;
  };
  dryerStatus: {
    active: boolean;
    temperature: number;
    efficiency: number;
  };
  
  // Processing Stages - Simplified
  processingRate: number;
  mixingStation: {
    activeRecipe: Recipe | null;
    batchProgress: number;
  };
  
  // Bagging Operations
  baggingLines: {
    line1: { active: boolean; bagSize: 25; rate: number };
    line2: { active: boolean; bagSize: 50; rate: number };
    line3: { active: boolean; bagSize: 25; rate: number };
  };
  totalBagsProduced: number;
  
  // Truck Loading
  truckBays: { 
    id: number; 
    occupied: boolean; 
    loadingProgress: number;
    tonnageLoaded: number;
  }[];
  trucksLoaded: number;
  
  // Conveyors
  conveyorActive: boolean[];
  
  // System Metrics
  temperature: number;
  humidity: number;
  dailyProduction: number; // tons
  productionCostPerTon: number;
  operatingEfficiency: number;
  revenue: number;
  
  // IoT Integration
  iotSensors: IoTSensor[];
  
  // System Status
  powerConsumption: number;
  efficiency: number;
  totalProduction: number;
  systemStatus: 'ACTIVE' | 'IDLE' | 'WARNING';
  processingActive: boolean;
  materialFlowRate: number;
}

// Professional color palette
interface ColorPalette {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  text: string;
  textSecondary: string;
  background: string;
  border: string;
}

function getPalette(theme: 'light' | 'dark'): ColorPalette {
  const isLight = theme === 'light';
  return {
    primary: isLight ? '#2563eb' : '#60a5fa',
    secondary: isLight ? '#64748b' : '#94a3b8',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: isLight ? '#06b6d4' : '#22d3ee',
    text: isLight ? '#1e293b' : '#f1f5f9',
    textSecondary: isLight ? '#64748b' : '#94a3b8',
    background: isLight ? '#ffffff' : '#0f172a',
    border: isLight ? '#e2e8f0' : '#334155'
  };
}

// Clean, Professional Plant Visualization
function CleanPlantVisualization({ data, theme, palette }: { data: PlantData; theme: 'light' | 'dark'; palette: ColorPalette }) {
  const isLight = theme === 'light';
  
  // Helper function to get fill level color
  const getFillColor = (level: number) => {
    if (level >= 80) return palette.danger;
    if (level >= 50) return palette.warning;
    return palette.success;
  };
  
  return (
    <Box sx={{ 
      width: '100%', 
      height: '600px',
      background: isLight 
        ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
        : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: 2,
      position: 'relative',
      overflow: 'hidden',
      border: '2px solid',
      borderColor: palette.border
    }}>
      <svg
        viewBox="0 0 1600 700"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Definitions */}
        <defs>
          {/* Subtle grid pattern */}
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke={palette.border} strokeWidth="0.5" opacity="0.15"/>
          </pattern>
          
          {/* Gradient for silos */}
          <linearGradient id="siloGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.secondary} stopOpacity="0.6"/>
            <stop offset="100%" stopColor={palette.secondary} stopOpacity="0.3"/>
          </linearGradient>
          
          {/* Simple conveyor pattern - no animation */}
          <pattern id="conveyorPattern" x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="10" height="10" fill={palette.primary} opacity="0.3"/>
          </pattern>
        </defs>
        
        {/* Background grid */}
        <rect width="1600" height="700" fill="url(#grid)"/>
        
        {/* Clear Section Labels at Top */}
        <rect x="0" y="0" width="1600" height="45" fill={palette.background} opacity="0.9"/>
        <line x1="0" y1="45" x2="1600" y2="45" stroke={palette.border} strokeWidth="2"/>
        
        <text x="150" y="28" textAnchor="middle" fill={palette.text} fontSize="14" fontWeight="bold">
          MARINE DOCK
        </text>
        <text x="450" y="28" textAnchor="middle" fill={palette.text} fontSize="14" fontWeight="bold">
          RAW MATERIAL STORAGE
        </text>
        <text x="800" y="28" textAnchor="middle" fill={palette.text} fontSize="14" fontWeight="bold">
          PROCESSING PLANT
        </text>
        <text x="1150" y="28" textAnchor="middle" fill={palette.text} fontSize="14" fontWeight="bold">
          BAGGING
        </text>
        <text x="1450" y="28" textAnchor="middle" fill={palette.text} fontSize="14" fontWeight="bold">
          TRUCK LOADING
        </text>
        
        {/* Marine Dock Area - Simplified */}
        <g transform="translate(50, 350)">
          {/* Dock Platform */}
          <rect x="0" y="0" width="200" height="100" fill={palette.secondary} opacity="0.2" rx="5" stroke={palette.border} strokeWidth="1"/>
          
          {/* Ship Status Display */}
          {data.shipDocked ? (
            <g>
              {/* Simple ship representation */}
              <rect x="20" y="20" width="120" height="50" fill={palette.primary} opacity="0.6" rx="3"/>
              <text x="80" y="50" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                SHIP DOCKED
              </text>
              
              {/* Unloading progress bar */}
              <rect x="20" y="80" width="160" height="10" fill={palette.border} rx="5"/>
              <rect x="20" y="80" width={160 * (data.shipUnloadingProgress / 100)} height="10" fill={palette.success} rx="5"/>
            </g>
          ) : (
            <text x="100" y="55" textAnchor="middle" fill={palette.textSecondary} fontSize="14">
              NO SHIP DOCKED
            </text>
          )}
          
          {/* Clear Data Labels */}
          <text x="100" y="120" textAnchor="middle" fill={palette.text} fontSize="12" fontWeight="bold">
            Status: {data.shipDocked ? 'UNLOADING' : 'IDLE'}
          </text>
          <text x="100" y="138" textAnchor="middle" fill={palette.textSecondary} fontSize="11">
            Progress: {data.shipUnloadingProgress}%
          </text>
          <text x="100" y="155" textAnchor="middle" fill={palette.textSecondary} fontSize="11">
            Rate: {data.shipUnloadingRate} tons/hr
          </text>
        </g>
        
        {/* Raw Material Storage - 4 Essential Silos */}
        <g transform="translate(350, 300)">
          <rect x="-10" y="-10" width="220" height="260" fill={palette.background} opacity="0.5" rx="5" stroke={palette.border} strokeWidth="1"/>
          
          {data.intakeMaterials.map((material, i) => {
            const x = i * 50 + 10;
            const fillColor = getFillColor(material.level);
            const moistureOk = Math.abs(material.moistureLevel - material.targetMoisture) < 0.5;
            
            return (
              <g key={`silo-${i}`} transform={`translate(${x}, 20)`}>
                {/* Silo cylinder */}
                <rect x="0" y="0" width="40" height="120" fill="url(#siloGradient)" stroke={palette.border} strokeWidth="1" rx="3"/>
                
                {/* Fill level */}
                <rect
                  x="2"
                  y={120 - (material.level * 1.2)}
                  width="36"
                  height={material.level * 1.2}
                  fill={fillColor}
                  opacity="0.7"
                  rx="2"
                />
                
                {/* Fill percentage inside silo */}
                <text x="20" y="60" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                  {material.level}%
                </text>
                
                {/* Material type label */}
                <text x="20" y="140" textAnchor="middle" fill={palette.text} fontSize="12" fontWeight="bold">
                  {material.type}
                </text>
                
                {/* Tonnage */}
                <text x="20" y="155" textAnchor="middle" fill={palette.textSecondary} fontSize="10">
                  {material.tonnage} tons
                </text>
                
                {/* Moisture indicator */}
                <text x="20" y="170" textAnchor="middle" fill={moistureOk ? palette.success : palette.warning} fontSize="10">
                  M: {material.moistureLevel}%
                </text>
              </g>
            );
          })}
          
          {/* Moisture Control Display */}
          <g transform="translate(10, 200)">
            <rect x="0" y="0" width="190" height="45" fill={palette.warning} opacity="0.1" rx="3" stroke={palette.warning} strokeWidth="1"/>
            <text x="95" y="15" textAnchor="middle" fill={palette.text} fontSize="11" fontWeight="bold">
              MOISTURE CONTROL
            </text>
            <text x="45" y="30" textAnchor="middle" fill={palette.textSecondary} fontSize="10">
              In: {data.moistureSensors.intake}%
            </text>
            <text x="95" y="30" textAnchor="middle" fill={palette.textSecondary} fontSize="10">
              Mid: {data.moistureSensors.processing}%
            </text>
            <text x="145" y="30" textAnchor="middle" fill={palette.textSecondary} fontSize="10">
              Out: {data.moistureSensors.output}%
            </text>
            <text x="95" y="40" textAnchor="middle" fill={data.dryerStatus.active ? palette.success : palette.textSecondary} fontSize="10">
              Dryer: {data.dryerStatus.active ? 'ACTIVE' : 'IDLE'}
            </text>
          </g>
        </g>
        
        {/* Processing Plant - Simplified */}
        <g transform="translate(700, 320)">
          <rect x="0" y="0" width="200" height="180" fill={palette.secondary} opacity="0.15" rx="5" stroke={palette.border} strokeWidth="1"/>
          
          {/* Status Indicator */}
          <circle cx="100" cy="30" r="10" fill={data.processingActive ? palette.success : palette.secondary}/>
          <text x="100" y="35" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
            {data.processingActive ? '✓' : '—'}
          </text>
          
          {/* Processing Status */}
          <text x="100" y="60" textAnchor="middle" fill={palette.text} fontSize="14" fontWeight="bold">
            PROCESSING UNIT
          </text>
          <text x="100" y="80" textAnchor="middle" fill={palette.text} fontSize="12">
            Status: {data.processingActive ? 'ACTIVE' : 'IDLE'}
          </text>
          
          {/* Processing Metrics */}
          <rect x="20" y="95" width="160" height="2" fill={palette.border}/>
          
          <text x="100" y="115" textAnchor="middle" fill={palette.textSecondary} fontSize="11">
            Rate: {data.processingRate} tons/hr
          </text>
          <text x="100" y="130" textAnchor="middle" fill={palette.textSecondary} fontSize="11">
            Efficiency: {data.efficiency}%
          </text>
          
          {/* Recipe Info */}
          {data.mixingStation.activeRecipe && (
            <>
              <text x="100" y="150" textAnchor="middle" fill={palette.primary} fontSize="11" fontWeight="bold">
                Recipe: {data.mixingStation.activeRecipe.name}
              </text>
              <text x="100" y="165" textAnchor="middle" fill={palette.textSecondary} fontSize="10">
                Batch Progress: {data.mixingStation.batchProgress}%
              </text>
            </>
          )}
        </g>
        
        {/* Bagging Operations - Simplified */}
        <g transform="translate(1050, 320)">
          <rect x="0" y="0" width="200" height="180" fill={palette.secondary} opacity="0.15" rx="5" stroke={palette.border} strokeWidth="1"/>
          
          <text x="100" y="30" textAnchor="middle" fill={palette.text} fontSize="14" fontWeight="bold">
            BAGGING LINES
          </text>
          
          {/* Line 1 */}
          <g transform="translate(20, 50)">
            <rect x="0" y="0" width="160" height="25" fill={data.baggingLines.line1.active ? palette.success : palette.secondary} opacity="0.2" rx="3"/>
            <text x="10" y="17" fill={palette.text} fontSize="11">Line 1 (25kg):</text>
            <text x="150" y="17" textAnchor="end" fill={data.baggingLines.line1.active ? palette.success : palette.textSecondary} fontSize="11" fontWeight="bold">
              {data.baggingLines.line1.active ? `${data.baggingLines.line1.rate} bags/hr` : 'IDLE'}
            </text>
          </g>
          
          {/* Line 2 */}
          <g transform="translate(20, 80)">
            <rect x="0" y="0" width="160" height="25" fill={data.baggingLines.line2.active ? palette.success : palette.secondary} opacity="0.2" rx="3"/>
            <text x="10" y="17" fill={palette.text} fontSize="11">Line 2 (50kg):</text>
            <text x="150" y="17" textAnchor="end" fill={data.baggingLines.line2.active ? palette.success : palette.textSecondary} fontSize="11" fontWeight="bold">
              {data.baggingLines.line2.active ? `${data.baggingLines.line2.rate} bags/hr` : 'IDLE'}
            </text>
          </g>
          
          {/* Line 3 */}
          <g transform="translate(20, 110)">
            <rect x="0" y="0" width="160" height="25" fill={data.baggingLines.line3.active ? palette.success : palette.secondary} opacity="0.2" rx="3"/>
            <text x="10" y="17" fill={palette.text} fontSize="11">Line 3 (25kg):</text>
            <text x="150" y="17" textAnchor="end" fill={data.baggingLines.line3.active ? palette.success : palette.textSecondary} fontSize="11" fontWeight="bold">
              {data.baggingLines.line3.active ? `${data.baggingLines.line3.rate} bags/hr` : 'IDLE'}
            </text>
          </g>
          
          {/* Total Production */}
          <rect x="10" y="145" width="180" height="30" fill={palette.primary} opacity="0.1" rx="3"/>
          <text x="100" y="165" textAnchor="middle" fill={palette.text} fontSize="12" fontWeight="bold">
            Total Bags: {data.totalBagsProduced.toLocaleString()}
          </text>
        </g>
        
        {/* Truck Loading Bays - Simplified */}
        <g transform="translate(1350, 320)">
          <rect x="0" y="0" width="200" height="180" fill={palette.secondary} opacity="0.15" rx="5" stroke={palette.border} strokeWidth="1"/>
          
          <text x="100" y="30" textAnchor="middle" fill={palette.text} fontSize="14" fontWeight="bold">
            TRUCK LOADING
          </text>
          
          {data.truckBays.slice(0, 3).map((bay, i) => {
            const y = 50 + i * 40;
            
            return (
              <g key={`bay-${i}`} transform={`translate(20, ${y})`}>
                <rect
                  x="0"
                  y="0"
                  width="160"
                  height="30"
                  fill={bay.occupied ? palette.success : palette.secondary}
                  opacity="0.2"
                  rx="3"
                  stroke={palette.border}
                  strokeWidth="1"
                />
                
                <text x="10" y="20" fill={palette.text} fontSize="11">
                  Bay {bay.id}:
                </text>
                
                {bay.occupied ? (
                  <>
                    <text x="60" y="20" fill={palette.success} fontSize="11" fontWeight="bold">
                      LOADING
                    </text>
                    <text x="110" y="20" fill={palette.text} fontSize="11">
                      {bay.loadingProgress}%
                    </text>
                    <text x="145" y="20" fill={palette.textSecondary} fontSize="10">
                      {bay.tonnageLoaded}t
                    </text>
                  </>
                ) : (
                  <text x="60" y="20" fill={palette.textSecondary} fontSize="11">
                    EMPTY
                  </text>
                )}
              </g>
            );
          })}
          
          <text x="100" y="170" textAnchor="middle" fill={palette.primary} fontSize="12" fontWeight="bold">
            Trucks Loaded Today: {data.trucksLoaded}
          </text>
        </g>
        
        {/* Simplified Conveyor Lines - Clear paths without excessive animation */}
        {/* Dock to Storage */}
        <g opacity={data.conveyorActive[0] ? 1 : 0.3}>
          <line x1="250" y1="400" x2="350" y2="380" stroke={palette.primary} strokeWidth="15" strokeLinecap="round"/>
          <polygon points="345,375 355,380 345,385" fill={palette.primary}/>
        </g>
        
        {/* Storage to Processing */}
        <g opacity={data.conveyorActive[1] ? 1 : 0.3}>
          <line x1="560" y1="400" x2="700" y2="400" stroke={palette.primary} strokeWidth="15" strokeLinecap="round"/>
          <polygon points="695,395 705,400 695,405" fill={palette.primary}/>
        </g>
        
        {/* Processing to Bagging */}
        <g opacity={data.conveyorActive[2] ? 1 : 0.3}>
          <line x1="900" y1="410" x2="1050" y2="410" stroke={palette.primary} strokeWidth="15" strokeLinecap="round"/>
          <polygon points="1045,405 1055,410 1045,415" fill={palette.primary}/>
        </g>
        
        {/* Bagging to Truck */}
        <g opacity={data.conveyorActive[3] ? 1 : 0.3}>
          <line x1="1250" y1="410" x2="1350" y2="410" stroke={palette.primary} strokeWidth="15" strokeLinecap="round"/>
          <polygon points="1345,405 1355,410 1345,415" fill={palette.primary}/>
        </g>
        
        {/* System Status Panel - Bottom */}
        <g transform="translate(50, 570)">
          <rect x="0" y="0" width="1500" height="100" fill={palette.background} opacity="0.95" rx="5" stroke={palette.border} strokeWidth="1"/>
          
          {/* System Status */}
          <g transform="translate(50, 20)">
            <circle cx="0" cy="10" r="8" fill={data.systemStatus === 'ACTIVE' ? palette.success : data.systemStatus === 'WARNING' ? palette.warning : palette.secondary}/>
            <text x="20" y="15" fill={palette.text} fontSize="14" fontWeight="bold">
              SYSTEM {data.systemStatus}
            </text>
          </g>
          
          {/* Key Metrics in a row */}
          <g transform="translate(50, 50)">
            <text x="0" y="0" fill={palette.textSecondary} fontSize="12">
              Efficiency: <tspan fill={palette.text} fontWeight="bold">{data.efficiency}%</tspan>
            </text>
            <text x="150" y="0" fill={palette.textSecondary} fontSize="12">
              Flow Rate: <tspan fill={palette.text} fontWeight="bold">{data.materialFlowRate} tons/hr</tspan>
            </text>
            <text x="320" y="0" fill={palette.textSecondary} fontSize="12">
              Production: <tspan fill={palette.text} fontWeight="bold">{data.totalProduction.toLocaleString()} kg</tspan>
            </text>
            <text x="500" y="0" fill={palette.textSecondary} fontSize="12">
              Power: <tspan fill={palette.text} fontWeight="bold">{data.powerConsumption} kW</tspan>
            </text>
            <text x="650" y="0" fill={palette.textSecondary} fontSize="12">
              Daily Production: <tspan fill={palette.text} fontWeight="bold">{data.dailyProduction} tons</tspan>
            </text>
            <text x="850" y="0" fill={palette.textSecondary} fontSize="12">
              Cost/Ton: <tspan fill={palette.text} fontWeight="bold">${data.productionCostPerTon}</tspan>
            </text>
            <text x="1000" y="0" fill={palette.textSecondary} fontSize="12">
              Revenue: <tspan fill={palette.text} fontWeight="bold">${(data.revenue / 1000).toFixed(1)}k</tspan>
            </text>
            <text x="1150" y="0" fill={palette.textSecondary} fontSize="12">
              IoT Sensors: <tspan fill={palette.success} fontWeight="bold">{data.iotSensors.filter(s => s.status === 'online').length}/{data.iotSensors.length} Online</tspan>
            </text>
          </g>
        </g>
      </svg>
    </Box>
  );
}

// Simple KPI Card Component
function SimpleKPICard({ title, value, unit, icon: Icon, status, subtext }: {
  title: string;
  value: number | string;
  unit: string;
  icon: any;
  status: 'success' | 'warning' | 'danger' | 'info';
  subtext?: string;
}) {
  const statusColors = {
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4'
  };
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '11px' }}>
            {title}
          </Typography>
          <Icon size={16} style={{ color: statusColors[status] }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          {value} <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>{unit}</Typography>
        </Typography>
        {subtext && (
          <Typography variant="caption" sx={{ color: statusColors[status], fontSize: '10px' }}>
            {subtext}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// Main Component
export default function DigitalTwinPage() {
  const { theme } = useTheme();
  const palette = useMemo(() => getPalette(theme), [theme]);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [is3DView, setIs3DView] = useState(false);
  
  // Plant data state - Simplified
  const [plantData, setPlantData] = useState<PlantData>({
    shipDocked: true,
    shipUnloadingProgress: 65,
    shipCapacity: 50000,
    shipUnloadingRate: 250,
    currentMaterial: 'Wheat',
    
    intakeMaterials: [
      { type: 'Wheat', level: 75, capacity: 5000, tonnage: 3750, moistureLevel: 13.5, targetMoisture: 14, costPerTon: 280 },
      { type: 'Corn', level: 45, capacity: 5000, tonnage: 2250, moistureLevel: 12.8, targetMoisture: 13, costPerTon: 260 },
      { type: 'Barley', level: 85, capacity: 5000, tonnage: 4250, moistureLevel: 14.2, targetMoisture: 14, costPerTon: 270 },
      { type: 'Soy', level: 30, capacity: 5000, tonnage: 1500, moistureLevel: 11.5, targetMoisture: 12, costPerTon: 350 }
    ],
    intakeConveyorSpeed: 85,
    
    moistureSensors: {
      intake: 13.8,
      processing: 13.2,
      output: 12.9
    },
    dryerStatus: {
      active: true,
      temperature: 82,
      efficiency: 94
    },
    
    processingRate: 180,
    mixingStation: {
      activeRecipe: {
        id: '1',
        name: 'Premium Feed Mix',
        materials: [
          { type: 'Wheat', percentage: 40 },
          { type: 'Corn', percentage: 35 },
          { type: 'Barley', percentage: 25 }
        ],
        targetOutput: 500,
        active: true
      },
      batchProgress: 78
    },
    
    baggingLines: {
      line1: { active: true, bagSize: 25, rate: 850 },
      line2: { active: true, bagSize: 50, rate: 620 },
      line3: { active: false, bagSize: 25, rate: 0 }
    },
    totalBagsProduced: 24750,
    
    truckBays: [
      { id: 1, occupied: true, loadingProgress: 85, tonnageLoaded: 22.5 },
      { id: 2, occupied: true, loadingProgress: 45, tonnageLoaded: 12.3 },
      { id: 3, occupied: false, loadingProgress: 0, tonnageLoaded: 0 }
    ],
    trucksLoaded: 18,
    
    conveyorActive: [true, true, true, true],
    
    temperature: 24,
    humidity: 55,
    dailyProduction: 450,
    productionCostPerTon: 185,
    operatingEfficiency: 92,
    revenue: 125000,
    
    iotSensors: [
      { id: 'S001', type: 'moisture', location: 'Intake', value: 13.5, unit: '%', status: 'online', lastUpdate: new Date() },
      { id: 'S002', type: 'temperature', location: 'Dryer', value: 82, unit: '°C', status: 'online', lastUpdate: new Date() },
      { id: 'S003', type: 'pressure', location: 'Pelletizer', value: 2.4, unit: 'bar', status: 'online', lastUpdate: new Date() },
      { id: 'S004', type: 'level', location: 'Silo 1', value: 75, unit: '%', status: 'online', lastUpdate: new Date() },
      { id: 'S005', type: 'flow', location: 'Main Line', value: 180, unit: 't/hr', status: 'online', lastUpdate: new Date() }
    ],
    
    powerConsumption: 245,
    efficiency: 92,
    totalProduction: 28500,
    systemStatus: 'ACTIVE',
    processingActive: true,
    materialFlowRate: 185
  });
  
  // Simplified real-time updates - less frequent, more subtle
  useEffect(() => {
    if (!autoUpdate) return;
    
    const interval = setInterval(() => {
      setPlantData(prev => ({
        ...prev,
        shipUnloadingProgress: prev.shipDocked ? Math.min(100, prev.shipUnloadingProgress + 0.5) : 0,
        mixingStation: {
          ...prev.mixingStation,
          batchProgress: (prev.mixingStation.batchProgress + 0.8) % 100
        },
        totalBagsProduced: prev.totalBagsProduced + Math.floor(Math.random() * 3),
        truckBays: prev.truckBays.map(bay => ({
          ...bay,
          loadingProgress: bay.occupied ? Math.min(100, bay.loadingProgress + 1) : 0,
          tonnageLoaded: bay.occupied ? Math.min(30, bay.tonnageLoaded + 0.2) : 0
        })),
        powerConsumption: 245 + Math.round(Math.random() * 10),
        materialFlowRate: 185 + Math.round(Math.random() * 5),
        efficiency: Math.min(100, Math.max(85, prev.efficiency + (Math.random() - 0.5) * 2))
      }));
    }, 3000); // Update every 3 seconds instead of 2
    
    return () => clearInterval(interval);
  }, [autoUpdate]);
  
  return (
    <WaterSystemLayout
      title="Digital Twin - Production Facility"
      subtitle="Real-time monitoring and control of the entire production process"
    >
      <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: palette.text }}>
              Digital Twin - Production Facility
            </Typography>
            <Typography variant="body2" sx={{ color: palette.textSecondary }}>
              Real-time monitoring and control of the entire production process
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={is3DView}
                  onChange={(e) => setIs3DView(e.target.checked)}
                  sx={{ 
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: palette.primary,
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: palette.primary,
                    },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Sparkles size={16} />
                  <Typography variant="body2">3D View</Typography>
                </Box>
              }
            />
            <Chip 
              label={`SYSTEM ${plantData.systemStatus}`}
              color={plantData.systemStatus === 'ACTIVE' ? 'success' : plantData.systemStatus === 'WARNING' ? 'warning' : 'default'}
              sx={{ fontWeight: 'bold' }}
            />
            <Tooltip title={autoUpdate ? "Pause Updates" : "Resume Updates"}>
              <IconButton 
                onClick={() => setAutoUpdate(!autoUpdate)}
                sx={{ border: '1px solid', borderColor: palette.border }}
              >
                {autoUpdate ? <RotateCw size={18} /> : <Eye size={18} />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {/* Main Visualization */}
        {is3DView ? (
          <Box sx={{ mb: 3, height: '600px', position: 'relative' }}>
            <DigitalTwin3D plantData={plantData} theme={theme} />
          </Box>
        ) : (
          <Paper elevation={2} sx={{ p: 2, mb: 3, backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff' }}>
            <CleanPlantVisualization data={plantData} theme={theme} palette={palette} />
          </Paper>
        )}
        
        {/* Simplified Essential KPI Cards */}
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4} md={2}>
            <SimpleKPICard
              title="DAILY PRODUCTION"
              value={plantData.dailyProduction}
              unit="tons"
              icon={Factory}
              status="success"
              subtext="↑ 12% from yesterday"
            />
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <SimpleKPICard
              title="EFFICIENCY"
              value={plantData.efficiency}
              unit="%"
              icon={Gauge}
              status={plantData.efficiency > 90 ? 'success' : 'warning'}
              subtext={plantData.efficiency > 90 ? 'Optimal' : 'Below target'}
            />
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <SimpleKPICard
              title="COST PER TON"
              value={`$${plantData.productionCostPerTon}`}
              unit=""
              icon={DollarSign}
              status={plantData.productionCostPerTon < 190 ? 'success' : 'warning'}
              subtext="Target: $180"
            />
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <SimpleKPICard
              title="FLOW RATE"
              value={plantData.materialFlowRate}
              unit="t/hr"
              icon={TrendingUp}
              status="info"
              subtext="Current throughput"
            />
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <SimpleKPICard
              title="IOT SENSORS"
              value={`${plantData.iotSensors.filter(s => s.status === 'online').length}/${plantData.iotSensors.length}`}
              unit=""
              icon={Wifi}
              status="success"
              subtext="All systems online"
            />
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <SimpleKPICard
              title="MOISTURE CONTROL"
              value={plantData.moistureSensors.output}
              unit="%"
              icon={Droplets}
              status="success"
              subtext="Within target range"
            />
          </Grid>
        </Grid>
      </Box>
    </WaterSystemLayout>
  );
}