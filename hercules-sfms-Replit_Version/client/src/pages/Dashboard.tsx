import { useState } from "react";
import { useLocation, Link } from "wouter";
import { FacilityCard } from "@/components/FacilityCard";
import { NetworkTopology } from "@/components/NetworkTopology";
import { LeftDashboardPanel } from "@/components/LeftDashboardPanel";
import { RightDashboardPanel } from "@/components/RightDashboardPanel";
import { CenterMetricsPanel } from "@/components/CenterMetricsPanel";
import { KPIVisualizationCards } from "@/components/KPIVisualizationCards";
import { mockFacilities, aggregateMetrics } from "@/lib/mockData";
import { Facility } from "@shared/schema";
import herculesLogo from "../assets/hercules-logo-final.png";

export default function Dashboard() {
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [, setLocation] = useLocation();

  const handleFacilityClick = (facility: Facility) => {
    setSelectedFacility(facility);
    setLocation(`/facility/${facility.id}/overview`);
  };

  return (
    <div className="h-screen overflow-hidden relative">
      {/* Enhanced Background with Matrix Effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 cyber-grid opacity-20" />
        
        {/* Matrix Rain Effect */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-px bg-gradient-to-b from-transparent via-[hsl(120,100%,70%)] to-transparent opacity-30"
              style={{
                left: `${i * 5}%`,
                height: '100px',
                animation: `matrix-rain ${3 + Math.random() * 4}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-[hsl(180,100%,50%)] rounded-full opacity-40 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `data-flow ${4 + Math.random() * 6}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      </div>
      {/* Main Layout Container - Flexbox Layout */}
      <div className="h-screen p-1 flex flex-col gap-1 relative z-10">
        
        {/* Header Control Panel - Compressed */}
        <div className="flex-shrink-0 h-12 holographic rounded-lg p-2 flex items-center justify-between relative overflow-hidden">
          {/* Scanning Line Effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[hsl(180,100%,50%)] to-transparent animate-data-flow" />
            <div className="data-particle" style={{ top: '50%', animationDelay: '0s' }} />
            <div className="data-particle" style={{ top: '30%', animationDelay: '1s' }} />
            <div className="data-particle" style={{ top: '70%', animationDelay: '2s' }} />
          </div>
          
          <div className="flex items-center justify-between w-full bg-gradient-to-r from-slate-900/90 via-slate-800/70 to-slate-900/90 backdrop-blur-md rounded px-3 py-1.5 border border-cyan-500/20 shadow-lg shadow-cyan-500/10 z-10">
            {/* Left side - Logo and branding */}
            <div className="flex items-center space-x-2">
              <img 
                src={herculesLogo} 
                alt="Hercules v2.0" 
                className="h-6 w-auto object-contain"
                style={{ 
                  filter: 'brightness(0) invert(1)',
                  opacity: 0.95,
                  imageRendering: 'crisp-edges'
                }}
              />
              <div className="h-5 w-px bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent"></div>
              <div className="text-xs text-slate-300 font-bold tracking-wider uppercase" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.1em' }}>
                Water Management System
              </div>
            </div>
            
            {/* Right side - Status and system info */}
            <div className="flex items-center space-x-3 text-xs font-mono">
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-[hsl(158,100%,50%)] rounded-full animate-pulse"></div>
                <span className="text-[hsl(158,100%,50%)] text-xs">NEURAL LINK ACTIVE</span>
              </div>
              <div className="text-slate-400 text-xs">|</div>
              <div className="text-slate-300 text-xs">{new Date().toLocaleString()}</div>
              <div className="text-slate-400 text-xs">|</div>
              <div className="px-2 py-0.5 bg-cyan-500/15 rounded text-cyan-300 border border-cyan-500/30 font-semibold text-xs">
                SECTOR 7-G
              </div>
            </div>
          </div>
        </div>

        {/* KPI Overview Row - Enhanced with Visualizations */}
        <KPIVisualizationCards />

        {/* Main Content Area - Three Column Layout with Center Metrics - Compressed */}
        <div className="flex-1 flex gap-0.5 min-h-0">
          {/* Left Dashboard Panel - Reduced width */}
          <div className="w-80">
            <LeftDashboardPanel />
          </div>

          {/* Center - Metrics and Network Topology */}
          <div className="flex-1 flex flex-col gap-0.5">
            <CenterMetricsPanel />
            <div className="flex-1">
              <NetworkTopology 
                facilities={mockFacilities}
                onFacilityClick={handleFacilityClick}
              />
            </div>
          </div>

          {/* Right Dashboard Panel - Reduced width */}
          <div className="w-80">
            <RightDashboardPanel />
          </div>
        </div>
      </div>
      {/* Ambient Glow Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-[hsl(180,100%,50%)] rounded-full opacity-5 blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[hsl(270,100%,50%)] rounded-full opacity-5 blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-[hsl(158,100%,50%)] rounded-full opacity-5 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>
    </div>
  );
}
