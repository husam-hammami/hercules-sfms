import React, { useRef, useEffect } from 'react'
import { TrendingUp, TrendingDown, Activity, Droplets, Zap, Gauge, Package, Radio, Battery, Signal } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string
  unit?: string
  trend?: number
  icon: 'water' | 'pump' | 'energy' | 'flow' | 'gauge' | 'activity' | 'package' | 'radio' | 'battery' | 'signal'
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'cyan' | 'yellow' | 'red'
  subtitle?: string
  chartType?: 'line' | 'circle' | 'bar' | 'gauge'
}

const iconMap = {
  water: Droplets,
  pump: Activity,
  energy: Zap,
  flow: TrendingUp,
  gauge: Gauge,
  activity: Activity,
  package: Package,
  radio: Radio,
  battery: Battery,
  signal: Signal
}

const colorMap = {
  blue: {
    bg: 'from-blue-100 to-blue-200 dark:from-blue-500/10 dark:to-blue-900/20',
    border: 'border-blue-400 dark:border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    glow: 'shadow-blue-400/30 dark:shadow-blue-500/20',
    lightBg: ''
  },
  green: {
    bg: 'from-emerald-100 to-green-200 dark:from-green-500/10 dark:to-green-900/20',
    border: 'border-emerald-400 dark:border-green-500/30',
    text: 'text-emerald-600 dark:text-green-400',
    glow: 'shadow-emerald-400/30 dark:shadow-green-500/20',
    lightBg: ''
  },
  orange: {
    bg: 'from-orange-100 to-amber-200 dark:from-orange-500/10 dark:to-orange-900/20',
    border: 'border-orange-400 dark:border-orange-500/30',
    text: 'text-orange-600 dark:text-orange-400',
    glow: 'shadow-orange-400/30 dark:shadow-orange-500/20',
    lightBg: ''
  },
  purple: {
    bg: 'from-purple-100 to-violet-200 dark:from-purple-500/10 dark:to-purple-900/20',
    border: 'border-purple-400 dark:border-purple-500/30',
    text: 'text-purple-600 dark:text-purple-400',
    glow: 'shadow-purple-400/30 dark:shadow-purple-500/20',
    lightBg: ''
  },
  cyan: {
    bg: 'from-cyan-100 to-teal-200 dark:from-cyan-500/10 dark:to-cyan-900/20',
    border: 'border-cyan-400 dark:border-cyan-500/30',
    text: 'text-cyan-600 dark:text-cyan-400',
    glow: 'shadow-cyan-400/30 dark:shadow-cyan-500/20',
    lightBg: ''
  },
  yellow: {
    bg: 'from-yellow-100 to-amber-200 dark:from-yellow-500/10 dark:to-yellow-900/20',
    border: 'border-yellow-400 dark:border-yellow-500/30',
    text: 'text-yellow-600 dark:text-yellow-400',
    glow: 'shadow-yellow-400/30 dark:shadow-yellow-500/20',
    lightBg: ''
  },
  red: {
    bg: 'from-red-100 to-rose-200 dark:from-red-500/10 dark:to-red-900/20',
    border: 'border-red-400 dark:border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
    glow: 'shadow-red-400/30 dark:shadow-red-500/20',
    lightBg: ''
  }
}

// Mini chart components
function MiniLineChart({ color, trend }: { color: string, trend?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)

    // Generate sample data points
    const points = []
    for (let i = 0; i < 10; i++) {
      const baseValue = height * 0.5
      const variation = (Math.sin(i * 0.5) + Math.random() * 0.4 - 0.2) * height * 0.3
      points.push(baseValue + variation)
    }

    // Draw line
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()

    points.forEach((point, index) => {
      const x = (index / (points.length - 1)) * width
      if (index === 0) {
        ctx.moveTo(x, point)
      } else {
        ctx.lineTo(x, point)
      }
    })

    ctx.stroke()

    // Add glow effect
    ctx.shadowColor = color
    ctx.shadowBlur = 4
    ctx.stroke()
  }, [color])

  return <canvas ref={canvasRef} width={60} height={30} className="opacity-80" />
}

