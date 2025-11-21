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

export default function WaterQuality() {
  const [, params] = useRoute("/facility/:id/quality");
  const [, setLocation] = useLocation();
  const [selectedParameter, setSelectedParameter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'realtime' | 'trends' | 'compliance'>('realtime');
  
  const facilityId = params?.id ? parseInt(params.id) : 1;
  const facility = mockFacilities.find(f => f.id === facilityId) || mockFacilities[0];

  const handleNavigation = (path: string) => {
    setLocation(path.replace('%id', facilityId.toString()));
  };

  // Real-time water quality parameters
  const qualityParams = [
    { id: 'ph', name: 'pH Level', value: 7.2, target: 7.0, unit: '', status: 'optimal', trend: 'stable' },
    { id: 'turbidity', name: 'Turbidity', value: 0.15, target: 0.20, unit: 'NTU', status: 'optimal', trend: 'decreasing' },
    { id: 'chlorine', name: 'Free Chlorine', value: 0.8, target: 1.0, unit: 'mg/L', status: 'optimal', trend: 'stable' },
    { id: 'tds', name: 'Total Dissolved Solids', value: 245, target: 300, unit: 'mg/L', status: 'optimal', trend: 'stable' },
    { id: 'alkalinity', name: 'Alkalinity', value: 125, target: 150, unit: 'mg/L', status: 'good', trend: 'increasing' },
    { id: 'hardness', name: 'Total Hardness', value: 180, target: 200, unit: 'mg/L', status: 'good', trend: 'stable' },
    { id: 'iron', name: 'Iron', value: 0.05, target: 0.30, unit: 'mg/L', status: 'optimal', trend: 'stable' },
    { id: 'fluoride', name: 'Fluoride', value: 0.7, target: 1.0, unit: 'mg/L', status: 'optimal', trend: 'stable' }
  ];

  const complianceData = [
    { standard: 'WHO Guidelines', compliance: 98.5, violations: 0 },
    { standard: 'National Standards', compliance: 99.2, violations: 0 },
    { standard: 'Local Regulations', compliance: 97.8, violations: 1 },
    { standard: 'Industry Best Practice', compliance: 96.4, violations: 2 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return '#00ff88';
      case 'good': return '#00ccff';
      case 'warning': return '#ffaa00';
      case 'critical': return '#ff4444';
      default: return '#ffffff';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return '↗';
      case 'decreasing': return '↘';
      case 'stable': return '→';
      default: return '~';
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
      {/* Advanced Holographic Background */}
      <div className="absolute inset-0 opacity-25">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,rgba(0,255,255,0.2)_0%,transparent_60%)]"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_70%,rgba(0,255,170,0.2)_0%,transparent_60%)]"></div>
        <div className="absolute center w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(170,0,255,0.1)_0%,transparent_70%)]"></div>
        
        {/* Dynamic Matrix Grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,255,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.15) 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, rgba(0,255,170,0.1) 2px, transparent 2px)
          `,
          backgroundSize: '40px 40px, 40px 40px, 80px 80px'
        }}></div>
        
        {/* Floating Quality Particles */}
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-60 animate-float"
            style={{
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              backgroundColor: ['#00ffff', '#00ff88', '#0080ff', '#aa00ff'][Math.floor(Math.random() * 4)],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `data-flow ${3 + Math.random() * 8}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 h-full p-4">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between w-full bg-gradient-to-r from-slate-900/90 via-slate-800/70 to-slate-900/90 backdrop-blur-md rounded-lg px-6 py-4 border border-cyan-500/20 shadow-lg shadow-cyan-500/10 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-full shadow-lg shadow-emerald-400/50 animate-pulse"></div>
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-emerald-400/40 to-transparent"></div>
            <div>
              <h1 className="text-lg text-slate-100 font-bold tracking-wider uppercase" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.1em' }}>
                {facility.name} - Water Quality Analysis
              </h1>
              <div className="text-xs text-emerald-400 font-mono">Real-time Monitoring | Regulatory Compliance | Quality Assurance</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-emerald-400">QUALITY OPTIMAL</span>
            </div>
            <div className="text-slate-400">|</div>
            <div className="text-slate-300">Compliance: 98.5%</div>
            <div className="text-slate-400">|</div>
            <div className="px-3 py-1 bg-emerald-500/15 rounded-md text-emerald-300 border border-emerald-500/30 font-semibold">
              0 VIOLATIONS
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
                  item.id === 'quality' 
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

        {/* View Mode Selector */}
        <div className="flex space-x-2 mb-4">
          {[
            { key: 'realtime', label: 'Real-time Data' },
            { key: 'trends', label: 'Historical Trends' },
            { key: 'compliance', label: 'Compliance Report' }
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

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-12 grid-rows-6 gap-4 h-[calc(100vh-220px)]">
          
          {/* Real-time Parameter Grid */}
          <div className="col-span-8 row-span-4 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-xl border border-emerald-500/20 shadow-lg shadow-emerald-500/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <h3 className="text-emerald-400 font-mono text-sm font-semibold">REAL-TIME WATER QUALITY PARAMETERS</h3>
              </div>
              <div className="text-xs text-slate-400 font-mono">Auto-refresh: 30s</div>
            </div>

            {/* 3D Parameter Grid */}
            <div className="grid grid-cols-4 grid-rows-2 gap-4 h-full">
              {qualityParams.map((param) => (
                <div
                  key={param.id}
                  className={`bg-gradient-to-br from-slate-800/80 to-slate-700/80 backdrop-blur-sm rounded-lg border p-4 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                    selectedParameter === param.id 
                      ? 'border-emerald-500/50 shadow-emerald-500/20' 
                      : 'border-slate-600/30 hover:border-emerald-500/30'
                  }`}
                  onClick={() => setSelectedParameter(param.id === selectedParameter ? null : param.id)}
                  style={{
                    boxShadow: selectedParameter === param.id 
                      ? `0 0 20px ${getStatusColor(param.status)}30, inset 0 1px 0 rgba(255,255,255,0.1)` 
                      : 'inset 0 1px 0 rgba(255,255,255,0.05)'
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-slate-400 font-mono">{param.name}</div>
                    <div className="text-xs" style={{ color: getStatusColor(param.status) }}>
                      {getTrendIcon(param.trend)}
                    </div>
                  </div>
                  
                  {/* 3D Value Display */}
                  <div className="text-center">
                    <div 
                      className="text-2xl font-mono font-bold mb-1"
                      style={{ 
                        color: getStatusColor(param.status),
                        textShadow: `0 0 10px ${getStatusColor(param.status)}50`
                      }}
                    >
                      {param.value}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">{param.unit}</div>
                    <div className="text-xs text-slate-500 font-mono">Target: {param.target} {param.unit}</div>
                  </div>

                  {/* Status Indicator */}
                  <div className="mt-3 flex items-center justify-center">
                    <div 
                      className="w-full h-1 rounded-full"
                      style={{ 
                        background: `linear-gradient(90deg, ${getStatusColor(param.status)}30, ${getStatusColor(param.status)}, ${getStatusColor(param.status)}30)`
                      }}
                    ></div>
                  </div>

                  {/* Expanded Details */}
                  {selectedParameter === param.id && (
                    <div className="mt-3 pt-3 border-t border-slate-600/30 text-xs font-mono space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status:</span>
                        <span style={{ color: getStatusColor(param.status) }} className="capitalize font-semibold">
                          {param.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Trend:</span>
                        <span className="text-slate-300 capitalize">{param.trend}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Variance:</span>
                        <span className="text-cyan-400">
                          {((param.value / param.target - 1) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quality Score & Compliance */}
          <div className="col-span-4 row-span-4 space-y-4">
            {/* Overall Quality Score */}
            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/40 backdrop-blur-md rounded-xl border border-emerald-500/30 p-4 shadow-lg shadow-emerald-500/10">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <h3 className="text-emerald-400 font-mono text-sm font-semibold">OVERALL QUALITY INDEX</h3>
              </div>
              
              {/* 3D Circular Quality Meter */}
              <div className="flex justify-center mb-4">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-slate-700"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#00ff88"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2.51 * 40 * 0.965} ${2.51 * 40}`}
                      className="transition-all duration-1000"
                      style={{
                        filter: 'drop-shadow(0 0 10px #00ff8850)',
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-mono font-bold text-emerald-400" style={{ textShadow: '0 0 10px #00ff8850' }}>
                        96.5
                      </div>
                      <div className="text-xs text-slate-400 font-mono">EXCELLENT</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Physical Parameters:</span>
                  <span className="text-emerald-400">98.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Chemical Parameters:</span>
                  <span className="text-emerald-400">96.1%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Biological Parameters:</span>
                  <span className="text-emerald-400">95.8%</span>
                </div>
              </div>
            </div>

            {/* Compliance Dashboard */}
            <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/40 backdrop-blur-md rounded-xl border border-cyan-500/30 p-4 shadow-lg shadow-cyan-500/10">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <h3 className="text-cyan-400 font-mono text-sm font-semibold">REGULATORY COMPLIANCE</h3>
              </div>
              
              <div className="space-y-3">
                {complianceData.map((item, index) => (
                  <div key={index} className="bg-slate-800/50 rounded-lg p-3 border border-slate-600/30">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs text-slate-300 font-mono">{item.standard}</div>
                      <div className="text-xs text-cyan-400 font-mono font-semibold">{item.compliance}%</div>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-1000"
                        style={{
                          width: `${item.compliance}%`,
                          background: `linear-gradient(90deg, #00ffff30, #00ffff, #00ffff30)`,
                          boxShadow: '0 0 10px #00ffff30'
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 font-mono mt-1">
                      <span>Violations: {item.violations}</span>
                      <span>Status: {item.violations === 0 ? '✓ PASS' : '⚠ REVIEW'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Treatment Efficiency & Alerts */}
          <div className="col-span-12 row-span-2 bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-xl border border-purple-500/20 shadow-lg shadow-purple-500/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <h3 className="text-purple-400 font-mono text-sm font-semibold">TREATMENT PROCESS EFFICIENCY</h3>
              </div>
              <div className="text-xs text-slate-400 font-mono">Last updated: {new Date().toLocaleTimeString()}</div>
            </div>

            <div className="grid grid-cols-6 gap-6">
              {[
                { process: 'Coagulation', efficiency: 97.8, status: 'optimal' },
                { process: 'Sedimentation', efficiency: 96.2, status: 'optimal' },
                { process: 'Filtration', efficiency: 98.5, status: 'optimal' },
                { process: 'Disinfection', efficiency: 99.1, status: 'optimal' },
                { process: 'pH Adjustment', efficiency: 94.7, status: 'good' },
                { process: 'Final Polish', efficiency: 96.8, status: 'optimal' }
              ].map((process, index) => (
                <div key={index} className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30 text-center">
                  <div className="text-xs text-slate-400 font-mono mb-2">{process.process}</div>
                  <div 
                    className="text-xl font-mono font-bold mb-2"
                    style={{ 
                      color: getStatusColor(process.status),
                      textShadow: `0 0 8px ${getStatusColor(process.status)}50`
                    }}
                  >
                    {process.efficiency}%
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-1000"
                      style={{
                        width: `${process.efficiency}%`,
                        background: `linear-gradient(90deg, ${getStatusColor(process.status)}30, ${getStatusColor(process.status)}, ${getStatusColor(process.status)}30)`,
                        boxShadow: `0 0 8px ${getStatusColor(process.status)}30`
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1 capitalize">{process.status}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Advanced Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/8 rounded-full opacity-40 blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-cyan-500/8 rounded-full opacity-40 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/8 rounded-full opacity-40 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>
    </div>
  );
}