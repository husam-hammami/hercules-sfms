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

export default function ChemicalDosing() {
  const [, params] = useRoute("/facility/:id/chemical");
  const [, setLocation] = useLocation();
  const [selectedTank, setSelectedTank] = useState<string | null>(null);
  const [dosingMode, setDosingMode] = useState<'auto' | 'manual' | 'emergency'>('auto');
  
  const facilityId = params?.id ? parseInt(params.id) : 1;
  const facility = mockFacilities.find(f => f.id === facilityId) || mockFacilities[0];

  const handleNavigation = (path: string) => {
    setLocation(path.replace('%id', facilityId.toString()));
  };

  // Chemical dosing systems data
  const dosingPumps = [
    { 
      id: 'coag-pump', 
      name: 'Coagulant Pump A1', 
      chemical: 'Aluminum Sulfate',
      status: 'operational', 
      flow: 12.5, 
      setpoint: 12.0,
      mode: 'auto',
      efficiency: 96.2,
      pressure: 3.8,
      speed: 45
    },
    { 
      id: 'floc-pump', 
      name: 'Flocculant Pump B1', 
      chemical: 'Polyacrylamide',
      status: 'operational', 
      flow: 2.8, 
      setpoint: 3.0,
      mode: 'auto',
      efficiency: 94.1,
      pressure: 2.1,
      speed: 28
    },
    { 
      id: 'chlor-pump', 
      name: 'Chlorine Pump C1', 
      chemical: 'Sodium Hypochlorite',
      status: 'warning', 
      flow: 8.2, 
      setpoint: 8.5,
      mode: 'manual',
      efficiency: 91.7,
      pressure: 4.2,
      speed: 55
    },
    { 
      id: 'lime-pump', 
      name: 'Lime Pump D1', 
      chemical: 'Calcium Hydroxide',
      status: 'operational', 
      flow: 15.1, 
      setpoint: 15.0,
      mode: 'auto',
      efficiency: 97.8,
      pressure: 3.5,
      speed: 42
    }
  ];

  // Chemical storage tanks
  const storageTanks = [
    { 
      id: 'coag-tank', 
      name: 'Coagulant Storage', 
      chemical: 'Aluminum Sulfate',
      level: 78.5, 
      capacity: 5000,
      refillAlert: false,
      temperature: 22.5,
      status: 'normal'
    },
    { 
      id: 'floc-tank', 
      name: 'Flocculant Storage', 
      chemical: 'Polyacrylamide',
      level: 45.2, 
      capacity: 2000,
      refillAlert: true,
      temperature: 24.1,
      status: 'low'
    },
    { 
      id: 'chlor-tank', 
      name: 'Chlorine Storage', 
      chemical: 'Sodium Hypochlorite',
      level: 92.8, 
      capacity: 8000,
      refillAlert: false,
      temperature: 18.7,
      status: 'normal'
    },
    { 
      id: 'lime-tank', 
      name: 'Lime Storage', 
      chemical: 'Calcium Hydroxide',
      level: 67.3, 
      capacity: 3000,
      refillAlert: false,
      temperature: 21.2,
      status: 'normal'
    }
  ];

  // Usage forecast vs actual
  const chemicalUsage = [
    { name: 'Coagulant', forecast: 1250, actual: 1195, variance: -4.4 },
    { name: 'Flocculant', forecast: 85, actual: 92, variance: +8.2 },
    { name: 'Chlorine', forecast: 420, actual: 445, variance: +5.9 },
    { name: 'Lime', forecast: 680, actual: 661, variance: -2.8 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return '#00ff88';
      case 'normal': return '#00ff88';
      case 'warning': return '#ffaa00';
      case 'low': return '#ff8800';
      case 'critical': return '#ff4444';
      case 'offline': return '#ff4444';
      default: return '#00ccff';
    }
  };

  const getLevelColor = (level: number) => {
    if (level < 25) return '#ff4444';
    if (level < 50) return '#ff8800';
    if (level < 75) return '#ffaa00';
    return '#00ff88';
  };

  const totalRefillAlerts = storageTanks.filter(tank => tank.refillAlert).length;

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
      {/* Chemical-themed Background */}
      <div className="absolute inset-0 opacity-25">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,rgba(0,255,170,0.2)_0%,transparent_50%)]"></div>
        <div className="absolute center right-0 w-full h-full bg-[radial-gradient(circle_at_80%_60%,rgba(255,170,255,0.15)_0%,transparent_50%)]"></div>
        <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_80%,rgba(170,255,0,0.15)_0%,transparent_50%)]"></div>
        
        {/* Chemical Molecule Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,170,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,170,0.1) 1px, transparent 1px),
            radial-gradient(circle at 20% 20%, rgba(255,170,255,0.1) 2px, transparent 2px),
            radial-gradient(circle at 60% 40%, rgba(170,255,0,0.1) 1px, transparent 1px),
            radial-gradient(circle at 80% 80%, rgba(255,255,170,0.1) 1.5px, transparent 1.5px)
          `,
          backgroundSize: '60px 60px, 60px 60px, 120px 120px, 80px 80px, 100px 100px'
        }}></div>
        
        {/* Chemical Flow Particles */}
        {[...Array(35)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-60 animate-float"
            style={{
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              backgroundColor: ['#00ffaa', '#ffaaff', '#aaff00', '#ffff80'][Math.floor(Math.random() * 4)],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `chemical-flow ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 h-full p-4">
        {/* Enhanced Chemical Header */}
        <div className="flex items-center justify-between w-full bg-gradient-to-r from-slate-900/90 via-slate-800/70 to-slate-900/90 backdrop-blur-md rounded-lg px-6 py-4 border border-cyan-500/20 shadow-lg shadow-cyan-500/10 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-lime-500 rounded-full shadow-lg shadow-emerald-400/50 animate-pulse"></div>
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-emerald-400/40 to-transparent"></div>
            <div>
              <h1 className="text-lg text-slate-100 font-bold tracking-wider uppercase" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.1em' }}>
                {facility.name} - Chemical Dosing Control
              </h1>
              <div className="text-xs text-emerald-400 font-mono">Real-time Dosing | Tank Monitoring | Usage Analytics</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-emerald-400">AUTO DOSING</span>
            </div>
            <div className="text-slate-400">|</div>
            <div className="text-slate-300">4 Systems Active</div>
            <div className="text-slate-400">|</div>
            <div className={`px-3 py-1 rounded-md border font-semibold ${
              totalRefillAlerts > 0 
                ? 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                : 'bg-green-500/15 text-green-300 border-green-500/30'
            }`}>
              {totalRefillAlerts > 0 ? `${totalRefillAlerts} REFILL ALERTS` : 'INVENTORY OK'}
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
                  item.id === 'chemical' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/20' 
                    : 'bg-slate-800/50 text-slate-400 border border-slate-600/30 hover:bg-emerald-500/10 hover:text-emerald-300'
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

        {/* Dosing Mode Controls */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            {[
              { key: 'auto', label: 'Automatic Dosing' },
              { key: 'manual', label: 'Manual Control' },
              { key: 'emergency', label: 'Emergency Mode' }
            ].map((mode) => (
              <button
                key={mode.key}
                onClick={() => setDosingMode(mode.key as any)}
                className={`px-4 py-2 rounded-lg font-mono text-xs transition-all duration-300 ${
                  dosingMode === mode.key
                    ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30 shadow-lg shadow-lime-500/20' 
                    : 'bg-slate-800/50 text-slate-400 border border-slate-600/30 hover:bg-lime-500/10 hover:text-lime-300'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400 font-mono">
            System Response Time: 2.3s | Last Calibration: 2025-06-24
          </div>
        </div>

        {/* Main Chemical Dashboard */}
        <div className="grid grid-cols-12 grid-rows-6 gap-4 h-[calc(100vh-220px)]">
          
          {/* Real-time Dosing Control */}
          <div className="col-span-8 row-span-4 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-xl border border-emerald-500/20 shadow-lg shadow-emerald-500/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <h3 className="text-emerald-400 font-mono text-sm font-semibold">REAL-TIME DOSING RATES</h3>
              </div>
              <div className="text-xs text-slate-400 font-mono">Target vs Actual • Auto-adjust: Enabled</div>
            </div>

            {/* 3D Dosing Pump Grid */}
            <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
              {dosingPumps.map((pump) => (
                <div
                  key={pump.id}
                  className={`bg-gradient-to-br from-slate-800/80 to-slate-700/80 backdrop-blur-sm rounded-lg border p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                    selectedTank === pump.id 
                      ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/20' 
                      : 'border-slate-600/30 hover:border-emerald-500/30'
                  }`}
                  onClick={() => setSelectedTank(pump.id === selectedTank ? null : pump.id)}
                  style={{
                    boxShadow: selectedTank === pump.id 
                      ? `0 0 20px ${getStatusColor(pump.status)}30, inset 0 1px 0 rgba(255,255,255,0.1)` 
                      : 'inset 0 1px 0 rgba(255,255,255,0.05)'
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-slate-300 font-mono font-semibold">{pump.name}</div>
                    <div 
                      className="px-2 py-1 rounded text-xs font-mono font-bold uppercase"
                      style={{ 
                        backgroundColor: `${getStatusColor(pump.status)}20`,
                        color: getStatusColor(pump.status),
                        border: `1px solid ${getStatusColor(pump.status)}40`
                      }}
                    >
                      {pump.status}
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 mb-3">{pump.chemical}</div>

                  {/* Flow Rate Display */}
                  <div className="text-center mb-4">
                    <div 
                      className="text-3xl font-mono font-bold mb-1"
                      style={{ 
                        color: getStatusColor(pump.status),
                        textShadow: `0 0 10px ${getStatusColor(pump.status)}50`
                      }}
                    >
                      {pump.flow.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">mg/L</div>
                    <div className="text-xs text-slate-500 font-mono">Target: {pump.setpoint.toFixed(1)} mg/L</div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Flow Rate</span>
                      <span>{((pump.flow / pump.setpoint) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min((pump.flow / pump.setpoint) * 100, 100)}%`,
                          backgroundColor: getStatusColor(pump.status),
                          boxShadow: `0 0 8px ${getStatusColor(pump.status)}40`
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <div className="text-slate-400">Mode</div>
                      <div className="text-cyan-400 uppercase">{pump.mode}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Efficiency</div>
                      <div className="text-green-400">{pump.efficiency}%</div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedTank === pump.id && (
                    <div className="mt-3 pt-3 border-t border-slate-600/30 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <div className="text-slate-400">Pressure</div>
                        <div className="text-blue-400">{pump.pressure} bar</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Speed</div>
                        <div className="text-purple-400">{pump.speed} RPM</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tank Levels Panel */}
          <div className="col-span-4 row-span-4 space-y-4">
            {/* Tank Level Overview */}
            <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/40 backdrop-blur-md rounded-xl border border-cyan-500/30 p-4 shadow-lg shadow-cyan-500/10">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <h3 className="text-cyan-400 font-mono text-sm font-semibold">TANK LEVELS</h3>
              </div>
              
              <div className="space-y-4">
                {storageTanks.map((tank) => (
                  <div key={tank.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-600/30">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs text-slate-300 font-mono">{tank.name}</div>
                      <div className="flex items-center space-x-2">
                        {tank.refillAlert && (
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                        )}
                        <div 
                          className="px-2 py-1 rounded text-xs font-mono font-semibold"
                          style={{ 
                            backgroundColor: `${getStatusColor(tank.status)}20`,
                            color: getStatusColor(tank.status),
                            border: `1px solid ${getStatusColor(tank.status)}40`
                          }}
                        >
                          {tank.level.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* 3D Tank Visualization */}
                    <div className="relative h-16 bg-slate-700/50 rounded border border-slate-600/30 overflow-hidden">
                      <div 
                        className="absolute bottom-0 left-0 right-0 rounded transition-all duration-1000"
                        style={{
                          height: `${tank.level}%`,
                          backgroundColor: getLevelColor(tank.level),
                          boxShadow: `0 0 15px ${getLevelColor(tank.level)}30`,
                          background: `linear-gradient(0deg, ${getLevelColor(tank.level)}60, ${getLevelColor(tank.level)})`
                        }}
                      >
                        {/* Liquid Animation */}
                        <div 
                          className="absolute top-0 left-0 right-0 h-1"
                          style={{
                            background: `linear-gradient(90deg, transparent, ${getLevelColor(tank.level)}, transparent)`,
                            animation: 'liquid-wave 3s ease-in-out infinite'
                          }}
                        ></div>
                      </div>
                      
                      {/* Level Text */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-xs font-mono font-bold text-white" style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                          {(tank.capacity * tank.level / 100).toFixed(0)}L
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono">
                      <div>
                        <div className="text-slate-400">Temp</div>
                        <div className="text-cyan-400">{tank.temperature}°C</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Capacity</div>
                        <div className="text-slate-300">{tank.capacity.toLocaleString()}L</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Usage Analytics */}
          <div className="col-span-12 row-span-2 bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-xl border border-purple-500/20 shadow-lg shadow-purple-500/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <h3 className="text-purple-400 font-mono text-sm font-semibold">FORECAST vs ACTUAL USAGE (MONTHLY)</h3>
              </div>
              <div className="text-xs text-slate-400 font-mono">Cost Optimization • Inventory Planning</div>
            </div>

            <div className="grid grid-cols-4 gap-6">
              {chemicalUsage.map((chemical) => (
                <div key={chemical.name} className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                  <div className="text-xs text-purple-400 font-mono mb-3 text-center font-semibold">
                    {chemical.name.toUpperCase()}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs font-mono text-slate-400">Forecast</span>
                      <span className="text-xs font-mono text-green-400">{chemical.forecast}L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-mono text-slate-400">Actual</span>
                      <span className="text-xs font-mono text-white font-semibold">{chemical.actual}L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-mono text-slate-400">Variance</span>
                      <span className={`text-xs font-mono font-semibold ${
                        chemical.variance > 0 ? 'text-orange-400' : 'text-green-400'
                      }`}>
                        {chemical.variance > 0 ? '+' : ''}{chemical.variance.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Usage Trend Visualization */}
                  <div className="mt-3 h-8 bg-slate-700/50 rounded flex items-end justify-between px-1">
                    {[...Array(7)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 bg-purple-400 rounded-t"
                        style={{ 
                          height: `${40 + Math.sin(i * 0.8) * 20 + Math.random() * 10}%`,
                          opacity: 0.6 + (i / 7) * 0.4
                        }}
                      />
                    ))}
                  </div>
                  
                  <div className="mt-2 text-center">
                    <div className="text-xs text-slate-500 font-mono">7-day trend</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Chemical-themed Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/8 rounded-full opacity-40 blur-3xl animate-float" />
        <div className="absolute center right-0 w-80 h-80 bg-lime-500/8 rounded-full opacity-40 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-cyan-500/8 rounded-full opacity-40 blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>
    </div>
  );
}