function MiniCircleProgress({ color, value }: { color: string, value: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 4

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Background circle
    ctx.strokeStyle = document.documentElement.classList.contains('light') ? 'rgba(203, 213, 225, 0.5)' : 'rgba(71, 85, 105, 0.3)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.stroke()

    // Progress arc
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    const startAngle = -Math.PI / 2
    const endAngle = startAngle + (2 * Math.PI * (value / 100))
    ctx.arc(centerX, centerY, radius, startAngle, endAngle)
    ctx.stroke()

    // Add glow
    ctx.shadowColor = color
    ctx.shadowBlur = 6
    ctx.stroke()
  }, [color, value])

  return <canvas ref={canvasRef} width={30} height={30} className="opacity-90" />
}

function MiniBars({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const barCount = 6
    const barWidth = canvas.width / barCount - 2
    const maxHeight = canvas.height - 4

    for (let i = 0; i < barCount; i++) {
      const height = Math.random() * maxHeight + 4
      const x = i * (barWidth + 2)
      const y = canvas.height - height

      ctx.fillStyle = color
      ctx.fillRect(x, y, barWidth, height)

      // Add glow
      ctx.shadowColor = color
      ctx.shadowBlur = 3
      ctx.fillRect(x, y, barWidth, height)
    }
  }, [color])

  return <canvas ref={canvasRef} width={60} height={30} className="opacity-80" />
}

export function KPICard({ 
  title, 
  value, 
  unit, 
  trend, 
  icon, 
  color = 'cyan',
  subtitle,
  chartType = 'line'
}: KPICardProps) {
  const Icon = iconMap[icon]
  const colors = colorMap[color]
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, '')) || 75

  const getChartColor = (colorName: string) => {
    const colorMapping = {
      'text-blue-400': '#60a5fa',
      'text-green-400': '#4ade80',
      'text-orange-400': '#fb923c',
      'text-purple-400': '#c084fc',
      'text-cyan-400': '#22d3ee',
      'text-yellow-400': '#facc15'
    }
    return colorMapping[colorName as keyof typeof colorMapping] || '#22d3ee'
  }

  const renderChart = () => {
    const chartColor = getChartColor(colors.text)
    switch (chartType) {
      case 'circle':
        return <MiniCircleProgress color={chartColor} value={numericValue} />
      case 'bar':
        return <MiniBars color={chartColor} />
      case 'gauge':
        return <MiniCircleProgress color={chartColor} value={numericValue} />
      default:
        return <MiniLineChart color={chartColor} trend={trend} />
    }
  }

  return (
    <div className={`relative bg-gradient-to-br ${colors.bg} ${colors.lightBg} border ${colors.border} rounded-lg p-3 
                     backdrop-blur-sm hover:shadow-xl hover:${colors.glow} hover:scale-105
                     transition-all duration-500 group overflow-hidden h-16 cursor-pointer`}>
      
      {/* Enhanced scanning lines */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent 
                      transform -translate-x-full group-hover:translate-x-full transition-transform duration-1200 ease-out"></div>
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent 
                      transform translate-x-full group-hover:-translate-x-full transition-transform duration-1500 ease-out"></div>
      
      {/* Pulse effect on hover */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 
                      opacity-0 group-hover:opacity-100 animate-pulse"></div>
      
      <div className="flex items-center justify-between h-full relative z-10">
        {/* Left side - Icon and content */}
        <div className="flex items-center space-x-3 flex-1">
          {icon && <div className={`${colors.text} flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>{icon}</div>}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide truncate font-semibold">{title}</div>
            <div className="flex items-baseline space-x-1">
              <span className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-gray-800 dark:group-hover:text-cyan-100 transition-colors duration-300">{value}</span>
              {unit && <span className={`text-xs ${colors.text} group-hover:brightness-125 transition-all duration-300`}>{unit}</span>}
              {subtitle && <span className="text-xs text-slate-600 dark:text-slate-500 truncate">{subtitle}</span>}
            </div>
          </div>
        </div>

        {/* Right side - Enhanced Chart */}
        <div className="flex-shrink-0 ml-2 group-hover:scale-110 transition-transform duration-300">
          {renderChart()}
        </div>


      </div>
      
      {/* Enhanced hover effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      
      {/* Border glow enhancement */}
      <div className="absolute inset-0 rounded-lg border border-cyan-400/0 group-hover:border-cyan-400/50 
                      transition-all duration-500 pointer-events-none"></div>
    </div>
  )
}