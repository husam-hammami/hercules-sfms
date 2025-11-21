import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DemoProvider, useDemo } from "@/contexts/DemoContext";
import { DemoDataProvider } from "@/contexts/DemoDataContext";
import { LiveDataProvider } from "@/contexts/LiveDataContext";
import { useAuth } from "@/hooks/useAuth";
import { CustomAuthProvider, useCustomAuth } from "@/hooks/useCustomAuth";
import NotFound from "@/pages/not-found";

// HERCULES V2 - CORE PAGES
import HomePage from "./pages/HomePage";
import { AuthPage } from "./pages/auth/AuthPage";
import { LandingPage } from "./pages/LandingPage";
import { DemoSetup } from "./pages/DemoSetup";
import { CustomAuth } from "./pages/CustomAuth";
import { Dashboard as WaterDashboard } from "./pages/water-system/Dashboard";
import { DemoDashboard } from "./pages/DemoDashboard";
import { PLCConfigPage } from "./pages/plc-config/PLCConfigPage";
import { PLCReports } from "./pages/water-system/PLCReports";
import TagDashboard from "./pages/TagDashboard";
import CustomTagDashboard from "./pages/CustomTagDashboard";
import TagReports from "./pages/TagReports";
import HistoricalData from "./pages/HistoricalData";
import LiveData from "./pages/LiveData";
import WelcomePage from "./pages/WelcomePage";
import Pricing from "./pages/Pricing";
import GatewayManagement from "./pages/GatewayManagement";
import GatewayDatabase from "./pages/GatewayDatabase";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import TestPLCData from "./pages/TestPLCData";
import GatewayDebug from "./pages/GatewayDebug";
import GatewayDebugSimple from "./pages/GatewayDebugSimple";
import { BatchCalendarPage } from "./pages/BatchCalendarPage";
import DigitalTwinPage from "./pages/DigitalTwinPage";
import FeedmillDigitalTwin from "./pages/FeedmillDigitalTwin";

// Component to handle dashboard access logic
function DashboardRoute() {
  const { isDemoMode } = useDemo();
  const { isAuthenticated } = useCustomAuth();
  const [, setLocation] = useLocation();

  console.log('[DashboardRoute] isDemoMode:', isDemoMode, 'isAuthenticated:', isAuthenticated);

  React.useEffect(() => {
    // If user is authenticated but not in demo mode, redirect to welcome
    if (isAuthenticated && !isDemoMode) {
      setLocation('/welcome');
    }
  }, [isAuthenticated, isDemoMode, setLocation]);

  // Show demo dashboard if in demo mode, otherwise show water dashboard
  if (isDemoMode) {
    console.log('[DashboardRoute] Rendering DemoDashboard');
    return <DemoDashboard />;
  }
  
  if (!isAuthenticated) {
    console.log('[DashboardRoute] Rendering WaterDashboard');
    return <WaterDashboard />;
  }

  return null; // Will redirect via useEffect
}

// Component to handle reports access logic
function ReportsRoute() {
  const { isDemoMode } = useDemo();
  const { isAuthenticated } = useCustomAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    // If user is authenticated but not in demo mode, redirect to welcome
    if (isAuthenticated && !isDemoMode) {
      setLocation('/welcome');
    }
  }, [isAuthenticated, isDemoMode, setLocation]);

  // Show reports only if in demo mode or not authenticated
  if (isDemoMode || !isAuthenticated) {
    return <PLCReports />;
  }

  return null; // Will redirect via useEffect
}

// Component to handle custom dashboard - only for authenticated users
function CustomDashboardRoute() {
  const { isDemoMode } = useDemo();
  const { isAuthenticated } = useCustomAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    // If in demo mode, redirect to pre-built dashboard instead
    if (isDemoMode) {
      setLocation('/dashboard');
    }
  }, [isDemoMode, setLocation]);

  // Only show custom dashboard builder for authenticated users
  if (isAuthenticated && !isDemoMode) {
    return <CustomTagDashboard />;
  }

  return null; // Will redirect via useEffect
}

function Router() {
  const [location, setLocation] = useLocation();
  const { isDemoMode, enterDemoMode } = useDemo();
  const { isAuthenticated } = useCustomAuth();
  
  // Force rebuild for new routes
  console.log("Routes reloaded at:", new Date().toISOString());

  // Handle demo route
  React.useEffect(() => {
    if (location === '/demo') {
      enterDemoMode();
      setLocation('/welcome');
    }
  }, [location]);

  return (
    <>
      <Switch>
        {/* HERCULES V2 - STREAMLINED ROUTING */}
        
        {/* Public Routes - Available to everyone */}
        <Route path="/" component={HomePage} />
        <Route path="/dashboard" component={DashboardRoute} />
        <Route path="/reports" component={ReportsRoute} />
        <Route path="/welcome" component={WelcomePage} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/custom-auth" component={CustomAuth} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/login" component={AuthPage} />
        <Route path="/register" component={AuthPage} />
        <Route path="/landing" component={LandingPage} />
        
        {/* Features available to both demo and authenticated users */}
        <Route path="/plc-config" component={PLCConfigPage} />
        <Route path="/engineering" component={PLCConfigPage} />
        <Route path="/control-center" component={PLCConfigPage} />
        <Route path="/custom-dashboard" component={CustomDashboardRoute} />
        <Route path="/tag-reports" component={TagReports} />
        <Route path="/historical-data" component={HistoricalData} />
        <Route path="/live-data" component={LiveData} />
        <Route path="/batch-calendar" component={BatchCalendarPage} />
        <Route path="/digital-twin" component={FeedmillDigitalTwin} />
        <Route path="/feedmill-twin" component={FeedmillDigitalTwin} />
        <Route path="/test-plc" component={TestPLCData} />
        <Route path="/gateway-debug" component={GatewayDebug} />
        <Route path="/test-debug" component={GatewayDebug} />
        
        {/* Protected Routes - Only for authenticated users */}
        <Route path="/setup" component={isAuthenticated ? DemoSetup : CustomAuth} />
        <Route path="/tag-dashboard" component={isAuthenticated ? TagDashboard : CustomAuth} />
        <Route path="/gateway-management" component={isAuthenticated ? GatewayManagement : CustomAuth} />
        <Route path="/gateway-database" component={isAuthenticated ? GatewayDatabase : CustomAuth} />
        
        {/* Admin Routes */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        
        {/* Redirects from legacy URLs */}
        <Route path="/plc-reports" component={() => { window.location.href = '/reports'; return null; }} />
        <Route path="/water-system/dashboard" component={() => { window.location.href = '/dashboard'; return null; }} />
        <Route path="/water-system" component={() => { window.location.href = '/dashboard'; return null; }} />
        
        {/* 404 for unknown routes */}
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CustomAuthProvider>
          <DemoProvider>
            <DemoDataProvider>
              <LiveDataProvider>
                <TooltipProvider>
                  <Toaster />
                  <Router />
                </TooltipProvider>
              </LiveDataProvider>
            </DemoDataProvider>
          </DemoProvider>
        </CustomAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;