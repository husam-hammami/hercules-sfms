import React, { useState, useEffect } from 'react';
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout';
import { Box, Paper, Typography, Chip, LinearProgress, Card, CardContent, Grid, Alert, AlertTitle, IconButton, Tooltip, Divider, Stack } from '@mui/material';
import { Activity, Gauge, Factory, Zap, TrendingUp, AlertTriangle, Package, Thermometer, Droplets, Maximize2, RotateCw, Settings, Eye, Ship, Truck, Anchor, Warehouse, AlertCircle, CheckCircle, Wind, Boxes, PackageCheck, Loader, Wifi, DollarSign, Wheat, Droplet, Scale, BarChart3, Cpu, ShieldCheck, Timer, Wrench } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// Material types with properties
interface RawMaterial {
  type: 'Wheat' | 'Corn' | 'Barley' | 'Soy' | 'Rice' | 'Oats';
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
  
  // Raw Material Intake with Materials
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
  moistureAlerts: string[];
  
  // Detailed Processing Stages
  siloLevels: number[];
  cleaningStage: {
    active: boolean;
    efficiency: number;
    foreignMatterRemoved: number; // kg/hr
  };
  grindingStage: {
    rate: number;
    particleSize: number; // microns
    targetSize: number;
  };
  mixingStation: {
    activeRecipe: Recipe | null;
    mixingRate: number;
    batchProgress: number;
  };
  pelletizingStage: {
    active: boolean;
    rate: number; // tons/hr
    temperature: number;
    pressure: number;
  };
  coolingSystem: {
    active: boolean;
    temperature: number;
    airflowRate: number;
  };
  
  // Quality Control
  qualityCheckPoints: { 
    id: number; 
    location: string;
    status: 'pass' | 'fail' | 'checking';
    parameter: string;
    value: number;
  }[];
  
  // Bagging Operations
  baggingLines: {
    line1: { active: boolean; bagSize: 25; rate: number };
    line2: { active: boolean; bagSize: 50; rate: number };
    line3: { active: boolean; bagSize: 25; rate: number };
  };
  totalBagsProduced: number;
  palletizingRate: number;
  shrinkWrapStation: {
    active: boolean;
    palletsWrapped: number;
  };
  
  // Truck Loading Enhanced
  truckBays: { 
    id: number; 
    occupied: boolean; 
    loadingProgress: number;
    loadType: 'bulk' | 'bagged';
    tonnageLoaded: number;
  }[];
  truckQueue: number;
  trucksLoaded: number;
  
  // Conveyors
  conveyorSpeed: number;
  conveyorActive: boolean[];
  
  // Environmental
  temperature: number;
  humidity: number;
  dustLevel: number;
  
  // Financial Metrics
  dailyProduction: number; // tons
  productionCostPerTon: number;
  energyCostPerHour: number;
  rawMaterialCost: number;
  operatingEfficiency: number;
  revenue: number;
  profit: number;
  
  // IoT Integration
  iotSensors: IoTSensor[];
  predictiveMaintenance: {
    nextMaintenance: string;
    criticalAlerts: string[];
    equipmentHealth: number;
  };
  dataFeeds: {
    plc: boolean;
    scada: boolean;
    erp: boolean;
    mes: boolean;
  };
  
  // System
  powerConsumption: number;
  efficiency: number;
  totalProduction: number;
  systemStatus: 'operational' | 'warning' | 'critical';
  processingActive: boolean;
  
  // Material Flow
  materialFlowRate: number;
  bottlenecks: string[];
}

