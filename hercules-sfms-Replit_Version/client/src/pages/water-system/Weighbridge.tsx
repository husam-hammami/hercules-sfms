import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout'
import { KPICard } from '@/components/water-system/KPICard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Scale, 
  Truck, 
  Timer, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Plus,
  RotateCcw,
  PlayCircle,
  PauseCircle,
  FileText,
  Eye,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Weight,
  User,
  Package,
  Settings,
  UserCheck,
  Wrench,
  Phone,
  DollarSign,
  Activity
} from 'lucide-react'
import type { WeighbridgeTransaction, WeighbridgeQueue, WeighbridgeScale, Truck as TruckType, Driver, TruckAssignment, TruckMaintenance } from '@shared/schema'

// Hook to fetch trucks
const useTrucks = () => {
  return useQuery<TruckType[]>({
    queryKey: ['/api/trucks'],
  })
}

// Hook to fetch drivers
const useDrivers = () => {
  return useQuery<Driver[]>({
    queryKey: ['/api/drivers'],
  })
}

// Hook to fetch truck assignments
const useTruckAssignments = () => {
  return useQuery<TruckAssignment[]>({
    queryKey: ['/api/truck-assignments'],
  })
}

// Hook to fetch truck maintenance
const useTruckMaintenance = () => {
  return useQuery<TruckMaintenance[]>({
    queryKey: ['/api/truck-maintenance'],
  })
}



