import { useEffect, useState } from 'react';
import { Download, Clock, Key, Check, AlertCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function DemoSetup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [demoStatus, setDemoStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchDemoStatus();
  }, []);

  const fetchDemoStatus = async () => {
    try {
      const response = await fetch('/api/demo/status', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDemoStatus(data);
      }
    } catch (error) {
      console.error('Error fetching demo status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGatewayDownload = async () => {
    setDownloading(true);
    try {
      const response = await apiRequest('POST', '/api/gateway/generate-download');
      const payload = await response.json();
      
      const downloadUrl = `/downloads/hercules-gateway-${payload.osType}.zip`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `hercules-gateway-${payload.osType}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Gateway Download Started",
        description: `Your demo key: ${payload.demoKey}`,
      });
      
      // Refresh demo status
      await fetchDemoStatus();
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to generate gateway download. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading demo setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hercules SFMS - Demo Setup</h1>
              <p className="text-sm text-gray-600">Welcome, {user?.email}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/api/logout'}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Status Alert */}
        {demoStatus && (
          <Alert className={`mb-6 ${demoStatus.remainingDays <= 3 ? 'border-yellow-500' : 'border-blue-500'}`}>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Demo Period:</strong> {demoStatus.remainingDays} days remaining 
              (expires on {new Date(demoStatus.demoEndDate).toLocaleDateString()})
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gateway Download Card */}
          <Card>
            <CardHeader>
              <CardTitle>Gateway Software</CardTitle>
              <CardDescription>
                Download and install the gateway to connect your PLCs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {demoStatus?.gatewayDownloaded ? (
                <div className="space-y-4">
                  <div className="flex items-center text-green-600">
                    <Check className="w-5 h-5 mr-2" />
                    <span>Gateway downloaded</span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Your Demo Key:</p>
                    <code className="text-xs bg-white px-2 py-1 rounded border">
                      {demoStatus.demoKey}
                    </code>
                  </div>
                  <Button 
                    onClick={handleGatewayDownload} 
                    variant="outline"
                    disabled={downloading}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Again
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    The gateway software creates a secure connection between your industrial PLCs 
                    and the Hercules cloud platform.
                  </p>
                  <Button 
                    onClick={handleGatewayDownload}
                    disabled={downloading}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {downloading ? 'Generating...' : 'Download Gateway'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Start Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Start Guide</CardTitle>
              <CardDescription>
                Get your system up and running
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-2">
                    1
                  </span>
                  <div>
                    <p className="font-medium">Download Gateway</p>
                    <p className="text-gray-600">Install on server with network access to PLCs</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-2">
                    2
                  </span>
                  <div>
                    <p className="font-medium">Enter Demo Key</p>
                    <p className="text-gray-600">Use your unique key during gateway setup</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-2">
                    3
                  </span>
                  <div>
                    <p className="font-medium">Configure PLCs</p>
                    <p className="text-gray-600">Add PLC connections and tag configurations</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-2">
                    4
                  </span>
                  <div>
                    <p className="font-medium">Access Dashboard</p>
                    <p className="text-gray-600">View real-time data and configure widgets</p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Features Available */}
          <Card>
            <CardHeader>
              <CardTitle>Demo Features</CardTitle>
              <CardDescription>
                Full access to all features during demo period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  'Real-time PLC data monitoring',
                  'Custom dashboard configuration',
                  'Tag management and mapping',
                  'Alert configuration',
                  'Report generation',
                  'Data export capabilities',
                  'Multi-facility support',
                  'User management'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Support Card */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>
                We're here to help you get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium mb-1">Documentation</p>
                <p className="text-xs text-gray-600">
                  Complete setup guides and API documentation
                </p>
                <Button variant="link" className="px-0 h-auto mt-2">
                  View Docs →
                </Button>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm font-medium mb-1">Technical Support</p>
                <p className="text-xs text-gray-600">
                  Get help with gateway setup and PLC configuration
                </p>
                <Button variant="link" className="px-0 h-auto mt-2">
                  Contact Support →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Access Main Application Button */}
        <div className="mt-8 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-8">
              <h3 className="text-lg font-semibold mb-2">Ready to explore?</h3>
              <p className="text-gray-600 mb-4">
                Once your gateway is connected, access the full application
              </p>
              <Button 
                size="lg"
                onClick={() => window.location.href = '/dashboard'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Go to Main Application →
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}