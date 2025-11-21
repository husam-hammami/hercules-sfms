import React, { useState } from 'react'
import { WaterSystemLayout } from '../../components/water-system/WaterSystemLayout'
import { KPICard } from '../../components/water-system/KPICard'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  AlertTriangle, 
  Brain, 
  Cpu, 
  Gauge, 
  Settings, 
  TrendingUp, 
  Wrench,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  Bot,
  Search,
  Filter,
  Play,
  Pause,
  RefreshCw
} from "lucide-react";
import { Input } from '@/components/ui/input'
import { apiRequest } from "@/lib/queryClient";

// Types based on schema
interface Equipment {
  id: number;
  equipmentId: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  location: string;
  installationDate: string;
  status: 'operational' | 'maintenance' | 'offline';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  operatingHours?: number;
  healthScore?: number;
}

interface FailurePrediction {
  id: number;
  equipmentId: number;
  predictionType: string;
  failureProbability: number;
  confidenceLevel: number;
  timeToFailure?: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  recommendations: string;
  contributingFactors: string;
  sensorAnalysis: string;
  predictionModel: string;
  modelAccuracy: number;
  isActive: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  resolvedAt?: string;
  actualOutcome?: string;
  createdAt: string;
  updatedAt: string;
}

interface MaintenanceWorkOrder {
  id: number;
  workOrderNumber: string;
  equipmentId: number;
  type: 'preventive' | 'corrective' | 'predictive';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  title: string;
  description: string;
  estimatedDuration: number;
  estimatedCost?: number;
  scheduledStart?: string;
  actualStart?: string;
  completedAt?: string;
  assignedTo?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Color mappings for consistent styling
const statusColors = {
  operational: 'bg-green-500 shadow-green-500/50',
  maintenance: 'bg-yellow-500 shadow-yellow-500/50',
  offline: 'bg-red-500 shadow-red-500/50'
};

const criticalityColors = {
  low: 'text-green-400 bg-green-500/10 border-green-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  critical: 'text-red-400 bg-red-500/10 border-red-500/20'
};

const riskColors = {
  low: 'text-green-400 bg-green-500/10 border-green-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  critical: 'text-red-400 bg-red-500/10 border-red-500/20'
};

const priorityColors = {
  low: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  normal: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  urgent: 'text-red-400 bg-red-500/10 border-red-500/20'
};

export default function PredictiveMaintenance() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('equipment');

  // Fetch equipment data
  const { data: equipment = [], isLoading: equipmentLoading } = useQuery<Equipment[]>({
    queryKey: ['/api/equipment'],
  });

  // Fetch active failure predictions
  const { data: predictions = [], isLoading: predictionsLoading } = useQuery<FailurePrediction[]>({
    queryKey: ['/api/failure-predictions/active'],
  });

  // Fetch maintenance work orders
  const { data: workOrders = [], isLoading: workOrdersLoading } = useQuery<MaintenanceWorkOrder[]>({
    queryKey: ['/api/maintenance-work-orders'],
  });

