import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { loginSchema, registerSchema, type LoginRequest, type RegisterRequest } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, Factory, Zap, Copy, CheckCircle2, AlertCircle,
  Lock, Mail, User, Building2, Globe, Download, Eye, EyeOff
} from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { useTheme } from '@/contexts/ThemeContext';

// Import existing assets
import futuristicNeonVideo from '@assets/20250725_1923_Futuristic Neon Serenity_simple_compose_01k112wfdvfd5v7jndrbpsca92_1753707277024.mp4';

interface AuthResponse {
  message: string;
  token: string;
  sessionId?: string;  // Added sessionId to the response
  activationCode?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  tenant: {
    id: string;
    companyName: string;
    companyCode: string;
    demoEndDate: string;
  };
}

export function AuthPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState<string>('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [activationCode, setActivationCode] = useState<string>('');
  const [showActivationCode, setShowActivationCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const { theme } = useTheme();

  const loginForm = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterRequest>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      companyName: '',
      country: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      const response = await apiRequest('POST', '/api/auth/login', data);
      return response.json() as Promise<AuthResponse>;
    },
    onSuccess: (data) => {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('tenant', JSON.stringify(data.tenant));
      // Save sessionId for API authentication
      if (data.sessionId) {
        localStorage.setItem('sessionId', data.sessionId);
      }
      setError('');
      setLocation('/dashboard');
    },
    onError: (error: any) => {
      setError(error.message || 'Login failed');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const response = await apiRequest('POST', '/api/auth/register', data);
      return response.json() as Promise<AuthResponse>;
    },
    onSuccess: (data) => {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('tenant', JSON.stringify(data.tenant));
      // Save sessionId for API authentication
      if (data.sessionId) {
        localStorage.setItem('sessionId', data.sessionId);
      }
      setError('');
      if (data.activationCode) {
        setActivationCode(data.activationCode);
        setRegistrationSuccess(true);
      } else {
        setLocation('/dashboard');
      }
    },
    onError: (error: any) => {
      setError(error.message || 'Registration failed');
    },
  });

  const onLogin = (data: LoginRequest) => {
    setError('');
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterRequest) => {
    setError('');
    registerMutation.mutate(data);
  };

  const copyActivationCode = () => {
    navigator.clipboard.writeText(activationCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const continueToDownload = () => {
    setLocation('/download');
  };

  if (registrationSuccess && activationCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 
                      light:bg-transparent
                      flex items-center justify-center p-4">
        
        {/* Background Video */}
        <div className="absolute inset-0 pointer-events-none">
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
        
        <Card className="w-full max-w-2xl backdrop-blur-sm bg-slate-900/80 border-slate-700/50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white">
              Welcome to Hercules v2!
            </CardTitle>
            <CardDescription className="text-slate-300 text-lg mt-2">
              Your 15-day demo has been activated
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert className="border-green-600/50 bg-green-900/30">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-green-200">
                <strong>Registration successful!</strong> Your demo account is ready. Save your activation code below to connect your gateway.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label className="text-white">Your Gateway Activation Code</Label>
              <div className="flex items-center space-x-3">
                <div className="flex-1 p-4 bg-slate-800/50 rounded-lg border border-slate-600 font-mono">
                  {showActivationCode ? (
                    <span className="text-cyan-400 text-lg tracking-wider">{activationCode}</span>
                  ) : (
                    <span className="text-slate-500">••••••••••••••••</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowActivationCode(!showActivationCode)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  {showActivationCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  onClick={copyActivationCode}
                  disabled={!showActivationCode}
                  className="border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-white"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {codeCopied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <p className="text-sm text-slate-400">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Save this code - you'll need it to activate your gateway
              </p>
            </div>
            
            <Separator className="bg-slate-700" />
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Next Steps:</h3>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Badge className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 text-cyan-400 border-cyan-500/50 px-2 py-1">
                    1
                  </Badge>
                  <div>
                    <p className="text-white font-medium">Download Gateway Software</p>
                    <p className="text-sm text-slate-400">Install on your factory computer</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Badge className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 text-cyan-400 border-cyan-500/50 px-2 py-1">
                    2
                  </Badge>
                  <div>
                    <p className="text-white font-medium">Enter Activation Code</p>
                    <p className="text-sm text-slate-400">Link gateway to your account</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Badge className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 text-cyan-400 border-cyan-500/50 px-2 py-1">
                    3
                  </Badge>
                  <div>
                    <p className="text-white font-medium">Configure PLCs</p>
                    <p className="text-sm text-slate-400">Connect and monitor your controllers</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={continueToDownload}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Gateway
              </Button>
              <Button 
                onClick={() => setLocation('/dashboard')}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 
                    flex items-center justify-center p-4">
      
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Cyber Grid */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" 
               style={{
                 backgroundImage: `linear-gradient(rgba(0,188,212,0.3) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(0,188,212,0.3) 1px, transparent 1px)`,
                 backgroundSize: '50px 50px'
               }}>
          </div>
        </div>
        
        {/* Background Video */}
        <div className="absolute inset-0 pointer-events-none">
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
      </div>
      
      <Card className="w-full max-w-md backdrop-blur-sm bg-slate-900/80 border-slate-700/50 relative z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Factory className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Hercules v2
          </CardTitle>
          <CardDescription className="text-slate-300">
            Industrial SaaS Platform - 15-Day Demo
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Demo Badge */}
          <div className="flex justify-center">
            <Badge className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-400 border-green-500/50 px-4 py-1.5">
              <Zap className="h-3 w-3 mr-1" />
              15-Day Free Demo • No Credit Card Required
            </Badge>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
              <TabsTrigger value="login" className="text-slate-300 data-[state=active]:text-white">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="text-slate-300 data-[state=active]:text-white">
                Start Demo
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              {error && (
                <Alert className="border-red-600/50 bg-red-900/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      {...loginForm.register('email')}
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 pl-10"
                      placeholder="your@email.com"
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-red-400 text-sm">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      {...loginForm.register('password')}
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 pl-10"
                      placeholder="••••••••"
                    />
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-red-400 text-sm">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4">
              {error && (
                <Alert className="border-red-600/50 bg-red-900/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-slate-300">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="firstName"
                        {...registerForm.register('firstName')}
                        className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 pl-10"
                        placeholder="John"
                      />
                    </div>
                    {registerForm.formState.errors.firstName && (
                      <p className="text-red-400 text-sm">{registerForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-slate-300">Last Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="lastName"
                        {...registerForm.register('lastName')}
                        className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 pl-10"
                        placeholder="Doe"
                      />
                    </div>
                    {registerForm.formState.errors.lastName && (
                      <p className="text-red-400 text-sm">{registerForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-slate-300">Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="companyName"
                      {...registerForm.register('companyName')}
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 pl-10"
                      placeholder="Acme Industries"
                    />
                  </div>
                  {registerForm.formState.errors.companyName && (
                    <p className="text-red-400 text-sm">{registerForm.formState.errors.companyName.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-slate-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="reg-email"
                      type="email"
                      {...registerForm.register('email')}
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 pl-10"
                      placeholder="your@email.com"
                    />
                  </div>
                  {registerForm.formState.errors.email && (
                    <p className="text-red-400 text-sm">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-slate-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="reg-password"
                      type="password"
                      {...registerForm.register('password')}
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 pl-10"
                      placeholder="••••••••"
                    />
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-red-400 text-sm">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-slate-300">Country</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="country"
                      {...registerForm.register('country')}
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 pl-10"
                      placeholder="United States"
                    />
                  </div>
                  {registerForm.formState.errors.country && (
                    <p className="text-red-400 text-sm">{registerForm.formState.errors.country.message}</p>
                  )}
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Demo Account...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Start 15-Day Demo
                    </>
                  )}
                </Button>
              </form>
              
              <p className="text-xs text-center text-slate-400">
                By registering, you agree to our demo terms. No credit card required.
              </p>
            </TabsContent>
          </Tabs>
          
          <Separator className="bg-slate-700" />
          
          <div className="text-center space-y-3">
            <div>
              <p className="text-sm text-slate-400 mb-2">
                Want to explore first?
              </p>
              <Link href="/demo">
                <Button 
                  variant="outline" 
                  className="border-emerald-600 text-emerald-400 hover:bg-emerald-900/30 w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Live Demo
                </Button>
              </Link>
            </div>
            <p className="text-sm text-slate-400">
              Need help? Visit our{' '}
              <Link href="/download" className="text-cyan-400 hover:underline">
                Gateway Download
              </Link>
              {' '}page
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}