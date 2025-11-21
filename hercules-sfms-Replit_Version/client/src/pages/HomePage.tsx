import React, { useState } from 'react';
import { Link } from 'wouter';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { 
  Factory, ArrowRight, CheckCircle2, Zap, Shield, Globe, 
  Cpu, Database, Settings, BarChart3, Monitor, Cable,
  Network, Wifi, Server, Lock, Eye, Play, UserPlus, LogIn
} from 'lucide-react';

// Import existing assets
import futuristicNeonVideo from '@assets/20250725_1923_Futuristic Neon Serenity_simple_compose_01k112wfdvfd5v7jndrbpsca92_1753707277024.mp4';
import herculesFooterLogo from '@assets/image_1753777345427.png';
import herculesLogo from '@assets/image-removebg-preview (3)_1756997445528.png';
import herculesLightLogo from '@assets/image_1756997811057.png';
import asmLogo from '@assets/image_1761069158022.png';
import saudiTechLogo from '@assets/Saudi Tech_1761044645583.jpg';
import siemensLogo from '@assets/simiuns_1761046009824.jpeg';

const PLCBrands = [
  { name: 'Siemens', models: ['S7-1200', 'S7-1500', 'S7-300', 'S7-400'], color: 'from-blue-500 to-blue-700', count: '120+' },
  { name: 'Allen-Bradley', models: ['ControlLogix', 'CompactLogix', 'MicroLogix'], color: 'from-red-500 to-red-700', count: '85+' },
  { name: 'Schneider Electric', models: ['Modicon M580', 'M340', 'M221'], color: 'from-green-500 to-green-700', count: '75+' },
  { name: 'Mitsubishi', models: ['FX Series', 'Q Series', 'iQ-R'], color: 'from-orange-500 to-orange-700', count: '90+' },
  { name: 'Omron', models: ['CP1E', 'CJ2M', 'NX Series'], color: 'from-purple-500 to-purple-700', count: '65+' },
];

const Protocols = [
  { name: 'Modbus TCP/RTU', icon: Network, description: 'Universal industrial protocol' },
  { name: 'Ethernet/IP', icon: Wifi, description: 'Rockwell ecosystem standard' },
  { name: 'Siemens S7', icon: Server, description: 'Native S7 communication' },
  { name: 'OPC UA', icon: Database, description: 'Modern secure standard' },
  { name: 'Profinet', icon: Cable, description: 'Real-time distributed I/O' },
];

const Industries = [
  { 
    name: 'Oil & Gas', 
    icon: Factory, 
    applications: ['Pipeline monitoring', 'Refinery automation', 'Tank farms'],
    color: 'from-amber-500 to-orange-600'
  },
  { 
    name: 'Chemical Processing', 
    icon: Cpu, 
    applications: ['Reactor control', 'Batch processing', 'Safety systems'],
    color: 'from-purple-500 to-indigo-600'
  },
  { 
    name: 'Pharmaceutical', 
    icon: Shield, 
    applications: ['Clean room monitoring', 'Batch records', 'Quality control'],
    color: 'from-green-500 to-emerald-600'
  },
  { 
    name: 'Food & Beverage', 
    icon: Settings, 
    applications: ['Production lines', 'Quality assurance', 'Packaging'],
    color: 'from-blue-500 to-cyan-600'
  },
  { 
    name: 'Automotive', 
    icon: Zap, 
    applications: ['Assembly lines', 'Paint shops', 'Testing stations'],
    color: 'from-red-500 to-pink-600'
  },
  { 
    name: 'Water Treatment', 
    icon: Monitor, 
    applications: ['SCADA systems', 'Chemical dosing', 'Flow control'],
    color: 'from-cyan-500 to-blue-600'
  },
];

const Features = [
  { 
    icon: Database, 
    title: 'Universal PLC Support', 
    description: '500+ PLC models from major manufacturers',
    highlight: '15+ Protocols'
  },
  { 
    icon: Globe, 
    title: 'Multi-Tenant Cloud', 
    description: 'Secure isolated environments for each organization',
    highlight: 'Enterprise Ready'
  },
  { 
    icon: Shield, 
    title: 'Local Data Security', 
    description: 'Production data stays at your facility, configs in cloud',
    highlight: '100% Secure'
  },
  { 
    icon: BarChart3, 
    title: 'Real-Time Analytics', 
    description: 'Live dashboards with customizable widgets and alerts',
    highlight: 'Tag-Based'
  },
];