// Comprehensive Isometric SVG Plant Visualization Component
function ComprehensivePlantView({ data, theme }: { data: PlantData; theme: 'light' | 'dark' }) {
  const isLight = theme === 'light';
  const baseColor = isLight ? '#94a3b8' : '#334155';
  const highlightColor = isLight ? '#3b82f6' : '#60a5fa';
  const successColor = '#10b981';
  const warningColor = '#fbbf24';
  const dangerColor = '#ef4444';
  const waterColor = isLight ? '#0ea5e9' : '#0284c7';
  
  return (
    <Box sx={{ 
      width: '100%', 
      height: '700px',
      background: isLight 
        ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
        : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: 2,
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid',
      borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
    }}>
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Definitions */}
        <defs>
          {/* Grid Pattern */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={isLight ? '#cbd5e1' : '#1e293b'} strokeWidth="0.5" opacity="0.3"/>
          </pattern>
          
          {/* Water Wave Pattern */}
          <pattern id="waterWave" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
            <path d="M0,10 Q25,5 50,10 T100,10" stroke={waterColor} strokeWidth="1" fill="none" opacity="0.5">
              <animate attributeName="d" 
                values="M0,10 Q25,5 50,10 T100,10;M0,10 Q25,15 50,10 T100,10;M0,10 Q25,5 50,10 T100,10" 
                dur="3s" repeatCount="indefinite"/>
            </path>
          </pattern>
          
          {/* Gradient for silos */}
          <linearGradient id="siloGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={baseColor} stopOpacity="1"/>
            <stop offset="100%" stopColor={baseColor} stopOpacity="0.6"/>
          </linearGradient>
          
          {/* Ship gradient */}
          <linearGradient id="shipGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isLight ? '#dc2626' : '#ef4444'} stopOpacity="1"/>
            <stop offset="100%" stopColor={isLight ? '#991b1b' : '#dc2626'} stopOpacity="1"/>
          </linearGradient>
          
          {/* Animated conveyor pattern */}
          <pattern id="conveyorPattern" x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="10" height="10" fill={highlightColor} opacity="0.3">
              <animate attributeName="x" from="0" to="20" dur="2s" repeatCount="indefinite"/>
            </rect>
          </pattern>
          
          {/* Truck gradient */}
          <linearGradient id="truckGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isLight ? '#059669' : '#10b981'} stopOpacity="1"/>
            <stop offset="100%" stopColor={isLight ? '#047857' : '#059669'} stopOpacity="1"/>
          </linearGradient>
        </defs>
        
        {/* Background grid */}
        <rect width="1600" height="900" fill="url(#grid)" opacity="0.5"/>
        
        {/* Marine Dock Area with Water */}
        <g transform="translate(0, 600)">
          {/* Water */}
          <rect x="0" y="0" width="300" height="200" fill={waterColor} opacity="0.3"/>
          <rect x="0" y="0" width="300" height="200" fill="url(#waterWave)"/>
          
          {/* Dock Platform */}
          <path
            d="M 250 -20 L 350 -40 L 350 20 L 250 40 Z"
            fill={isLight ? '#6b7280' : '#4b5563'}
            stroke={baseColor}
            strokeWidth="2"
          />
          
          {/* Ship (if docked) */}
          {data.shipDocked && (
            <g transform="translate(100, -30)">
              {/* Ship hull */}
              <path
                d="M 0 0 L 120 0 L 110 40 L 10 40 Z"
                fill="url(#shipGradient)"
                stroke={baseColor}
                strokeWidth="2"
              />
              {/* Ship cabin */}
              <rect x="30" y="-20" width="60" height="20" fill={isLight ? '#dc2626' : '#ef4444'} stroke={baseColor} strokeWidth="1"/>
              {/* Ship chimney */}
              <rect x="50" y="-35" width="20" height="15" fill={isLight ? '#374151' : '#6b7280'} stroke={baseColor} strokeWidth="1"/>
              {/* Smoke animation */}
              <circle cx="60" cy="-40" r="3" fill="#9ca3af" opacity="0.6">
                <animate attributeName="cy" from="-40" to="-60" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite"/>
              </circle>
              
              {/* Unloading crane arm */}
              <line x1="100" y1="-10" x2="200" y2="-60" stroke={baseColor} strokeWidth="3"/>
              <circle cx="200" cy="-60" r="5" fill={highlightColor}/>
              
              {/* Loading progress bar */}
              <rect x="20" y="50" width="80" height="8" fill={isLight ? '#e5e7eb' : '#374151'} rx="4"/>
              <rect x="20" y="50" width={80 * (data.shipUnloadingProgress / 100)} height="8" fill={successColor} rx="4">
                <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite"/>
              </rect>
            </g>
          )}
          
          {/* Dock Label */}
          <text x="150" y="80" textAnchor="middle" fill={isLight ? '#475569' : '#cbd5e1'} fontSize="14" fontWeight="bold">
            Marine Dock
          </text>
          <text x="150" y="100" textAnchor="middle" fill={waterColor} fontSize="12">
            {data.shipDocked ? `Unloading: ${data.shipUnloadingProgress}%` : 'No Ship Docked'}
          </text>
        </g>
        
        {/* Raw Material Intake Silos with Individual Materials */}
        <g transform="translate(380, 550)">
          {data.intakeMaterials.map((material, i) => {
            const x = i * 65;
            const fillColor = material.level > 80 ? dangerColor : material.level > 50 ? warningColor : successColor;
            const moistureOk = Math.abs(material.moistureLevel - material.targetMoisture) < 0.5;
            
            return (
              <g key={`intake-silo-${i}`} transform={`translate(${x}, 0)`}>
                {/* Silo body */}
                <path
                  d="M 0 0 L 20 -10 L 20 48 L 0 58 L -20 48 L -20 -10 Z"
                  fill="url(#siloGradient)"
                  stroke={baseColor}
                  strokeWidth="2"
                />
                {/* Silo top */}
                <ellipse cx="0" cy="-10" rx="20" ry="10" fill={baseColor} stroke={baseColor} strokeWidth="2"/>
                {/* Fill level */}
                <rect
                  x="-18"
                  y={48 - material.level * 0.48}
                  width="36"
                  height={material.level * 0.48}
                  fill={fillColor}
                  opacity="0.6"
                >
                  <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite"/>
                </rect>
                
                {/* Moisture indicator */}
                <circle cx="0" cy="-25" r="4" fill={moistureOk ? successColor : warningColor}>
                  <animate attributeName="r" values="4;5;4" dur="1s" repeatCount="indefinite"/>
                </circle>
                
                {/* Labels */}
                <text x="0" y="72" textAnchor="middle" fill={isLight ? '#475569' : '#cbd5e1'} fontSize="9" fontWeight="bold">
                  {material.type}
                </text>
                <text x="0" y="83" textAnchor="middle" fill={fillColor} fontSize="9">
                  {material.level}%
                </text>
                <text x="0" y="94" textAnchor="middle" fill={isLight ? '#6b7280' : '#9ca3af'} fontSize="8">
                  {material.tonnage}t
                </text>
                <text x="0" y="104" textAnchor="middle" fill={moistureOk ? successColor : warningColor} fontSize="8">
                  {material.moistureLevel}%
                </text>
              </g>
            );
          })}
          <text x="190" y="125" textAnchor="middle" fill={isLight ? '#475569' : '#cbd5e1'} fontSize="12" fontWeight="bold">
            Raw Material Storage
          </text>
        </g>
        
        {/* Moisture Control System */}
        <g transform="translate(280, 420)">
          <rect x="-50" y="-30" width="100" height="60" fill={isLight ? '#fef3c7' : '#78350f'} opacity="0.3" rx="5" stroke={warningColor} strokeWidth="1"/>
          <text x="0" y="-10" textAnchor="middle" fill={isLight ? '#92400e' : '#fbbf24'} fontSize="11" fontWeight="bold">
            Moisture Control
          </text>
          <text x="0" y="5" textAnchor="middle" fill={isLight ? '#475569' : '#cbd5e1'} fontSize="9">
            In: {data.moistureSensors.intake}%
          </text>
          <text x="0" y="18" textAnchor="middle" fill={isLight ? '#475569' : '#cbd5e1'} fontSize="9">
            Process: {data.moistureSensors.processing}%
          </text>
          <text x="0" y="31" textAnchor="middle" fill={isLight ? '#475569' : '#cbd5e1'} fontSize="9">
            Out: {data.moistureSensors.output}%
          </text>
          {/* Dryer indicator */}
          {data.dryerStatus.active && (
            <circle cx="35" cy="10" r="5" fill={successColor}>
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite"/>
            </circle>
          )}
        </g>
        
        {/* Intake Conveyor from Dock to Intake Silos */}
        <g opacity={data.conveyorActive[0] ? 1 : 0.3}>
          <path
            d="M 250 620 L 380 580"
            fill="none"
            stroke={highlightColor}
            strokeWidth="15"
            strokeLinecap="round"
          />
          <path
            d="M 250 620 L 380 580"
            fill="none"
            stroke="url(#conveyorPattern)"
            strokeWidth="13"
            strokeLinecap="round"
          />
        </g>
        
        {/* Main Processing Silos */}
        {data.siloLevels.map((level, i) => {
          const x = 650 + i * 100;
          const y = 400;
          const fillColor = level > 80 ? dangerColor : level > 50 ? warningColor : highlightColor;
          
          return (
            <g key={`silo-${i}`} transform={`translate(${x}, ${y})`}>
              {/* Silo body - isometric cylinder */}
              <path
                d="M 0 0 L 35 -17 L 35 103 L 0 120 L -35 103 L -35 -17 Z"
                fill="url(#siloGradient)"
                stroke={baseColor}
                strokeWidth="2"
              />
              {/* Silo top */}
              <ellipse cx="0" cy="-17" rx="35" ry="17" fill={baseColor} stroke={baseColor} strokeWidth="2"/>
              {/* Fill level */}
              <rect
                x="-33"
                y={103 - level * 1.03}
                width="66"
                height={level * 1.03}
                fill={fillColor}
                opacity="0.6"
              >
                <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite"/>
              </rect>
              {/* Silo label */}
              <text x="0" y="140" textAnchor="middle" fill={isLight ? '#475569' : '#cbd5e1'} fontSize="12">
                Silo {i + 1}
              </text>
              <text x="0" y="155" textAnchor="middle" fill={fillColor} fontSize="14" fontWeight="bold">
                {level}%
              </text>
              {/* Status indicator */}
              <circle cx="0" cy="-35" r="5" fill={fillColor}>
                <animate attributeName="r" values="5;7;5" dur="1s" repeatCount="indefinite"/>
              </circle>
            </g>
          );
        })}
        
        {/* Processing Plant Complex - Enhanced */}
        <g transform="translate(800, 250)">
          {/* Main building */}
          <path
            d="M -150 0 L 0 -60 L 150 0 L 150 150 L 0 210 L -150 150 Z"
            fill={isLight ? '#e2e8f0' : '#1e293b'}
            stroke={baseColor}
            strokeWidth="3"
          />
          {/* Roof */}
          <path
            d="M -150 0 L 0 -60 L 150 0 L 0 60 Z"
            fill={baseColor}
            stroke={baseColor}
            strokeWidth="2"
          />
          
          {/* Enhanced Processing stages */}
          {/* Cleaning Stage */}
          <g transform="translate(-120, 40)">
            <rect x="-25" y="-5" width="50" height="30" fill={isLight ? '#dbeafe' : '#1e3a8a'} opacity="0.3" rx="3"/>
            <text x="0" y="8" textAnchor="middle" fill={isLight ? '#334155' : '#e2e8f0'} fontSize="10" fontWeight="bold">Cleaning</text>
            {data.cleaningStage.active && (
              <circle cx="15" cy="8" r="3" fill={successColor}>
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite"/>
              </circle>
            )}
            <text x="0" y="20" textAnchor="middle" fill={highlightColor} fontSize="9">{data.cleaningStage.efficiency}%</text>
          </g>
          
          {/* Grinding Stage with Particle Size */}
          <g transform="translate(-50, 40)">
            <rect x="-25" y="-5" width="50" height="30" fill={isLight ? '#fef3c7' : '#78350f'} opacity="0.3" rx="3"/>
            <text x="0" y="8" textAnchor="middle" fill={isLight ? '#334155' : '#e2e8f0'} fontSize="10" fontWeight="bold">Grinding</text>
            <text x="0" y="20" textAnchor="middle" fill={highlightColor} fontSize="9">{data.grindingStage.particleSize}μm</text>
          </g>
          
          {/* Mixing Station with Recipe */}
          <g transform="translate(20, 40)">
            <rect x="-30" y="-5" width="60" height="40" fill={isLight ? '#dcfce7' : '#14532d'} opacity="0.3" rx="3"/>
            <text x="0" y="8" textAnchor="middle" fill={isLight ? '#334155' : '#e2e8f0'} fontSize="10" fontWeight="bold">Mixing</text>
            {data.mixingStation.activeRecipe && (
              <text x="0" y="20" textAnchor="middle" fill={successColor} fontSize="8">
                {data.mixingStation.activeRecipe.name}
              </text>
            )}
            <text x="0" y="30" textAnchor="middle" fill={highlightColor} fontSize="9">
              {data.mixingStation.batchProgress}%
            </text>
          </g>
          
          {/* Pelletizing Stage */}
          <g transform="translate(90, 40)">
            <rect x="-25" y="-5" width="50" height="30" fill={isLight ? '#fee2e2' : '#7f1d1d'} opacity="0.3" rx="3"/>
            <text x="0" y="8" textAnchor="middle" fill={isLight ? '#334155' : '#e2e8f0'} fontSize="10" fontWeight="bold">Pelletizing</text>
            {data.pelletizingStage.active && (
              <circle cx="15" cy="8" r="3" fill={successColor}>
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1.2s" repeatCount="indefinite"/>
              </circle>
            )}
            <text x="0" y="20" textAnchor="middle" fill={highlightColor} fontSize="9">{data.pelletizingStage.rate}t/hr</text>
          </g>
          
          {/* Cooling System */}
          <g transform="translate(-60, 100)">
            <rect x="-25" y="-5" width="50" height="30" fill={isLight ? '#e0f2fe' : '#0c4a6e'} opacity="0.3" rx="3"/>
            <text x="0" y="8" textAnchor="middle" fill={isLight ? '#334155' : '#e2e8f0'} fontSize="10" fontWeight="bold">Cooling</text>
            {data.coolingSystem.active && (
              <circle cx="15" cy="8" r="3" fill={highlightColor}>
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/>
              </circle>
            )}
            <text x="0" y="20" textAnchor="middle" fill={highlightColor} fontSize="9">{data.coolingSystem.temperature}°C</text>
          </g>
          
          {/* Active Recipe Display */}
          {data.mixingStation.activeRecipe && (
            <g transform="translate(60, 100)">
              <rect x="-40" y="-5" width="80" height="45" fill={isLight ? '#f3f4f6' : '#1f2937'} opacity="0.5" rx="3" stroke={highlightColor} strokeWidth="1"/>
              <text x="0" y="8" textAnchor="middle" fill={highlightColor} fontSize="9" fontWeight="bold">Recipe Active</text>
              {data.mixingStation.activeRecipe.materials.map((mat, idx) => (
                <text key={idx} x="0" y={20 + idx * 8} textAnchor="middle" fill={isLight ? '#6b7280' : '#9ca3af'} fontSize="8">
                  {mat.type}: {mat.percentage}%
                </text>
              ))}
            </g>
          )}
          
          <text x="0" y="240" textAnchor="middle" fill={isLight ? '#475569' : '#cbd5e1'} fontSize="14" fontWeight="bold">
            Processing Plant
          </text>
          <text x="0" y="260" textAnchor="middle" fill={highlightColor} fontSize="12">
            {data.processingActive ? 'ACTIVE - Production Rate: ' + data.pelletizingStage.rate + ' t/hr' : 'IDLE'}
          </text>
        </g>
        
        {/* Enhanced Quality Control Stations with Parameters */}
        <g transform="translate(1020, 320)">
          <rect x="-45" y="-15" width="90" height="180" fill={isLight ? '#f9fafb' : '#1f2937'} opacity="0.3" rx="5" stroke={baseColor} strokeWidth="1"/>
          <text x="0" y="5" textAnchor="middle" fill={isLight ? '#475569' : '#cbd5e1'} fontSize="11" fontWeight="bold">
            Quality Control
          </text>
          {data.qualityCheckPoints.map((point, i) => (
            <g key={`qc-${i}`} transform={`translate(0, ${25 + i * 28})`}>
              <rect
                x="-40"
                y="-10"
                width="80"
                height="24"
                fill={point.status === 'pass' ? successColor : point.status === 'fail' ? dangerColor : warningColor}
                opacity="0.5"
                rx="3"
              />
              <text x="-30" y="0" fill={isLight ? '#1f2937' : 'white'} fontSize="9" fontWeight="bold">
                {point.location}
              </text>
              <text x="-30" y="10" fill={isLight ? '#4b5563' : '#e5e7eb'} fontSize="8">
                {point.parameter}: {point.value}
              </text>
              <circle cx="30" cy="2" r="4" fill={point.status === 'pass' ? successColor : point.status === 'fail' ? dangerColor : warningColor}>
                {point.status === 'checking' && <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite"/>}
              </circle>
            </g>
          ))}
        </g>
        
        {/* Enhanced Bagging Operations Area */}
        <g transform="translate(1150, 430)">
          <rect
            x="-90"
            y="-50"
            width="180"
            height="120"
            fill={isLight ? '#f3f4f6' : '#374151'}
            stroke={baseColor}
            strokeWidth="2"
          />
          <text x="0" y="-30" textAnchor="middle" fill={isLight ? '#475569' : '#cbd5e1'} fontSize="12" fontWeight="bold">
            Bagging Operations
          </text>
          
          {/* Bagging Lines */}
          <g transform="translate(-60, -5)">
            <text x="0" y="0" fill={isLight ? '#6b7280' : '#9ca3af'} fontSize="9">Line 1 (25kg)</text>
            <rect x="0" y="5" width="50" height="8" fill={isLight ? '#e5e7eb' : '#374151'} rx="4"/>
            <rect x="0" y="5" width={data.baggingLines.line1.active ? 50 * (data.baggingLines.line1.rate / 1000) : 0} height="8" fill={successColor} rx="4">
              <animate attributeName="width" values={`${50 * (data.baggingLines.line1.rate / 1000)};${50 * (data.baggingLines.line1.rate / 1000) * 0.9};${50 * (data.baggingLines.line1.rate / 1000)}`} dur="2s" repeatCount="indefinite"/>
            </rect>
            <text x="55" y="10" fill={highlightColor} fontSize="8">{data.baggingLines.line1.rate}/hr</text>
          </g>
          
          <g transform="translate(-60, 15)">
            <text x="0" y="0" fill={isLight ? '#6b7280' : '#9ca3af'} fontSize="9">Line 2 (50kg)</text>
            <rect x="0" y="5" width="50" height="8" fill={isLight ? '#e5e7eb' : '#374151'} rx="4"/>
            <rect x="0" y="5" width={data.baggingLines.line2.active ? 50 * (data.baggingLines.line2.rate / 800) : 0} height="8" fill={successColor} rx="4">
              <animate attributeName="width" values={`${50 * (data.baggingLines.line2.rate / 800)};${50 * (data.baggingLines.line2.rate / 800) * 0.9};${50 * (data.baggingLines.line2.rate / 800)}`} dur="2.5s" repeatCount="indefinite"/>
            </rect>
            <text x="55" y="10" fill={highlightColor} fontSize="8">{data.baggingLines.line2.rate}/hr</text>
          </g>
          
          <g transform="translate(-60, 35)">
            <text x="0" y="0" fill={isLight ? '#6b7280' : '#9ca3af'} fontSize="9">Line 3 (25kg)</text>
            <rect x="0" y="5" width="50" height="8" fill={isLight ? '#e5e7eb' : '#374151'} rx="4"/>
            <rect x="0" y="5" width={data.baggingLines.line3.active ? 50 * (data.baggingLines.line3.rate / 1000) : 0} height="8" fill={data.baggingLines.line3.active ? successColor : '#6b7280'} rx="4"/>
            <text x="55" y="10" fill={data.baggingLines.line3.active ? highlightColor : '#6b7280'} fontSize="8">
              {data.baggingLines.line3.active ? `${data.baggingLines.line3.rate}/hr` : 'Inactive'}
            </text>
          </g>
          
          {/* Total bags and palletizing */}
          <text x="0" y="60" textAnchor="middle" fill={isLight ? '#334155' : '#e2e8f0'} fontSize="10" fontWeight="bold">
            Total Bags: {data.totalBagsProduced.toLocaleString()}
          </text>
          
          {/* Shrink Wrap Station */}
          {data.shrinkWrapStation.active && (
            <g transform="translate(30, 25)">
              <rect x="-20" y="-10" width="40" height="20" fill={highlightColor} opacity="0.3" rx="3"/>
              <text x="0" y="0" textAnchor="middle" fill={isLight ? '#334155' : '#e2e8f0'} fontSize="8">Wrap Station</text>
              <text x="0" y="10" textAnchor="middle" fill={highlightColor} fontSize="8">{data.shrinkWrapStation.palletsWrapped}</text>
            </g>
          )}
        </g>
        
        {/* Finished Product Storage Warehouse */}
        <g transform="translate(1300, 380)">
          {/* Warehouse building */}
          <path
            d="M -60 0 L 0 -30 L 60 0 L 60 100 L 0 130 L -60 100 Z"
            fill={isLight ? '#d1d5db' : '#374151'}
            stroke={baseColor}
            strokeWidth="2"
          />
          {/* Warehouse roof */}
          <path
            d="M -60 0 L 0 -30 L 60 0 L 0 30 Z"
            fill={isLight ? '#9ca3af' : '#4b5563'}
            stroke={baseColor}
            strokeWidth="2"
          />
          
          {/* Storage racks */}
          {data.finishedProductStorage.map((level, i) => (
            <rect
              key={`storage-${i}`}
              x={-40 + i * 20}
              y={30 + (100 - level)}
              width="15"
              height={level * 0.7}
              fill={level > 80 ? dangerColor : level > 50 ? warningColor : successColor}
              opacity="0.7"
            />
          ))}
          
          <text x="0" y="150" textAnchor="middle" fill={isLight ? '#475569' : '#cbd5e1'} fontSize="12" fontWeight="bold">
            Finished Storage
          </text>
          <text x="0" y="165" textAnchor="middle" fill={highlightColor} fontSize="11">
            Capacity: {Math.round(data.finishedProductStorage.reduce((a, b) => a + b, 0) / data.finishedProductStorage.length)}%
          </text>
        </g>
        
        {/* Truck Loading Bays */}
        <g transform="translate(1400, 550)">
          {data.truckBays.map((bay, i) => {
            const y = i * 60;
            
            return (
              <g key={`bay-${i}`} transform={`translate(0, ${y})`}>
                {/* Loading bay platform */}
                <rect
                  x="0"
                  y="0"
                  width="80"
                  height="40"
                  fill={isLight ? '#6b7280' : '#4b5563'}
                  stroke={baseColor}
                  strokeWidth="1"
                />
                
                {/* Truck if present */}
                {bay.occupied && (
                  <g>
                    {/* Truck body */}
                    <rect
                      x="85"
                      y="5"
                      width="60"
                      height="30"
                      fill="url(#truckGradient)"
                      stroke={baseColor}
                      strokeWidth="1"
                    />
                    {/* Truck cab */}
                    <rect
                      x="145"
                      y="10"
                      width="20"
                      height="20"
                      fill={isLight ? '#059669' : '#10b981'}
                      stroke={baseColor}
                      strokeWidth="1"
                    />
                    {/* Loading progress */}
                    <rect x="90" y="38" width="50" height="4" fill={isLight ? '#e5e7eb' : '#374151'} rx="2"/>
                    <rect x="90" y="38" width={50 * (bay.loadingProgress / 100)} height="4" fill={successColor} rx="2"/>
                  </g>
                )}
                
                {/* Bay label */}
                <text x="40" y="25" textAnchor="middle" fill={isLight ? '#e5e7eb' : '#9ca3af'} fontSize="10">
                  Bay {bay.id}
                </text>
              </g>
            );
          })}
          
          <text x="80" y="200" textAnchor="middle" fill={isLight ? '#475569' : '#cbd5e1'} fontSize="12" fontWeight="bold">
            Truck Loading
          </text>
          <text x="80" y="215" textAnchor="middle" fill={successColor} fontSize="11">
            {data.trucksLoaded} Trucks Loaded
          </text>
        </g>
        
        {/* Main Conveyor System Network */}
        {/* Intake to Processing */}
        <g opacity={data.conveyorActive[1] ? 1 : 0.3}>
          <path
            d="M 520 580 L 650 520"
            fill="none"
            stroke={highlightColor}
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M 520 580 L 650 520"
            fill="none"
            stroke="url(#conveyorPattern)"
            strokeWidth="16"
            strokeLinecap="round"
          />
        </g>
        
        {/* Processing to Packaging */}
        <g opacity={data.conveyorActive[2] ? 1 : 0.3}>
          <path
            d="M 950 400 L 1080 430"
            fill="none"
            stroke={highlightColor}
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M 950 400 L 1080 430"
            fill="none"
            stroke="url(#conveyorPattern)"
            strokeWidth="16"
            strokeLinecap="round"
          />
        </g>
        
        {/* Packaging to Storage */}
        <g opacity={data.conveyorActive[3] ? 1 : 0.3}>
          <path
            d="M 1220 450 L 1240 420"
            fill="none"
            stroke={highlightColor}
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M 1220 450 L 1240 420"
            fill="none"
            stroke="url(#conveyorPattern)"
            strokeWidth="16"
            strokeLinecap="round"
          />
        </g>
        
        {/* Storage to Truck Loading */}
        <g opacity={data.conveyorActive[4] ? 1 : 0.3}>
          <path
            d="M 1360 480 L 1400 550"
            fill="none"
            stroke={highlightColor}
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M 1360 480 L 1400 550"
            fill="none"
            stroke="url(#conveyorPattern)"
            strokeWidth="16"
            strokeLinecap="round"
          />
        </g>
        
        {/* Animated material flow particles */}
        {data.processingActive && Array.from({ length: 20 }).map((_, i) => (
          <circle key={`particle-${i}`} r="3" fill={highlightColor} opacity="0.8">
            <animateMotion
              path="M 250 620 L 520 580 L 650 520 L 950 400 L 1080 430 L 1220 450 L 1360 480 L 1400 550"
              dur={`${10 + i * 0.5}s`}
              repeatCount="indefinite"
              begin={`${i * 0.5}s`}
            />
            <animate attributeName="opacity" values="0;0.8;0" dur="3s" repeatCount="indefinite"/>
          </circle>
        ))}
        
        {/* System Status Dashboard Overlay */}
        <g transform="translate(50, 50)">
          <rect x="-5" y="-5" width="220" height="140" fill={isLight ? 'white' : '#1e293b'} opacity="0.95" rx="5" stroke={baseColor} strokeWidth="1"/>
          <text x="105" y="20" textAnchor="middle" fill={isLight ? '#334155' : '#cbd5e1'} fontSize="14" fontWeight="bold">
            Plant Overview
          </text>
          
          <circle cx="20" cy="45" r="8" fill={data.systemStatus === 'operational' ? successColor : data.systemStatus === 'warning' ? warningColor : dangerColor}>
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
          </circle>
          <text x="40" y="50" fill={isLight ? '#475569' : '#94a3b8'} fontSize="12">
            Status: {data.systemStatus.toUpperCase()}
          </text>
          
          <text x="20" y="70" fill={isLight ? '#475569' : '#94a3b8'} fontSize="11">
            Efficiency: {data.efficiency}%
          </text>
          <text x="20" y="88" fill={isLight ? '#475569' : '#94a3b8'} fontSize="11">
            Flow Rate: {data.materialFlowRate} tons/hr
          </text>
          <text x="20" y="106" fill={isLight ? '#475569' : '#94a3b8'} fontSize="11">
            Production: {data.totalProduction.toLocaleString()} kg
          </text>
          <text x="20" y="124" fill={isLight ? '#475569' : '#94a3b8'} fontSize="11">
            Power: {data.powerConsumption} kW
          </text>
        </g>
        
        {/* Bottleneck Alerts */}
        {data.bottlenecks.length > 0 && (
          <g transform="translate(1350, 50)">
            <rect x="-5" y="-5" width="200" height="80" fill={dangerColor} opacity="0.2" rx="5" stroke={dangerColor} strokeWidth="2"/>
            <text x="95" y="20" textAnchor="middle" fill={dangerColor} fontSize="12" fontWeight="bold">
              ⚠ BOTTLENECKS
            </text>
            {data.bottlenecks.slice(0, 3).map((bottleneck, i) => (
              <text key={`bottleneck-${i}`} x="10" y={40 + i * 15} fill={isLight ? '#dc2626' : '#ef4444'} fontSize="11">
                • {bottleneck}
              </text>
            ))}
          </g>
        )}
      </svg>
      
      {/* Live indicator */}
      <Chip
        label="LIVE"
        color="error"
        size="small"
        icon={<Activity size={12} />}
        sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          animation: 'pulse 2s infinite',
          fontWeight: 600
        }}
      />
    </Box>
  );
}

