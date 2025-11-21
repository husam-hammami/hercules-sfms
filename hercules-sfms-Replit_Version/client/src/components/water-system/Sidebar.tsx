import React from 'react'
import { Link, useLocation } from 'wouter'
import { 
  LayoutDashboard, 
  Database, 
  ChevronLeft,
  ChevronRight,
  Settings,
  Download,
  Tag,
  Grid,
  FileText,
  Home,
  Wrench,
  Shield,
  Terminal,
  Clock,
  Activity,
  Calendar,
  Cpu
} from 'lucide-react'
import { useDemo } from '@/contexts/DemoContext'
import { useCustomAuth } from '@/hooks/useCustomAuth'
import herculesLogo from "../../assets/hercules-logo-final.png"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

// HERCULES V2 - AUTHENTICATED USER NAVIGATION
const authenticatedMenuItems = [
  { 
    path: '/welcome', 
    icon: Home, 
    label: 'Welcome',
    description: 'Getting started guide'
  },
  { 
    path: '/plc-config', 
    icon: Settings, 
    label: 'Control Center',
    description: 'Configure PLCs & Tags'
  },
  { 
    path: '/custom-dashboard', 
    icon: Grid, 
    label: 'Dashboard',
    description: 'Build monitoring views'
  },
  { 
    path: '/batch-calendar', 
    icon: Calendar, 
    label: 'Batch Calendar',
    description: 'Production scheduling & tracking'
  },
  { 
    path: '/digital-twin', 
    icon: Cpu, 
    label: 'Plant Monitoring',
    description: '3D real-time plant visual.'
  },
  { 
    path: '/historical-data', 
    icon: Clock, 
    label: 'Historical',
    description: 'View & analyze historical data'
  },
  { 
    path: '/live-data', 
    icon: Activity, 
    label: 'Live',
    description: 'Real-time data monitoring'
  },
  { 
    path: '/gateway-management', 
    icon: Shield, 
    label: 'Gateway Management',
    description: 'Manage gateway codes'
  }
  // Hidden menu items - uncomment to show
  // {
  //   path: '/gateway-database',
  //   icon: Database,
  //   label: 'Database Management',
  //   description: 'Configure schemas & tables'
  // },
  // { 
  //   path: '/gateway-debug', 
  //   icon: Terminal, 
  //   label: 'Gateway Debug',
  //   description: 'Monitor gateway activity'
  // }
]