  // AI Analysis mutation
  const analyzeEquipment = useMutation({
    mutationFn: async (equipmentId: number) => {
      const response = await fetch(`/api/equipment/${equipmentId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Analysis failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/failure-predictions/active'] });
    },
  });

  // Calculate KPIs
  const totalEquipment = equipment.length;
  const operationalEquipment = equipment.filter(e => e.status === 'operational').length;
  const criticalAlerts = predictions.filter(p => p.riskLevel === 'critical').length;
  const avgHealthScore = equipment.length > 0 
    ? Math.round(equipment.reduce((sum, e) => sum + (e.healthScore || 100), 0) / equipment.length)
    : 100;
  const pendingWorkOrders = workOrders.filter(w => w.status === 'pending').length;
  const activePredictions = predictions.filter(p => p.isActive).length;

  // Filter equipment based on search
  const filteredEquipment = equipment.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (equipmentLoading || predictionsLoading || workOrdersLoading) {
    return (
      <WaterSystemLayout title="AI Predictive Maintenance" subtitle="Advanced machine learning for proactive equipment maintenance">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700/50 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-700/50 rounded"></div>
            ))}
          </div>
        </div>
      </WaterSystemLayout>
    );
  }

  return (
    <WaterSystemLayout title="AI Predictive Maintenance" subtitle="Advanced machine learning for proactive equipment maintenance">
      {/* System Overview */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
            <Brain className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white mb-1">AI Predictive Maintenance</h3>
            <p className="text-sm text-slate-300">
              We predict equipment failures, optimize maintenance schedules, and prevent unplanned downtime by analyzing sensor data, operating patterns, and historical performance with AI.
            </p>
          </div>
          <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium border border-green-500/30">
            AI Powered
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KPICard
          title="Total Equipment"
          value={totalEquipment.toString()}
          icon="package"
          trend={0}
          color="blue"
        />
        <KPICard
          title="Operational"
          value={operationalEquipment.toString()}
          icon="activity"
          trend={5}
          color="green"
        />
        <KPICard
          title="Critical Alerts"
          value={criticalAlerts.toString()}
          icon="signal"
          trend={-2}
          color="red"
        />
        <KPICard
          title="Avg Health Score"
          value={`${avgHealthScore}%`}
          icon="gauge"
          trend={0}
          color="cyan"
        />
        <KPICard
          title="Pending Work Orders"
          value={pendingWorkOrders.toString()}
          icon="radio"
          trend={3}
          color="yellow"
        />
        <KPICard
          title="AI Predictions"
          value={activePredictions.toString()}
          icon="activity"
          trend={0}
          color="purple"
        />
      </div>

      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg px-3 py-2 min-w-0 flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <Input
            placeholder="Search equipment, type, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-0 bg-transparent placeholder-slate-500 text-white focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium flex items-center gap-2 border border-cyan-500/30">
            <Brain className="h-4 w-4" />
            AI Powered
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50">
          <TabsTrigger value="equipment" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-cyan-600/20">
            Equipment Fleet
          </TabsTrigger>
          <TabsTrigger value="predictions" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-cyan-600/20">
            AI Predictions
          </TabsTrigger>
          <TabsTrigger value="workorders" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-cyan-600/20">
            Work Orders
          </TabsTrigger>
        </TabsList>

        {/* Equipment Fleet Tab */}
        <TabsContent value="equipment" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredEquipment.map((item) => (
              <div key={item.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 hover:bg-slate-800/70 transition-all duration-200 hover:border-cyan-500/30 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                      <Cpu className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {item.manufacturer} {item.model}
                      </p>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${statusColors[item.status]} shadow-lg`}></div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Location</span>
                    <span className="text-sm font-medium text-white">{item.location}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Criticality</span>
                    <Badge className={`text-xs ${criticalityColors[item.criticality]} border`}>
                      {item.criticality.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Health Score</span>
                      <span className="text-sm font-medium text-white">{item.healthScore || 100}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.healthScore || 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Operating Hours</span>
                    <span className="text-white font-medium">{item.operatingHours?.toLocaleString() || 0}h</span>
                  </div>
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white border-0 transition-all duration-200"
                  onClick={() => analyzeEquipment.mutate(item.id)}
                  disabled={analyzeEquipment.isPending}
                >
                  {analyzeEquipment.isPending ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Run AI Analysis
                    </div>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* AI Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {predictions.map((prediction) => {
              const equipmentItem = equipment.find(e => e.id === prediction.equipmentId);
              return (
                <div key={prediction.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 hover:bg-slate-800/70 transition-all duration-200 hover:border-cyan-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/20 rounded-lg border border-orange-500/30">
                        <AlertCircle className="h-5 w-5 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {prediction.predictionType.replace(/_/g, ' ').toUpperCase()}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {equipmentItem?.name} • {new Date(prediction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${riskColors[prediction.riskLevel]} border`}>
                      {prediction.riskLevel.toUpperCase()} RISK
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-slate-400">Failure Probability</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-full bg-slate-700 rounded-full h-2 flex-1">
                            <div 
                              className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${prediction.failureProbability * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-white">
                            {Math.round(prediction.failureProbability * 100)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-slate-400">Confidence</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-full bg-slate-700 rounded-full h-2 flex-1">
                            <div 
                              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${prediction.confidenceLevel * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-white">
                            {Math.round(prediction.confidenceLevel * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {prediction.timeToFailure && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Time to Failure</span>
                        <span className="text-sm font-medium text-red-400">
                          {Math.round(prediction.timeToFailure)} hours
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="text-sm text-slate-400 block mb-2">Root Cause</span>
                      <p className="text-sm text-white bg-slate-900/50 p-3 rounded border border-slate-600/50">
                        {prediction.rootCause}
                      </p>
                    </div>

                    <div>
                      <span className="text-sm text-slate-400 block mb-2">AI Recommendations</span>
                      <div className="text-sm text-white bg-slate-900/50 p-3 rounded border border-slate-600/50">
                        {JSON.parse(prediction.recommendations || '[]').map((rec: string, index: number) => (
                          <div key={index} className="flex items-start gap-2 mb-1 last:mb-0">
                            <span className="text-cyan-400">•</span>
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Model Accuracy</span>
                      <span className="text-cyan-400 font-medium">
                        {Math.round((prediction.modelAccuracy || 0.89) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {predictions.length === 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-8 text-center">
              <Brain className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Active Predictions</h3>
              <p className="text-slate-400 mb-4">Run AI analysis on equipment to generate failure predictions</p>
              <Button 
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white border-0"
                onClick={() => window.location.reload()}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Work Orders Tab */}
        <TabsContent value="workorders" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {workOrders.map((order) => {
              const equipmentItem = equipment.find(e => e.id === order.equipmentId);
              return (
                <div key={order.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 hover:bg-slate-800/70 transition-all duration-200 hover:border-cyan-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/30">
                        <Wrench className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {order.workOrderNumber}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {equipmentItem?.name} • {order.type.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${priorityColors[order.priority]} border`}>
                      {order.priority.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">{order.title}</h4>
                      <p className="text-sm text-slate-400">{order.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Duration</span>
                        <div className="text-white font-medium">{order.estimatedDuration}h</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Cost</span>
                        <div className="text-white font-medium">${order.estimatedCost?.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Status</span>
                      <Badge 
                        className={`text-xs border ${order.status === 'completed' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'}`}
                      >
                        {order.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    {order.scheduledStart && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Scheduled</span>
                        <span className="text-white font-medium">
                          {new Date(order.scheduledStart).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {workOrders.length === 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-8 text-center">
              <Wrench className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Work Orders</h3>
              <p className="text-slate-400 mb-4">AI predictions will automatically generate maintenance work orders</p>
              <Button 
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white border-0"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </WaterSystemLayout>
  );
}