// Stage KPI Card Component
function StageKPICard({ title, value, unit, icon: Icon, status, trend }: any) {
  const { theme } = useTheme();
  const isLightMode = theme === 'light';
  
  const getStatusColor = (): 'success' | 'warning' | 'error' | 'primary' => {
    if (status === 'optimal') return 'success';
    if (status === 'warning') return 'warning';
    if (status === 'critical') return 'error';
    return 'primary'; // Use 'primary' instead of 'default' for LinearProgress
  };

  const getChipColor = (): 'success' | 'warning' | 'error' | 'default' => {
    if (status === 'optimal') return 'success';
    if (status === 'warning') return 'warning';
    if (status === 'critical') return 'error';
    return 'default';
  };

  return (
    <Card sx={{
      background: isLightMode ? '#ffffff' : '#1e293b',
      border: '1px solid',
      borderColor: isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
      height: '100%'
    }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon size={16} />
            <Typography variant="caption" color="text.secondary">
              {title}
            </Typography>
          </Box>
          {trend && (
            <Chip
              label={trend}
              size="small"
              color={getChipColor()}
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mt: 1 }}>
          {value} <Typography component="span" variant="caption">{unit}</Typography>
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={Math.min(100, (value / 100) * 100)}
          sx={{ mt: 1.5, height: 4, borderRadius: 1 }}
          color={getStatusColor()}
        />
      </CardContent>
    </Card>
  );
}

export function DigitalTwinPage() {
  const { theme } = useTheme();
  const isLightMode = theme === 'light';
  const [autoUpdate, setAutoUpdate] = useState(true);
  
  // Comprehensive plant data state
  const [data, setData] = useState<PlantData>({
    // Marine Terminal
    shipDocked: true,
    shipUnloadingProgress: 65,
    shipCapacity: 7500, // 5000-10000 tons range
    shipUnloadingRate: 450, // tons/hr
    currentMaterial: 'Wheat',
    
    // Raw Material Intake with Materials
    intakeMaterials: [
      { type: 'Wheat', level: 72, capacity: 1200, tonnage: 864, moistureLevel: 13.5, targetMoisture: 13, costPerTon: 245 },
      { type: 'Corn', level: 85, capacity: 1500, tonnage: 1275, moistureLevel: 14.2, targetMoisture: 14, costPerTon: 195 },
      { type: 'Barley', level: 48, capacity: 800, tonnage: 384, moistureLevel: 12.8, targetMoisture: 12, costPerTon: 215 },
      { type: 'Soy', level: 92, capacity: 1000, tonnage: 920, moistureLevel: 13.1, targetMoisture: 13, costPerTon: 425 },
      { type: 'Rice', level: 56, capacity: 600, tonnage: 336, moistureLevel: 15.2, targetMoisture: 14, costPerTon: 285 },
      { type: 'Oats', level: 78, capacity: 500, tonnage: 390, moistureLevel: 12.5, targetMoisture: 12, costPerTon: 195 }
    ],
    intakeConveyorSpeed: 3.2,
    
    // Moisture Control System
    moistureSensors: {
      intake: 14.2,
      processing: 13.5,
      output: 12.8
    },
    dryerStatus: {
      active: true,
      temperature: 82,
      efficiency: 92
    },
    moistureAlerts: [],
    
    // Detailed Processing Stages
    siloLevels: [75, 82, 45, 90, 68, 55],
    cleaningStage: {
      active: true,
      efficiency: 94,
      foreignMatterRemoved: 125 // kg/hr
    },
    grindingStage: {
      rate: 92,
      particleSize: 425, // microns
      targetSize: 400
    },
    mixingStation: {
      activeRecipe: {
        id: 'RCP-001',
        name: 'Premium Feed Mix',
        materials: [
          { type: 'Wheat', percentage: 45 },
          { type: 'Corn', percentage: 30 },
          { type: 'Soy', percentage: 25 }
        ],
        targetOutput: 250,
        active: true
      },
      mixingRate: 87,
      batchProgress: 73
    },
    pelletizingStage: {
      active: true,
      rate: 35, // tons/hr
      temperature: 85,
      pressure: 250
    },
    coolingSystem: {
      active: true,
      temperature: 28,
      airflowRate: 1250
    },
    
    // Quality Control
    qualityCheckPoints: [
      { id: 1, location: 'Intake', status: 'pass', parameter: 'Moisture', value: 13.5 },
      { id: 2, location: 'Grinding', status: 'checking', parameter: 'Particle Size', value: 425 },
      { id: 3, location: 'Mixing', status: 'pass', parameter: 'Homogeneity', value: 94 },
      { id: 4, location: 'Pelletizing', status: 'pass', parameter: 'Durability', value: 96 },
      { id: 5, location: 'Packaging', status: 'pass', parameter: 'Weight', value: 99.8 }
    ],
    
    // Bagging Operations
    baggingLines: {
      line1: { active: true, bagSize: 25, rate: 720 }, // bags/hr
      line2: { active: true, bagSize: 50, rate: 480 },
      line3: { active: false, bagSize: 25, rate: 0 }
    },
    totalBagsProduced: 18650,
    palletizingRate: 95, // pallets/hr
    shrinkWrapStation: {
      active: true,
      palletsWrapped: 425
    },
    
    // Truck Loading Enhanced
    truckBays: [
      { id: 1, occupied: true, loadingProgress: 75, loadType: 'bulk', tonnageLoaded: 22.5 },
      { id: 2, occupied: false, loadingProgress: 0, loadType: 'bulk', tonnageLoaded: 0 },
      { id: 3, occupied: true, loadingProgress: 45, loadType: 'bagged', tonnageLoaded: 13.5 },
      { id: 4, occupied: true, loadingProgress: 92, loadType: 'bulk', tonnageLoaded: 27.6 },
      { id: 5, occupied: false, loadingProgress: 0, loadType: 'bagged', tonnageLoaded: 0 }
    ],
    truckQueue: 3,
    trucksLoaded: 24,
    
    // Conveyors
    conveyorSpeed: 3.5,
    conveyorActive: [true, true, true, true, true],
    
    // Environmental
    temperature: 28,
    humidity: 45,
    dustLevel: 12,
    
    // Financial Metrics
    dailyProduction: 842, // tons
    productionCostPerTon: 185,
    energyCostPerHour: 320,
    rawMaterialCost: 225450,
    operatingEfficiency: 89,
    revenue: 428500,
    profit: 128650,
    
    // IoT Integration
    iotSensors: [
      { id: 'SNS-001', type: 'moisture', location: 'Intake Bay 1', value: 14.2, unit: '%', status: 'online', lastUpdate: new Date() },
      { id: 'SNS-002', type: 'temperature', location: 'Dryer Unit', value: 82, unit: '°C', status: 'online', lastUpdate: new Date() },
      { id: 'SNS-003', type: 'level', location: 'Silo 1', value: 75, unit: '%', status: 'online', lastUpdate: new Date() },
      { id: 'SNS-004', type: 'flow', location: 'Main Conveyor', value: 125, unit: 't/hr', status: 'online', lastUpdate: new Date() },
      { id: 'SNS-005', type: 'pressure', location: 'Pelletizer', value: 250, unit: 'bar', status: 'warning', lastUpdate: new Date() },
      { id: 'SNS-006', type: 'vibration', location: 'Mill Motor', value: 2.8, unit: 'mm/s', status: 'online', lastUpdate: new Date() }
    ],
    predictiveMaintenance: {
      nextMaintenance: 'Mill Bearings - 72 hrs',
      criticalAlerts: [],
      equipmentHealth: 92
    },
    dataFeeds: {
      plc: true,
      scada: true,
      erp: true,
      mes: true
    },
    
    // System
    powerConsumption: 1450,
    efficiency: 89,
    totalProduction: 45678,
    systemStatus: 'operational',
    processingActive: true,
    
    // Material Flow
    materialFlowRate: 125,
    bottlenecks: []
  });

  // Simulate real-time data updates
  useEffect(() => {
    if (!autoUpdate) return;
    
    const interval = setInterval(() => {
      setData(prev => {
        const newData = { ...prev };
        
        // Update ship unloading
        if (newData.shipDocked) {
          newData.shipUnloadingProgress = Math.min(100, prev.shipUnloadingProgress + Math.random() * 2);
          if (newData.shipUnloadingProgress >= 100) {
            newData.shipDocked = Math.random() > 0.7;
            newData.shipUnloadingProgress = newData.shipDocked ? 0 : 100;
          }
        } else if (Math.random() > 0.95) {
          newData.shipDocked = true;
          newData.shipUnloadingProgress = 0;
        }
        
        // Update intake materials
        newData.intakeMaterials = prev.intakeMaterials.map(material => ({
          ...material,
          level: Math.max(20, Math.min(95, material.level + (Math.random() - 0.5) * 3)),
          tonnage: Math.round(material.capacity * (material.level / 100)),
          moistureLevel: Math.max(12, Math.min(16, material.moistureLevel + (Math.random() - 0.5) * 0.2))
        }));
        
        // Update silos
        newData.siloLevels = prev.siloLevels.map(level => 
          Math.max(20, Math.min(95, level + (Math.random() - 0.5) * 2))
        );
        
        // Update processing stages
        newData.cleaningStage.efficiency = Math.max(80, Math.min(100, prev.cleaningStage.efficiency + (Math.random() - 0.5) * 2));
        newData.grindingStage.rate = Math.max(80, Math.min(100, prev.grindingStage.rate + (Math.random() - 0.5) * 3));
        newData.grindingStage.particleSize = Math.max(350, Math.min(500, prev.grindingStage.particleSize + (Math.random() - 0.5) * 10));
        newData.mixingStation.mixingRate = Math.max(70, Math.min(100, prev.mixingStation.mixingRate + (Math.random() - 0.5) * 2));
        newData.mixingStation.batchProgress = Math.min(100, prev.mixingStation.batchProgress + Math.random() * 3);
        if (newData.mixingStation.batchProgress >= 100) {
          newData.mixingStation.batchProgress = 0;
        }
        newData.pelletizingStage.rate = Math.max(20, Math.min(50, prev.pelletizingStage.rate + (Math.random() - 0.5) * 2));
        newData.pelletizingStage.temperature = Math.max(75, Math.min(95, prev.pelletizingStage.temperature + (Math.random() - 0.5) * 2));
        newData.coolingSystem.temperature = Math.max(20, Math.min(35, prev.coolingSystem.temperature + (Math.random() - 0.5)));
        
        // Update moisture sensors
        newData.moistureSensors.intake = Math.max(12, Math.min(16, prev.moistureSensors.intake + (Math.random() - 0.5) * 0.3));
        newData.moistureSensors.processing = Math.max(12, Math.min(15, prev.moistureSensors.processing + (Math.random() - 0.5) * 0.2));
        newData.moistureSensors.output = Math.max(11, Math.min(14, prev.moistureSensors.output + (Math.random() - 0.5) * 0.2));
        
        // Update quality checkpoints
        newData.qualityCheckPoints = prev.qualityCheckPoints.map(point => ({
          ...point,
          status: Math.random() > 0.9 ? 'fail' : Math.random() > 0.5 ? 'pass' : 'checking',
          value: point.value + (Math.random() - 0.5) * 2
        }));
        
        // Update bagging operations
        newData.baggingLines.line1.rate = Math.max(500, Math.min(1000, prev.baggingLines.line1.rate + (Math.random() - 0.5) * 50));
        newData.baggingLines.line2.rate = Math.max(300, Math.min(700, prev.baggingLines.line2.rate + (Math.random() - 0.5) * 30));
        newData.baggingLines.line3.rate = newData.baggingLines.line3.active ? Math.max(500, Math.min(1000, prev.baggingLines.line3.rate + (Math.random() - 0.5) * 50)) : 0;
        newData.totalBagsProduced = prev.totalBagsProduced + Math.floor(Math.random() * 10);
        newData.palletizingRate = Math.max(70, Math.min(120, prev.palletizingRate + (Math.random() - 0.5) * 3));
        newData.shrinkWrapStation.palletsWrapped = prev.shrinkWrapStation.palletsWrapped + (Math.random() > 0.7 ? 1 : 0);
        
        // Update storage
        newData.finishedProductStorage = prev.finishedProductStorage.map(level => 
          Math.max(20, Math.min(95, level + (Math.random() - 0.5) * 2))
        );
        
        // Update truck bays
        newData.truckBays = prev.truckBays.map(bay => {
          if (bay.occupied) {
            const newProgress = Math.min(100, bay.loadingProgress + Math.random() * 5);
            if (newProgress >= 100) {
              newData.trucksLoaded++;
              return { ...bay, occupied: false, loadingProgress: 0 };
            }
            return { ...bay, loadingProgress: newProgress };
          } else if (Math.random() > 0.9) {
            return { ...bay, occupied: true, loadingProgress: 0 };
          }
          return bay;
        });
        
        // Update environmental
        newData.temperature = Math.max(20, Math.min(35, prev.temperature + (Math.random() - 0.5)));
        newData.humidity = Math.max(30, Math.min(60, prev.humidity + (Math.random() - 0.5) * 2));
        newData.dustLevel = Math.max(5, Math.min(25, prev.dustLevel + (Math.random() - 0.5) * 2));
        
        // Update system metrics
        newData.powerConsumption = Math.max(1000, Math.min(2000, prev.powerConsumption + (Math.random() - 0.5) * 50));
        newData.efficiency = Math.max(75, Math.min(95, prev.efficiency + (Math.random() - 0.5) * 2));
        newData.totalProduction = prev.totalProduction + Math.floor(Math.random() * 20);
        newData.materialFlowRate = Math.max(100, Math.min(150, prev.materialFlowRate + (Math.random() - 0.5) * 5));
        
        // Update financial metrics
        newData.dailyProduction = Math.max(500, Math.min(1000, prev.dailyProduction + (Math.random() - 0.5) * 10));
        newData.productionCostPerTon = Math.max(150, Math.min(250, prev.productionCostPerTon + (Math.random() - 0.5) * 5));
        newData.energyCostPerHour = Math.max(200, Math.min(500, prev.energyCostPerHour + (Math.random() - 0.5) * 20));
        newData.revenue = newData.dailyProduction * 500 + Math.floor(Math.random() * 5000);
        newData.profit = newData.revenue - (newData.dailyProduction * newData.productionCostPerTon);
        
        // Update IoT sensors
        newData.iotSensors = prev.iotSensors.map(sensor => ({
          ...sensor,
          value: sensor.type === 'moisture' ? Math.max(12, Math.min(16, sensor.value + (Math.random() - 0.5) * 0.5)) :
                 sensor.type === 'temperature' ? Math.max(20, Math.min(100, sensor.value + (Math.random() - 0.5) * 2)) :
                 sensor.type === 'level' ? Math.max(20, Math.min(95, sensor.value + (Math.random() - 0.5) * 3)) :
                 sensor.type === 'flow' ? Math.max(50, Math.min(200, sensor.value + (Math.random() - 0.5) * 5)) :
                 sensor.type === 'pressure' ? Math.max(100, Math.min(400, sensor.value + (Math.random() - 0.5) * 10)) :
                 Math.max(1, Math.min(5, sensor.value + (Math.random() - 0.5) * 0.2)),
          status: Math.random() > 0.95 ? 'warning' : Math.random() > 0.98 ? 'offline' : 'online',
          lastUpdate: new Date()
        }));
        
        // Update predictive maintenance
        newData.predictiveMaintenance.equipmentHealth = Math.max(70, Math.min(100, prev.predictiveMaintenance.equipmentHealth + (Math.random() - 0.5) * 2));
        
        // Update system status based on efficiency
        newData.systemStatus = newData.efficiency > 85 ? 'operational' : newData.efficiency > 70 ? 'warning' : 'critical';
        
        // Random conveyor activity
        newData.conveyorActive = prev.conveyorActive.map(() => Math.random() > 0.1);
        newData.processingActive = Math.random() > 0.1;
        
        // Check for bottlenecks
        newData.bottlenecks = [];
        if (newData.cleaningStage.efficiency < 70) newData.bottlenecks.push('Cleaning Stage');
        if (newData.grindingStage.rate < 70) newData.bottlenecks.push('Grinding Stage');
        if (newData.baggingLines.line1.rate < 600) newData.bottlenecks.push('Bagging Line 1');
        if (newData.materialFlowRate < 110) newData.bottlenecks.push('Material Flow');
        
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [autoUpdate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ 
      p: 3,
      background: isLightMode 
        ? 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)' 
        : 'linear-gradient(180deg, #0a0f1b 0%, #1a2332 100%)',
      minHeight: '100vh'
    }}>
      {/* Header Controls */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Factory size={24} />
            Complete Production Facility Digital Twin
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip 
              icon={<Ship size={16} />}
              label={data.shipDocked ? 'Ship Docked' : 'No Ship'}
              color={data.shipDocked ? 'primary' : 'default'}
              variant="outlined"
            />
            <Chip 
              icon={<Truck size={16} />}
              label={`${data.trucksLoaded} Trucks`}
              color="success"
              variant="outlined"
            />
            <Tooltip title={autoUpdate ? "Pause Updates" : "Resume Updates"}>
              <IconButton 
                onClick={() => setAutoUpdate(!autoUpdate)}
                sx={{ 
                  border: '1px solid',
                  borderColor: isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
                }}
              >
                {autoUpdate ? <RotateCw size={20} className="animate-spin" /> : <Eye size={20} />}
              </IconButton>
            </Tooltip>
            <Chip 
              label={`SYSTEM ${data.systemStatus.toUpperCase()}`}
              color={getStatusColor(data.systemStatus)}
              sx={{ fontWeight: 600 }}
            />
            <Chip 
              label={`Efficiency: ${data.efficiency}%`}
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          </Box>
        </Box>

        {/* Main Comprehensive Plant View */}
        <ComprehensivePlantView data={data} theme={theme} />

        {/* Stage-wise KPIs Grid */}
        <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Gauge size={20} />
          Production Stage KPIs
        </Typography>
        
        <Grid container spacing={2}>
          {/* Marine Operations */}
          <Grid item xs={6} sm={4} md={2}>
            <StageKPICard
              title="Ship Unloading"
              value={data.shipUnloadingProgress}
              unit="%"
              icon={Anchor}
              status={data.shipUnloadingProgress > 80 ? 'optimal' : 'warning'}
              trend={data.shipDocked ? 'Active' : 'Idle'}
            />
          </Grid>
          
          {/* Intake */}
          <Grid item xs={6} sm={4} md={2}>
            <StageKPICard
              title="Material Intake"
              value={Math.round(data.intakeMaterials.reduce((a, b) => a + b.level, 0) / data.intakeMaterials.length)}
              unit="%"
              icon={Warehouse}
              status="optimal"
              trend="Receiving"
            />
          </Grid>
          
          {/* Processing */}
          <Grid item xs={6} sm={4} md={2}>
            <StageKPICard
              title="Cleaning"
              value={data.cleaningStage.efficiency}
              unit="%"
              icon={Factory}
              status={data.cleaningStage.efficiency > 85 ? 'optimal' : data.cleaningStage.efficiency > 70 ? 'warning' : 'critical'}
              trend={data.cleaningStage.efficiency > 85 ? '↑' : '↓'}
            />
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <StageKPICard
              title="Grinding"
              value={data.grindingStage.rate}
              unit="%"
              icon={Settings}
              status={data.grindingStage.rate > 85 ? 'optimal' : data.grindingStage.rate > 70 ? 'warning' : 'critical'}
              trend={`${data.grindingStage.particleSize}μm`}
            />
          </Grid>
          
          {/* Packaging */}
          <Grid item xs={6} sm={4} md={2}>
            <StageKPICard
              title="Bagging"
              value={data.baggingLines.line1.rate + data.baggingLines.line2.rate}
              unit="bags/hr"
              icon={Package}
              status="optimal"
              trend="3 Lines"
            />
          </Grid>
          
          {/* Distribution */}
          <Grid item xs={6} sm={4} md={2}>
            <StageKPICard
              title="Truck Loading"
              value={data.truckBays.filter(b => b.occupied).length}
              unit="bays"
              icon={Truck}
              status="optimal"
              trend={`${data.trucksLoaded} shipped`}
            />
          </Grid>
        </Grid>

        {/* Financial & Production Metrics */}
        <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DollarSign size={20} />
          Financial & Production Metrics
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4} md={2}>
            <StageKPICard
              title="Daily Production"
              value={data.dailyProduction}
              unit="tons"
              icon={BarChart3}
              status="optimal"
              trend={`${data.pelletizingStage.rate} t/hr`}
            />
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <StageKPICard
              title="Production Cost"
              value={data.productionCostPerTon}
              unit="$/ton"
              icon={DollarSign}
              status={data.productionCostPerTon < 200 ? 'optimal' : 'warning'}
              trend={data.productionCostPerTon < 200 ? '↓' : '↑'}
            />
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <StageKPICard
              title="Energy Cost"
              value={data.energyCostPerHour}
              unit="$/hr"
              icon={Zap}
              status="warning"
              trend={`${data.powerConsumption}kW`}
            />
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <StageKPICard
              title="Revenue"
              value={(data.revenue / 1000).toFixed(1)}
              unit="k$"
              icon={TrendingUp}
              status="optimal"
              trend="↑ 12%"
            />
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <StageKPICard
              title="Profit"
              value={(data.profit / 1000).toFixed(1)}
              unit="k$"
              icon={DollarSign}
              status="optimal"
              trend="↑ 8%"
            />
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <StageKPICard
              title="Efficiency"
              value={data.operatingEfficiency}
              unit="%"
              icon={Activity}
              status={data.operatingEfficiency > 85 ? 'optimal' : 'warning'}
              trend={data.operatingEfficiency > 85 ? 'Optimal' : 'Sub-optimal'}
            />
          </Grid>
        </Grid>

        {/* IoT Integration & Monitoring */}
        <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Wifi size={20} />
          IoT Integration & Real-Time Monitoring
        </Typography>
        
        <Grid container spacing={2}>
          {/* IoT Sensors Status */}
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              background: isLightMode ? '#ffffff' : '#1e293b',
              border: '1px solid',
              borderColor: isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
            }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Cpu size={18} />
                  IoT Sensor Network
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {data.iotSensors.map(sensor => (
                    <Box key={sensor.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%',
                          backgroundColor: sensor.status === 'online' ? '#10b981' : sensor.status === 'warning' ? '#fbbf24' : '#ef4444',
                          animation: sensor.status === 'online' ? 'pulse 2s infinite' : 'none'
                        }} />
                        <Typography variant="caption" color="text.secondary">
                          {sensor.location}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: highlightColor }}>
                        {sensor.value}{sensor.unit}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Predictive Maintenance */}
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              background: isLightMode ? '#ffffff' : '#1e293b',
              border: '1px solid',
              borderColor: isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
            }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Wrench size={18} />
                  Predictive Maintenance
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Equipment Health</Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={data.predictiveMaintenance.equipmentHealth} 
                      sx={{ height: 8, borderRadius: 1, mt: 0.5 }}
                      color={data.predictiveMaintenance.equipmentHealth > 80 ? 'success' : data.predictiveMaintenance.equipmentHealth > 60 ? 'warning' : 'error'}
                    />
                  </Box>
                  <Typography variant="h6" sx={{ ml: 2, fontWeight: 600 }}>
                    {data.predictiveMaintenance.equipmentHealth}%
                  </Typography>
                </Box>
                <Alert severity="info" sx={{ py: 0.5, px: 1, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                  Next: {data.predictiveMaintenance.nextMaintenance}
                </Alert>
                {data.predictiveMaintenance.criticalAlerts.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 1, py: 0.5, px: 1, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                    {data.predictiveMaintenance.criticalAlerts[0]}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Data Integration Status */}
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              background: isLightMode ? '#ffffff' : '#1e293b',
              border: '1px solid',
              borderColor: isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
            }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ShieldCheck size={18} />
                  System Integration Status
                </Typography>
                <Grid container spacing={1}>
                  {Object.entries(data.dataFeeds).map(([system, status]) => (
                    <Grid item xs={6} key={system}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: isLightMode ? '#f9fafb' : '#111827'
                      }}>
                        <Box sx={{ 
                          width: 10, 
                          height: 10, 
                          borderRadius: '50%',
                          backgroundColor: status ? '#10b981' : '#6b7280'
                        }} />
                        <Typography variant="caption" sx={{ fontWeight: 500, textTransform: 'uppercase' }}>
                          {system}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Data Refresh Rate</Typography>
                  <Chip label="Real-time" size="small" color="success" sx={{ height: 20 }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">Active Sensors</Typography>
                  <Chip label={`${data.iotSensors.filter(s => s.status === 'online').length}/${data.iotSensors.length}`} size="small" sx={{ height: 20 }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Power Usage</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{data.powerConsumption} kW</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Alert 
              severity={data.bottlenecks.length > 0 ? 'warning' : 'success'}
              icon={data.bottlenecks.length > 0 ? <AlertCircle /> : <CheckCircle />}
              sx={{ 
                height: '100%',
                background: isLightMode 
                  ? data.bottlenecks.length > 0 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(16, 185, 129, 0.1)'
                  : data.bottlenecks.length > 0 ? 'rgba(251, 191, 36, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                border: '1px solid',
                borderColor: isLightMode 
                  ? data.bottlenecks.length > 0 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(16, 185, 129, 0.3)'
                  : data.bottlenecks.length > 0 ? 'rgba(251, 191, 36, 0.4)' : 'rgba(16, 185, 129, 0.4)'
              }}
            >
              <AlertTitle sx={{ fontWeight: 600 }}>
                {data.bottlenecks.length > 0 ? 'Bottlenecks Detected' : 'All Systems Optimal'}
              </AlertTitle>
              {data.bottlenecks.length > 0 ? (
                <Box>
                  {data.bottlenecks.map((bottleneck, i) => (
                    <Typography key={i} variant="body2" sx={{ mt: 0.5 }}>
                      • {bottleneck}
                    </Typography>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2">
                  All production stages are operating at optimal efficiency.
                  Material flow is steady from dock to distribution.
                </Typography>
              )}
            </Alert>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}