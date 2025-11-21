import React, { useState, useEffect, useMemo } from 'react'
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Zap, 
  Thermometer, 
  Gauge, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  Signal,
  Monitor
} from 'lucide-react'

// Real-time operations data simulation
interface OperationalMetric {
  id: string
  name: string
  value: number
  unit: string
  status: 'optimal' | 'warning' | 'critical'
  trend: 'up' | 'down' | 'stable'
  lastUpdated: Date
}

interface SystemStatus {
  id: string
  system: string
  status: 'online' | 'offline' | 'maintenance'
  uptime: number
  cpu: number
  memory: number
  network: number
}

// Generate the 3 most critical operational metrics
function generateOperationalData(): OperationalMetric[] {
  const timestamp = new Date()
  
  // Only the 3 most critical metrics for live operations monitoring
  return [
    {
      id: 'mixer-motor-speed',
      name: 'Mixer Motor Speed (M001)',
      value: 1485 + (Math.random() - 0.5) * 50,
      unit: 'RPM',
      status: 'optimal',
      trend: Math.random() > 0.5 ? 'up' : 'down',
      lastUpdated: timestamp
    },
    {
      id: 'reactor-temperature',
      name: 'Reactor Temperature (TE-201)',
      value: 85.3 + (Math.random() - 0.5) * 8,
      unit: '°C',
      status: Math.random() > 0.85 ? 'critical' : 'optimal',
      trend: Math.random() > 0.5 ? 'up' : 'down',
      lastUpdated: timestamp
    },
    {
      id: 'feed-flow-rate',
      name: 'Feed Flow Rate (FE-401)',
      value: 145.7 + (Math.random() - 0.5) * 25,
      unit: 'L/min',
      status: Math.random() > 0.7 ? 'optimal' : 'warning',
      trend: Math.random() > 0.5 ? 'up' : 'down',
      lastUpdated: timestamp
    }
  ]
}

function generateSystemStatus(): SystemStatus[] {
  return [
    {
      id: 'plc-s7-1500',
      system: 'Siemens S7-1500 PLC (CPU 1516-3)',
      status: 'online',
      uptime: 99.87,
      cpu: 12 + Math.random() * 8, // PLCs typically run low CPU usage
      memory: 45 + Math.random() * 15,
      network: 89 + Math.random() * 10
    },
    {
      id: 'hmi-panel',
      system: 'WinCC Runtime (OP-177B)',
      status: 'online',
      uptime: 99.94,
      cpu: 25 + Math.random() * 15,
      memory: 68 + Math.random() * 20,
      network: 95 + Math.random() * 5
    },
    {
      id: 'profinet-network',
      system: 'PROFINET Field Network',
      status: Math.random() > 0.98 ? 'maintenance' : 'online',
      uptime: 99.96,
      cpu: 5 + Math.random() * 5, // Network switches have minimal CPU usage
      memory: 35 + Math.random() * 10,
      network: 88 + Math.random() * 10
    },
    {
      id: 'opc-server',
      system: 'OPC UA Server (KEPServer)',
      status: 'online',
      uptime: 99.91,
      cpu: 18 + Math.random() * 12,
      memory: 52 + Math.random() * 18,
      network: 92 + Math.random() * 8
    },
    {
      id: 'historian-server',
      system: 'OSIsoft PI Historian',
      status: Math.random() > 0.95 ? 'maintenance' : 'online',
      uptime: 99.89,
      cpu: 28 + Math.random() * 15,
      memory: 71 + Math.random() * 12,
      network: 88 + Math.random() * 10
    },
    {
      id: 'modbus-gateway',
      system: 'Modbus TCP Gateway',
      status: 'online',
      uptime: 99.93,
      cpu: 8 + Math.random() * 6,
      memory: 32 + Math.random() * 12,
      network: 94 + Math.random() * 6
    }
  ]
}