export function Weighbridge() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [selectedTransaction, setSelectedTransaction] = useState<WeighbridgeTransaction | null>(null)

  const queryClient = useQueryClient()

  // Data fetching
  const { data: transactions = [] } = useQuery<WeighbridgeTransaction[]>({
    queryKey: ['/api/weighbridge-transactions'],
  })

  const { data: queues = [] } = useQuery<WeighbridgeQueue[]>({
    queryKey: ['/api/weighbridge-queues'],
  })

  const { data: scales = [] } = useQuery<WeighbridgeScale[]>({
    queryKey: ['/api/weighbridge-scales'],
  })



  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.truckLicensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.materialType.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || transaction.status === statusFilter
    const matchesType = typeFilter === 'All' || transaction.transactionType === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  // Calculate KPIs
  const totalTransactions = transactions.length
  const completedToday = transactions.filter(t => 
    t.status === 'completed' && 
    new Date(t.completedAt!).toDateString() === new Date().toDateString()
  ).length
  const inProgress = transactions.filter(t => t.status === 'in_progress').length
  const queueLength = queues.filter(q => q.status === 'waiting').length
  const operationalScales = scales.filter(s => s.status === 'operational').length
  const avgWaitTime = queues.length > 0 ? 
    queues.reduce((sum, q) => {
      if (q.waitStartTime) {
        return sum + (Date.now() - new Date(q.waitStartTime).getTime()) / (1000 * 60)
      }
      return sum
    }, 0) / queues.length : 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'in_progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'waiting': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'called': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'weighing': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
      case 'operational': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'maintenance': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'offline': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'normal': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'low': return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <WaterSystemLayout 
      title="Weighbridge Management" 
      subtitle="Industrial truck weighing and material flow control"
    >
      <div className="space-y-6">
        
        {/* Weighbridge KPI Cards */}
        <div className="grid grid-cols-6 gap-4">
          <KPICard
            title="TOTAL SCALES"
            value={scales.length.toString()}
            subtitle="Active"
            icon="gauge"
            color="cyan"
            chartType="gauge"
          />
          <KPICard
            title="OPERATIONAL"
            value={operationalScales.toString()}
            subtitle="Scales"
            icon="activity"
            color="green"
            chartType="circle"
          />
          <KPICard
            title="TRANSACTIONS"
            value={totalTransactions.toString()}
            subtitle="Today"
            icon="package"
            color="blue"
            chartType="line"
          />
          <KPICard
            title="IN PROGRESS"
            value={inProgress.toString()}
            subtitle="Active"
            icon="gauge"
            color="orange"
            chartType="gauge"
          />
          <KPICard
            title="QUEUE LENGTH"
            value={queueLength.toString()}
            subtitle="Waiting"
            icon="gauge"
            color="purple"
            chartType="bar"
          />
          <KPICard
            title="AVG WAIT"
            value={`${avgWaitTime.toFixed(0)}m`}
            subtitle="Queue Time"
            icon="gauge"
            color="yellow"
            chartType="line"
          />
        </div>

        {/* Weighbridge Operations */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Main Transaction Management */}
              <div className="lg:col-span-3 space-y-6">
            
            {/* Transaction Management */}
            <Card className="bg-slate-950/50 border-slate-700/30 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                    <Scale className="h-6 w-6 text-cyan-400" />
                    Weighbridge Transactions
                  </CardTitle>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Transaction
                  </Button>
                </div>
                
                {/* Filters */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Search Transactions</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search ticket, truck, driver..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder-slate-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Status Filter</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Status</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Type Filter</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Types</SelectItem>
                        <SelectItem value="inbound">Inbound</SelectItem>
                        <SelectItem value="outbound">Outbound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {filteredTransactions.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No transactions found matching your criteria</p>
                    </div>
                  ) : (
                    filteredTransactions.slice(0, 10).map((transaction) => (
                      <div 
                        key={transaction.id}
                        className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-4 hover:border-cyan-500/50 
                                   transition-all duration-200 cursor-pointer"
                        onClick={() => setSelectedTransaction(transaction)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 rounded-lg ${transaction.transactionType === 'inbound' ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
                              <Truck className={`h-5 w-5 ${transaction.transactionType === 'inbound' ? 'text-green-400' : 'text-blue-400'}`} />
                            </div>
                            <div>
                              <div className="flex items-center space-x-3">
                                <span className="font-semibold text-white">{transaction.ticketNumber}</span>
                                <Badge className={getStatusColor(transaction.status)}>
                                  {transaction.status}
                                </Badge>
                                <Badge variant="outline" className="text-slate-300 border-slate-600">
                                  {transaction.transactionType}
                                </Badge>
                              </div>
                              <div className="text-sm text-slate-400 mt-1">
                                <span className="mr-4">🚛 {transaction.truckLicensePlate}</span>
                                <span className="mr-4">👤 {transaction.driverName}</span>
                                <span>📦 {transaction.materialType}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            {transaction.netWeight && (
                              <div className="text-lg font-bold text-cyan-400">
                                {transaction.netWeight.toFixed(1)} t
                              </div>
                            )}
                            {transaction.firstWeighTime && (
                              <div className="text-sm text-slate-400">
                                {formatTime(transaction.firstWeighTime)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Weighbridge Scales Status */}
            <Card className="bg-slate-950/50 border-slate-700/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                  <Weight className="h-6 w-6 text-cyan-400" />
                  Weighbridge Scales Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {scales.map((scale) => (
                    <div 
                      key={scale.id}
                      className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-white">{scale.scaleName}</h4>
                        <Badge className={getStatusColor(scale.status)}>
                          {scale.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm text-slate-300">
                        <div className="flex justify-between">
                          <span>Scale ID:</span>
                          <span className="text-cyan-400">{scale.scaleId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Location:</span>
                          <span>{scale.location}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Capacity:</span>
                          <span className="text-green-400">{scale.capacity}t</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Current Weight:</span>
                          <span className={(scale.currentWeight || 0) > 0 ? 'text-orange-400' : 'text-slate-400'}>
                            {(scale.currentWeight || 0).toFixed(1)}t
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Occupied:</span>
                          <span className={scale.isOccupied ? 'text-red-400' : 'text-green-400'}>
                            {scale.isOccupied ? 'Yes' : 'No'}
                          </span>
                        </div>
                        {scale.operatorId && (
                          <div className="flex justify-between">
                            <span>Operator:</span>
                            <span className="text-cyan-400">{scale.operatorId}</span>
                          </div>
                        )}
                      </div>
                      
                      {scale.nextCalibration && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                          <div className="text-xs text-slate-400">
                            Next Calibration: {formatDate(scale.nextCalibration)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            
            {/* Current Queue */}
            <Card className="bg-slate-950/50 border-slate-700/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <Timer className="h-5 w-5 text-cyan-400" />
                  Current Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {queues.filter(q => q.status === 'waiting' || q.status === 'called').slice(0, 8).map((queue) => (
                    <div 
                      key={queue.id}
                      className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">#{queue.queuePosition}</span>
                        <div className="flex items-center space-x-2">
                          <Badge className={getPriorityColor(queue.priority)}>
                            {queue.priority}
                          </Badge>
                          <Badge className={getStatusColor(queue.status)}>
                            {queue.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-sm text-slate-300 space-y-1">
                        <div className="flex items-center gap-2">
                          <Truck className="h-3 w-3 text-slate-400" />
                          <span>{queue.truckLicensePlate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>{queue.driverName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3 text-slate-400" />
                          <span className="text-xs">{queue.materialType}</span>
                        </div>
                        {queue.estimatedWeight && (
                          <div className="flex items-center gap-2">
                            <Weight className="h-3 w-3 text-slate-400" />
                            <span className="text-xs">{queue.estimatedWeight}t</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-2 text-xs text-slate-400">
                        Wait: {queue.waitStartTime ? Math.round((Date.now() - new Date(queue.waitStartTime).getTime()) / (1000 * 60)) : 0}min
                      </div>
                    </div>
                  ))}
                  
                  {queues.filter(q => q.status === 'waiting' || q.status === 'called').length === 0 && (
                    <div className="text-center py-4 text-slate-400">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No trucks in queue</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-slate-950/50 border-slate-700/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-cyan-400" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white justify-start"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Start Weighing
                  </Button>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Queue
                  </Button>
                  <Button 
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white justify-start"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Tare Scale
                  </Button>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white justify-start"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
            
          </div>
        </div>

      </div>
    </WaterSystemLayout>
  )
}