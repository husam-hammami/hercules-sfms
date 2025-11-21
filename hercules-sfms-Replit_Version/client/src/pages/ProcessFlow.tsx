import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { mockFacilities } from "@/lib/mockData";

const navigationItems = [
  { id: "overview", label: "Overview", path: "/facility/%id/overview" },
  { id: "process", label: "Process Flow", path: "/facility/%id/process" },
  { id: "quality", label: "Water Quality", path: "/facility/%id/quality" },
  { id: "energy", label: "Energy", path: "/facility/%id/energy" },
  { id: "maintenance", label: "Maintenance", path: "/facility/%id/maintenance" },
  { id: "chemical", label: "Chemical", path: "/facility/%id/chemical" },
];

export default function ProcessFlow() {
  const [, params] = useRoute("/facility/:id/process");
  const [, setLocation] = useLocation();
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'simulation'>('overview');
  
  const facilityId = params?.id ? parseInt(params.id) : 1;
  const facility = mockFacilities.find(f => f.id === facilityId) || mockFacilities[0];

  const handleNavigation = (path: string) => {
    setLocation(path.replace('%id', facilityId.toString()));
  };

  // Process equipment with live data
  const processEquipment = [
    { 
      id: 'intake-pump', 
      name: 'Intake Pump A1', 
      type: 'pump',
      status: 'operational', 
      flow: 2450, 
      pressure: 4.2, 
      power: 85.5,
      speed: 1750,
      efficiency: 94.2,
      x: 15, 
      y: 20,
      connections: ['screen-1']
    },
    { 
      id: 'screen-1', 
      name: 'Bar Screen #1', 
      type: 'screen',
      status: 'operational', 
      flow: 2450, 
      pressure: 4.0, 
      differential: 0.15,
      cleanCycles: 12,
      x: 35, 
      y: 20,
      connections: ['coag-tank']
    },
    { 
      id: 'coag-tank', 
      name: 'Coagulation Tank', 
      type: 'tank',
      status: 'warning', 
      flow: 2450, 
      level: 78.5, 
      mixerSpeed: 45,
      chemDose: 12.5,
      retention: 18.5,
      x: 55, 
      y: 25,
      connections: ['sed-basin']
    },
    { 
      id: 'sed-basin', 
      name: 'Sedimentation Basin', 
      type: 'basin',
      status: 'operational', 
      flow: 2400, 
      turbidity: 2.8, 
      sludgeLevel: 15.2,
      overflow: 1.2,
      x: 75, 
      y: 20,
      connections: ['filter-bank']
    },
    { 
      id: 'filter-bank', 
      name: 'Sand Filter Bank', 
      type: 'filter',
      status: 'operational', 
      flow: 2380, 
      pressure: 2.1, 
      backwashCycle: 45,
      turbidityOut: 0.12,
      x: 85, 
      y: 40,
      connections: ['clearwell']
    },
    { 
      id: 'clearwell', 
      name: 'Clear Well Storage', 
      type: 'storage',
      status: 'operational', 
      level: 85.2, 
      volume: 5420, 
      residence: 4.2,
      chlorineLevel: 0.8,
      x: 75, 
      y: 65,
      connections: ['dist-pump']
    },
    { 
      id: 'dist-pump', 
      name: 'Distribution Pump', 
      type: 'pump',
      status: 'operational', 
      flow: 2350, 
      pressure: 6.8, 
      power: 125.8,
      speed: 1650,
      efficiency: 92.1,
      x: 45, 
      y: 75,
      connections: []
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return '#00ff88';
      case 'warning': return '#ffaa00';
      case 'maintenance': return '#ff8800';
      case 'offline': return '#ff4444';
      default: return '#00ccff';
    }
  };

  const getEquipmentIcon = (type: string) => {
    switch (type) {
      case 'pump': return '⚙';
      case 'tank': return '🔲';
      case 'filter': return '▦';
      case 'basin': return '⬜';
      case 'screen': return '|||';
      case 'storage': return '🔳';
      default: return '⚪';
    }
  };

  const bottlenecks = [
    { equipment: 'Coagulation Tank', issue: 'Chemical dosing variance', severity: 'medium', impact: '2.1% efficiency loss' },
    { equipment: 'Filter Bank', issue: 'Approaching backwash cycle', severity: 'low', impact: 'Scheduled maintenance' }
  ];

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
      {/* Dynamic Process Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_15%_25%,rgba(0,255,255,0.2)_0%,transparent_50%)]"></div>
        <div className="absolute center left-0 w-full h-full bg-[radial-gradient(circle_at_85%_45%,rgba(255,170,0,0.15)_0%,transparent_50%)]"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_75%_75%,rgba(170,0,255,0.15)_0%,transparent_50%)]"></div>
        
        {/* Animated Flow Grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          animation: 'grid-flow 20s linear infinite'
        }}></div>
        
        {/* Process Flow Particles */}
        {[...Array(35)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-50"
            style={{
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              backgroundColor: ['#00ffff', '#00ff88', '#ffaa00', '#8800ff'][Math.floor(Math.random() * 4)],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `process-flow ${8 + Math.random() * 12}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 h-full p-4">
        {/* Enhanced Process Header */}
        <div className="flex items-center justify-between w-full bg-gradient-to-r from-slate-900/90 via-slate-800/70 to-slate-900/90 backdrop-blur-md rounded-lg px-6 py-4 border border-cyan-500/20 shadow-lg shadow-cyan-500/10 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full shadow-lg shadow-blue-400/50 animate-pulse"></div>
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-blue-400/40 to-transparent"></div>
            <div>
              <h1 className="text-lg text-slate-100 font-bold tracking-wider uppercase" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.1em' }}>
                {facility.name} - Process Flow Diagram
              </h1>
              <div className="text-xs text-blue-400 font-mono">Live Process Data | Equipment Status | Flow Optimization</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-blue-400">PROCESS ACTIVE</span>
            </div>
            <div className="text-slate-400">|</div>
            <div className="text-slate-300">Flow Rate: 2,350 m³/h</div>
            <div className="text-slate-400">|</div>
            <div className="px-3 py-1 bg-orange-500/15 rounded-md text-orange-300 border border-orange-500/30 font-semibold">
              {bottlenecks.length} ALERTS
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`px-4 py-2 rounded-lg font-mono text-xs transition-all duration-300 ${
                  item.id === 'process' 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/20' 
                    : 'bg-slate-800/50 text-slate-400 border border-slate-600/30 hover:bg-blue-500/10 hover:text-blue-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setLocation('/')}
            className="px-4 py-2 rounded-lg font-mono text-xs transition-all duration-300 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 hover:text-emerald-300 shadow-lg shadow-emerald-500/20"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* View Mode Controls */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            {[
              { key: 'overview', label: 'Process Overview' },
              { key: 'detailed', label: 'Detailed View' },
              { key: 'simulation', label: 'Flow Simulation' }
            ].map((mode) => (
              <button
                key={mode.key}
                onClick={() => setViewMode(mode.key as any)}
                className={`px-4 py-2 rounded-lg font-mono text-xs transition-all duration-300 ${
                  viewMode === mode.key
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20' 
                    : 'bg-slate-800/50 text-slate-400 border border-slate-600/30 hover:bg-cyan-500/10 hover:text-cyan-300'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          
          <div className="text-xs text-slate-400 font-mono">
            Last updated: {new Date().toLocaleTimeString()} | Auto-refresh: ON
          </div>
        </div>

        {/* Main Process Dashboard */}
        <div className="grid grid-cols-12 grid-rows-6 gap-4 h-[calc(100vh-220px)]">
          
          {/* Interactive Process Flow Diagram */}
          <div className="col-span-9 row-span-5 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-xl border border-blue-500/20 shadow-lg shadow-blue-500/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5"></div>
            
            {/* PFD Header */}
            <div className="relative z-10 p-4 border-b border-blue-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <h3 className="text-blue-400 font-mono text-sm font-semibold">ANIMATED PROCESS FLOW DIAGRAM</h3>
                </div>
                <div className="flex items-center space-x-4 text-xs font-mono">
                  <div className="text-slate-400">Flow Direction: →</div>
                  <div className="text-slate-400">Live Tags: Active</div>
                  <div className="text-slate-400">Process Status: Normal</div>
                </div>
              </div>
            </div>

            {/* 3D Process Visualization */}
            <div className="relative h-full p-6">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                  {/* Flow Gradients */}
                  <linearGradient id="waterFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0080ff" stopOpacity="0.6"/>
                    <stop offset="50%" stopColor="#00ffff" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#0080ff" stopOpacity="0.6"/>
                  </linearGradient>
                  <linearGradient id="processFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00ff88" stopOpacity="0.4"/>
                    <stop offset="50%" stopColor="#00ffff" stopOpacity="0.7"/>
                    <stop offset="100%" stopColor="#00ff88" stopOpacity="0.4"/>
                  </linearGradient>
                  
                  {/* Equipment Shadows */}
                  <filter id="equipment-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge> 
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Process Flow Lines with Animation */}
                <g stroke="url(#waterFlow)" strokeWidth="3" fill="none">
                  {/* Main process line */}
                  <path 
                    d="M15,20 L35,20 L55,25 L75,20 L85,40 L75,65 L45,75"
                    className="animate-pulse"
                    strokeDasharray="5,5"
                  >
                    <animate attributeName="stroke-dashoffset" 
                             values="0;10" 
                             dur="2s" 
                             repeatCount="indefinite"/>
                  </path>
                  
                  {/* Secondary flow lines */}
                  <path d="M55,35 Q60,50 65,65" stroke="#ffaa00" strokeWidth="2" strokeDasharray="3,3">
                    <animate attributeName="stroke-dashoffset" values="0;6" dur="1.5s" repeatCount="indefinite"/>
                  </path>
                </g>

                {/* Process Equipment with 3D Effects */}
                {processEquipment.map((equipment) => {
                  const equipmentColor = getStatusColor(equipment.status);
                  return (
                    <g key={equipment.id}>
                      {/* Equipment Base */}
                      <circle
                        cx={equipment.x}
                        cy={equipment.y}
                        r="5"
                        fill={equipmentColor}
                        filter="url(#equipment-glow)"
                        className="cursor-pointer transition-all duration-300"
                        onClick={() => setSelectedEquipment(equipment.id === selectedEquipment ? null : equipment.id)}
                        style={{
                          animation: equipment.status === 'warning' ? 'warning-blink 2s infinite' : 
                                   equipment.status === 'operational' ? 'pulse 3s infinite' : 'none'
                        }}
                      />
                      
                      {/* Equipment Icon */}
                      <text
                        x={equipment.x}
                        y={equipment.y + 1}
                        textAnchor="middle"
                        className="fill-slate-900 font-bold"
                        style={{ fontSize: '4px' }}
                      >
                        {getEquipmentIcon(equipment.type)}
                      </text>
                      
                      {/* Equipment Label */}
                      <text
                        x={equipment.x}
                        y={equipment.y - 7}
                        textAnchor="middle"
                        className="fill-slate-300 font-mono"
                        style={{ fontSize: '2.5px' }}
                      >
                        {equipment.name}
                      </text>

                      {/* Live Data Tags */}
                      {equipment.status === 'operational' && (
                        <g>
                          <rect
                            x={equipment.x + 6}
                            y={equipment.y - 3}
                            width="12"
                            height="6"
                            fill="rgba(0,0,0,0.8)"
                            stroke={equipmentColor}
                            strokeWidth="0.3"
                            rx="1"
                          />
                          <text
                            x={equipment.x + 12}
                            y={equipment.y + 1}
                            textAnchor="middle"
                            className="fill-cyan-400 font-mono"
                            style={{ fontSize: '1.5px' }}
                          >
                            {equipment.flow ? `${equipment.flow}m³/h` : 
                             equipment.level ? `${equipment.level}%` : 
                             equipment.pressure ? `${equipment.pressure}bar` : ''}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Animated Flow Particles */}
                {[...Array(12)].map((_, i) => (
                  <circle
                    key={i}
                    r="0.8"
                    fill="#00ffff"
                    className="opacity-80"
                  >
                    <animateMotion
                      dur={`${8 + i * 0.5}s`}
                      repeatCount="indefinite"
                      path="M15,20 L35,20 L55,25 L75,20 L85,40 L75,65 L45,75"
                      begin={`${i * 0.7}s`}
                    />
                    <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite"/>
                  </circle>
                ))}

                {/* Chemical Injection Points */}
                <g fill="#ffaa00">
                  <circle cx="55" cy="35" r="1.5" className="animate-pulse"/>
                  <text x="55" y="40" textAnchor="middle" className="fill-amber-400 font-mono" style={{ fontSize: '2px' }}>
                    COAG
                  </text>
                </g>
              </svg>

              {/* Equipment Detail Panel */}
              {selectedEquipment && (
                <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur-md rounded-lg p-4 border border-blue-500/30 w-80">
                  {(() => {
                    const equipment = processEquipment.find(e => e.id === selectedEquipment);
                    return equipment ? (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-blue-400 font-mono text-sm font-semibold">{equipment.name}</h4>
                          <button
                            onClick={() => setSelectedEquipment(null)}
                            className="text-slate-400 hover:text-white text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Status:</span>
                              <span style={{ color: getStatusColor(equipment.status) }} className="capitalize font-semibold">
                                {equipment.status}
                              </span>
                            </div>
                            {equipment.flow && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Flow:</span>
                                <span className="text-cyan-400">{equipment.flow} m³/h</span>
                              </div>
                            )}
                            {equipment.pressure && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Pressure:</span>
                                <span className="text-cyan-400">{equipment.pressure} bar</span>
                              </div>
                            )}
                            {equipment.level && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Level:</span>
                                <span className="text-emerald-400">{equipment.level}%</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            {equipment.power && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Power:</span>
                                <span className="text-amber-400">{equipment.power} kW</span>
                              </div>
                            )}
                            {equipment.efficiency && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Efficiency:</span>
                                <span className="text-emerald-400">{equipment.efficiency}%</span>
                              </div>
                            )}
                            {equipment.speed && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Speed:</span>
                                <span className="text-blue-400">{equipment.speed} RPM</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Real-time Trend Miniature */}
                        <div className="mt-4 p-2 bg-slate-800/50 rounded border border-slate-600/30">
                          <div className="text-xs text-slate-400 mb-2">Real-time Trend</div>
                          <div className="h-8 bg-slate-700/50 rounded flex items-end justify-between px-1">
                            {[...Array(12)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-cyan-400 rounded-t"
                                style={{ 
                                  height: `${20 + Math.sin(i * 0.5) * 10 + Math.random() * 5}%`,
                                  opacity: 0.7 + (i / 12) * 0.3
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Process Analytics Sidebar */}
          <div className="col-span-3 row-span-5 space-y-4">
            {/* Pump Status Panel */}
            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/40 backdrop-blur-md rounded-xl border border-emerald-500/30 p-4 shadow-lg shadow-emerald-500/10">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <h3 className="text-emerald-400 font-mono text-sm font-semibold">PUMP STATUS</h3>
              </div>
              
              <div className="space-y-3">
                {processEquipment.filter(e => e.type === 'pump').map((pump) => (
                  <div key={pump.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-600/30">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs text-slate-300 font-mono">{pump.name}</div>
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getStatusColor(pump.status) }}
                      ></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <div className="text-slate-400">Flow</div>
                        <div className="text-cyan-400">{pump.flow} m³/h</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Power</div>
                        <div className="text-amber-400">{pump.power} kW</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Process Bottlenecks */}
            <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/40 backdrop-blur-md rounded-xl border border-orange-500/30 p-4 shadow-lg shadow-orange-500/10">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                <h3 className="text-orange-400 font-mono text-sm font-semibold">PROCESS BOTTLENECKS</h3>
              </div>
              
              <div className="space-y-3">
                {bottlenecks.map((bottleneck, index) => (
                  <div key={index} className="bg-slate-800/50 rounded-lg p-3 border border-slate-600/30">
                    <div className="text-xs text-slate-300 font-mono mb-1">{bottleneck.equipment}</div>
                    <div className="text-xs text-orange-400 mb-2">{bottleneck.issue}</div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Impact:</span>
                      <span className="text-orange-300">{bottleneck.impact}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Severity:</span>
                      <span className={`capitalize ${
                        bottleneck.severity === 'high' ? 'text-red-400' :
                        bottleneck.severity === 'medium' ? 'text-orange-400' : 'text-yellow-400'
                      }`}>
                        {bottleneck.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Real-time Process Metrics */}
          <div className="col-span-12 row-span-1 bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-xl border border-cyan-500/20 shadow-lg shadow-cyan-500/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <h3 className="text-cyan-400 font-mono text-sm font-semibold">REAL-TIME PROCESS METRICS</h3>
              </div>
              
              <div className="grid grid-cols-8 gap-6 flex-1 ml-8">
                {[
                  { label: 'Total Flow', value: '2,350', unit: 'm³/h', color: '#00ffff' },
                  { label: 'System Pressure', value: '4.2', unit: 'bar', color: '#00ff88' },
                  { label: 'Power Consumption', value: '211.3', unit: 'kW', color: '#ffaa00' },
                  { label: 'Process Efficiency', value: '94.8', unit: '%', color: '#00ff88' },
                  { label: 'Turbidity Removal', value: '99.2', unit: '%', color: '#00ccff' },
                  { label: 'Chemical Dosing', value: '12.5', unit: 'mg/L', color: '#ff8800' },
                  { label: 'Residence Time', value: '18.5', unit: 'min', color: '#8800ff' },
                  { label: 'System Uptime', value: '99.7', unit: '%', color: '#00ff88' }
                ].map((metric, index) => (
                  <div key={index} className="text-center">
                    <div className="text-xs text-slate-400 font-mono mb-1">{metric.label}</div>
                    <div 
                      className="text-lg font-mono font-bold"
                      style={{ 
                        color: metric.color,
                        textShadow: `0 0 8px ${metric.color}50`
                      }}
                    >
                      {metric.value}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{metric.unit}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Enhanced Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/8 rounded-full opacity-40 blur-3xl animate-float" />
        <div className="absolute center right-0 w-80 h-80 bg-cyan-500/8 rounded-full opacity-40 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-purple-500/8 rounded-full opacity-40 blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>
    </div>
  );
}