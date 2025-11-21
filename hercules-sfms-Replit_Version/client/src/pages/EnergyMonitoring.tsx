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

export default function EnergyMonitoring() {
  const [, params] = useRoute("/facility/:id/energy");
  const [, setLocation] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [energyMode, setEnergyMode] = useState<'realtime' | 'trends' | 'forecasting'>('realtime');
  
  const facilityId = params?.id ? parseInt(params.id) : 1;
  const facility = mockFacilities.find(f => f.id === facilityId) || mockFacilities[0];

  const handleNavigation = (path: string) => {
    setLocation(path.replace('%id', facilityId.toString()));
  };

  // Comprehensive energy data with multiple systems
  const energyConsumers = [
    { id: 'main-pumps', name: 'Main Water Pumps', power: 185.5, percentage: 28.2, status: 'optimal', efficiency: 94.2, voltage: 415, current: 285, pf: 0.92 },
    { id: 'aeration', name: 'Aeration System', power: 142.8, percentage: 21.7, status: 'optimal', efficiency: 91.8, voltage: 415, current: 221, pf: 0.89 },
    { id: 'treatment', name: 'Treatment Equipment', power: 98.2, percentage: 14.9, status: 'good', efficiency: 88.5, voltage: 415, current: 152, pf: 0.86 },
    { id: 'lighting', name: 'Facility Lighting', power: 45.6, percentage: 6.9, status: 'optimal', efficiency: 96.1, voltage: 230, current: 198, pf: 0.95 },
    { id: 'hvac', name: 'HVAC Systems', power: 67.3, percentage: 10.2, status: 'good', efficiency: 85.7, voltage: 415, current: 104, pf: 0.88 },
    { id: 'controls', name: 'Control Systems', power: 23.1, percentage: 3.5, status: 'optimal', efficiency: 92.3, voltage: 230, current: 100, pf: 0.93 },
    { id: 'chemical', name: 'Chemical Dosing', power: 34.7, percentage: 5.3, status: 'optimal', efficiency: 89.9, voltage: 415, current: 54, pf: 0.91 },
    { id: 'backup', name: 'Backup Systems', power: 15.2, percentage: 2.3, status: 'standby', efficiency: 87.4, voltage: 415, current: 24, pf: 0.85 },
    { id: 'utilities', name: 'General Utilities', power: 45.8, percentage: 7.0, status: 'good', efficiency: 83.2, voltage: 230, current: 199, pf: 0.87 }
  ];

  const totalPower = energyConsumers.reduce((sum, consumer) => sum + consumer.power, 0);

  // Real-time electrical parameters
  const electricalMetrics = {
    totalDemand: totalPower,
    peakDemand: 742.8,
    avgDemand: 598.3,
    demandFactor: 0.89,
    loadFactor: 0.82,
    powerFactor: 0.91,
    frequency: 49.98,
    voltageL1: 414.2,
    voltageL2: 415.8,
    voltageL3: 413.7,
    totalHarmonics: 3.2,
    kwhToday: 14567,
    kwhMonth: 456789,
    costToday: 4285.50,
    costMonth: 134567.80,
    co2Today: 8.9,
    co2Month: 278.4,
    renewablePercent: 18.5
  };

  // Energy efficiency metrics for gauges
  const efficiencyMetrics = [
    { label: 'Overall Efficiency', value: 91.2, target: 92.0, unit: '%', color: '#00ff88' },
    { label: 'Power Factor', value: 0.91, target: 0.95, unit: '', color: '#00ccff' },
    { label: 'Load Factor', value: 0.82, target: 0.85, unit: '', color: '#ffaa00' },
    { label: 'Demand Factor', value: 0.89, target: 0.90, unit: '', color: '#ff8800' },
    { label: 'THD Voltage', value: 3.2, target: 5.0, unit: '%', color: '#8800ff', inverted: true },
    { label: 'Frequency Stability', value: 99.96, target: 99.95, unit: '%', color: '#00ff88' }
  ];

  // Power quality data for charts
  const powerQualityData = [
    { time: '08:00', voltage: 414.5, current: 850, frequency: 49.99, pf: 0.91, thd: 3.1 },
    { time: '08:15', voltage: 415.2, current: 865, frequency: 49.98, pf: 0.90, thd: 3.3 },
    { time: '08:30', voltage: 413.8, current: 842, frequency: 50.01, pf: 0.92, thd: 3.0 },
    { time: '08:45', voltage: 414.9, current: 878, frequency: 49.97, pf: 0.89, thd: 3.4 },
    { time: '09:00', voltage: 415.1, current: 856, frequency: 50.00, pf: 0.91, thd: 3.2 }
  ];

  // Energy forecasting data
  const forecastData = [
    { period: 'Next Hour', predicted: 668, actual: null, confidence: 94.2 },
    { period: 'Next 4 Hours', predicted: 2847, actual: null, confidence: 89.7 },
    { period: 'Next Day', predicted: 15890, actual: null, confidence: 85.1 },
    { period: 'Next Week', predicted: 98450, actual: null, confidence: 78.9 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return '#00ff88';
      case 'good': return '#00ccff';
      case 'warning': return '#ffaa00';
      case 'critical': return '#ff4444';
      case 'standby': return '#8800ff';
      default: return '#ffffff';
    }
  };

  const getEfficiencyColor = (value: number, target: number, inverted = false) => {
    const ratio = inverted ? target / value : value / target;
    if (ratio >= 0.98) return '#00ff88';
    if (ratio >= 0.95) return '#00ccff';
    if (ratio >= 0.90) return '#ffaa00';
    return '#ff8800';
  };

  // Circular gauge component
  const CircularGauge = ({ value, max, label, unit, color, size = 120 }: {
    value: number; max: number; label: string; unit: string; color: string; size?: number;
  }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const circumference = 2 * Math.PI * 45;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke={color}
              strokeWidth="8"
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000"
              style={{
                filter: `drop-shadow(0 0 8px ${color}60)`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-lg font-mono font-bold" style={{ color }}>
              {typeof value === 'number' ? value.toFixed(1) : value}
            </div>
            <div className="text-xs text-slate-400 font-mono">{unit}</div>
          </div>
        </div>
        <div className="text-xs text-slate-300 font-mono text-center mt-2">{label}</div>
      </div>
    );
  };

  // Linear gauge component
  const LinearGauge = ({ value, max, label, unit, color }: {
    value: number; max: number; label: string; unit: string; color: string;
  }) => {
    const percentage = Math.min((value / max) * 100, 100);
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400 font-mono">{label}</span>
          <span className="text-sm font-mono font-bold" style={{ color }}>
            {value.toFixed(1)} {unit}
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 relative overflow-hidden">
          <div 
            className="h-3 rounded-full transition-all duration-1000 relative"
            style={{
              width: `${percentage}%`,
              background: `linear-gradient(90deg, ${color}60, ${color}, ${color}60)`,
              boxShadow: `0 0 10px ${color}40`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
      {/* Enhanced Energy Background */}
      <div className="absolute inset-0 opacity-25">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,170,0,0.25)_0%,transparent_50%)]"></div>
        <div className="absolute center right-0 w-full h-full bg-[radial-gradient(circle_at_80%_50%,rgba(255,255,0,0.18)_0%,transparent_50%)]"></div>
        <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_80%,rgba(255,140,0,0.18)_0%,transparent_50%)]"></div>
        
        {/* Advanced Electric Grid Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(255,170,0,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,170,0,0.12) 1px, transparent 1px),
            radial-gradient(circle at 25% 25%, rgba(255,255,0,0.12) 3px, transparent 3px),
            radial-gradient(circle at 75% 75%, rgba(255,140,0,0.12) 2px, transparent 2px),
            repeating-linear-gradient(45deg, transparent, transparent 25px, rgba(255,170,0,0.05) 25px, rgba(255,170,0,0.05) 26px)
          `,
          backgroundSize: '40px 40px, 40px 40px, 80px 80px, 120px 120px, 50px 50px'
        }}></div>
        
        {/* Enhanced Energy Flow Particles */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-60 animate-float"
            style={{
              width: `${1 + Math.random() * 3}px`,
              height: `${1 + Math.random() * 3}px`,
              backgroundColor: ['#ffaa00', '#ffff00', '#ff8c00', '#ffd700', '#ffcc00'][Math.floor(Math.random() * 5)],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `energy-flow ${4 + Math.random() * 12}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 h-full p-3">
        {/* Enhanced Energy Header */}
        <div className="flex items-center justify-between w-full bg-gradient-to-r from-slate-900/90 via-slate-800/70 to-slate-900/90 backdrop-blur-md rounded-lg px-6 py-4 border border-cyan-500/20 shadow-lg shadow-cyan-500/10 mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full shadow-lg shadow-amber-400/50 animate-pulse"></div>
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-amber-400/40 to-transparent"></div>
            <div>
              <h1 className="text-lg text-slate-100 font-bold tracking-wider uppercase" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.1em' }}>
                {facility.name} - Comprehensive Energy Analytics
              </h1>
              <div className="text-xs text-amber-400 font-mono">Real-time Monitoring | Power Quality | Efficiency Optimization</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
              <span className="text-amber-400">GRID CONNECTED</span>
            </div>
            <div className="text-slate-400">|</div>
            <div className="text-slate-300">{totalPower.toFixed(1)} kW DEMAND</div>
            <div className="text-slate-400">|</div>
            <div className="text-slate-300">PF: {electricalMetrics.powerFactor}</div>
            <div className="text-slate-400">|</div>
            <div className="px-3 py-1 bg-green-500/15 rounded-md text-green-300 border border-green-500/30 font-semibold">
              OPTIMAL EFFICIENCY
            </div>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex space-x-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`px-3 py-2 rounded-lg font-mono text-xs transition-all duration-300 ${
                  item.id === 'energy' 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/20' 
                    : 'bg-slate-800/50 text-slate-400 border border-slate-600/30 hover:bg-amber-500/10 hover:text-amber-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex space-x-2">
              {[
                { key: 'realtime', label: 'Real-time' },
                { key: 'trends', label: 'Trends' },
                { key: 'forecasting', label: 'Forecasting' }
              ].map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => setEnergyMode(mode.key as any)}
                  className={`px-3 py-1 rounded font-mono text-xs transition-all duration-300 ${
                    energyMode === mode.key
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                      : 'bg-slate-800/50 text-slate-400 border border-slate-600/30 hover:bg-yellow-500/10'
                  }`}
                >
                  {mode.label}
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
        </div>

        {/* Comprehensive Energy Dashboard - Dense Layout */}
        <div className="grid grid-cols-12 grid-rows-12 gap-2 h-[calc(100vh-180px)]">
          
          {/* Main Power Overview */}
          <div className="col-span-8 row-span-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-xl border border-amber-500/20 shadow-lg shadow-amber-500/10 p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                <h3 className="text-amber-400 font-mono text-sm font-semibold">REAL-TIME POWER DISTRIBUTION</h3>
              </div>
              <div className="text-xs text-slate-400 font-mono">Total: {totalPower.toFixed(1)} kW • Peak: {electricalMetrics.peakDemand} kW</div>
            </div>

            <div className="grid grid-cols-3 grid-rows-3 gap-4 h-full">
              {/* Central Power Hub - Enhanced 3D Design */}
              <div className="col-start-2 row-start-2 flex items-center justify-center">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-500/30 to-yellow-500/30 backdrop-blur-md border-2 border-amber-400/50 flex items-center justify-center relative overflow-hidden">
                    {/* Holographic Ring Animation */}
                    <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 animate-spin" style={{ animationDuration: '8s' }}></div>
                    <div className="absolute inset-2 rounded-full border border-yellow-400/20 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}></div>
                    
                    {/* Scanning Line Effect */}
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse"></div>
                    </div>
                    
                    {/* Central Content */}
                    <div className="text-center relative z-10">
                      <div className="text-2xl font-mono font-bold text-amber-400 mb-1" style={{ textShadow: '0 0 20px #ffaa0080' }}>
                        {totalPower.toFixed(0)}
                      </div>
                      <div className="text-xs text-slate-300 font-mono font-semibold">TOTAL kW</div>
                      <div className="text-xs text-amber-400/80 font-mono">DEMAND</div>
                    </div>
                    
                    {/* Holographic Glow Effect */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/10 via-transparent to-yellow-400/10 animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* 3D Holographic Gauge Nodes */}
              {energyConsumers.slice(0, 8).map((consumer, index) => {
                const positions = [
                  { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 3, row: 1 },
                  { col: 3, row: 2 }, { col: 3, row: 3 }, { col: 2, row: 3 },
                  { col: 1, row: 3 }, { col: 1, row: 2 }
                ];
                const pos = positions[index];
                const percentage = (consumer.power / totalPower) * 100;
                
                return (
                  <div
                    key={consumer.id}
                    className={`col-start-${pos.col} row-start-${pos.row} flex flex-col items-center justify-center`}
                  >
                    {/* 3D Holographic Gauge */}
                    <div className="relative w-20 h-20 cursor-pointer hover:scale-110 transition-all duration-300 group">
                      {/* Outer Holographic Ring */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md border border-slate-600/40 shadow-lg"></div>
                      
                      {/* Progress Ring */}
                      <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="4"
                          fill="none"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          stroke={getStatusColor(consumer.status)}
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={`${2.64 * 42}`}
                          strokeDashoffset={`${2.64 * 42 * (1 - percentage / 100)}`}
                          className="transition-all duration-1000"
                          style={{
                            filter: `drop-shadow(0 0 8px ${getStatusColor(consumer.status)}60)`,
                          }}
                        />
                      </svg>
                      
                      {/* Holographic Center */}
                      <div className="absolute inset-3 rounded-full bg-gradient-to-br from-slate-700/60 to-slate-800/60 backdrop-blur-sm border border-slate-500/30 flex flex-col items-center justify-center">
                        <div 
                          className="text-sm font-mono font-bold leading-none"
                          style={{ 
                            color: getStatusColor(consumer.status),
                            textShadow: `0 0 8px ${getStatusColor(consumer.status)}60`
                          }}
                        >
                          {consumer.power.toFixed(0)}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">kW</div>
                      </div>
                      
                      {/* Status Indicator */}
                      <div 
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
                        style={{ 
                          backgroundColor: getStatusColor(consumer.status),
                          boxShadow: `0 0 8px ${getStatusColor(consumer.status)}80`
                        }}
                      ></div>
                      
                      {/* Holographic Scanning Effect */}
                      <div className="absolute inset-0 rounded-full overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div 
                          className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-current to-transparent animate-pulse"
                          style={{ color: getStatusColor(consumer.status) }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Label */}
                    <div className="text-xs text-slate-300 font-mono text-center leading-tight mt-2 max-w-16">
                      {consumer.name.split(' ')[0]}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {consumer.percentage.toFixed(1)}%
                    </div>

                    {/* Enhanced Connection Line to Center */}
                    <div
                      className="absolute w-0.5 bg-gradient-to-r from-amber-400/40 via-amber-400/80 to-transparent origin-center"
                      style={{
                        height: '80px',
                        transform: `rotate(${45 * index}deg)`,
                        transformOrigin: 'bottom center',
                        animation: 'power-pulse 3s infinite',
                        animationDelay: `${index * 0.2}s`
                      }}
                    />
                    
                    {/* Energy Flow Particles */}
                    <div
                      className="absolute w-1 h-1 bg-amber-400 rounded-full opacity-80"
                      style={{
                        animation: `energy-particle-${index} 4s linear infinite`,
                        animationDelay: `${index * 0.5}s`
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Efficiency Gauges */}
          <div className="col-span-4 row-span-6 space-y-2">
            {efficiencyMetrics.map((metric, index) => (
              <div key={index} className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 backdrop-blur-md rounded-lg border border-slate-600/30 p-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <LinearGauge
                      value={metric.value}
                      max={metric.inverted ? metric.target * 2 : metric.target * 1.1}
                      label={metric.label}
                      unit={metric.unit}
                      color={getEfficiencyColor(metric.value, metric.target, metric.inverted)}
                    />
                  </div>
                  <div className="ml-3">
                    <CircularGauge
                      value={metric.value}
                      max={metric.inverted ? metric.target * 2 : metric.target * 1.1}
                      label=""
                      unit={metric.unit}
                      color={getEfficiencyColor(metric.value, metric.target, metric.inverted)}
                      size={60}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Electrical Parameters */}
          <div className="col-span-6 row-span-3 bg-gradient-to-br from-blue-900/40 to-blue-800/40 backdrop-blur-md rounded-xl border border-blue-500/30 p-3 shadow-lg shadow-blue-500/10">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <h3 className="text-blue-400 font-mono text-sm font-semibold">ELECTRICAL PARAMETERS</h3>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Voltage L1', value: electricalMetrics.voltageL1, unit: 'V', color: '#00ccff' },
                { label: 'Voltage L2', value: electricalMetrics.voltageL2, unit: 'V', color: '#00ccff' },
                { label: 'Voltage L3', value: electricalMetrics.voltageL3, unit: 'V', color: '#00ccff' },
                { label: 'Frequency', value: electricalMetrics.frequency, unit: 'Hz', color: '#00ff88' },
                { label: 'Total Current', value: energyConsumers.reduce((sum, c) => sum + c.current, 0), unit: 'A', color: '#ffaa00' },
                { label: 'Power Factor', value: electricalMetrics.powerFactor, unit: '', color: '#ff8800' },
                { label: 'THD', value: electricalMetrics.totalHarmonics, unit: '%', color: '#8800ff' },
                { label: 'Load Factor', value: electricalMetrics.loadFactor, unit: '', color: '#00ffaa' }
              ].map((param, index) => (
                <div key={index} className="bg-slate-800/50 rounded-lg p-2 border border-slate-600/30">
                  <div className="text-xs text-slate-400 font-mono mb-1">{param.label}</div>
                  <div 
                    className="text-lg font-mono font-bold mb-1"
                    style={{ 
                      color: param.color,
                      textShadow: `0 0 8px ${param.color}50`
                    }}
                  >
                    {typeof param.value === 'number' ? param.value.toFixed(param.unit === 'Hz' ? 2 : 1) : param.value}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">{param.unit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost & Environmental */}
          <div className="col-span-3 row-span-3 bg-gradient-to-br from-green-900/40 to-green-800/40 backdrop-blur-md rounded-xl border border-green-500/30 p-3 shadow-lg shadow-green-500/10">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <h3 className="text-green-400 font-mono text-sm font-semibold">COST & CARBON</h3>
            </div>
            
            <div className="space-y-3">
              <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-600/30">
                <div className="text-xs text-slate-400 font-mono">Today's Cost</div>
                <div className="text-xl font-mono font-bold text-green-400">${electricalMetrics.costToday.toFixed(2)}</div>
                <div className="text-xs text-slate-500 font-mono">{electricalMetrics.kwhToday.toLocaleString()} kWh</div>
              </div>
              
              <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-600/30">
                <div className="text-xs text-slate-400 font-mono">Monthly Est.</div>
                <div className="text-lg font-mono font-bold text-green-400">${electricalMetrics.costMonth.toLocaleString()}</div>
                <div className="text-xs text-slate-500 font-mono">{electricalMetrics.kwhMonth.toLocaleString()} kWh</div>
              </div>
              
              <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-600/30">
                <div className="text-xs text-slate-400 font-mono">CO₂ Emissions</div>
                <div className="text-lg font-mono font-bold text-orange-400">{electricalMetrics.co2Today.toFixed(1)} t</div>
                <div className="text-xs text-slate-500 font-mono">Today</div>
              </div>
            </div>
          </div>

          {/* Renewable Energy */}
          <div className="col-span-3 row-span-3 bg-gradient-to-br from-emerald-900/40 to-emerald-800/40 backdrop-blur-md rounded-xl border border-emerald-500/30 p-3 shadow-lg shadow-emerald-500/10">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <h3 className="text-emerald-400 font-mono text-sm font-semibold">RENEWABLE ENERGY</h3>
            </div>
            
            <div className="flex justify-center mb-3">
              <CircularGauge
                value={electricalMetrics.renewablePercent}
                max={100}
                label="Solar Contribution"
                unit="%"
                color="#10dc60"
                size={80}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Generation:</span>
                <span className="text-emerald-400">127.8 kW</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Savings:</span>
                <span className="text-emerald-400">$847/month</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">CO₂ Avoided:</span>
                <span className="text-emerald-400">2.1 t/month</span>
              </div>
            </div>
          </div>

          {/* Power Quality Trends */}
          <div className="col-span-12 row-span-3 bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-xl border border-purple-500/20 shadow-lg shadow-purple-500/10 p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <h3 className="text-purple-400 font-mono text-sm font-semibold">POWER QUALITY TRENDS & FORECASTING</h3>
              </div>
              <div className="text-xs text-slate-400 font-mono">Last 2 hours • Next 24h prediction</div>
            </div>

            <div className="grid grid-cols-8 gap-4">
              {/* Historical Data Visualization */}
              <div className="col-span-5">
                <div className="grid grid-cols-5 gap-2 h-32">
                  {powerQualityData.map((data, index) => (
                    <div key={index} className="bg-slate-800/50 rounded border border-slate-600/30 p-2">
                      <div className="text-xs text-slate-400 font-mono mb-2">{data.time}</div>
                      <div className="space-y-1">
                        <div className="text-xs font-mono">
                          <span className="text-blue-400">{data.voltage}V</span>
                        </div>
                        <div className="text-xs font-mono">
                          <span className="text-amber-400">{data.current}A</span>
                        </div>
                        <div className="text-xs font-mono">
                          <span className="text-green-400">{data.frequency}Hz</span>
                        </div>
                        <div className="text-xs font-mono">
                          <span className="text-purple-400">PF:{data.pf}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Forecasting Panel */}
              <div className="col-span-3">
                <div className="space-y-2">
                  {forecastData.map((forecast, index) => (
                    <div key={index} className="bg-slate-800/50 rounded border border-slate-600/30 p-2">
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-xs text-slate-400 font-mono">{forecast.period}</div>
                        <div className="text-xs text-cyan-400 font-mono">{forecast.confidence}%</div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-mono text-white font-bold">{forecast.predicted.toLocaleString()} kW</div>
                        <div className="w-8 h-1 bg-slate-700 rounded">
                          <div 
                            className="h-1 bg-cyan-400 rounded transition-all duration-1000"
                            style={{ width: `${forecast.confidence}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Enhanced Energy Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full opacity-50 blur-3xl animate-float" />
        <div className="absolute center right-0 w-80 h-80 bg-yellow-500/10 rounded-full opacity-50 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-orange-500/10 rounded-full opacity-50 blur-3xl animate-float" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-green-500/8 rounded-full opacity-40 blur-3xl animate-float" style={{ animationDelay: '6s' }} />
      </div>
    </div>
  );
}