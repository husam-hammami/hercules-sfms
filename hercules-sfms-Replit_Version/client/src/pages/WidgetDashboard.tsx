import { EnhancedWidgetDashboard } from '@/components/EnhancedWidgetDashboard';
import { useQuery } from '@tanstack/react-query';
import { Facility } from '@shared/schema';
import herculesLogo from "../assets/hercules-logo-final.png";

export default function WidgetDashboard() {
  // Fetch facilities for the widget configuration
  const { data: facilities = [], isLoading } = useQuery<Facility[]>({
    queryKey: ['/api/facilities'],
    queryFn: () => fetch('/api/facilities').then(res => res.json()),
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading facilities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Hercules Header */}
      <div className="flex-shrink-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={herculesLogo} 
              alt="Hercules v2.0" 
              className="h-12 w-auto object-contain"
              style={{ 
                filter: 'brightness(0) invert(1)',
                opacity: 0.95,
                imageRendering: 'crisp-edges'
              }}
            />
            <div>
              <p className="text-slate-400 text-sm">
                Advanced Widget Dashboard v2.0
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400">NEURAL LINK ACTIVE</span>
            </div>
            <div className="text-slate-400">|</div>
            <div className="text-slate-300">{new Date().toLocaleString()}</div>
            <div className="text-slate-400">|</div>
            <div className="px-3 py-1 bg-cyan-500/15 rounded-md text-cyan-300 border border-cyan-500/30 font-semibold">
              WIDGET CONTROL
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <EnhancedWidgetDashboard facilities={facilities} />
      </div>
    </div>
  );
}