export default function HomePage() {
  const { theme } = useTheme();
  const [selectedIndustry, setSelectedIndustry] = useState<number | null>(null);
  
  // Force cache bust - v2
  
  // Handle gateway download
  const handleGatewayDownload = () => {
    window.location.href = '/api/download/gateway';
  };

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 
                    light:bg-transparent text-white light:text-gray-900 relative overflow-x-hidden">
      
      {/* Futuristic Video Background - Same as main app */}
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
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/30 to-slate-950/50"></div>
        )}
        {theme === 'light' && (
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/20"></div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">
        
        {/* Navigation Header */}
        <header className="bg-slate-900/95 light:bg-white/90 border-b border-slate-700/50 light:border-gray-200 backdrop-blur-sm 
                          px-6 py-4 flex items-center justify-between shadow-lg light:shadow-xl">
          {/* Logo only - no text */}
          <div className="flex-shrink-0">
            {/* Light mode logo */}
            <img 
              src={herculesLightLogo} 
              alt="Hercules v2 - Smart Factory Management System" 
              className="h-10 md:h-12 w-auto light:block hidden"
              style={{
                minHeight: '40px',
                objectFit: 'contain'
              }}
            />
            {/* Dark mode logo */}
            <img 
              src={herculesFooterLogo} 
              alt="Hercules v2 - Smart Factory Management System" 
              className="h-10 md:h-12 w-auto light:hidden block"
              style={{
                minHeight: '40px',
                objectFit: 'contain'
              }}
            />
          </div>
          
          <div className="flex items-center gap-3">
            {/* Company Logos */}
            <div className="flex items-center gap-2 pr-3 border-r border-slate-700 light:border-gray-300">
              <a 
                href="https://www.asm.net/mes-hercules" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-white/95 light:bg-white border border-slate-700/50 light:border-gray-200 cursor-pointer 
                           hover:bg-white light:hover:bg-gray-50 transition-all duration-300"
              >
                <img 
                  src={asmLogo}
                  alt="ASM Process Automation" 
                  className="h-10 w-auto object-contain
                             drop-shadow-[0_1px_4px_rgba(6,182,212,0.2)] 
                             light:drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]
                             hover:scale-105 transition-transform duration-300"
                />
              </a>
              <div className="p-1.5 rounded-lg bg-slate-800/30 light:bg-gray-50/80 border border-slate-700/50 light:border-gray-200">
                <img 
                  src={saudiTechLogo}
                  alt="Saudi Tech Hercules" 
                  className="h-10 w-auto object-contain brightness-110 
                             drop-shadow-[0_1px_4px_rgba(6,182,212,0.3)] 
                             dark:drop-shadow-[0_1px_4px_rgba(6,182,212,0.3)]
                             light:drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]
                             hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-1.5 rounded-lg bg-white/95 light:bg-white border border-slate-700/50 light:border-gray-200">
                <img 
                  src={siemensLogo}
                  alt="Siemens" 
                  className="h-10 w-auto object-contain
                             drop-shadow-[0_1px_4px_rgba(6,182,212,0.2)] 
                             light:drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]
                             hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
            
            <ThemeToggle />
            <Link to="/custom-auth">
              <Button variant="outline">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="px-6 py-20 text-center">
          <div className="max-w-6xl mx-auto">
            
            {/* Large Logo with Enhanced 3D Effects */}
            <div className="mb-12 perspective-1000">
              <div className="relative group">
                {/* Background glow layers */}
                <div className="absolute inset-0 -m-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-3xl rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/30 to-blue-600/30 blur-2xl rounded-full animate-pulse delay-300"></div>
                </div>
                
                {/* Main logo with 3D effects */}
                <div className="relative transform-gpu transition-all duration-700 group-hover:scale-110 group-hover:rotate-y-12 group-hover:-translate-y-2">
                  <img 
                    src={herculesLogo} 
                    alt="Hercules Logo" 
                    className="h-24 md:h-32 lg:h-36 w-auto mx-auto relative z-10"
                    style={{ 
                      filter: `
                        drop-shadow(0 0 30px rgba(6, 182, 212, 0.8))
                        drop-shadow(0 0 60px rgba(59, 130, 246, 0.6))
                        drop-shadow(0 8px 25px rgba(0, 0, 0, 0.4))
                        drop-shadow(0 15px 35px rgba(6, 182, 212, 0.3))
                        brightness(1.1)
                        contrast(1.2)
                        saturate(1.3)
                      `,
                      transform: 'translateZ(50px) rotateX(5deg)',
                      transformStyle: 'preserve-3d'
                    }}
                  />
                  
                  {/* Holographic reflection effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000 delay-200"></div>
                  
                  {/* 3D base shadow */}
                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-8 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent blur-xl rounded-full"></div>
                </div>
                
                {/* Orbiting particles */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400 rounded-full animate-ping delay-100"></div>
                  <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-blue-500 rounded-full animate-ping delay-500"></div>
                  <div className="absolute bottom-1/4 left-3/4 w-1.5 h-1.5 bg-cyan-300 rounded-full animate-ping delay-700"></div>
                </div>
                
                {/* Cyber grid background */}
                <div className="absolute inset-0 -m-16 opacity-20">
                  <div className="w-full h-full" style={{
                    backgroundImage: `
                      linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                  }}></div>
                </div>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white light:text-gray-900 mb-8 tracking-tight">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                  Smart Factory Management System
                </span>
              </h1>
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 dark:from-cyan-400 dark:via-blue-500 dark:to-purple-600 light:from-blue-600 light:via-indigo-600 light:to-purple-700 bg-clip-text text-transparent">
                We Turn Data Into Action
              </span>
            </h2>
            
            <p className="text-xl text-slate-200 dark:text-slate-200 light:text-gray-800 mb-8 max-w-4xl mx-auto leading-relaxed font-medium">
              Transform your factory with cloud-based PLC monitoring and control. Support for <strong>500+ PLC models</strong> across <strong>15+ protocols</strong>. 
              Configure remotely, keep data local.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Link to="/custom-auth">
                <Button size="lg" className="text-lg px-8 py-4">
                  <Play className="h-5 w-5 mr-2" />
                  Start 15-Day Demo
                </Button>
              </Link>
              <Link to="/demo">
                <Button size="lg" variant="secondary" className="text-lg px-8 py-4">
                  <Eye className="h-5 w-5 mr-2" />
                  View Live Demo
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-cyan-500 text-cyan-400 hover:bg-cyan-500/10">
                  <Zap className="h-5 w-5 mr-2" />
                  View Pricing
                </Button>
              </Link>
            </div>

            {/* Admin Access Section with Professional Styling */}
            <div className="mt-12 pt-12 border-t border-slate-700/30 dark:border-slate-700/30 light:border-gray-300/50">
              <div className="relative">
                {/* Decorative elements */}
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 px-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 light:bg-white">
                  <span className="text-sm font-medium text-slate-400 dark:text-slate-400 light:text-gray-600 uppercase tracking-wider">System Administration</span>
                </div>
                
                <Link to="/admin/login">
                  <Button 
                    size="lg" 
                    className="relative group text-lg px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-0"
                    data-testid="hero-admin-login-button"
                  >
                    {/* Animated background effect */}
                    <span className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500"></span>
                    
                    {/* Button content */}
                    <span className="relative flex items-center">
                      <Shield className="h-6 w-6 mr-3" />
                      <span>Administrator Login</span>
                      <ArrowRight className="h-5 w-5 ml-3 transform group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                    
                    {/* Shine effect */}
                    <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></span>
                  </Button>
                </Link>
                
                <p className="mt-4 text-sm text-slate-400 dark:text-slate-400 light:text-gray-600">
                  <Lock className="inline-block h-3 w-3 mr-1" />
                  Secure access for system administrators and technical staff
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400 dark:text-cyan-400 light:text-blue-700">500+</div>
                <div className="text-sm text-slate-300 dark:text-slate-300 light:text-gray-700 font-medium">PLC Models</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400 dark:text-cyan-400 light:text-blue-700">15+</div>
                <div className="text-sm text-slate-300 dark:text-slate-300 light:text-gray-700 font-medium">Protocols</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400 dark:text-cyan-400 light:text-blue-700">24/7</div>
                <div className="text-sm text-slate-300 dark:text-slate-300 light:text-gray-700 font-medium">Monitoring</div>
              </div>
            </div>
          </div>
        </section>

        {/* PLC Support Section */}
        <section className="px-6 py-20 bg-slate-900/60 light:bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white dark:text-white light:text-gray-900 mb-4">Universal PLC Compatibility</h2>
              <p className="text-xl text-slate-200 dark:text-slate-200 light:text-gray-700 font-medium">
                Connect to any industrial controller from major manufacturers
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {PLCBrands.map((brand, index) => (
                <Card key={index} className="bg-slate-800/80 light:bg-white/90 border-slate-700/50 light:border-gray-200 backdrop-blur-sm hover:scale-105 transition-transform">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white light:text-gray-900 flex items-center justify-between">
                      <span className="text-lg">{brand.name}</span>
                      <Badge className={`bg-gradient-to-r ${brand.color} text-white text-xs`}>
                        {brand.count}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {brand.models.map((model, idx) => (
                      <div key={idx} className="flex items-center text-sm text-slate-200 dark:text-slate-200 light:text-gray-700 font-medium">
                        <CheckCircle2 className="h-3 w-3 text-green-500 mr-2" />
                        {model}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Protocols Section */}
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white dark:text-white light:text-gray-900 mb-4">Industrial Communication Protocols</h2>
              <p className="text-xl text-slate-200 dark:text-slate-200 light:text-gray-700 font-medium">
                Native support for industry-standard protocols. No adapters or converters needed.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Protocols.map((protocol, index) => (
                <Card key={index} className="bg-slate-800/60 light:bg-white/90 border-slate-700/50 light:border-gray-200 backdrop-blur-sm hover:border-cyan-500 light:hover:border-blue-400 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-white light:text-gray-900 flex items-center">
                      <protocol.icon className="h-6 w-6 text-cyan-400 light:text-blue-600 mr-3" />
                      {protocol.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-200 dark:text-slate-200 light:text-gray-700 font-medium">{protocol.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Industries Section */}
        <section className="px-6 py-20 bg-slate-900/40 light:bg-gray-50/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white dark:text-white light:text-gray-900 mb-4">Built for Every Industry</h2>
              <p className="text-xl text-slate-200 dark:text-slate-200 light:text-gray-700 font-medium">
                Industry-specific solutions for comprehensive operational visibility.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Industries.map((industry, index) => (
                <Card 
                  key={index}
                  className={`bg-slate-800/70 light:bg-white/95 border-slate-700/50 light:border-gray-200 backdrop-blur-sm cursor-pointer transition-all hover:scale-105
                            ${selectedIndustry === index ? 'ring-2 ring-cyan-400 light:ring-blue-400' : ''}`}
                  onClick={() => setSelectedIndustry(selectedIndustry === index ? null : index)}
                >
                  <CardHeader>
                    <CardTitle className="text-white light:text-gray-900 flex items-center">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${industry.color} flex items-center justify-center mr-4`}>
                        <industry.icon className="h-5 w-5 text-white" />
                      </div>
                      {industry.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {industry.applications.map((app, idx) => (
                      <div key={idx} className="flex items-center text-sm text-slate-200 dark:text-slate-200 light:text-gray-700 font-medium">
                        <ArrowRight className="h-3 w-3 text-cyan-400 dark:text-cyan-400 light:text-blue-600 mr-2" />
                        {app}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white dark:text-white light:text-gray-900 mb-4">Enterprise-Grade Features</h2>
              <p className="text-xl text-slate-200 dark:text-slate-200 light:text-gray-700 font-medium">
                Everything you need to modernize your industrial operations.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {Features.map((feature, index) => (
                <Card key={index} className="bg-slate-800/60 light:bg-white/90 border-slate-700/50 light:border-gray-200 backdrop-blur-sm text-center">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-cyan-600 to-blue-600 light:from-blue-600 light:to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-white light:text-gray-900">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-slate-200 dark:text-slate-200 light:text-gray-700 text-sm font-medium">{feature.description}</p>
                    <Badge className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 text-cyan-400 border-cyan-500/50 light:from-blue-100 light:to-indigo-100 light:text-blue-700 light:border-blue-300">
                      {feature.highlight}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="px-6 py-20 bg-gradient-to-r from-slate-900/80 to-slate-800/80 light:from-blue-50/90 light:to-indigo-50/90 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl font-bold text-white dark:text-white light:text-gray-900 mb-6">
              Ready to Transform Your Factory?
            </h2>
            <p className="text-xl text-slate-200 dark:text-slate-200 light:text-gray-700 mb-8 font-medium">
              Join 500+ industrial companies monitoring their operations in real-time with Hercules v2.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Link to="/custom-auth">
                <Button size="lg" className="text-lg px-8 py-4">
                  <UserPlus className="h-5 w-5 mr-2" />
                  Try 15-Day Demo
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="secondary" 
                className="text-lg px-8 py-4"
                onClick={handleGatewayDownload}
                data-testid="download-gateway-button"
              >
                <Cable className="h-5 w-5 mr-2" />
                Download Gateway (241 MB)
              </Button>
            </div>
            
            <p className="text-sm text-slate-300 dark:text-slate-300 light:text-gray-600 mt-6 font-medium">
              No credit card required • 15-day demo • Setup in under 10 minutes
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-12 bg-slate-950/95 light:bg-white border-t border-slate-700/50 light:border-gray-200 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center space-x-4 mb-6 md:mb-0">
                {/* Footer logo with subtle 3D effects */}
                <div className="relative group">
                  <img 
                    src={herculesLogo} 
                    alt="Hercules Logo" 
                    className="h-10 w-auto transition-all duration-300 group-hover:scale-105"
                    style={{ 
                      filter: `
                        drop-shadow(0 0 15px rgba(6, 182, 212, 0.4))
                        drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))
                        brightness(1.05)
                        contrast(1.1)
                      `
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 blur-lg rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white light:text-gray-900">Hercules v2</h3>
                  <p className="text-sm text-slate-400 light:text-gray-600">Smart Factory Management System</p>
                </div>
              </div>
              
              <div className="text-sm text-slate-400 light:text-gray-600 text-center md:text-right">
                <p>© 2025 Hercules SFMS. All rights reserved.</p>
                <p className="mt-1">Industrial IoT • Cloud Platform • PLC Integration</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}