import { Shield, Gauge, Activity, Database, Download, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Hercules SFMS
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Industrial Factory Management System with real-time PLC communication, 
              comprehensive monitoring, and advanced analytics for modern manufacturing
            </p>
            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                onClick={() => window.location.href = '/api/login'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Start 15-Day Demo
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Learn More
              </Button>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              No credit card required • Full features for 15 days
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Complete Factory Management Solution
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to manage and optimize your industrial operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* PLC Communication */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">PLC Communication</h3>
              <p className="text-gray-600">
                Direct integration with Siemens, Allen-Bradley, Schneider, and other industrial PLCs
              </p>
            </div>

            {/* Real-time Monitoring */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Gauge className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-time Monitoring</h3>
              <p className="text-gray-600">
                Live dashboard with configurable widgets showing production metrics and KPIs
              </p>
            </div>

            {/* Data Management */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Data Management</h3>
              <p className="text-gray-600">
                Secure cloud storage with historical data analysis and reporting capabilities
              </p>
            </div>

            {/* Gateway System */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Download className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Secure Gateway</h3>
              <p className="text-gray-600">
                Local gateway software for secure connection between your PLCs and cloud platform
              </p>
            </div>

            {/* Alert System */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Alert Management</h3>
              <p className="text-gray-600">
                Configurable thresholds with email and SMS notifications for critical events
              </p>
            </div>

            {/* Reporting */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Automated Reports</h3>
              <p className="text-gray-600">
                Scheduled reports with customizable templates for production and quality metrics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Get Started in 3 Simple Steps
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold mb-1">Sign in with Google</h3>
                  <p className="text-gray-600">
                    Quick and secure authentication to start your 15-day demo instantly
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold mb-1">Download Gateway Software</h3>
                  <p className="text-gray-600">
                    Install our secure gateway on your local network to connect PLCs
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold mb-1">Configure & Monitor</h3>
                  <p className="text-gray-600">
                    Set up your PLCs, create dashboards, and start monitoring in real-time
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Start Your Demo Now
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">
            © 2025 Hercules SFMS. Enterprise factory management solution.
          </p>
        </div>
      </div>
    </div>
  );
}