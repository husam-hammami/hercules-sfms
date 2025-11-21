import React, { useState } from 'react'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { User, Settings, LogOut, LayoutDashboard, Eye } from 'lucide-react'
import { Link } from 'wouter'
import { useTheme } from '@/contexts/ThemeContext'
import { useDemo } from '@/contexts/DemoContext'
import futuristicNeonVideo from '@assets/20250725_1923_Futuristic Neon Serenity_simple_compose_01k112wfdvfd5v7jndrbpsca92_1753707277024.mp4'
import herculesFooterLogo from '@assets/image_1753777345427.png'
import asmLogo from '@assets/image_1761069158022.png'
import saudiTechLogo from '@assets/Saudi Tech_1761044645583.jpg'
import siemensLogo from '@assets/simiuns_1761046009824.jpeg'


interface WaterSystemLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function WaterSystemLayout({ children, title = 'Water System', subtitle = '' }: WaterSystemLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const { theme } = useTheme()
  const { isDemoMode } = useDemo()
  
  // Helper function to capitalize first letter of names
  const capitalize = (str: string) => {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }
  
  // Logout handler
  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem('sessionId');
    localStorage.removeItem('demoUser');
    localStorage.removeItem('demoKey');
    sessionStorage.clear();
    // Redirect to home
    window.location.href = '/';
  }
  
  React.useEffect(() => {
    // Get user data from localStorage only if NOT in demo mode
    if (!isDemoMode) {
      const demoUser = localStorage.getItem('demoUser')
      if (demoUser) {
        try {
          const user = JSON.parse(demoUser)
          setUserData(user)
        } catch (error) {
          console.error('Failed to parse user data:', error)
        }
      }
    } else {
      // Clear user data in demo mode
      setUserData(null)
    }
  }, [isDemoMode])

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 
                    light:bg-transparent
                    text-white light:text-gray-900 flex relative overflow-hidden">
      {/* Futuristic Video Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <video
          key={theme} 
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ 
            opacity: theme === 'dark' ? 0.4 : 0.85,
            filter: theme === 'light' ? 'brightness(1.2) contrast(0.9) saturate(0.8)' : 'none'
          }}
        >
          <source src={futuristicNeonVideo} type="video/mp4" />
        </video>
        {theme === 'dark' && (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/20 to-slate-950/40"></div>
        )}
        {theme === 'light' && (
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/20"></div>
        )}
      </div>
      {/* Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10">
        
        {/* Top Header */}
        <header className="bg-slate-900/95 light:bg-white/90 border-b border-slate-700/50 light:border-gray-200 backdrop-blur-sm 
                          px-4 py-3 flex items-center justify-between shadow-lg light:shadow-xl">
            <div>
              <h1 className="text-sm font-bold text-white light:text-gray-900">{title}</h1>
              <p className="text-xs text-slate-400 light:text-gray-600">{subtitle || 'Smart Factory Management System'}</p>
            </div>
          
          <div className="flex items-center space-x-4">
            {/* User Info - Only show in authenticated mode */}
            {!isDemoMode && (
              <div className="flex items-center space-x-3 text-sm">
                <span className="text-slate-300 light:text-gray-700">
                  {userData ? `${capitalize(userData.firstName || '')} ${capitalize(userData.lastName || '')}`.trim() || userData.email : 'User'}
                </span>
                {userData?.profileImageUrl ? (
                  <img 
                    src={userData.profileImageUrl} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover border-2 border-cyan-500/50"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 
                                  rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            )}
            
            {/* Demo Mode Indicator */}
            {isDemoMode && (
              <div className="flex items-center space-x-3 text-sm">
                <span className="text-cyan-300 light:text-blue-600 font-medium">Demo Mode</span>
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 
                                rounded-full flex items-center justify-center">
                  <Eye className="h-4 w-4 text-white" />
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <button className="p-2 rounded-lg bg-slate-800/50 light:bg-gray-100 hover:bg-slate-700/50 light:hover:bg-gray-200
                                 text-slate-400 light:text-gray-600 hover:text-cyan-400 light:hover:text-blue-600 transition-colors">
                <Settings className="h-4 w-4" />
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-lg bg-slate-800/50 light:bg-gray-100 hover:bg-slate-700/50 light:hover:bg-gray-200
                           text-slate-400 light:text-gray-600 hover:text-red-400 light:hover:text-red-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
            
            {/* Timestamp */}
            <div className="text-xs text-slate-500 light:text-gray-500 border-l border-slate-700 light:border-gray-300 pl-4">
              <div>Thursday, July 24, 2025</div>
              <div className="text-cyan-400 light:text-blue-600">11:42 AM +03</div>
            </div>
            
            {/* Company Logos - Right Side */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-700 light:border-gray-300">
              <a 
                href="https://www.asm.net/mes-hercules" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/95 light:bg-white border border-slate-700/50 light:border-gray-200 cursor-pointer 
                           hover:bg-white light:hover:bg-gray-50 transition-all duration-300"
              >
                <img 
                  src={asmLogo}
                  alt="ASM Process Automation" 
                  className="h-14 w-auto object-contain
                             drop-shadow-[0_2px_8px_rgba(6,182,212,0.2)] 
                             light:drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]
                             hover:scale-105 transition-transform duration-300"
                />
              </a>
              <div className="p-2 rounded-lg bg-slate-800/30 light:bg-gray-50/80 border border-slate-700/50 light:border-gray-200">
                <img 
                  src={saudiTechLogo}
                  alt="Saudi Tech Hercules" 
                  className="h-14 w-auto object-contain brightness-110 
                             drop-shadow-[0_2px_8px_rgba(6,182,212,0.3)] 
                             dark:drop-shadow-[0_2px_8px_rgba(6,182,212,0.3)]
                             light:drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]
                             hover:scale-105 transition-transform duration-300"
                />
              </div>
              <a 
                href="https://xcelerator.siemens.com/global/en/all-offerings/products/hercules-v2-0.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-slate-800/30 light:bg-gray-50/80 border border-slate-700/50 light:border-gray-200 cursor-pointer"
              >
                <img 
                  src={siemensLogo}
                  alt="Siemens" 
                  className="h-14 w-auto object-contain brightness-110 
                             drop-shadow-[0_2px_8px_rgba(6,182,212,0.3)] 
                             dark:drop-shadow-[0_2px_8px_rgba(6,182,212,0.3)]
                             light:drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]
                             hover:scale-105 transition-transform duration-300"
                />
              </a>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-2 relative smooth-scroll
                         bg-transparent light:bg-transparent">
          
          {/* Background Grid Pattern - Hidden in light mode */}
          <div className="absolute inset-0 pointer-events-none opacity-5 light:opacity-0">
            <div className="w-full h-full" 
                 style={{
                   backgroundImage: `linear-gradient(rgba(0,188,212,0.1) 1px, transparent 1px),
                                    linear-gradient(90deg, rgba(0,188,212,0.1) 1px, transparent 1px)`,
                   backgroundSize: '50px 50px'
                 }}>
            </div>
          </div>
          
          {/* Content Container */}
          <div className="relative z-10 max-w-full page-transition page-transition-enter-active">
            {children}
          </div>
          
          {/* Floating Particles - Hidden in light mode */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden light:hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 10}s`,
                  animationDuration: `${15 + Math.random() * 10}s`
                }}
              />
            ))}
          </div>
        </main>
        
        
      </div>
    </div>
  );
}