// Settings options - shown at bottom
const setupItems = [
  { 
    path: '/settings', 
    icon: Wrench, 
    label: 'Settings',
    description: 'System configuration'
  }
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [location] = useLocation()
  const { isDemoMode } = useDemo()
  const { isAuthenticated } = useCustomAuth()

  // Show different menu items based on user state
  const getMenuItems = () => {
    // Authenticated trial users see their real data features FIRST
    if (isAuthenticated) {
      return authenticatedMenuItems // Welcome, PLC Config, Custom Dashboard, Gateway Setup
    }
    
    // Demo mode users see features with mock data
    if (isDemoMode) {
      return [
        { 
          path: '/welcome', 
          icon: Home, 
          label: 'Welcome',
          description: 'Getting started (Demo)'
        },
        { 
          path: '/plc-config', 
          icon: Settings, 
          label: 'Control Center',
          description: 'Configure controllers (Demo)'
        },
        { 
          path: '/dashboard', 
          icon: Grid, 
          label: 'Dashboard',
          description: 'Pre-built feedmill dashboard (Demo)'
        },
        { 
          path: '/batch-calendar', 
          icon: Calendar, 
          label: 'Batch Calendar',
          description: 'Production scheduling & tracking (Demo)'
        },
        { 
          path: '/digital-twin', 
          icon: Cpu, 
          label: 'Plant Monitoring',
          description: '3D real-time plant visual. (Demo)'
        },
        { 
          path: '/historical-data', 
          icon: Clock, 
          label: 'Historical',
          description: 'View & analyze historical data (Demo)'
        },
        { 
          path: '/live-data', 
          icon: Activity, 
          label: 'Live',
          description: 'Real-time data monitoring (Demo)'
        }
      ]
    }
    
    // Non-authenticated users see minimal navigation (empty for now since they should authenticate)
    return []
  }

  const currentMenuItems = getMenuItems()

  return (
    <div className={`bg-slate-900/95 light:bg-white border-r border-slate-700/50 light:border-gray-200 backdrop-blur-sm 
                     transition-all duration-300 flex flex-col relative h-screen shadow-lg light:shadow-xl
                     ${collapsed ? 'w-16' : 'w-64'}`}>
      
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 light:border-gray-200 bg-transparent">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <img 
                src={herculesLogo} 
                alt="Hercules v2.0" 
                className="h-12 w-auto object-contain dark:brightness-0 dark:invert"
                style={{ 
                  opacity: 1,
                  imageRendering: 'auto'
                }}
              />
              
            </div>
          )}
          {collapsed && (
            <img 
              src={herculesLogo} 
              alt="Hercules v2.0" 
              className="h-10 w-auto object-contain mx-auto dark:brightness-0 dark:invert"
              style={{ 
                opacity: 1,
                imageRendering: 'auto'
              }}
            />
          )}
          <button
            onClick={onToggle}
            className="p-2 rounded-lg bg-slate-800/50 light:bg-gray-100 hover:bg-slate-700/50 light:hover:bg-gray-200
                       text-slate-400 light:text-gray-600 hover:text-cyan-400 light:hover:text-blue-600 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {currentMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = location === item.path
          
          return (
            <Link key={item.path} href={item.path}>
              <div className={`flex items-center p-3 rounded-lg transition-all duration-200 group cursor-pointer
                             ${isActive 
                               ? 'bg-gradient-to-r from-cyan-600/20 to-blue-600/20 light:from-blue-100 light:to-cyan-100 border border-cyan-500/30 light:border-blue-400/30 text-cyan-400 light:text-blue-700' 
                               : 'text-slate-400 light:text-gray-700 hover:text-cyan-400 light:hover:text-blue-600 hover:bg-slate-800/50 light:hover:bg-gray-100'
                             }`}>
                <Icon className={`h-5 w-5 ${collapsed ? 'mx-auto' : 'mr-3'} flex-shrink-0`} />
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.label}</div>
                    {isActive && (
                      <div className="text-xs text-slate-400 light:text-gray-600 truncate mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </div>
                )}
                {!collapsed && isActive && (
                  <div className="w-2 h-2 bg-cyan-400 light:bg-blue-600 rounded-full flex-shrink-0"></div>
                )}
              </div>
            </Link>
          )
        })}
      </nav>
      
      {/* Setup Items - Bottom Section */}
      <div className="border-t border-slate-700/50 light:border-gray-200 p-2 space-y-1">
        {setupItems.map((item) => {
          const Icon = item.icon
          const isActive = location === item.path
          
          return (
            <Link key={item.path} href={item.path}>
              <div className={`flex items-center p-3 rounded-lg transition-all duration-200 group cursor-pointer
                             ${isActive 
                               ? 'bg-gradient-to-r from-cyan-600/20 to-blue-600/20 light:from-blue-100 light:to-cyan-100 border border-cyan-500/30 light:border-blue-400/30 text-cyan-400 light:text-blue-700' 
                               : 'text-slate-400 light:text-gray-700 hover:text-cyan-400 light:hover:text-blue-600 hover:bg-slate-800/50 light:hover:bg-gray-100'
                             }`}>
                <Icon className={`h-5 w-5 ${collapsed ? 'mx-auto' : 'mr-3'} flex-shrink-0`} />
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.label}</div>
                    {isActive && (
                      <div className="text-xs text-slate-400 light:text-gray-600 truncate mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </div>
                )}
                {!collapsed && isActive && (
                  <div className="w-2 h-2 bg-cyan-400 light:bg-blue-600 rounded-full flex-shrink-0"></div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
      
      {/* Scanning Line Animation */}
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent 
                      via-cyan-500/50 to-transparent opacity-30">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/0 via-cyan-400/80 to-cyan-400/0 
                        h-8 animate-pulse"></div>
      </div>
    </div>
  )
}