// 3D Futuristic metric card component
function MetricCard({ metric }: { metric: OperationalMetric }) {
  const statusAccents = {
    optimal: 'from-blue-400 via-cyan-400 to-blue-500',
    warning: 'from-orange-400 via-yellow-400 to-orange-500', 
    critical: 'from-red-400 via-pink-400 to-red-500'
  }

  const statusGlow = {
    optimal: 'shadow-blue-500/30',
    warning: 'shadow-orange-500/30',
    critical: 'shadow-red-500/30'
  }

  return (
    <div className="group perspective-1000">
      <Card className={`
        relative overflow-hidden transform transition-all duration-700 ease-out
        hover:rotate-y-12 hover:rotate-x-6 hover:scale-105 hover:-translate-y-2
        dark:bg-slate-900/30 bg-white/80 backdrop-blur-lg
        border dark:border-slate-700/30 border-blue-100/50
        ${statusGlow[metric.status]} hover:shadow-2xl hover:shadow-blue-500/20
        before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none
      `} style={{ transformStyle: 'preserve-3d' }}>
        
        {/* Floating energy particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-1 h-1 bg-blue-400 rounded-full top-4 left-4 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '3s' }}></div>
          <div className="absolute w-1 h-1 bg-cyan-400 rounded-full top-8 right-6 animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
          <div className="absolute w-1 h-1 bg-blue-300 rounded-full bottom-6 left-8 animate-bounce" style={{ animationDelay: '2s', animationDuration: '3.5s' }}></div>
        </div>

        {/* Dynamic border glow */}
        <div className={`absolute inset-0 bg-gradient-to-r ${statusAccents[metric.status]} opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-lg`}></div>
        
        {/* Holographic scan line */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent translate-y-0 group-hover:translate-y-full transition-transform duration-2000 ease-linear opacity-60"></div>
        
        <CardContent className="p-4 relative z-10">
          {/* Metric name with subtle glow */}
          <div className="text-xs dark:text-slate-400 text-blue-600 font-medium mb-1 tracking-wide uppercase">
            {metric.name}
          </div>
          
          {/* Main value with 3D effect */}
          <div className="relative">
            <div className="text-3xl font-bold dark:text-white text-gray-900 leading-none mb-1 group-hover:text-shadow-glow transition-all duration-300">
              {metric.value.toFixed(1)}
              <span className="text-sm dark:text-slate-400 text-blue-500 ml-1 font-normal">{metric.unit}</span>
            </div>
            
            {/* Subtle reflection effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>

          {/* Minimal progress indicator for percentages */}
          {metric.unit === '%' && (
            <div className="relative h-1 bg-slate-200 dark:bg-slate-700/50 rounded-full mt-2 overflow-hidden">
              <div 
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${statusAccents[metric.status]} rounded-full transition-all duration-1000 ease-out shadow-sm`}
                style={{ width: `${metric.value}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          )}

          {/* Floating status indicator */}
          {metric.status !== 'optimal' && (
            <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
              metric.status === 'warning' ? 'bg-orange-400' : 'bg-red-400'
            } animate-pulse shadow-lg`}></div>
          )}
        </CardContent>

        {/* 3D depth effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-black/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg"></div>
      </Card>
    </div>
  )
}

// System status card component
function SystemCard({ system }: { system: SystemStatus }) {
  const statusColors = {
    online: 'text-green-400 bg-green-500/10 light:text-green-600 light:bg-green-50',
    offline: 'text-red-400 bg-red-500/10 light:text-red-600 light:bg-red-50',
    maintenance: 'text-yellow-400 bg-yellow-500/10 light:text-yellow-600 light:bg-yellow-50'
  }

  const statusIcons = {
    online: CheckCircle,
    offline: AlertTriangle,
    maintenance: Clock
  }

  const StatusIcon = statusIcons[system.status]

  return (
    <Card className="bg-slate-900/40 light:bg-white border border-slate-700/30 light:border-blue-200 backdrop-blur-sm relative overflow-hidden group hover:scale-105 transition-all duration-300 light:shadow-sm">
      {/* Matrix rain effect */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 to-transparent animate-pulse"></div>
      </div>
      
      <CardHeader className="pb-3">
        <CardTitle className="text-white light:text-gray-900 text-sm font-medium flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${statusColors[system.status].split(' ')[0]}`} />
          {system.system}
          <Badge variant="outline" className={`ml-auto ${statusColors[system.status]} border-0 text-xs`}>
            {system.status.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400 light:text-blue-600 flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Uptime
          </span>
          <span className="text-white light:text-gray-900 font-mono">{system.uptime}%</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 light:text-blue-600 flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              CPU
            </span>
            <span className="text-white light:text-gray-900">{system.cpu.toFixed(1)}%</span>
          </div>
          <Progress value={system.cpu} className="h-1" />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 light:text-blue-600 flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              Memory
            </span>
            <span className="text-white light:text-gray-900">{system.memory.toFixed(1)}%</span>
          </div>
          <Progress value={system.memory} className="h-1" />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 light:text-blue-600 flex items-center gap-1">
              <Signal className="h-3 w-3" />
              Network
            </span>
            <span className="text-white light:text-gray-900">{system.network.toFixed(1)}%</span>
          </div>
          <Progress value={system.network} className="h-1" />
        </div>
      </CardContent>
    </Card>
  )
}

// Main Operations content
function OperationsContent() {
  const [operationalData, setOperationalData] = useState<OperationalMetric[]>([])
  const [systemData, setSystemData] = useState<SystemStatus[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Real-time data updates
  useEffect(() => {
    const updateData = () => {
      setOperationalData(generateOperationalData())
      setSystemData(generateSystemStatus())
      setLastUpdate(new Date())
    }

    // Initial load
    updateData()

    // Update every 3 seconds for real-time feel
    const interval = setInterval(updateData, 3000)
    
    return () => clearInterval(interval)
  }, [])

  const overallStatus = useMemo(() => {
    const criticalCount = operationalData.filter(m => m.status === 'critical').length
    const warningCount = operationalData.filter(m => m.status === 'warning').length
    
    if (criticalCount > 0) return { status: 'critical', message: `${criticalCount} Critical Issues` }
    if (warningCount > 0) return { status: 'warning', message: `${warningCount} Warnings Active` }
    return { status: 'optimal', message: 'All Systems Optimal' }
  }, [operationalData])

  return (
    <div className="space-y-6">
      {/* Real-time status header */}
      <div className="relative">
        <Card className="dark:bg-gradient-to-r dark:from-slate-900/80 dark:to-slate-800/80 bg-gradient-to-r from-white to-blue-50 border dark:border-slate-700/50 border-blue-200 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl dark:text-white text-gray-900 flex items-center gap-3">
                  <div className="relative">
                    <Monitor className="h-8 w-8 dark:text-cyan-400 text-blue-600" />
                    <div className="absolute inset-0 dark:bg-cyan-400/20 bg-blue-600/20 rounded-full animate-ping"></div>
                  </div>
                  Real-Time Operations Center
                </CardTitle>
                <CardDescription className="dark:text-slate-300 text-blue-700 mt-2">
                  Live monitoring and control of all factory operations
                </CardDescription>
              </div>
              
              <div className="text-right">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                  overallStatus.status === 'optimal' 
                    ? 'dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30 bg-green-50 text-green-600 border border-green-200' 
                    : overallStatus.status === 'warning'
                    ? 'dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30 bg-yellow-50 text-yellow-600 border border-yellow-200'
                    : 'dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30 bg-red-50 text-red-600 border border-red-200'
                }`}>
                  <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                  {overallStatus.message}
                </div>
                <div className="text-xs dark:text-slate-500 text-blue-600 mt-1">
                  Last Update: {lastUpdate.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Real-time operational metrics */}
      <div>
        <h3 className="text-lg font-semibold text-white light:text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-cyan-400 light:text-blue-600" />
          Live Operational Metrics
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {operationalData.map(metric => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </div>

      {/* System status monitoring */}
      <div>
        <h3 className="text-lg font-semibold text-white light:text-gray-900 mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-cyan-400 light:text-blue-600" />
          System Status Monitoring
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemData.map(system => (
            <SystemCard key={system.id} system={system} />
          ))}
        </div>
      </div>

      {/* Live activity feed */}
      <Card className="bg-slate-900/40 light:bg-white border border-slate-700/30 light:border-blue-200 backdrop-blur-sm light:shadow-sm">
        <CardHeader>
          <CardTitle className="text-white light:text-gray-900 flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-400 light:text-blue-600" />
            Live Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {[...Array(8)].map((_, i) => {
              const eventTypes = [
                { color: 'bg-green-400 light:bg-green-600', text: 'PLC S7-1500: Sequence program completed successfully - Step 47 of 52' },
                { color: 'bg-yellow-400 light:bg-yellow-600', text: 'Alarm: Reactor TE-201 temperature deviation +2.5°C from setpoint' },
                { color: 'bg-blue-400 light:bg-blue-600', text: 'VFD-101: Frequency adjusted to 48.2 Hz - Motor M001 speed optimization' },
                { color: 'bg-green-400 light:bg-green-600', text: 'PID Loop: Steam pressure PT-301 control stable within ±0.1 bar' },
                { color: 'bg-cyan-400 light:bg-cyan-600', text: 'OPC UA: Tag subscription updated for analog input AI_4-20mA_CH3' },
                { color: 'bg-orange-400 light:bg-orange-600', text: 'HMI Warning: Valve PV-101 position feedback signal lost - Check wiring' },
                { color: 'bg-green-400 light:bg-green-600', text: 'PROFINET: Field device ET200SP module diagnostic OK' },
                { color: 'bg-purple-400 light:bg-purple-600', text: 'Historian: 1,247 process tags archived to PI Server database' }
              ]
              
              const event = eventTypes[i]
              
              return (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className={`w-2 h-2 ${event.color} rounded-full animate-pulse`}></div>
                  <span className="text-slate-400 light:text-blue-600 font-mono">
                    {new Date(Date.now() - i * 30000).toLocaleTimeString()}
                  </span>
                  <span className="text-white light:text-gray-900">
                    {event.text}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main Operations page component
export function Operations() {
  return (
    <WaterSystemLayout 
      title="Real-Time Operations Center" 
      subtitle="Live monitoring and control of all factory systems and processes"
    >
      <OperationsContent />
    </WaterSystemLayout>
  )
}