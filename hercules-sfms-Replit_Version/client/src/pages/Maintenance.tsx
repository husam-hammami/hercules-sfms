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

export default function Maintenance() {
  const [, params] = useRoute("/facility/:id/maintenance");
  const [, setLocation] = useLocation();
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [maintenanceView, setMaintenanceView] = useState<'alerts' | 'schedule' | 'analytics'>('alerts');
  
  const facilityId = params?.id ? parseInt(params.id) : 1;
  const facility = mockFacilities.find(f => f.id === facilityId) || mockFacilities[0];

  const handleNavigation = (path: string) => {
    setLocation(path.replace('%id', facilityId.toString()));
  };

  // Active alarms by severity
  const activeAlarms = [
    { id: 'ALM-001', equipment: 'Intake Pump A1', severity: 'critical', message: 'Vibration levels exceed threshold', timestamp: '2025-06-26T08:15:23Z', duration: '2h 15m' },
    { id: 'ALM-002', equipment: 'Coagulation Tank', severity: 'high', message: 'Chemical dosing system variance', timestamp: '2025-06-26T06:30:15Z', duration: '4h 45m' },
    { id: 'ALM-003', equipment: 'Filter Bank #2', severity: 'medium', message: 'Pressure differential high', timestamp: '2025-06-26T05:22:41Z', duration: '6h 12m' },
    { id: 'ALM-004', equipment: 'Distribution Pump B2', severity: 'medium', message: 'Temperature sensor drift', timestamp: '2025-06-26T04:18:33Z', duration: '7h 28m' },
    { id: 'ALM-005', equipment: 'Control Panel #3', severity: 'low', message: 'Communication timeout', timestamp: '2025-06-26T02:45:12Z', duration: '9h 55m' },
    { id: 'ALM-006', equipment: 'Chlorine Analyzer', severity: 'low', message: 'Calibration due', timestamp: '2025-06-26T01:12:08Z', duration: '11h 23m' }
  ];

  // MTBF Analysis data
  const mtbfData = [
    { equipment: 'Water Pumps', mtbf: 2847, trend: 'improving', reliability: 94.2, lastFailure: '2025-05-15' },
    { equipment: 'Filter Systems', mtbf: 1856, trend: 'stable', reliability: 91.8, lastFailure: '2025-04-22' },
    { equipment: 'Chemical Dosing', mtbf: 3241, trend: 'improving', reliability: 96.1, lastFailure: '2025-03-08' },
    { equipment: 'Control Systems', mtbf: 4582, trend: 'stable', reliability: 98.5, lastFailure: '2025-02-14' },
    { equipment: 'Sensors/Analyzers', mtbf: 1245, trend: 'declining', reliability: 87.3, lastFailure: '2025-06-18' },
    { equipment: 'Mechanical Equipment', mtbf: 2156, trend: 'stable', reliability: 92.7, lastFailure: '2025-04-05' }
  ];

  // Maintenance schedule
  const maintenanceSchedule = [
    { id: 'MAINT-001', equipment: 'Intake Pump A1', type: 'preventive', priority: 'high', dueDate: '2025-06-28', status: 'scheduled', estimatedHours: 4 },
    { id: 'MAINT-002', equipment: 'Filter Backwash System', type: 'preventive', priority: 'medium', dueDate: '2025-06-30', status: 'planned', estimatedHours: 2 },
    { id: 'MAINT-003', equipment: 'Chemical Storage Tank', type: 'inspection', priority: 'medium', dueDate: '2025-07-02', status: 'planned', estimatedHours: 1 },
    { id: 'MAINT-004', equipment: 'Emergency Generator', type: 'preventive', priority: 'high', dueDate: '2025-07-05', status: 'scheduled', estimatedHours: 6 },
    { id: 'MAINT-005', equipment: 'Control Panel Upgrade', type: 'corrective', priority: 'low', dueDate: '2025-07-08', status: 'pending', estimatedHours: 8 }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ff4444';
      case 'high': return '#ff8800';
      case 'medium': return '#ffaa00';
      case 'low': return '#ffff00';
      default: return '#00ccff';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return '#00ff88';
      case 'stable': return '#00ccff';
      case 'declining': return '#ff8800';
      default: return '#ffffff';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '↗';
      case 'stable': return '→';
      case 'declining': return '↘';
      default: return '~';
    }
  };

  const criticalAlarms = activeAlarms.filter(a => a.severity === 'critical').length;
  const highAlarms = activeAlarms.filter(a => a.severity === 'high').length;
  const totalAlarms = activeAlarms.length;

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
      {/* Maintenance-themed Background */}
      <div className="absolute inset-0 opacity-25">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_25%_25%,rgba(255,68,68,0.2)_0%,transparent_50%)]"></div>
        <div className="absolute center right-0 w-full h-full bg-[radial-gradient(circle_at_75%_50%,rgba(255,136,0,0.15)_0%,transparent_50%)]"></div>
        <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_80%,rgba(136,0,255,0.15)_0%,transparent_50%)]"></div>
        
        {/* Technical Grid Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(255,68,68,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,68,68,0.1) 1px, transparent 1px),
            repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,136,0,0.05) 20px, rgba(255,136,0,0.05) 21px)
          `,
          backgroundSize: '45px 45px, 45px 45px, 40px 40px'
        }}></div>
        
        {/* Alert Pulse Particles */}
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-60 animate-float"
            style={{
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              backgroundColor: ['#ff4444', '#ff8800', '#ffaa00', '#8800ff'][Math.floor(Math.random() * 4)],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `alert-pulse ${4 + Math.random() * 8}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 h-full p-4">
        {/* Enhanced Maintenance Header */}
        <div className="flex items-center justify-between w-full bg-gradient-to-r from-slate-900/90 via-slate-800/70 to-slate-900/90 backdrop-blur-md rounded-lg px-6 py-4 border border-cyan-500/20 shadow-lg shadow-cyan-500/10 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-orange-500 rounded-full shadow-lg shadow-red-400/50 animate-pulse"></div>
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-red-400/40 to-transparent"></div>
            <div>
              <h1 className="text-lg text-slate-100 font-bold tracking-wider uppercase" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.1em' }}>
                {facility.name} - Maintenance Control
              </h1>
              <div className="text-xs text-red-400 font-mono">Active Alarms | MTBF Analysis | Planned Maintenance</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <span className="text-red-400">{totalAlarms} ACTIVE ALARMS</span>
            </div>
            <div className="text-slate-400">|</div>
            <div className="text-slate-300">MTBF: 2,486h avg</div>
            <div className="text-slate-400">|</div>
            <div className={`px-3 py-1 rounded-md border font-semibold ${
              criticalAlarms > 0 
                ? 'bg-red-500/15 text-red-300 border-red-500/30'
                : 'bg-green-500/15 text-green-300 border-green-500/30'
            }`}>
              {criticalAlarms > 0 ? `${criticalAlarms} CRITICAL` : 'SYSTEM STABLE'}
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
                  item.id === 'maintenance' 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/20' 
                    : 'bg-slate-800/50 text-slate-400 border border-slate-600/30 hover:bg-red-500/10 hover:text-red-300'
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
        <div className="flex space-x-2 mb-4">
          {[
            { key: 'alerts', label: 'Active Alarms' },
            { key: 'schedule', label: 'Maintenance Schedule' },
            { key: 'analytics', label: 'MTBF Analytics' }
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => setMaintenanceView(mode.key as any)}
              className={`px-4 py-2 rounded-lg font-mono text-xs transition-all duration-300 ${
                maintenanceView === mode.key
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-lg shadow-orange-500/20' 
                  : 'bg-slate-800/50 text-slate-400 border border-slate-600/30 hover:bg-orange-500/10 hover:text-orange-300'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Main Maintenance Dashboard */}
        <div className="grid grid-cols-12 grid-rows-6 gap-4 h-[calc(100vh-220px)]">
          
          {/* Active Alarms Panel */}
          <div className="col-span-8 row-span-4 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-xl border border-red-500/20 shadow-lg shadow-red-500/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                <h3 className="text-red-400 font-mono text-sm font-semibold">ACTIVE ALARMS BY SEVERITY</h3>
              </div>
              <div className="flex items-center space-x-4 text-xs font-mono">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-red-400">Critical: {criticalAlarms}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span className="text-orange-400">High: {highAlarms}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-yellow-400">Med/Low: {totalAlarms - criticalAlarms - highAlarms}</span>
                </div>
              </div>
            </div>

            {/* 3D Alarm List with Severity Visualization */}
            <div className="space-y-3 max-h-full overflow-y-auto">
              {activeAlarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className={`bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm rounded-lg border p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                    selectedAlert === alarm.id 
                      ? 'border-red-500/50 shadow-lg shadow-red-500/20' 
                      : 'border-slate-600/30 hover:border-red-500/30'
                  }`}
                  onClick={() => setSelectedAlert(alarm.id === selectedAlert ? null : alarm.id)}
                  style={{
                    boxShadow: selectedAlert === alarm.id 
                      ? `0 0 20px ${getSeverityColor(alarm.severity)}30, inset 0 1px 0 rgba(255,255,255,0.1)` 
                      : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                    borderLeft: `4px solid ${getSeverityColor(alarm.severity)}`
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="px-2 py-1 rounded text-xs font-mono font-bold uppercase"
                        style={{ 
                          backgroundColor: `${getSeverityColor(alarm.severity)}20`,
                          color: getSeverityColor(alarm.severity),
                          border: `1px solid ${getSeverityColor(alarm.severity)}40`
                        }}
                      >
                        {alarm.severity}
                      </div>
                      <div className="text-sm text-slate-300 font-mono font-semibold">{alarm.equipment}</div>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                      <span>{alarm.id}</span>
                      <span>•</span>
                      <span>{alarm.duration}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-slate-200 mb-2">{alarm.message}</div>
                  
                  <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                    <span>Triggered: {new Date(alarm.timestamp).toLocaleString()}</span>
                    <div className="flex space-x-2">
                      <button className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 hover:bg-blue-500/30 transition-all">
                        ACK
                      </button>
                      <button className="px-2 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30 hover:bg-green-500/30 transition-all">
                        CLEAR
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedAlert === alarm.id && (
                    <div className="mt-3 pt-3 border-t border-slate-600/30 grid grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <div className="text-slate-400 mb-2">Diagnostic Info:</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Priority:</span>
                            <span style={{ color: getSeverityColor(alarm.severity) }}>Level {alarm.severity === 'critical' ? '1' : alarm.severity === 'high' ? '2' : '3'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Auto-Clear:</span>
                            <span className="text-cyan-400">Disabled</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Escalation:</span>
                            <span className="text-orange-400">2h timer</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-slate-400 mb-2">Recommended Action:</div>
                        <div className="text-slate-300 leading-relaxed">
                          {alarm.severity === 'critical' ? 'Immediate technician dispatch required. Isolate equipment if safe.' :
                           alarm.severity === 'high' ? 'Schedule maintenance within 24h. Monitor closely.' :
                           'Plan maintenance during next scheduled window.'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* MTBF Analytics Panel */}
          <div className="col-span-4 row-span-4 space-y-4">
            {/* MTBF Overview */}
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 backdrop-blur-md rounded-xl border border-blue-500/30 p-4 shadow-lg shadow-blue-500/10">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <h3 className="text-blue-400 font-mono text-sm font-semibold">MTBF ANALYSIS</h3>
              </div>
              
              <div className="space-y-3">
                {mtbfData.map((item, index) => (
                  <div key={index} className="bg-slate-800/50 rounded-lg p-3 border border-slate-600/30">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs text-slate-300 font-mono">{item.equipment}</div>
                      <div className="flex items-center space-x-1">
                        <span 
                          className="text-xs font-mono"
                          style={{ color: getTrendColor(item.trend) }}
                        >
                          {getTrendIcon(item.trend)}
                        </span>
                        <span 
                          className="text-xs font-mono font-semibold"
                          style={{ color: getTrendColor(item.trend) }}
                        >
                          {item.trend.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <div className="text-slate-400">MTBF</div>
                        <div className="text-blue-400 font-bold">{item.mtbf}h</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Reliability</div>
                        <div className="text-green-400 font-bold">{item.reliability}%</div>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <div className="text-slate-400 text-xs">Last Failure: {item.lastFailure}</div>
                      <div className="w-full bg-slate-700 rounded-full h-1 mt-1">
                        <div 
                          className="h-1 rounded-full transition-all duration-1000"
                          style={{
                            width: `${item.reliability}%`,
                            backgroundColor: getTrendColor(item.trend),
                            boxShadow: `0 0 6px ${getTrendColor(item.trend)}40`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Maintenance Schedule */}
          <div className="col-span-12 row-span-2 bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-xl border border-purple-500/20 shadow-lg shadow-purple-500/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <h3 className="text-purple-400 font-mono text-sm font-semibold">PLANNED vs UNPLANNED MAINTENANCE</h3>
              </div>
              <div className="text-xs text-slate-400 font-mono">Next 7 days • Efficiency Target: 85%</div>
            </div>

            <div className="grid grid-cols-5 gap-4">
              {maintenanceSchedule.map((item) => (
                <div key={item.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-600/30">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs text-slate-300 font-mono">{item.equipment}</div>
                    <div 
                      className="px-2 py-1 rounded text-xs font-mono font-semibold"
                      style={{ 
                        backgroundColor: item.priority === 'high' ? '#ff880020' : 
                                       item.priority === 'medium' ? '#ffaa0020' : '#00ccff20',
                        color: item.priority === 'high' ? '#ff8800' : 
                               item.priority === 'medium' ? '#ffaa00' : '#00ccff',
                        border: `1px solid ${item.priority === 'high' ? '#ff880040' : 
                                             item.priority === 'medium' ? '#ffaa0040' : '#00ccff40'}`
                      }}
                    >
                      {item.priority.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="text-xs text-slate-400 mb-1 capitalize">{item.type} Maintenance</div>
                  <div className="text-sm text-slate-200 mb-2">{item.dueDate}</div>
                  
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Est. Time:</span>
                    <span className="text-cyan-400">{item.estimatedHours}h</span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Status:</span>
                    <span className={`capitalize ${
                      item.status === 'scheduled' ? 'text-green-400' :
                      item.status === 'planned' ? 'text-blue-400' : 'text-orange-400'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Maintenance-themed Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-500/8 rounded-full opacity-40 blur-3xl animate-float" />
        <div className="absolute center right-0 w-80 h-80 bg-orange-500/8 rounded-full opacity-40 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-purple-500/8 rounded-full opacity-40 blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>
    </div>
  );
}