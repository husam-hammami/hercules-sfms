import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Zap, X } from 'lucide-react';
import { useDemo } from '@/contexts/DemoContext';

export function DemoBanner() {
  const { isDemoMode, exitDemoMode } = useDemo();

  if (!isDemoMode) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <Zap className="h-5 w-5 text-white animate-pulse" />
          <AlertDescription className="text-white font-medium">
            You're viewing a live demo with simulated data. Sign up for your free 15-day trial to connect real PLCs!
          </AlertDescription>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/auth">
            <Button 
              size="sm" 
              className="bg-white text-emerald-600 hover:bg-gray-100"
            >
              Start Real Demo
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={exitDemoMode}
            className="text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}