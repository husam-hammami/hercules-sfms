import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, Crown, MessageSquare, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import logo from '@/assets/hercules-logo-final.png';

export default function Pricing() {
  const [, setLocation] = useLocation();

  const pricingTiers = [
    {
      name: "Starter",
      price: "Free",
      description: "Perfect for getting started",
      icon: Zap,
      features: [
        "1 Signal",
        "1 KPI Dashboard",
        "Basic Support",
        "Cloud Storage"
      ],
      buttonText: "Start Free",
      buttonVariant: "outline" as const,
      popular: false
    },
    {
      name: "Basic",
      price: "$25",
      period: "/month",
      description: "For small operations",
      icon: Zap,
      features: [
        "5 Signals",
        "1 KPI Dashboard",
        "1 User",
        "Email Support",
        "Cloud Storage"
      ],
      buttonText: "Get Started",
      buttonVariant: "outline" as const,
      popular: false
    },
    {
      name: "Professional",
      price: "$50",
      period: "/month",
      description: "For growing operations",
      icon: Crown,
      features: [
        "10 Signals",
        "2 KPI Dashboards",
        "2 Users",
        "Priority Support",
        "Advanced Analytics",
        "Custom Reports"
      ],
      buttonText: "Get Started",
      buttonVariant: "default" as const,
      popular: true
    },
    {
      name: "Custom",
      price: "Contact Us",
      description: "Tailored for your needs",
      icon: MessageSquare,
      features: [
        "Unlimited Signals",
        "Unlimited KPIs",
        "Unlimited Users",
        "24/7 Dedicated Support",
        "Custom Integrations",
        "On-premise Deployment"
      ],
      buttonText: "Contact Sales",
      buttonVariant: "outline" as const,
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f1d2e]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img src={logo} alt="Hercules Logo" className="h-10 w-10" />
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold text-white">Hercules</span>
                <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                  V2.0
                </span>
              </div>
            </div>

            {/* Back Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/')}
              className="border-gray-700 hover:bg-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">
            Simple, Transparent Pricing
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Choose the plan that fits your factory's needs. All plans include core monitoring features.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {pricingTiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <Card
                key={tier.name}
                className={`relative ${
                  tier.popular
                    ? 'border-cyan-500 shadow-lg shadow-cyan-500/20 bg-gradient-to-b from-gray-900/90 to-gray-800/90'
                    : 'border-gray-700 bg-gray-900/50'
                }`}
                data-testid={`card-pricing-${tier.name.toLowerCase()}`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                      MOST POPULAR
                    </div>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8 pt-6">
                  <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-full ${
                      tier.popular 
                        ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/50' 
                        : 'bg-gray-800 border border-gray-700'
                    }`}>
                      <Icon className={`h-8 w-8 ${tier.popular ? 'text-cyan-400' : 'text-gray-400'}`} />
                    </div>
                  </div>
                  
                  <CardTitle className="text-2xl font-bold text-white">
                    {tier.name}
                  </CardTitle>
                  
                  <CardDescription className="text-gray-400 mt-2">
                    {tier.description}
                  </CardDescription>
                  
                  <div className="mt-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className={`text-4xl font-bold ${
                        tier.popular ? 'text-cyan-400' : 'text-white'
                      }`}>
                        {tier.price}
                      </span>
                      {tier.period && (
                        <span className="text-gray-400 text-sm">
                          {tier.period}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Features */}
                  <ul className="space-y-3">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                          tier.popular ? 'text-cyan-400' : 'text-green-400'
                        }`} />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    variant={tier.buttonVariant}
                    className={`w-full ${
                      tier.popular
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0'
                        : ''
                    }`}
                    size="lg"
                    data-testid={`button-pricing-${tier.name.toLowerCase()}`}
                  >
                    {tier.buttonText}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="text-center space-y-4 pt-8">
          <p className="text-gray-400">
            All plans include SSL encryption, automatic backups, and 99.9% uptime guarantee
          </p>
          <p className="text-sm text-gray-500">
            Need help choosing? <a href="#" className="text-cyan-400 hover:text-cyan-300 underline">Contact our sales team</a>
          </p>
        </div>
      </div>
    </div>
  );
}
