import React, { useState, useEffect, useRef } from 'react';
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout';
import { Box, Paper, Typography, Grid, Card, CardContent, Chip, LinearProgress, Stack } from '@mui/material';
import { 
  Ship, Truck, Wheat, Droplets, Thermometer, Wind, Settings, Gauge, Package, 
  Factory, Zap, Activity, AlertTriangle, CheckCircle, Timer, Scale, BarChart3,
  Loader, Sparkles, ShieldCheck, Wrench, DollarSign, TrendingUp, AlertCircle,
  Boxes, PackageCheck, Cpu, Eye, RotateCw, Anchor, Waves, Siren
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { formatNumber, formatPercentage, formatWeight, formatTemperature, formatFlowRate, formatPressure, formatWithUnit } from '@/utils/formatNumber';

// Comprehensive Feedmill Data Model
interface FeedmillData {
  // 1. RAW MATERIAL RECEPTION
  reception: {
    marineDock: {
      shipDocked: boolean;
      shipName: string;
      unloadingRate: number; // tons/hr
      craneActive: boolean;
      materialType: string;
      tonnageUnloaded: number;
      estimatedCompletion: string;
    };
    truckPits: {
      pit1: { occupied: boolean; material: string; weight: number; truckId: string };
      pit2: { occupied: boolean; material: string; weight: number; truckId: string };
      pit3: { occupied: boolean; material: string; weight: number; truckId: string };
    };
    preCleaning: {
      aspiratorActive: boolean;
      screenActive: boolean;
      dustRemoved: number; // kg/hr
      foreignMatterRemoved: number; // kg/hr
    };
    intakeElevators: {
      elevator1: { active: boolean; speed: number; load: number };
      elevator2: { active: boolean; speed: number; load: number };
    };
  };

  // 2. RAW MATERIAL STORAGE
  storage: {
    silos: Array<{
      id: string;
      material: string;
      capacity: number; // tons
      currentLevel: number; // tons
      percentage: number;
      moisture: number;
      temperature: number;
      aerationActive: boolean;
      fumigationStatus: 'none' | 'active' | 'completed';
    }>;
  };

  // 3. CLEANING & PREPARATION
  cleaning: {
    magneticSeparator: {
      active: boolean;
      metalRemoved: number; // kg/day
      lastCleaned: string;
    };
    destoner: {
      active: boolean;
      stonesRemoved: number; // kg/hr
      efficiency: number;
    };
    gradingScreens: {
      active: boolean;
      oversizeRejects: number; // %
      undersizeRejects: number; // %
    };
    aspiration: {
      active: boolean;
      dustCollected: number; // kg/hr
      airflowRate: number; // m³/min
    };
  };

  // 4. GRINDING SECTION
  grinding: {
    hammerMill: {
      active: boolean;
      rpm: number;
      powerConsumption: number; // kW
      screenSize: number; // mm
      throughput: number; // tons/hr
    };
    rollerMill: {
      active: boolean;
      particleSize: number; // microns
      gapSetting: number; // mm
      throughput: number; // tons/hr
    };
    sieveAnalysis: {
      coarse: number; // %
      medium: number; // %
      fine: number; // %
    };
    dustCollection: {
      active: boolean;
      filterPressureDrop: number; // Pa
      collectedDust: number; // kg/hr
    };
  };

  // 5. DOSING & BATCHING
  dosing: {
    microDosing: {
      vitamins: { target: number; actual: number; accuracy: number };
      minerals: { target: number; actual: number; accuracy: number };
      additives: { target: number; actual: number; accuracy: number };
    };
    macroBatching: {
      wheat: { target: number; actual: number };
      corn: { target: number; actual: number };
      soy: { target: number; actual: number };
      barley: { target: number; actual: number };
    };
    currentRecipe: {
      name: string;
      code: string;
      batchSize: number; // kg
      batchNumber: string;
    };
    batchAccuracy: number; // %
  };

  // 6. MIXING
  mixing: {
    mixer: {
      active: boolean;
      mixingTime: number; // seconds
      currentTime: number; // seconds
      homogeneity: number; // CV%
      batchSize: number; // kg
      fullness: number; // %
    };
    liquidAddition: {
      oil: { active: boolean; flowRate: number; totalAdded: number };
      molasses: { active: boolean; flowRate: number; totalAdded: number };
      water: { active: boolean; flowRate: number; totalAdded: number };
    };
    cycleTime: number; // minutes
  };

  // 7. CONDITIONING
  conditioning: {
    steamConditioner: {
      active: boolean;
      temperature: number; // °C
      moisture: number; // %
      steamPressure: number; // bar
      retentionTime: number; // seconds
    };
  };

  // 8. PELLETING
  pelleting: {
    pelletMill: {
      active: boolean;
      dieSize: number; // mm
      productionRate: number; // tons/hr
      temperature: number; // °C
      amperage: number; // A
      pdi: number; // Pellet Durability Index %
      dieWear: number; // %
      steamValveOpen: number; // %
    };
  };

  // 9. COOLING
  cooling: {
    cooler: {
      active: boolean;
      inletTemp: number; // °C
      outletTemp: number; // °C
      ambientTemp: number; // °C
      retentionTime: number; // minutes
      moistureReduction: number; // %
      airflowRate: number; // m³/min
    };
  };

  // 10. CRUMBLING & SCREENING
  crumbling: {
    crumblerRolls: {
      active: boolean;
      gapSetting: number; // mm
      throughput: number; // tons/hr
    };
    screener: {
      active: boolean;
      finesPercentage: number; // %
      oversizePercentage: number; // %
    };
    recycleSystem: {
      active: boolean;
      recycleRate: number; // kg/hr
    };
  };

  // 11. LIQUID COATING
  coating: {
    fatCoating: {
      active: boolean;
      applicationRate: number; // %
      temperature: number; // °C
      accuracy: number; // %
    };
    enzymeApplication: {
      active: boolean;
      applicationRate: number; // g/ton
      accuracy: number; // %
    };
  };

  // 12. FINISHED PRODUCT STORAGE
  finishedStorage: {
    bins: Array<{
      id: string;
      product: string;
      capacity: number; // tons
      currentLevel: number; // tons
      percentage: number;
      qualityStatus: 'Passed' | 'Hold' | 'Reject';
      batchCode: string;
    }>;
  };

  // 13. BAGGING & BULK LOADING
  bagging: {
    lines: {
      line1: { active: boolean; bagSize: 25; rate: number; totalBags: number };
      line2: { active: boolean; bagSize: 50; rate: number; totalBags: number };
      line3: { active: boolean; bagSize: 1000; rate: number; totalBags: number };
    };
    palletizer: {
      active: boolean;
      palletsPerHour: number;
      currentPallet: number;
    };
    shrinkWrapper: {
      active: boolean;
      wrappedPallets: number;
    };
    bulkLoading: {
      bay1: { occupied: boolean; truckId: string; loaded: number; target: number };
      bay2: { occupied: boolean; truckId: string; loaded: number; target: number };
      bay3: { occupied: boolean; truckId: string; loaded: number; target: number };
      bay4: { occupied: boolean; truckId: string; loaded: number; target: number };
    };
  };

  // 14. QUALITY CONTROL
  qualityControl: {
    nirAnalyzer: {
      active: boolean;
      lastSample: string;
      protein: number;
      moisture: number;
      fat: number;
      fiber: number;
      ash: number;
    };
    labTests: {
      mycotoxins: { status: 'Pass' | 'Fail' | 'Pending'; value: number };
      salmonella: { status: 'Pass' | 'Fail' | 'Pending' };
      enterobacteria: { status: 'Pass' | 'Fail' | 'Pending'; value: number };
    };
    batchApproval: {
      status: 'Approved' | 'Pending' | 'Rejected';
      approvedBy: string;
      timestamp: string;
    };
    certificateGeneration: {
      available: boolean;
      certificateNumber: string;
    };
  };

  // 15. UTILITIES & SUPPORT
  utilities: {
    boiler: {
      active: boolean;
      steamGeneration: number; // tons/hr
      pressure: number; // bar
      temperature: number; // °C
      efficiency: number; // %
    };
    compressedAir: {
      active: boolean;
      pressure: number; // bar
      flowRate: number; // m³/min
      dewPoint: number; // °C
    };
    dustCollection: {
      active: boolean;
      totalAirflow: number; // m³/hr
      filterStatus: 'Clean' | 'Normal' | 'Needs Cleaning';
      collectedDust: number; // kg/hr
    };
    electrical: {
      totalLoad: number; // kW
      powerFactor: number;
      voltage: number; // V
      frequency: number; // Hz
    };
  };

  // KPIs
  kpis: {
    totalProduction: number; // tons/day
    oee: number; // %
    energyConsumption: number; // kWh/ton
    productionCost: number; // $/ton
    qualityIndex: number; // %
    downtime: number; // hours
    batchAccuracy: number; // %
    moistureControl: number; // %
  };
}

// Professional SCADA-style Feedmill Visualization Component
const ProfessionalFeedmillVisualization: React.FC<{ data: FeedmillData }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [animationFrame, setAnimationFrame] = useState(0);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Animation loop for material flow and equipment operation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Professional SCADA color scheme - Enhanced Cyberpunk for Dark Mode
  const colors = {
    // Equipment states - Neon cyberpunk colors
    activeEquipment: isDark ? '#00BCD4' : '#0288D1',  // Bright cyan for dark mode, blue for light
    inactiveEquipment: isDark ? '#2D3561' : '#616161', // Dark blue-gray for dark mode
    warningEquipment: isDark ? '#FFAB00' : '#FFA726',  // Bright amber for dark mode
    errorEquipment: isDark ? '#FF1744' : '#EF5350',    // Bright red for dark mode
    
    // Materials - Enhanced visibility
    materialFlow: isDark ? '#FFD700' : '#FFD600',       // Gold for grain flow
    liquidFlow: isDark ? '#00BCD4' : '#2196F3',         // Cyan for liquids in dark mode
    steamFlow: isDark ? '#64FFDA' : '#E0E0E0',          // Cyan-white for steam in dark mode
    
    // Structure - Cyberpunk metallic with blue undertones
    equipmentBody: isDark ? '#1E3A5F' : '#78909C', // Deep blue metallic for dark mode
    equipmentHighlight: isDark ? '#2E5266' : '#90A4AE',
    equipmentShadow: isDark ? '#0D2438' : '#546E7A',
    
    // Text - Cyberpunk neon text
    primaryText: isDark ? '#00BCD4' : '#212121',  // Cyan headers in dark mode
    secondaryText: isDark ? '#2196F3' : '#616161',  // Blue secondary text in dark mode
    valueText: isDark ? '#00BCD4' : '#2E7D32',
    
    // Background elements - Deep space theme
    floor: isDark ? '#0A0E1A' : '#ECEFF1',  // Deep blue-black floor
    gridLines: isDark ? 'rgba(0, 188, 212, 0.15)' : '#CFD8DC',  // Cyan grid lines in dark
    sectionBg: isDark ? 'rgba(13, 25, 38, 0.95)' : 'rgba(255, 255, 255, 0.95)'  // Deep blue sections
  };

  const getEquipmentColor = (active: boolean, warning?: boolean, error?: boolean) => {
    if (error) return colors.errorEquipment;
    if (warning) return colors.warningEquipment;
    if (active) return colors.activeEquipment;
    return colors.inactiveEquipment;
  };

  const getFillLevelColor = (percentage: number) => {
    if (percentage >= 90) return '#EF5350';
    if (percentage >= 75) return '#FFA726';
    if (percentage >= 50) return '#66BB6A';
    return '#42A5F5';
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '900px',
      background: isDark
        ? 'linear-gradient(135deg, #0A0E1A 0%, #1A1F3A 50%, #0D1929 100%)'  // Deep blue-black cyberpunk gradient
        : 'linear-gradient(180deg, #FAFAFA 0%, #F5F5F5 100%)',
      borderRadius: 3,
      position: 'relative',
      overflow: 'auto',
      border: '2px solid',
      borderColor: isDark ? 'rgba(0, 188, 212, 0.3)' : '#E0E0E0',  // Cyan border in dark mode
      boxShadow: isDark 
        ? '0 0 30px rgba(0, 188, 212, 0.2), inset 0 2px 4px rgba(0,0,0,0.5)'  // Cyan glow effect
        : 'inset 0 2px 4px rgba(0,0,0,0.1)',
      p: 3
    }}>
      <svg
        ref={svgRef}
        viewBox="0 0 3200 1600"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', minWidth: '1600px' }}
      >
        <defs>
          {/* Professional gradient definitions */}
          <linearGradient id="metalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.equipmentHighlight} />
            <stop offset="50%" stopColor={colors.equipmentBody} />
            <stop offset="100%" stopColor={colors.equipmentShadow} />
          </linearGradient>

          <linearGradient id="siloGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B0BEC5" />
            <stop offset="30%" stopColor="#90A4AE" />
            <stop offset="70%" stopColor="#78909C" />
            <stop offset="100%" stopColor="#607D8B" />
          </linearGradient>

          <radialGradient id="glowEffect">
            <stop offset="0%" stopColor={isDark ? "#00BCD4" : "#0288D1"} stopOpacity="0.8" />
            <stop offset="100%" stopColor={isDark ? "#00BCD4" : "#0288D1"} stopOpacity="0" />
          </radialGradient>
          
          {/* Cyberpunk gradient for dark mode */}
          <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00BCD4" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#2196F3" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1976D2" stopOpacity="0.4" />
          </linearGradient>

          {/* Drop shadow filter */}
          <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
            <feOffset dx="2" dy="4" result="offsetblur"/>
            <feFlood floodColor="#000000" floodOpacity="0.3"/>
            <feComposite in2="offsetblur" operator="in"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Material flow pattern */}
          <pattern id="grainFlow" x={animationFrame % 40} y="0" width="40" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="4" fill={colors.materialFlow} opacity="0.8"/>
            <circle cx="30" cy="10" r="4" fill={colors.materialFlow} opacity="0.8"/>
          </pattern>

          {/* Industrial floor pattern */}
          <pattern id="industrialFloor" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill={colors.floor}/>
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke={colors.gridLines} strokeWidth="1" opacity="0.3"/>
            <rect x="45" y="45" width="10" height="10" fill={colors.gridLines} opacity="0.1"/>
          </pattern>
        </defs>

        {/* Industrial floor background */}
        <rect width="3200" height="1600" fill="url(#industrialFloor)"/>

        {/* Main title header */}
        <g>
          <rect x="0" y="0" width="3200" height="100" fill={colors.sectionBg} filter="url(#dropShadow)"/>
          <text x="1600" y="50" textAnchor="middle" fill={colors.primaryText} fontSize="32" fontWeight="bold">
            PLANT MONITORING - REAL-TIME PROCESS CONTROL
          </text>
          <text x="1600" y="80" textAnchor="middle" fill={colors.secondaryText} fontSize="18">
            15-STAGE PRODUCTION LINE | CAPACITY: 500 TPD | STATUS: OPERATIONAL
          </text>
        </g>

        {/* Section 1: MARINE DOCK & TRUCK RECEPTION */}
        <g transform="translate(100, 150)">
          <rect x="0" y="0" width="500" height="80" fill={colors.sectionBg} rx="10" filter="url(#dropShadow)"/>
          <text x="250" y="35" textAnchor="middle" fill={colors.primaryText} fontSize="20" fontWeight="bold">
            1. RAW MATERIAL RECEPTION
          </text>
          <text x="250" y="60" textAnchor="middle" fill={colors.secondaryText} fontSize="16">
            Marine Dock & Truck Pits
          </text>

          {/* Realistic ship/barge shape */}
          <g transform="translate(0, 100)">
            {data.reception.marineDock.shipDocked && (
              <g filter="url(#dropShadow)">
                {/* Ship hull */}
                <path d="M 20 150 L 40 180 L 280 180 L 320 150 L 300 120 L 40 120 Z" 
                      fill={colors.equipmentBody} stroke={colors.equipmentShadow} strokeWidth="2"/>
                {/* Ship deck */}
                <rect x="60" y="100" width="220" height="20" fill={colors.equipmentHighlight}/>
                {/* Ship bridge */}
                <rect x="200" y="80" width="60" height="20" fill={colors.equipmentBody}/>
                <rect x="210" y="85" width="40" height="10" fill="#4FC3F7"/>
                {/* Cargo holds */}
                <rect x="80" y="125" width="60" height="45" fill={colors.materialFlow} opacity="0.7"/>
                <rect x="150" y="125" width="60" height="45" fill={colors.materialFlow} opacity="0.7"/>
                <rect x="220" y="125" width="60" height="45" fill={colors.materialFlow} opacity="0.5"/>
                {/* Ship name */}
                <text x="170" y="145" textAnchor="middle" fill={colors.primaryText} fontSize="16" fontWeight="bold">
                  {data.reception.marineDock.shipName}
                </text>
              </g>
            )}

            {/* Unloading crane with realistic design */}
            <g transform="translate(350, 0)" filter="url(#dropShadow)">
              {/* Crane base */}
              <rect x="-20" y="160" width="40" height="40" fill={colors.equipmentBody} rx="5"/>
              {/* Crane tower */}
              <rect x="-5" y="0" width="10" height="160" fill="url(#metalGradient)"/>
              {/* Crane boom */}
              <line x1="0" y1="20" x2="120" y2="60" stroke={colors.equipmentBody} strokeWidth="8"/>
              {/* Crane cables */}
              <line x1="120" y1="60" x2="120" y2={120 + Math.sin(animationFrame / 10) * 20} 
                    stroke={colors.equipmentShadow} strokeWidth="2" strokeDasharray="5,5"/>
              {/* Grab bucket */}
              {data.reception.marineDock.craneActive && (
                <g transform={`translate(120, ${120 + Math.sin(animationFrame / 10) * 20})`}>
                  <path d="M -15 0 L -10 20 L 10 20 L 15 0 Z" fill={colors.activeEquipment}/>
                  <circle cx="0" cy="10" r="3" fill={colors.materialFlow}/>
                </g>
              )}
              {/* Crane cabin */}
              <rect x="-10" y="15" width="20" height="15" fill={colors.equipmentHighlight} rx="3"/>
              <rect x="-5" y="18" width="10" height="8" fill="#4FC3F7" opacity="0.8"/>
            </g>
          </g>

          {/* Data display panel */}
          <g transform="translate(0, 220)">
            <rect x="0" y="0" width="500" height="120" fill={colors.sectionBg} rx="10" filter="url(#dropShadow)"/>
            <text x="20" y="30" fill={colors.primaryText} fontSize="16" fontWeight="bold">
              Unloading Rate: 
            </text>
            <text x="180" y="30" fill={colors.valueText} fontSize="18" fontWeight="bold">
              {formatWithUnit(data.reception.marineDock.unloadingRate, 'TPH')}
            </text>
            <text x="20" y="60" fill={colors.primaryText} fontSize="16">
              Material: {data.reception.marineDock.materialType}
            </text>
            <text x="20" y="90" fill={colors.primaryText} fontSize="16">
              Progress: {formatWithUnit(data.reception.marineDock.tonnageUnloaded, 'tons')}
            </text>
            <text x="300" y="60" fill={colors.primaryText} fontSize="16">
              ETA: {data.reception.marineDock.estimatedCompletion}
            </text>
            <text x="300" y="90" fill={getEquipmentColor(data.reception.marineDock.craneActive)} fontSize="16" fontWeight="bold">
              Status: {data.reception.marineDock.craneActive ? 'ACTIVE' : 'IDLE'}
            </text>
          </g>

          {/* Truck receiving pits with realistic trucks */}
          <g transform="translate(0, 360)">
            {Object.entries(data.reception.truckPits).map(([pitId, pit], index) => (
              <g key={pitId} transform={`translate(${index * 170}, 0)`}>
                {/* Pit structure */}
                <rect x="0" y="40" width="150" height="80" fill={colors.equipmentShadow} rx="5" filter="url(#dropShadow)"/>
                <rect x="5" y="45" width="140" height="70" fill={pit.occupied ? colors.materialFlow : colors.equipmentBody} 
                      opacity="0.6" rx="3"/>
                
                {/* Realistic truck if occupied */}
                {pit.occupied && (
                  <g filter="url(#dropShadow)">
                    {/* Truck cab */}
                    <rect x="10" y="0" width="40" height="35" fill="#1976D2" rx="5"/>
                    <rect x="15" y="5" width="30" height="15" fill="#64B5F6" opacity="0.8"/>
                    {/* Truck trailer */}
                    <rect x="50" y="5" width="90" height="30" fill="#424242" rx="3"/>
                    {/* Truck wheels */}
                    <circle cx="30" cy="35" r="5" fill="#212121"/>
                    <circle cx="70" cy="35" r="5" fill="#212121"/>
                    <circle cx="90" cy="35" r="5" fill="#212121"/>
                    <circle cx="110" cy="35" r="5" fill="#212121"/>
                    <circle cx="130" cy="35" r="5" fill="#212121"/>
                    {/* Truck ID */}
                    <text x="95" y="22" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                      {pit.truckId}
                    </text>
                  </g>
                )}
                
                {/* Pit info */}
                <text x="75" y="140" textAnchor="middle" fill={colors.primaryText} fontSize="16" fontWeight="bold">
                  PIT {index + 1}
                </text>
                <text x="75" y="160" textAnchor="middle" fill={colors.secondaryText} fontSize="14">
                  {pit.material} | {formatWithUnit(pit.weight, 't')}
                </text>
              </g>
            ))}
          </g>
        </g>

        {/* Section 2: STORAGE SILOS */}
        <g transform="translate(650, 150)">
          <rect x="0" y="0" width="600" height="80" fill={colors.sectionBg} rx="10" filter="url(#dropShadow)"/>
          <text x="300" y="35" textAnchor="middle" fill={colors.primaryText} fontSize="20" fontWeight="bold">
            2. RAW MATERIAL STORAGE
          </text>
          <text x="300" y="60" textAnchor="middle" fill={colors.secondaryText} fontSize="16">
            6 Storage Silos - 24,500 MT Total Capacity
          </text>

          {/* Realistic cylindrical silos with proper 3D perspective */}
          <g transform="translate(0, 100)">
            {data.storage.silos.map((silo, index) => {
              const x = index * 100;
              const fillHeight = (silo.percentage / 100) * 280;
              const fillColor = getFillLevelColor(silo.percentage);
              
              return (
                <g key={silo.id} transform={`translate(${x}, 0)`} filter="url(#dropShadow)">
                  {/* Silo cone top */}
                  <path d="M 20 40 L 50 0 L 80 40 Z" fill={colors.equipmentHighlight} stroke={colors.equipmentShadow} strokeWidth="2"/>
                  
                  {/* Silo cylinder body */}
                  <rect x="20" y="40" width="60" height="280" fill="url(#siloGradient)" stroke={colors.equipmentShadow} strokeWidth="2"/>
                  
                  {/* Vertical ribs for realism */}
                  <line x1="30" y1="40" x2="30" y2="320" stroke={colors.equipmentShadow} strokeWidth="1" opacity="0.5"/>
                  <line x1="50" y1="40" x2="50" y2="320" stroke={colors.equipmentHighlight} strokeWidth="1" opacity="0.5"/>
                  <line x1="70" y1="40" x2="70" y2="320" stroke={colors.equipmentShadow} strokeWidth="1" opacity="0.5"/>
                  
                  {/* Fill level with gradient */}
                  <defs>
                    <linearGradient id={`fill-${silo.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={fillColor} stopOpacity="0.9"/>
                      <stop offset="100%" stopColor={fillColor} stopOpacity="0.6"/>
                    </linearGradient>
                  </defs>
                  <rect x="22" y={320 - fillHeight} width="56" height={fillHeight} 
                        fill={`url(#fill-${silo.id})`} opacity="0.8"/>
                  
                  {/* Hopper bottom */}
                  <path d="M 20 320 L 40 360 L 60 360 L 80 320 Z" 
                        fill={colors.equipmentBody} stroke={colors.equipmentShadow} strokeWidth="2"/>
                  
                  {/* Discharge gate */}
                  <rect x="45" y="360" width="10" height="10" fill={colors.equipmentShadow} rx="2"/>
                  
                  {/* Level indicator window */}
                  <rect x="35" y="160" width="30" height="40" fill="rgba(0,0,0,0.3)" rx="5" stroke={colors.equipmentHighlight} strokeWidth="2"/>
                  <text x="50" y="185" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">
                    {formatPercentage(silo.percentage)}
                  </text>
                  
                  {/* Aeration system indicator */}
                  {silo.aerationActive && (
                    <g>
                      <circle cx="50" cy="300" r="8" fill={colors.activeEquipment}>
                        <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite"/>
                      </circle>
                      <text x="50" y="305" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                        AIR
                      </text>
                    </g>
                  )}
                  
                  {/* Silo identification and data */}
                  <g transform="translate(0, 380)">
                    <rect x="10" y="0" width="80" height="80" fill={colors.sectionBg} rx="5" opacity="0.95"/>
                    <text x="50" y="20" textAnchor="middle" fill={colors.primaryText} fontSize="14" fontWeight="bold">
                      {silo.id}
                    </text>
                    <text x="50" y="35" textAnchor="middle" fill={colors.secondaryText} fontSize="12">
                      {silo.material}
                    </text>
                    <text x="50" y="50" textAnchor="middle" fill={colors.valueText} fontSize="12">
                      {formatWithUnit(silo.currentLevel, 'MT')}
                    </text>
                    <text x="50" y="65" textAnchor="middle" fill={silo.moisture > 14 ? colors.warningEquipment : colors.activeEquipment} fontSize="11">
                      M: {formatPercentage(silo.moisture)}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </g>

        {/* Section 3: CLEANING STATION */}
        <g transform="translate(1300, 150)">
          <rect x="0" y="0" width="400" height="80" fill={colors.sectionBg} rx="10" filter="url(#dropShadow)"/>
          <text x="200" y="35" textAnchor="middle" fill={colors.primaryText} fontSize="20" fontWeight="bold">
            3. CLEANING STATION
          </text>
          <text x="200" y="60" textAnchor="middle" fill={colors.secondaryText} fontSize="16">
            Pre-cleaning & Separation
          </text>

          {/* Magnetic Separator - Realistic design */}
          <g transform="translate(20, 100)" filter="url(#dropShadow)">
            <rect x="0" y="0" width="160" height="100" fill={getEquipmentColor(data.cleaning.magneticSeparator.active)} 
                  rx="10" opacity="0.8"/>
            <rect x="10" y="10" width="140" height="80" fill={colors.equipmentBody} rx="8"/>
            {/* Magnetic coils visualization */}
            <rect x="20" y="30" width="30" height="40" fill="#9C27B0" opacity="0.7" rx="5"/>
            <rect x="60" y="30" width="30" height="40" fill="#9C27B0" opacity="0.7" rx="5"/>
            <rect x="100" y="30" width="30" height="40" fill="#9C27B0" opacity="0.7" rx="5"/>
            {/* Magnetic field lines */}
            {data.cleaning.magneticSeparator.active && (
              <>
                <path d="M 35 30 Q 35 10, 75 10 Q 115 10, 115 30" fill="none" stroke="#E91E63" strokeWidth="2" opacity="0.6" strokeDasharray="5,5">
                  <animate attributeName="stroke-dashoffset" values="0;10" dur="1s" repeatCount="indefinite"/>
                </path>
                <path d="M 35 70 Q 35 90, 75 90 Q 115 90, 115 70" fill="none" stroke="#E91E63" strokeWidth="2" opacity="0.6" strokeDasharray="5,5">
                  <animate attributeName="stroke-dashoffset" values="0;10" dur="1s" repeatCount="indefinite"/>
                </path>
              </>
            )}
            <text x="80" y="55" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
              MAGNET
            </text>
            <text x="80" y="115" textAnchor="middle" fill={colors.primaryText} fontSize="14">
              Metal: {formatWithUnit(data.cleaning.magneticSeparator.metalRemoved, 'kg/day')}
            </text>
          </g>

          {/* Destoner - Vibrating screen design */}
          <g transform="translate(200, 100)" filter="url(#dropShadow)">
            <g transform={data.cleaning.destoner.active ? `translate(${Math.sin(animationFrame / 5) * 2}, 0)` : ''}>
              <rect x="0" y="0" width="160" height="100" fill={getEquipmentColor(data.cleaning.destoner.active)} 
                    rx="10" opacity="0.8"/>
              <rect x="10" y="10" width="140" height="80" fill={colors.equipmentBody} rx="8"/>
              {/* Screen mesh pattern */}
              <pattern id="screenMesh" width="4" height="4" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill={colors.equipmentShadow} opacity="0.5"/>
              </pattern>
              <rect x="20" y="30" width="120" height="40" fill="url(#screenMesh)"/>
              {/* Vibration indicators */}
              {data.cleaning.destoner.active && (
                <>
                  <line x1="15" y1="50" x2="25" y2="50" stroke={colors.activeEquipment} strokeWidth="3" opacity="0.8"/>
                  <line x1="135" y1="50" x2="145" y2="50" stroke={colors.activeEquipment} strokeWidth="3" opacity="0.8"/>
                </>
              )}
              <text x="80" y="55" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
                DESTONER
              </text>
            </g>
            <text x="80" y="115" textAnchor="middle" fill={colors.primaryText} fontSize="14">
              Efficiency: {formatPercentage(data.cleaning.destoner.efficiency)}
            </text>
          </g>

          {/* Grading Screens */}
          <g transform="translate(20, 220)" filter="url(#dropShadow)">
            <rect x="0" y="0" width="340" height="120" fill={getEquipmentColor(data.cleaning.gradingScreens.active)} 
                  rx="10" opacity="0.8"/>
            <rect x="10" y="10" width="320" height="100" fill={colors.equipmentBody} rx="8"/>
            {/* Multi-layer screens */}
            <rect x="20" y="25" width="300" height="20" fill={colors.equipmentHighlight} opacity="0.6"/>
            <rect x="20" y="50" width="300" height="20" fill={colors.equipmentHighlight} opacity="0.5"/>
            <rect x="20" y="75" width="300" height="20" fill={colors.equipmentHighlight} opacity="0.4"/>
            <text x="170" y="60" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
              GRADING SCREENS
            </text>
            <text x="100" y="135" textAnchor="middle" fill={colors.primaryText} fontSize="14">
              Over: {formatPercentage(data.cleaning.gradingScreens.oversizeRejects)}
            </text>
            <text x="240" y="135" textAnchor="middle" fill={colors.primaryText} fontSize="14">
              Under: {formatPercentage(data.cleaning.gradingScreens.undersizeRejects)}
            </text>
          </g>
        </g>

        {/* Section 4: GRINDING SECTION */}
        <g transform="translate(1750, 150)">
          <rect x="0" y="0" width="450" height="80" fill={colors.sectionBg} rx="10" filter="url(#dropShadow)"/>
          <text x="225" y="35" textAnchor="middle" fill={colors.primaryText} fontSize="20" fontWeight="bold">
            4. GRINDING SECTION
          </text>
          <text x="225" y="60" textAnchor="middle" fill={colors.secondaryText} fontSize="16">
            Particle Size Reduction
          </text>

          {/* Hammer Mill - Realistic rotating hammers */}
          <g transform="translate(20, 100)" filter="url(#dropShadow)">
            <rect x="0" y="0" width="200" height="200" fill={getEquipmentColor(data.grinding.hammerMill.active)} 
                  rx="15" opacity="0.8"/>
            <circle cx="100" cy="100" r="80" fill={colors.equipmentBody} stroke={colors.equipmentShadow} strokeWidth="3"/>
            {/* Rotor and hammers */}
            {data.grinding.hammerMill.active && (
              <g transform={`translate(100, 100) rotate(${animationFrame * 10})`}>
                {/* Central rotor */}
                <circle cx="0" cy="0" r="20" fill={colors.equipmentShadow}/>
                {/* Hammers */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                  <g key={angle} transform={`rotate(${angle})`}>
                    <rect x="-5" y="20" width="10" height="50" fill={colors.equipmentHighlight} rx="2"/>
                    <rect x="-8" y="65" width="16" height="8" fill="#FF6F00" rx="2"/>
                  </g>
                ))}
              </g>
            )}
            {/* Screen at bottom */}
            <path d="M 30 160 Q 100 180, 170 160" fill="none" stroke={colors.equipmentShadow} strokeWidth="3" strokeDasharray="5,2"/>
            <text x="100" y="190" textAnchor="middle" fill={colors.primaryText} fontSize="16" fontWeight="bold">
              HAMMER MILL
            </text>
            <text x="100" y="220" textAnchor="middle" fill={colors.primaryText} fontSize="14">
              {formatWithUnit(data.grinding.hammerMill.rpm, 'RPM')}
            </text>
            <text x="100" y="240" textAnchor="middle" fill={colors.valueText} fontSize="14">
              {formatWithUnit(data.grinding.hammerMill.throughput, 'TPH')}
            </text>
          </g>

          {/* Roller Mill - Dual rollers */}
          <g transform="translate(240, 100)" filter="url(#dropShadow)">
            <rect x="0" y="0" width="180" height="200" fill={getEquipmentColor(data.grinding.rollerMill.active)} 
                  rx="15" opacity="0.8"/>
            <rect x="10" y="10" width="160" height="180" fill={colors.equipmentBody} rx="10"/>
            {/* Top roller */}
            <ellipse cx="90" cy="70" rx="60" ry="25" fill={colors.equipmentHighlight} 
                     transform={data.grinding.rollerMill.active ? `rotate(${animationFrame * 5} 90 70)` : ''}/>
            {/* Bottom roller */}
            <ellipse cx="90" cy="120" rx="60" ry="25" fill={colors.equipmentHighlight}
                     transform={data.grinding.rollerMill.active ? `rotate(${-animationFrame * 5} 90 120)` : ''}/>
            {/* Gap indicator */}
            <line x1="90" y1="85" x2="90" y2="105" stroke={colors.warningEquipment} strokeWidth="2" strokeDasharray="3,3"/>
            <text x="120" y="97" fill={colors.valueText} fontSize="12">
              {formatWithUnit(data.grinding.rollerMill.gapSetting, 'mm')}
            </text>
            <text x="90" y="160" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
              ROLLER MILL
            </text>
            <text x="90" y="220" textAnchor="middle" fill={colors.primaryText} fontSize="14">
              {formatWithUnit(data.grinding.rollerMill.particleSize, 'μm')}
            </text>
            <text x="90" y="240" textAnchor="middle" fill={colors.valueText} fontSize="14">
              {formatWithUnit(data.grinding.rollerMill.throughput, 'TPH')}
            </text>
          </g>
        </g>

        {/* Section 5: MIXING & DOSING */}
        <g transform="translate(2250, 150)">
          <rect x="0" y="0" width="450" height="80" fill={colors.sectionBg} rx="10" filter="url(#dropShadow)"/>
          <text x="225" y="35" textAnchor="middle" fill={colors.primaryText} fontSize="20" fontWeight="bold">
            5. MIXING & DOSING
          </text>
          <text x="225" y="60" textAnchor="middle" fill={colors.secondaryText} fontSize="16">
            Precision Batching System
          </text>

          {/* Horizontal Mixer - Realistic double ribbon design */}
          <g transform="translate(50, 100)" filter="url(#dropShadow)">
            <rect x="0" y="0" width="350" height="180" fill={getEquipmentColor(data.mixing.mixer.active)} 
                  rx="15" opacity="0.8"/>
            {/* Mixer body - U-shaped trough */}
            <path d="M 20 40 L 20 120 Q 20 160, 60 160 L 290 160 Q 330 160, 330 120 L 330 40 Z" 
                  fill={colors.equipmentBody} stroke={colors.equipmentShadow} strokeWidth="3"/>
            {/* Fill level */}
            <path d={`M 25 ${160 - data.mixing.mixer.fullness * 1.2} L 25 155 Q 25 155, 60 155 L 290 155 Q 325 155, 325 155 L 325 ${160 - data.mixing.mixer.fullness * 1.2} Z`} 
                  fill={colors.materialFlow} opacity="0.6"/>
            {/* Double ribbon agitator */}
            {data.mixing.mixer.active && (
              <g transform={`translate(175, 100)`}>
                <g transform={`rotate(${animationFrame * 3})`}>
                  {/* Inner ribbon */}
                  <ellipse cx="0" cy="0" rx="120" ry="40" fill="none" stroke={colors.equipmentHighlight} strokeWidth="4" strokeDasharray="20,10" opacity="0.8"/>
                  {/* Outer ribbon */}
                  <ellipse cx="0" cy="0" rx="140" ry="50" fill="none" stroke={colors.equipmentHighlight} strokeWidth="4" strokeDasharray="20,10" opacity="0.6"
                           transform="rotate(180)"/>
                </g>
              </g>
            )}
            {/* Mixer cover */}
            <rect x="20" y="30" width="310" height="15" fill={colors.equipmentHighlight} rx="5"/>
            {/* Inspection windows */}
            <circle cx="100" cy="37" r="5" fill="#4FC3F7" opacity="0.8"/>
            <circle cx="175" cy="37" r="5" fill="#4FC3F7" opacity="0.8"/>
            <circle cx="250" cy="37" r="5" fill="#4FC3F7" opacity="0.8"/>
            
            <text x="175" y="20" textAnchor="middle" fill={colors.primaryText} fontSize="18" fontWeight="bold">
              HORIZONTAL MIXER
            </text>
            <text x="175" y="190" textAnchor="middle" fill={colors.primaryText} fontSize="16">
              Batch: {data.mixing.mixer.batchSize} kg
            </text>
            <text x="175" y="210" textAnchor="middle" fill={colors.valueText} fontSize="16" fontWeight="bold">
              {data.mixing.mixer.fullness}% Full
            </text>
            <text x="175" y="230" textAnchor="middle" fill={colors.primaryText} fontSize="14">
              Time: {data.mixing.mixer.currentTime}/{data.mixing.mixer.mixingTime}s
            </text>
          </g>

          {/* Micro Dosing Scales */}
          <g transform="translate(50, 350)">
            <rect x="0" y="0" width="350" height="100" fill={colors.sectionBg} rx="10" opacity="0.95"/>
            <text x="175" y="25" textAnchor="middle" fill={colors.primaryText} fontSize="16" fontWeight="bold">
              MICRO DOSING
            </text>
            <text x="60" y="50" textAnchor="middle" fill={colors.secondaryText} fontSize="14">
              Vitamins: {formatWithUnit(data.dosing.microDosing.vitamins.actual, 'kg')}
            </text>
            <text x="175" y="50" textAnchor="middle" fill={colors.secondaryText} fontSize="14">
              Minerals: {formatWithUnit(data.dosing.microDosing.minerals.actual, 'kg')}
            </text>
            <text x="290" y="50" textAnchor="middle" fill={colors.secondaryText} fontSize="14">
              Additives: {formatWithUnit(data.dosing.microDosing.additives.actual, 'kg')}
            </text>
            <text x="175" y="80" textAnchor="middle" fill={colors.valueText} fontSize="16" fontWeight="bold">
              Accuracy: {formatPercentage(data.dosing.batchAccuracy)}
            </text>
          </g>
        </g>

        {/* Section 6: PELLETING & COOLING */}
        <g transform="translate(2750, 150)">
          <rect x="0" y="0" width="400" height="80" fill={colors.sectionBg} rx="10" filter="url(#dropShadow)"/>
          <text x="200" y="35" textAnchor="middle" fill={colors.primaryText} fontSize="20" fontWeight="bold">
            6. PELLETING
          </text>
          <text x="200" y="60" textAnchor="middle" fill={colors.secondaryText} fontSize="16">
            Die & Roller System
          </text>

          {/* Pellet Mill - Realistic die and roller assembly */}
          <g transform="translate(50, 100)" filter="url(#dropShadow)">
            <rect x="0" y="0" width="300" height="250" fill={getEquipmentColor(data.pelleting.pelletMill.active)} 
                  rx="15" opacity="0.8"/>
            {/* Mill housing */}
            <rect x="20" y="20" width="260" height="210" fill={colors.equipmentBody} rx="10"/>
            {/* Die ring */}
            <circle cx="150" cy="125" r="80" fill="none" stroke={colors.equipmentHighlight} strokeWidth="15"/>
            {/* Die holes pattern */}
            <circle cx="150" cy="125" r="80" fill="none" stroke={colors.equipmentShadow} strokeWidth="15" 
                    strokeDasharray="3,3" opacity="0.5"/>
            {/* Rollers */}
            {data.pelleting.pelletMill.active && (
              <g transform={`translate(150, 125)`}>
                <g transform={`rotate(${animationFrame * 8})`}>
                  <circle cx="40" cy="0" r="25" fill={colors.equipmentHighlight}/>
                  <circle cx="-40" cy="0" r="25" fill={colors.equipmentHighlight}/>
                  <circle cx="0" cy="40" r="25" fill={colors.equipmentHighlight}/>
                </g>
              </g>
            )}
            {/* Center shaft */}
            <circle cx="150" cy="125" r="15" fill={colors.equipmentShadow}/>
            {/* Steam injection indicator */}
            {data.pelleting.pelletMill.steamValveOpen > 0 && (
              <g>
                <line x1="50" y1="125" x2="80" y2="125" stroke={colors.steamFlow} strokeWidth="4" opacity="0.6">
                  <animate attributeName="x2" values="80;70;80" dur="1s" repeatCount="indefinite"/>
                </line>
                <text x="30" y="130" fill={colors.primaryText} fontSize="12">STEAM</text>
              </g>
            )}
            <text x="150" y="15" textAnchor="middle" fill={colors.primaryText} fontSize="18" fontWeight="bold">
              PELLET MILL
            </text>
            <text x="150" y="210" textAnchor="middle" fill={colors.primaryText} fontSize="14">
              Die: {data.pelleting.pelletMill.dieSize}mm
            </text>
            <text x="150" y="230" textAnchor="middle" fill={colors.valueText} fontSize="14">
              {formatWithUnit(data.pelleting.pelletMill.productionRate, 'TPH')}
            </text>
            <text x="150" y="250" textAnchor="middle" fill={data.pelleting.pelletMill.temperature > 85 ? colors.warningEquipment : colors.primaryText} fontSize="14">
              Temp: {formatTemperature(data.pelleting.pelletMill.temperature)}
            </text>
          </g>
        </g>

        {/* Conveyor Systems - Material flow connections */}
        <g>
          {/* Main horizontal conveyor belt */}
          <rect x="100" y="700" width="3000" height="40" fill={colors.equipmentBody} rx="20" opacity="0.8" filter="url(#dropShadow)"/>
          <rect x="110" y="705" width="2980" height="30" fill={colors.equipmentShadow} rx="15"/>
          {/* Belt surface */}
          <rect x="115" y="708" width="2970" height="24" fill="url(#grainFlow)" opacity="0.7"/>
          {/* Support rollers */}
          {[200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000].map(x => (
            <circle key={x} cx={x} cy="720" r="8" fill={colors.equipmentHighlight} opacity="0.6"/>
          ))}
        </g>

        {/* Bottom Control Panel - KPIs and System Status */}
        <g transform="translate(100, 800)">
          <rect x="0" y="0" width="3000" height="200" fill={colors.sectionBg} rx="15" filter="url(#dropShadow)"/>
          
          {/* KPI Cards */}
          <g transform="translate(50, 30)">
            {/* Production Rate */}
            <g>
              <rect x="0" y="0" width="350" height="140" 
                fill={isDark ? 'rgba(0, 255, 159, 0.1)' : '#E8F5E9'} 
                stroke={isDark ? 'rgba(0, 255, 159, 0.5)' : 'transparent'} 
                strokeWidth="2" rx="10" opacity="0.9"/>
              <Factory x={20} y={20} size={30} color={colors.activeEquipment}/>
              <text x={70} y={40} fill={colors.primaryText} fontSize="18" fontWeight="bold">
                PRODUCTION RATE
              </text>
              <text x={175} y={85} textAnchor="middle" fill={colors.valueText} fontSize="36" fontWeight="bold">
                {data.kpis.totalProduction}
              </text>
              <text x={175} y={115} textAnchor="middle" fill={colors.secondaryText} fontSize="16">
                tons/day
              </text>
            </g>

            {/* OEE */}
            <g transform="translate(380, 0)">
              <rect x="0" y="0" width="350" height="140" 
                fill={isDark ? 'rgba(0, 188, 212, 0.1)' : '#E8EAF6'} 
                stroke={isDark ? 'rgba(0, 188, 212, 0.5)' : 'transparent'} 
                strokeWidth="2" rx="10" opacity="0.9"/>
              <Activity x={20} y={20} size={30} color={isDark ? '#00BCD4' : '#3F51B5'}/>
              <text x={70} y={40} fill={colors.primaryText} fontSize="18" fontWeight="bold">
                OEE
              </text>
              <text x={175} y={85} textAnchor="middle" fill={colors.valueText} fontSize="36" fontWeight="bold">
                {data.kpis.oee}%
              </text>
              <text x={175} y={115} textAnchor="middle" fill={colors.secondaryText} fontSize="16">
                Overall Equipment Effectiveness
              </text>
            </g>

            {/* Energy Consumption */}
            <g transform="translate(760, 0)">
              <rect x="0" y="0" width="350" height="140" 
                fill={isDark ? 'rgba(255, 171, 0, 0.1)' : '#FFF3E0'} 
                stroke={isDark ? 'rgba(255, 171, 0, 0.5)' : 'transparent'} 
                strokeWidth="2" rx="10" opacity="0.9"/>
              <Zap x={20} y={20} size={30} color={isDark ? '#FFAB00' : '#FF6F00'}/>
              <text x={70} y={40} fill={colors.primaryText} fontSize="18" fontWeight="bold">
                ENERGY USE
              </text>
              <text x={175} y={85} textAnchor="middle" fill={colors.valueText} fontSize="36" fontWeight="bold">
                {data.kpis.energyConsumption}
              </text>
              <text x={175} y={115} textAnchor="middle" fill={colors.secondaryText} fontSize="16">
                kWh/ton
              </text>
            </g>

            {/* Quality Index */}
            <g transform="translate(1140, 0)">
              <rect x="0" y="0" width="350" height="140" 
                fill={isDark ? 'rgba(156, 39, 176, 0.1)' : '#F3E5F5'} 
                stroke={isDark ? 'rgba(156, 39, 176, 0.5)' : 'transparent'} 
                strokeWidth="2" rx="10" opacity="0.9"/>
              <ShieldCheck x={20} y={20} size={30} color="#9C27B0"/>
              <text x={70} y={40} fill={colors.primaryText} fontSize="18" fontWeight="bold">
                QUALITY INDEX
              </text>
              <text x={175} y={85} textAnchor="middle" fill={colors.valueText} fontSize="36" fontWeight="bold">
                {data.kpis.qualityIndex}%
              </text>
              <text x={175} y={115} textAnchor="middle" fill={colors.secondaryText} fontSize="16">
                Product Quality Score
              </text>
            </g>

            {/* Production Cost */}
            <g transform="translate(1520, 0)">
              <rect x="0" y="0" width="350" height="140" 
                fill={isDark ? 'rgba(255, 23, 68, 0.1)' : '#FFEBEE'} 
                stroke={isDark ? 'rgba(255, 23, 68, 0.5)' : 'transparent'} 
                strokeWidth="2" rx="10" opacity="0.9"/>
              <DollarSign x={20} y={20} size={30} color={isDark ? '#FF1744' : '#F44336'}/>
              <text x={70} y={40} fill={colors.primaryText} fontSize="18" fontWeight="bold">
                PRODUCTION COST
              </text>
              <text x={175} y={85} textAnchor="middle" fill={colors.valueText} fontSize="36" fontWeight="bold">
                ${data.kpis.productionCost}
              </text>
              <text x={175} y={115} textAnchor="middle" fill={colors.secondaryText} fontSize="16">
                per ton
              </text>
            </g>

            {/* System Status */}
            <g transform="translate(1900, 0)">
              <rect x="0" y="0" width="350" height="140" 
                fill={isDark ? 'rgba(0, 230, 118, 0.1)' : '#E0F2F1'} 
                stroke={isDark ? 'rgba(0, 230, 118, 0.5)' : 'transparent'} 
                strokeWidth="2" rx="10" opacity="0.9"/>
              <Settings x={20} y={20} size={30} color={isDark ? '#00E676' : '#00897B'}/>
              <text x={70} y={40} fill={colors.primaryText} fontSize="18" fontWeight="bold">
                SYSTEM STATUS
              </text>
              <circle cx={175} cy={80} r={25} fill={colors.activeEquipment}>
                <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
              </circle>
              <text x={175} y={88} textAnchor="middle" fill={isDark ? '#0A0E1A' : 'white'} fontSize="14" fontWeight="bold">
                LIVE
              </text>
              <text x={175} y={115} textAnchor="middle" fill={colors.secondaryText} fontSize="16">
                All Systems Operational
              </text>
            </g>

            {/* Batch Info */}
            <g transform="translate(2280, 0)">
              <rect x="0" y="0" width="600" height="140" 
                fill={isDark ? 'rgba(96, 125, 139, 0.1)' : '#ECEFF1'} 
                stroke={isDark ? 'rgba(96, 125, 139, 0.5)' : 'transparent'} 
                strokeWidth="2" rx="10" opacity="0.9"/>
              <Package x={20} y={20} size={30} color="#607D8B"/>
              <text x={70} y={40} fill={colors.primaryText} fontSize="18" fontWeight="bold">
                CURRENT BATCH
              </text>
              <text x={70} y={70} fill={colors.primaryText} fontSize="16">
                Recipe: {data.dosing.currentRecipe.name}
              </text>
              <text x={70} y={95} fill={colors.secondaryText} fontSize="14">
                Batch: {data.dosing.currentRecipe.batchNumber}
              </text>
              <text x={70} y={115} fill={colors.secondaryText} fontSize="14">
                Size: {data.dosing.currentRecipe.batchSize} kg | Accuracy: {data.dosing.batchAccuracy}%
              </text>
            </g>
          </g>
        </g>
      </svg>
    </Box>
  );
};

// Main Component
export default function FeedmillDigitalTwin() {
  const { theme } = useTheme();
  const [data, setData] = useState<FeedmillData>(() => generateInitialData());
  
  // Generate realistic initial data
  function generateInitialData(): FeedmillData {
    return {
      reception: {
        marineDock: {
          shipDocked: true,
          shipName: "MV GRAIN CARRIER",
          unloadingRate: 250,
          craneActive: true,
          materialType: "Wheat",
          tonnageUnloaded: 1250,
          estimatedCompletion: "14:30"
        },
        truckPits: {
          pit1: { occupied: true, material: "Corn", weight: 28, truckId: "TRK-A451" },
          pit2: { occupied: false, material: "-", weight: 0, truckId: "-" },
          pit3: { occupied: true, material: "Soy", weight: 32, truckId: "TRK-B782" }
        },
        preCleaning: {
          aspiratorActive: true,
          screenActive: true,
          dustRemoved: 125,
          foreignMatterRemoved: 45
        },
        intakeElevators: {
          elevator1: { active: true, speed: 85, load: 78 },
          elevator2: { active: true, speed: 90, load: 82 }
        }
      },
      storage: {
        silos: [
          { id: "S1", material: "Wheat", capacity: 5000, currentLevel: 3850, percentage: 77, moisture: 13.2, temperature: 24, aerationActive: true, fumigationStatus: 'none' },
          { id: "S2", material: "Corn", capacity: 5000, currentLevel: 4250, percentage: 85, moisture: 14.1, temperature: 26, aerationActive: false, fumigationStatus: 'none' },
          { id: "S3", material: "Barley", capacity: 3000, currentLevel: 1800, percentage: 60, moisture: 12.8, temperature: 23, aerationActive: false, fumigationStatus: 'none' },
          { id: "S4", material: "Soy", capacity: 4000, currentLevel: 3200, percentage: 80, moisture: 11.5, temperature: 25, aerationActive: true, fumigationStatus: 'none' },
          { id: "S5", material: "Sunflower", capacity: 2000, currentLevel: 900, percentage: 45, moisture: 9.2, temperature: 22, aerationActive: false, fumigationStatus: 'none' },
          { id: "S6", material: "Additives", capacity: 500, currentLevel: 350, percentage: 70, moisture: 8.5, temperature: 21, aerationActive: false, fumigationStatus: 'none' }
        ]
      },
      cleaning: {
        magneticSeparator: { active: true, metalRemoved: 2.5, lastCleaned: "06:00" },
        destoner: { active: true, stonesRemoved: 8.3, efficiency: 98.5 },
        gradingScreens: { active: true, oversizeRejects: 2.1, undersizeRejects: 1.8 },
        aspiration: { active: true, dustCollected: 45, airflowRate: 1250 }
      },
      grinding: {
        hammerMill: { active: true, rpm: 3600, powerConsumption: 185, screenSize: 3.0, throughput: 18 },
        rollerMill: { active: true, particleSize: 850, gapSetting: 0.8, throughput: 22 },
        sieveAnalysis: { coarse: 15, medium: 60, fine: 25 },
        dustCollection: { active: true, filterPressureDrop: 120, collectedDust: 35 }
      },
      dosing: {
        microDosing: {
          vitamins: { target: 2.5, actual: 2.48, accuracy: 99.2 },
          minerals: { target: 5.0, actual: 4.98, accuracy: 99.6 },
          additives: { target: 1.5, actual: 1.49, accuracy: 99.3 }
        },
        macroBatching: {
          wheat: { target: 500, actual: 498 },
          corn: { target: 300, actual: 301 },
          soy: { target: 150, actual: 149 },
          barley: { target: 50, actual: 50 }
        },
        currentRecipe: { name: "LAYER FEED 16%", code: "LF-2024-001", batchSize: 2000, batchNumber: "B-2024-1125" },
        batchAccuracy: 99.4
      },
      mixing: {
        mixer: { active: true, mixingTime: 180, currentTime: 125, homogeneity: 5.2, batchSize: 2000, fullness: 75 },
        liquidAddition: {
          oil: { active: true, flowRate: 12, totalAdded: 25 },
          molasses: { active: false, flowRate: 0, totalAdded: 0 },
          water: { active: true, flowRate: 8, totalAdded: 15 }
        },
        cycleTime: 4.5
      },
      conditioning: {
        steamConditioner: { active: true, temperature: 82, moisture: 16.5, steamPressure: 2.8, retentionTime: 45 }
      },
      pelleting: {
        pelletMill: { active: true, dieSize: 3.5, productionRate: 18.5, temperature: 78, amperage: 285, pdi: 92, dieWear: 35, steamValveOpen: 65 }
      },
      cooling: {
        cooler: { active: true, inletTemp: 78, outletTemp: 28, ambientTemp: 22, retentionTime: 12, moistureReduction: 2.5, airflowRate: 850 }
      },
      crumbling: {
        crumblerRolls: { active: false, gapSetting: 2.5, throughput: 0 },
        screener: { active: true, finesPercentage: 3.2, oversizePercentage: 0.8 },
        recycleSystem: { active: true, recycleRate: 125 }
      },
      coating: {
        fatCoating: { active: true, applicationRate: 2.5, temperature: 45, accuracy: 98.5 },
        enzymeApplication: { active: true, applicationRate: 250, accuracy: 99.1 }
      },
      finishedStorage: {
        bins: [
          { id: "F1", product: "Layer Feed", capacity: 1000, currentLevel: 650, percentage: 65, qualityStatus: 'Passed', batchCode: "LF-2024-1122" },
          { id: "F2", product: "Broiler Starter", capacity: 1000, currentLevel: 480, percentage: 48, qualityStatus: 'Passed', batchCode: "BS-2024-1123" },
          { id: "F3", product: "Pig Grower", capacity: 800, currentLevel: 720, percentage: 90, qualityStatus: 'Hold', batchCode: "PG-2024-1124" },
          { id: "F4", product: "Cattle Feed", capacity: 1200, currentLevel: 360, percentage: 30, qualityStatus: 'Passed', batchCode: "CF-2024-1121" },
          { id: "F5", product: "Fish Feed", capacity: 600, currentLevel: 450, percentage: 75, qualityStatus: 'Passed', batchCode: "FF-2024-1125" }
        ]
      },
      bagging: {
        lines: {
          line1: { active: true, bagSize: 25, rate: 12, totalBags: 4520 },
          line2: { active: false, bagSize: 50, rate: 0, totalBags: 2180 },
          line3: { active: true, bagSize: 1000, rate: 2, totalBags: 85 }
        },
        palletizer: { active: true, palletsPerHour: 45, currentPallet: 128 },
        shrinkWrapper: { active: true, wrappedPallets: 125 },
        bulkLoading: {
          bay1: { occupied: true, truckId: "BLK-451", loaded: 28, target: 35 },
          bay2: { occupied: false, truckId: "-", loaded: 0, target: 0 },
          bay3: { occupied: true, truckId: "BLK-782", loaded: 32, target: 32 },
          bay4: { occupied: false, truckId: "-", loaded: 0, target: 0 }
        }
      },
      qualityControl: {
        nirAnalyzer: { active: true, lastSample: "12:45", protein: 16.2, moisture: 12.8, fat: 3.5, fiber: 4.2, ash: 5.8 },
        labTests: {
          mycotoxins: { status: 'Pass', value: 12 },
          salmonella: { status: 'Pass' },
          enterobacteria: { status: 'Pass', value: 100 }
        },
        batchApproval: { status: 'Approved', approvedBy: "QC Manager", timestamp: "12:50" },
        certificateGeneration: { available: true, certificateNumber: "CERT-2024-11254" }
      },
      utilities: {
        boiler: { active: true, steamGeneration: 8.5, pressure: 12, temperature: 185, efficiency: 88 },
        compressedAir: { active: true, pressure: 7.2, flowRate: 450, dewPoint: -40 },
        dustCollection: { active: true, totalAirflow: 12500, filterStatus: 'Normal', collectedDust: 185 },
        electrical: { totalLoad: 1850, powerFactor: 0.92, voltage: 415, frequency: 50 }
      },
      kpis: {
        totalProduction: 425,
        oee: 87,
        energyConsumption: 85,
        productionCost: 285,
        qualityIndex: 96,
        downtime: 1.2,
        batchAccuracy: 99.4,
        moistureControl: 98
      }
    };
  }
  
  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const newData = { ...prev };
        
        // Update dynamic values with realistic variations
        newData.reception.marineDock.tonnageUnloaded = Math.min(5000, newData.reception.marineDock.tonnageUnloaded + Math.random() * 4.2);
        newData.pelleting.pelletMill.temperature = 75 + Math.random() * 10;
        newData.pelleting.pelletMill.amperage = 280 + Math.random() * 20;
        newData.mixing.mixer.currentTime = (newData.mixing.mixer.currentTime + 1) % newData.mixing.mixer.mixingTime;
        newData.mixing.mixer.fullness = Math.min(100, Math.max(0, newData.mixing.mixer.fullness + (Math.random() - 0.3) * 2));
        
        // Update silo levels gradually
        newData.storage.silos.forEach(silo => {
          if (Math.random() > 0.8) {
            silo.currentLevel = Math.max(0, Math.min(silo.capacity, silo.currentLevel + (Math.random() - 0.5) * 10));
            silo.percentage = Math.round((silo.currentLevel / silo.capacity) * 100);
          }
        });
        
        // Update KPIs with realistic variations
        newData.kpis.totalProduction = Math.round(420 + Math.random() * 30);
        newData.kpis.oee = Math.round(85 + Math.random() * 8);
        newData.kpis.energyConsumption = Math.round(82 + Math.random() * 10);
        newData.kpis.qualityIndex = Math.round(94 + Math.random() * 4);
        
        return newData;
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <WaterSystemLayout 
      title="Plant Monitoring"
      subtitle="SCADA-Grade Industrial Monitoring System - Real-time visualization of complete feedmill operations"
    >
      <Stack spacing={3}>
        {/* Main Visualization */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            background: theme === 'dark'
              ? 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)'
              : 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)',
            border: '2px solid',
            borderColor: theme === 'dark' ? '#2C2C2C' : '#E0E0E0',
            borderRadius: 3,
            boxShadow: theme === 'dark' 
              ? '0 8px 32px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255,255,255,0.1)' 
              : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255,255,255,0.9)'
          }}
        >
          <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ 
            background: theme === 'dark' 
              ? 'linear-gradient(90deg, #00BCD4 0%, #2196F3 100%)' 
              : 'linear-gradient(90deg, #0D47A1 0%, #1976D2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 3
          }}>
            Plant Monitoring System
          </Typography>
          <ProfessionalFeedmillVisualization data={data} />
        </Paper>
        
        {/* Additional Information Panel */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            background: theme === 'dark'
              ? 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)'
              : 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)',
            border: '2px solid',
            borderColor: theme === 'dark' ? '#2C2C2C' : '#E0E0E0',
            borderRadius: 3,
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, rgba(0, 188, 212, 0.1) 0%, rgba(0, 188, 212, 0.05) 100%)'
                  : '#FFFFFF',
                border: theme === 'dark' ? '1px solid rgba(0, 188, 212, 0.3)' : 'none',
                borderLeft: '4px solid #00BCD4',
                boxShadow: theme === 'dark' ? '0 0 20px rgba(0, 188, 212, 0.2)' : 'none'
              }}>
                <CardContent>
                  <Typography variant="caption" sx={{ 
                    color: theme === 'dark' ? '#00BCD4' : 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>
                    System Uptime
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" sx={{
                    color: theme === 'dark' ? '#FFFFFF' : 'inherit'
                  }}>
                    99.8%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%)'
                  : '#FFFFFF',
                border: theme === 'dark' ? '1px solid rgba(33, 150, 243, 0.3)' : 'none',
                borderLeft: '4px solid #2196F3',
                boxShadow: theme === 'dark' ? '0 0 20px rgba(33, 150, 243, 0.2)' : 'none'
              }}>
                <CardContent>
                  <Typography variant="caption" sx={{ 
                    color: theme === 'dark' ? '#2196F3' : 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>
                    Daily Target
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" sx={{
                    color: theme === 'dark' ? '#FFFFFF' : 'inherit'
                  }}>
                    500 TPD
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, rgba(3, 169, 244, 0.1) 0%, rgba(3, 169, 244, 0.05) 100%)'
                  : '#FFFFFF',
                border: theme === 'dark' ? '1px solid rgba(3, 169, 244, 0.3)' : 'none',
                borderLeft: '4px solid #03A9F4',
                boxShadow: theme === 'dark' ? '0 0 20px rgba(3, 169, 244, 0.2)' : 'none'
              }}>
                <CardContent>
                  <Typography variant="caption" sx={{ 
                    color: theme === 'dark' ? '#03A9F4' : 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>
                    Active Equipment
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" sx={{
                    color: theme === 'dark' ? '#FFFFFF' : 'inherit'
                  }}>
                    42/45
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(25, 118, 210, 0.05) 100%)'
                  : '#FFFFFF',
                border: theme === 'dark' ? '1px solid rgba(25, 118, 210, 0.3)' : 'none',
                borderLeft: '4px solid #1976D2',
                boxShadow: theme === 'dark' ? '0 0 20px rgba(25, 118, 210, 0.2)' : 'none'
              }}>
                <CardContent>
                  <Typography variant="caption" sx={{ 
                    color: theme === 'dark' ? '#1976D2' : 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>
                    Quality Score
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" sx={{
                    color: theme === 'dark' ? '#FFFFFF' : 'inherit'
                  }}>
                    A+
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      </Stack>
    </WaterSystemLayout>
  );
}