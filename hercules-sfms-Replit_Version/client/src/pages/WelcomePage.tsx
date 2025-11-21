import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Shield, 
  Cpu, 
  Activity, 
  ChevronRight, 
  AlertTriangle,
  CheckCircle2,
  Server,
  Zap,
  Lock,
  Rocket,
  Database,
  Wifi,
  Clock,
  Settings,
  FileText,
  Grid,
  Factory,
  TrendingUp,
  HardDrive,
  Network,
  Terminal,
  Power,
  Layers,
  AlertCircle,
  Monitor,
  ArrowRight,
  Play,
  Sparkles,
  Globe,
  Users,
  BarChart3,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout';
import { Link } from 'wouter';

interface GatewayCodeData {
  code: string;
  status: 'issued' | 'redeemed' | 'revoked';
  expiresAt: string;
  redeemedAt?: string;
}

export default function WelcomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gatewayCode, setGatewayCode] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Update time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Animated background dots
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const dots: Array<{x: number, y: number, opacity: number, size: number}> = [];
    const dotCount = 50;

    for (let i = 0; i < dotCount; i++) {
      dots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        opacity: Math.random() * 0.3 + 0.1,
        size: Math.random() * 2 + 1
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      dots.forEach((dot) => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${dot.opacity})`;
        ctx.fill();
        
        dot.opacity = Math.sin(Date.now() * 0.001 + dot.x) * 0.2 + 0.2;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Load demo data
  useEffect(() => {
    const demoUser = localStorage.getItem('demoUser');
    if (demoUser) {
      try {
        const userObj = JSON.parse(demoUser);
        if (userObj.demoKey) {
          setGatewayCode(userObj.demoKey);
        }
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }
  }, []);

  // Generate activation code mutation
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/me/gateway/code/regenerate');
      return response.json();
    },
    onSuccess: (data) => {
      setGatewayCode(data.code);
      queryClient.invalidateQueries({ queryKey: ['/api/me/gateway/code'] });
      toast({
        title: 'Success',
        description: 'New activation code generated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate activation code',
        variant: 'destructive',
      });
    },
  });

  // Fetch existing codes
  const { data: codeData } = useQuery<GatewayCodeData>({
    queryKey: ['/api/me/gateway/code'],
    enabled: !!user,
  });

  useEffect(() => {
    if (codeData && codeData.code) {
      setGatewayCode(codeData.code);
    }
  }, [codeData]);

  const downloadGateway = async (platform: string) => {
    // Direct download from GitHub releases (241 MB Hercules_Gateway.exe)
    const downloadLink = 'https://github.com/mujahedozone-wq/Gateway/releases/download/V1/Hercules_Gateway.exe';
    
    toast({
      title: 'Download Started',
      description: `Downloading Hercules Gateway for ${platform} (241 MB)`,
    });
    
    // Trigger download
    window.location.href = downloadLink;
  };

  const features = [
    { 
      icon: Factory, 
      title: 'Smart Factory Control', 
      desc: 'Complete industrial automation',
      color: 'from-cyan-500 to-blue-500'
    },
    { 
      icon: Shield, 
      title: 'Enterprise Security', 
      desc: 'Bank-grade encryption',
      color: 'from-green-500 to-emerald-500'
    },
    { 
      icon: BarChart3, 
      title: 'Real-time Analytics', 
      desc: 'Live production insights',
      color: 'from-purple-500 to-pink-500'
    },
    { 
      icon: Globe, 
      title: 'Cloud Connected', 
      desc: 'Access from anywhere',
      color: 'from-orange-500 to-red-500'
    }
  ];

  const setupSteps = [
    { icon: Download, title: 'Download', desc: 'Get the gateway software' },
    { icon: Lock, title: 'Activate', desc: 'Enter your license code' },
    { icon: Network, title: 'Connect', desc: 'Link to your PLCs' },
    { icon: Play, title: 'Start', desc: 'Begin monitoring' }
  ];

  const quickLinks = [
    { title: 'PLC Configuration', icon: Cpu, link: '/plc-config', desc: 'Connect your controllers' },
    { title: 'Dashboard Designer', icon: Grid, link: '/custom-dashboard', desc: 'Create custom views' },
    { title: 'Gateway Management', icon: Server, link: '/gateway-management', desc: 'Monitor connections' },
    { title: 'Reports & Analytics', icon: FileText, link: '/tag-reports', desc: 'View system data' }
  ];

  const userName = user ? (user as any).firstName || (user as any).email?.split('@')[0] || 'there' : 'there';

  return (
    <WaterSystemLayout 
      title="Welcome to Hercules SFMS" 
      subtitle="Your Smart Factory Management System"
    >
      {/* Animated background */}
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10"
        style={{ zIndex: 0 }}
      />
      
      <div className="relative space-y-6" style={{ zIndex: 1 }}>
        {/* Hero Section - Properly Sized */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-cyan-200 dark:border-slate-700 p-6">
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <Badge className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/50 h-7 text-sm px-3">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    System Ready
                  </Badge>
                  <h1 className="text-3xl font-bold">
                    <span className="text-gray-900 dark:text-white">Welcome, </span>
                    <span className="bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                      {userName}!
                    </span>
                  </h1>
                </div>
                
                <p className="text-base text-gray-600 dark:text-gray-300 mb-6 max-w-2xl">
                  Transform your factory operations with AI-powered automation and real-time monitoring.
                </p>

                <div className="flex gap-3">
                  <Button 
                    size="default"
                    className="h-10 text-sm px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                  >
                    <Rocket className="h-5 w-5 mr-2" />
                    Start Setup
                  </Button>
                  <Button 
                    size="default"
                    variant="outline"
                    className="h-10 text-sm px-6 border-gray-300 dark:border-slate-600"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Watch Demo
                  </Button>
                  
                  <div className="flex items-center gap-3 ml-auto text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>15-day trial</span>
                    <span>•</span>
                    <span>No credit card</span>
                    <span>•</span>
                    <Zap className="h-4 w-4" />
                    <span>5 min setup</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid - Properly Sized */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="bg-white dark:bg-slate-900/50 border-gray-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-500 transition-all group"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0`}>
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{feature.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Setup Section - Properly Sized */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Setup Card */}
          <div className="lg:col-span-2">
            <Card className="bg-white dark:bg-slate-900/50 border-gray-200 dark:border-slate-700">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
                    <Terminal className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-900 dark:text-white">Quick Setup</CardTitle>
                    <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                      Get connected in minutes
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-6 pt-0">
                {/* Activation Code - Properly Sized */}
                <div className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10 rounded-lg border border-cyan-200 dark:border-cyan-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      <span className="font-medium text-base text-gray-900 dark:text-white">Activation Code</span>
                    </div>
                    {user ? (
                      <Button
                        onClick={() => generateCodeMutation.mutate()}
                        disabled={generateCodeMutation.isPending}
                        size="default"
                        variant="outline"
                        className="h-9 text-sm px-4 border-cyan-300 dark:border-cyan-500 text-cyan-700 dark:text-cyan-400"
                      >
                        {generateCodeMutation.isPending ? (
                          <span className="flex items-center">
                            <div className="h-4 w-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mr-2" />
                            Generating...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <Sparkles className="h-4 w-4 mr-2" />
                            {codeData?.status === 'redeemed' ? 'Generate New' : 'Regenerate'}
                          </span>
                        )}
                      </Button>
                    ) : null}
                  </div>
                  
                  {gatewayCode ? (
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-cyan-200 dark:border-cyan-700">
                      <code className="text-lg font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {gatewayCode}
                      </code>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {codeData?.status === 'redeemed' ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            Already redeemed • Generate new
                          </span>
                        ) : (
                          <>Valid 15 days • One-time use</>
                        )}
                      </p>
                    </div>
                  ) : user ? (
                    <div className="text-sm text-blue-600 dark:text-blue-400 p-2">
                      Click "Generate New" to create activation code
                    </div>
                  ) : (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                      <code className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
                        DEMO-17F7781B-MF8EPIWR
                      </code>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Demo mode • Login for full access
                      </p>
                    </div>
                  )}
                </div>

                {/* Download Section & Setup Steps Combined - Properly Sized */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Download className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Gateway Software</span>
                    </div>
                    <Button
                      onClick={() => downloadGateway('Windows')}
                      variant="outline"
                      size="default"
                      className="w-full h-10 text-sm border-gray-300 dark:border-slate-600"
                    >
                      <HardDrive className="h-5 w-5 mr-2" />
                      Download for Windows
                    </Button>
                  </div>

                  {/* Setup Steps */}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">Setup Steps</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                      {setupSteps.map((step, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {index + 1}
                          </span>
                          <step.icon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                          <span className="text-gray-700 dark:text-gray-300">{step.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links - Properly Sized */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base text-gray-900 dark:text-white">Quick Access</h3>
            <div className="space-y-3">
              {quickLinks.map((link, index) => (
                <Link key={index} href={link.link}>
                  <Card className="bg-white dark:bg-slate-900/50 border-gray-200 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-500 transition-all cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg group-hover:bg-cyan-100 dark:group-hover:bg-cyan-500/20 transition-colors">
                          <link.icon className="h-5 w-5 text-gray-700 dark:text-gray-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                            {link.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {link.desc}
                          </p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-500 opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Help Card - Properly Sized */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-800/50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white">Need Help?</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Check docs or support
                    </p>
                  </div>
                  <Button 
                    size="default" 
                    variant="link" 
                    className="h-auto px-0 text-sm text-purple-600 dark:text-purple-400"
                  >
                    View Docs →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </WaterSystemLayout>
  );
}