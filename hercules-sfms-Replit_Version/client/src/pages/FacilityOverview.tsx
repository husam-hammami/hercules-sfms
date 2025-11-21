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

export default function FacilityOverview() {
  const [, params] = useRoute("/facility/:id/overview");
  const [, setLocation] = useLocation();
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [alertCount, setAlertCount] = useState(2);
  
  const facilityId = params?.id ? parseInt(params.id) : 1;
  const facility = mockFacilities.find(f => f.id === facilityId) || mockFacilities[0];

  const handleNavigation = (path: string) => {
    setLocation(path.replace('%id', facilityId.toString()));
  };

  const kpis = {
    dailyProduction: facility.dailyProduction,
    weeklyProduction: facility.dailyProduction * 7,
    energyConsumption: 2847,
    chemicalUsage: 156,
    downtime: 2.3,
    efficiency: facility.efficiency,
    co2Equivalent: 1.2,
  };

  const systemComponents = [
    { id: 'intake', name: 'Water Intake', status: 'operational', temp: 22.5, pressure: 4.2, x: 15, y: 25 },
    { id: 'pretreat', name: 'Pre-treatment', status: 'operational', temp: 24.1, pressure: 3.8, x: 35, y: 30 },
    { id: 'coagulation', name: 'Coagulation', status: 'warning', temp: 26.3, pressure: 3.5, x: 55, y: 25 },
    { id: 'filtration', name: 'Filtration Banks', status: 'operational', temp: 23.8, pressure: 3.2, x: 75, y: 35 },
    { id: 'disinfection', name: 'Disinfection', status: 'operational', temp: 25.2, pressure: 2.9, x: 85, y: 55 },
    { id: 'storage', name: 'Clear Well', status: 'operational', temp: 22.1, pressure: 2.5, x: 65, y: 75 },
    { id: 'distribution', name: 'Distribution', status: 'operational', temp: 21.8, pressure: 4.5, x: 25, y: 65 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return '#00ff88';
      case 'warning': return '#ffaa00';
      case 'offline': return '#ff4444';
      default: return '#00ccff';
    }
  };

  const shiftData = [
    { shift: "Day (06:00-14:00)", operator: "John Smith", production: 952, alerts: 0 },
    { shift: "Evening (14:00-22:00)", operator: "Maria Garcia", production: 1108, alerts: 2 },
    { shift: "Night (22:00-06:00)", operator: "Ahmed Hassan", production: 787, alerts: 1 },
  ];

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
      {/* Holographic Background Matrix */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_25%_25%,rgba(0,255,255,0.15)_0%,transparent_50%)]"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_75%_75%,rgba(255,0,255,0.15)_0%,transparent_50%)]"></div>
        
        {/* 3D Grid Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
        
        {/* Floating Cyber Particles */}
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `data-flow ${4 + Math.random() * 6}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 h-full p-4">
        {/* Enhanced 3D Header */}
        <div className="flex items-center justify-between w-full bg-gradient-to-r from-slate-900/90 via-slate-800/70 to-slate-900/90 backdrop-blur-md rounded-lg px-6 py-4 border border-cyan-500/20 shadow-lg shadow-cyan-500/10 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full shadow-lg shadow-cyan-400/50 animate-pulse"></div>
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent"></div>
            <div>
              <h1 className="text-lg text-slate-100 font-bold tracking-wider uppercase" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.1em' }}>
                {facility.name} - Plant Overview
              </h1>
              <div className="text-xs text-cyan-400 font-mono">Interactive Process Flow | Real-time Operations</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400">PLANT OPERATIONAL</span>
            </div>
            <div className="text-slate-400">|</div>
            <div className="text-slate-300">Efficiency: {facility.efficiency}%</div>
            <div className="text-slate-400">|</div>
            <div className="px-3 py-1 bg-orange-500/15 rounded-md text-orange-300 border border-orange-500/30 font-semibold">
              {alertCount} ALERTS
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
                  item.id === 'overview' 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20' 
                    : 'bg-slate-800/50 text-slate-400 border border-slate-600/30 hover:bg-cyan-500/10 hover:text-cyan-300'
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

        {/* Main 3D Dashboard Grid */}
        <div className="grid grid-cols-12 grid-rows-6 gap-4 h-[calc(100vh-180px)]">
          
          {/* Interactive Plant Layout - Main Center */}
          <div className="col-span-8 row-span-4 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-xl border border-cyan-500/20 shadow-lg shadow-cyan-500/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
            
            {/* Header */}
            <div className="relative z-10 p-4 border-b border-cyan-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <h3 className="text-cyan-400 font-mono text-sm font-semibold">INTERACTIVE PLANT LAYOUT</h3>
                </div>
                <div className="text-xs text-slate-400 font-mono">Click components for details</div>
              </div>
            </div>

            {/* 3D Plant Visualization */}
            <div className="relative h-full p-4">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Flow Lines */}
                <defs>
                  <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00ffff" stopOpacity="0.3"/>
                    <stop offset="50%" stopColor="#0080ff" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#00ffff" stopOpacity="0.3"/>
                  </linearGradient>
                </defs>
                
                {/* Process Flow Lines */}
                <path
                  d="M15,25 Q25,20 35,30 Q45,35 55,25 Q65,20 75,35 Q80,45 85,55 Q75,65 65,75 Q45,80 25,65 Q20,50 15,25"
                  stroke="url(#flowGradient)"
                  strokeWidth="2"
                  fill="none"
                  className="animate-pulse"
                />

                {/* System Components */}
                {systemComponents.map((component) => (
                  <g key={component.id}>
                    <circle
                      cx={component.x}
                      cy={component.y}
                      r="4"
                      fill={getStatusColor(component.status)}
                      className="cursor-pointer transition-all duration-300 hover:r-6"
                      onClick={() => setSelectedSystem(component.id)}
                      style={{
                        filter: `drop-shadow(0 0 8px ${getStatusColor(component.status)}40)`,
                        animation: component.status === 'warning' ? 'blink 2s infinite' : 'none'
                      }}
                    />
                    <text
                      x={component.x}
                      y={component.y - 6}
                      textAnchor="middle"
                      className="fill-slate-300 text-xs font-mono"
                      style={{ fontSize: '3px' }}
                    >
                      {component.name}
                    </text>
                  </g>
                ))}

                {/* Animated Flow Particles */}
                {[...Array(8)].map((_, i) => (
                  <circle
                    key={i}
                    r="1"
                    fill="#00ffff"
                    className="opacity-70"
                  >
                    <animateMotion
                      dur={`${6 + i}s`}
                      repeatCount="indefinite"
                      path="M15,25 Q25,20 35,30 Q45,35 55,25 Q65,20 75,35 Q80,45 85,55 Q75,65 65,75 Q45,80 25,65 Q20,50 15,25"
                      begin={`${i * 0.8}s`}
                    />
                  </circle>
                ))}
              </svg>

              {/* Component Detail Panel */}
              {selectedSystem && (
                <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur-md rounded-lg p-4 border border-cyan-500/30 w-64">
                  {(() => {
                    const component = systemComponents.find(c => c.id === selectedSystem);
                    return component ? (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-cyan-400 font-mono text-sm font-semibold">{component.name}</h4>
                          <button
                            onClick={() => setSelectedSystem(null)}
                            className="text-slate-400 hover:text-white text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="space-y-2 text-xs font-mono">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Status:</span>
                            <span style={{ color: getStatusColor(component.status) }} className="capitalize font-semibold">
                              {component.status}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Temperature:</span>
                            <span className="text-white">{component.temp}°C</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Pressure:</span>
                            <span className="text-white">{component.pressure} bar</span>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Real-time KPIs Panel */}
          <div className="col-span-4 row-span-4 space-y-4">
            {/* Production Metrics */}
            <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/30 backdrop-blur-md rounded-xl border border-emerald-500/20 p-4 shadow-lg shadow-emerald-500/10">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <h3 className="text-emerald-400 font-mono text-sm font-semibold">PRODUCTION METRICS</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-400">Daily Output</span>
                  <span className="text-lg font-mono text-emerald-400 font-bold">{kpis.dailyProduction.toLocaleString()} m³</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-400">Weekly Total</span>
                  <span className="text-sm font-mono text-slate-300">{kpis.weeklyProduction.toLocaleString()} m³</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-400">Efficiency</span>
                  <span className="text-sm font-mono text-cyan-400">{kpis.efficiency}%</span>
                </div>
              </div>
            </div>

            {/* Energy & Environment */}
            <div className="bg-gradient-to-br from-amber-900/30 to-amber-800/30 backdrop-blur-md rounded-xl border border-amber-500/20 p-4 shadow-lg shadow-amber-500/10">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                <h3 className="text-amber-400 font-mono text-sm font-semibold">ENERGY & ENVIRONMENT</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-400">Energy Usage</span>
                  <span className="text-sm font-mono text-amber-400">{kpis.energyConsumption} kWh</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-400">Chemical Usage</span>
                  <span className="text-sm font-mono text-slate-300">{kpis.chemicalUsage} L</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-400">CO₂ Equivalent</span>
                  <span className="text-sm font-mono text-green-400">{kpis.co2Equivalent} tons</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shift Summary */}
          <div className="col-span-12 row-span-2 bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-xl border border-cyan-500/20 shadow-lg shadow-cyan-500/10 p-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <h3 className="text-purple-400 font-mono text-sm font-semibold">24-HOUR SHIFT OPERATIONS</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              {shiftData.map((shift, index) => (
                <div key={index} className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                  <div className="text-xs text-cyan-400 font-mono mb-2">{shift.shift}</div>
                  <div className="text-sm text-slate-300 font-mono mb-1">Operator: {shift.operator}</div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400">Production:</span>
                    <span className="text-sm text-emerald-400 font-mono">{shift.production} m³</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Alerts:</span>
                    <span className={`text-sm font-mono ${shift.alerts > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                      {shift.alerts}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Ambient 3D Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full opacity-30 blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full opacity-30 blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-emerald-500/10 rounded-full opacity-30 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>
    </div>
  );
}