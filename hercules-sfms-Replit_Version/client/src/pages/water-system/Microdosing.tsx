import React, { useState, useRef, useEffect } from 'react'
import { WaterSystemLayout } from '../../components/water-system/WaterSystemLayout'
import { KPICard } from '../../components/water-system/KPICard'
import { Plus, Scan, Play, Pause, Square, Settings, AlertTriangle, CheckCircle, Clock, Beaker, Package, Scale, Target, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Microdosing data structures
interface ProductionOrder {
  id: string
  orderNumber: string
  productName: string
  targetWeight: number
  currentWeight: number
  status: 'pending' | 'active' | 'paused' | 'completed' | 'error'
  barcode: string
  formula: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  operator: string
  batchNumber: string
}

interface DosingIngredient {
  id: string
  materialCode: string
  materialName: string
  targetWeight: number
  currentWeight: number
  tolerance: number
  status: 'waiting' | 'dosing' | 'completed' | 'error'
  dosingRate: number
  estimatedTime: number
}

interface DosingSession {
  orderId: string
  ingredients: DosingIngredient[]
  totalProgress: number
  currentIngredient: number
  startTime: string
  status: 'running' | 'paused' | 'completed' | 'error'
}

// Mock data
const mockOrders: ProductionOrder[] = [
  {
    id: 'ORD-001',
    orderNumber: '980485114499',
    productName: 'Propanol Solution',
    targetWeight: 10.30,
    currentWeight: 0,
    status: 'active',
    barcode: '980485114499',
    formula: 'PROP-001',
    createdAt: '2025-01-28T08:00:00Z',
    startedAt: '2025-01-28T08:15:00Z',
    operator: 'Ahmed Al-Rashid',
    batchNumber: 'BAT-2025-001'
  },
  {
    id: 'ORD-002',
    orderNumber: '400670324521',
    productName: 'Industrial Detergent Mix',
    targetWeight: 25.50,
    currentWeight: 25.50,
    status: 'completed',
    barcode: '400670324521',
    formula: 'DET-002',
    createdAt: '2025-01-28T06:30:00Z',
    startedAt: '2025-01-28T06:45:00Z',
    completedAt: '2025-01-28T07:30:00Z',
    operator: 'Fatima Al-Zahra',
    batchNumber: 'BAT-2025-002'
  },
  {
    id: 'ORD-003',
    orderNumber: '789123456789',
    productName: 'Chemical Catalyst Base',
    targetWeight: 15.75,
    currentWeight: 0,
    status: 'pending',
    barcode: '789123456789',
    formula: 'CAT-003',
    createdAt: '2025-01-28T09:00:00Z',
    operator: 'Mohammed Hassan',
    batchNumber: 'BAT-2025-003'
  }
]

const mockIngredients: DosingIngredient[] = [
  {
    id: 'ING-001',
    materialCode: 'PROP-A01',
    materialName: 'Propanol Base',
    targetWeight: 8.25,
    currentWeight: 8.25,
    tolerance: 0.05,
    status: 'completed',
    dosingRate: 0.15,
    estimatedTime: 55
  },
  {
    id: 'ING-002',
    materialCode: 'ADD-B02',
    materialName: 'Stabilizer Agent',
    targetWeight: 1.50,
    currentWeight: 1.32,
    tolerance: 0.02,
    status: 'dosing',
    dosingRate: 0.08,
    estimatedTime: 12
  },
  {
    id: 'ING-003',
    materialCode: 'CAT-C03',
    materialName: 'Catalyst Powder',
    targetWeight: 0.55,
    currentWeight: 0,
    tolerance: 0.01,
    status: 'waiting',
    dosingRate: 0.05,
    estimatedTime: 11
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
    case 'running':
    case 'dosing':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'completed':
      return 'bg-green-500/10 text-green-400 border-green-500/20'
    case 'pending':
    case 'waiting':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    case 'paused':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    case 'error':
      return 'bg-red-500/10 text-red-400 border-red-500/20'
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
    case 'running':
    case 'dosing':
      return <Play className="h-4 w-4" />
    case 'completed':
      return <CheckCircle className="h-4 w-4" />
    case 'pending':
    case 'waiting':
      return <Clock className="h-4 w-4" />
    case 'paused':
      return <Pause className="h-4 w-4" />
    case 'error':
      return <AlertTriangle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

export function Microdosing() {
  const [orders, setOrders] = useState<ProductionOrder[]>(mockOrders)
  const [activeOrder, setActiveOrder] = useState<ProductionOrder | null>(mockOrders[0])
  const [dosingSession, setDosingSession] = useState<DosingSession | null>(null)
  const [ingredients, setIngredients] = useState<DosingIngredient[]>(mockIngredients)
  const [isScanning, setIsScanning] = useState(false)
  const [scanInput, setScanInput] = useState('')
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false)

  // Simulate real-time weight updates
  useEffect(() => {
    if (activeOrder?.status === 'active') {
      const interval = setInterval(() => {
        setIngredients(prev => prev.map(ing => {
          if (ing.status === 'dosing' && ing.currentWeight < ing.targetWeight) {
            const newWeight = Math.min(
              ing.currentWeight + (Math.random() * ing.dosingRate),
              ing.targetWeight
            )
            return {
              ...ing,
              currentWeight: newWeight,
              status: newWeight >= ing.targetWeight ? 'completed' : 'dosing'
            }
          }
          return ing
        }))
      }, 500)

      return () => clearInterval(interval)
    }
  }, [activeOrder])

  const handleBarcodeInput = (value: string) => {
    setScanInput(value)
    const order = orders.find(o => o.barcode === value)
    if (order) {
      setActiveOrder(order)
      setIsScanning(false)
      setScanInput('')
    }
  }

  const startDosing = () => {
    if (activeOrder) {
      setOrders(prev => prev.map(order => 
        order.id === activeOrder.id 
          ? { ...order, status: 'active', startedAt: new Date().toISOString() }
          : order
      ))
      setActiveOrder(prev => prev ? { ...prev, status: 'active' } : null)
    }
  }

  const pauseDosing = () => {
    if (activeOrder) {
      setOrders(prev => prev.map(order => 
        order.id === activeOrder.id 
          ? { ...order, status: 'paused' }
          : order
      ))
      setActiveOrder(prev => prev ? { ...prev, status: 'paused' } : null)
    }
  }

  const stopDosing = () => {
    if (activeOrder) {
      setOrders(prev => prev.map(order => 
        order.id === activeOrder.id 
          ? { ...order, status: 'completed', completedAt: new Date().toISOString() }
          : order
      ))
      setActiveOrder(prev => prev ? { ...prev, status: 'completed' } : null)
    }
  }

  const resetDosing = () => {
    setIngredients(prev => prev.map(ing => ({
      ...ing,
      currentWeight: 0,
      status: 'waiting' as const
    })))
    if (activeOrder) {
      setActiveOrder(prev => prev ? { ...prev, currentWeight: 0, status: 'pending' } : null)
    }
  }

  return (
    <WaterSystemLayout 
      title="Microdosing System" 
      subtitle="Precision dosing and production order management"
    >
      <div className="space-y-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard
            title="ACTIVE ORDERS"
            value={orders.filter(o => o.status === 'active').length.toString()}
            subtitle="In Progress"
            icon="activity"
            color="blue"
            chartType="line"
          />
          <KPICard
            title="COMPLETED TODAY"
            value={orders.filter(o => o.status === 'completed').length.toString()}
            subtitle="Finished Orders"
            icon="gauge"
            color="green"
            chartType="circle"
          />
          <KPICard
            title="PENDING ORDERS"
            value={orders.filter(o => o.status === 'pending').length.toString()}
            subtitle="Awaiting Start"
            icon="activity"
            color="yellow"
            chartType="bar"
          />
          <KPICard
            title="ACCURACY RATE"
            value="99.8"
            unit="%"
            subtitle="Dosing Precision"
            icon="gauge"
            color="purple"
            chartType="gauge"
          />
          <KPICard
            title="AVG CYCLE TIME"
            value="32"
            unit="min"
            subtitle="Per Order"
            icon="activity"
            color="cyan"
            chartType="line"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Production Orders List */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-950/50 light:bg-white border-slate-700/30 light:border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-white light:text-gray-900">
                    <Package className="h-5 w-5 mr-2 text-cyan-400 light:text-blue-600" />
                    Production Orders
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Dialog open={isScanning} onOpenChange={setIsScanning}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="border-slate-700 light:border-gray-300 text-slate-300 light:text-gray-700">
                          <Scan className="h-4 w-4 mr-2" />
                          Scan Barcode
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-slate-900 light:bg-white border-slate-700 light:border-gray-300">
                        <DialogHeader>
                          <DialogTitle className="text-white light:text-gray-900">Scan Order Barcode</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="text-center py-8">
                            <div className="w-32 h-32 mx-auto border-2 border-dashed border-slate-600 light:border-gray-300 rounded-lg flex items-center justify-center">
                              <Scan className="h-12 w-12 text-slate-400 light:text-gray-500" />
                            </div>
                            <p className="text-slate-400 light:text-gray-600 mt-4">Position barcode in scanner view</p>
                          </div>
                          <div>
                            <Label className="text-slate-300 light:text-gray-700">Manual Entry</Label>
                            <Input
                              value={scanInput}
                              onChange={(e) => handleBarcodeInput(e.target.value)}
                              placeholder="Enter barcode manually"
                              className="bg-slate-800 light:bg-gray-50 border-slate-700 light:border-gray-300 text-white light:text-gray-900"
                            />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Order
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-slate-900 light:bg-white border-slate-700 light:border-gray-300">
                        <DialogHeader>
                          <DialogTitle className="text-white light:text-gray-900">Create New Production Order</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-slate-300 light:text-gray-700">Order Number</Label>
                            <Input placeholder="Auto-generated" disabled className="bg-slate-800 light:bg-gray-50 border-slate-700 light:border-gray-300" />
                          </div>
                          <div>
                            <Label className="text-slate-300 light:text-gray-700">Product Name</Label>
                            <Input placeholder="Enter product name" className="bg-slate-800 light:bg-gray-50 border-slate-700 light:border-gray-300 text-white light:text-gray-900" />
                          </div>
                          <div>
                            <Label className="text-slate-300 light:text-gray-700">Formula</Label>
                            <Select>
                              <SelectTrigger className="bg-slate-800 light:bg-gray-50 border-slate-700 light:border-gray-300 text-white light:text-gray-900">
                                <SelectValue placeholder="Select formula" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 light:bg-white border-slate-700 light:border-gray-200">
                                <SelectItem value="PROP-001">PROP-001 - Propanol Solution</SelectItem>
                                <SelectItem value="DET-002">DET-002 - Industrial Detergent</SelectItem>
                                <SelectItem value="CAT-003">CAT-003 - Chemical Catalyst</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-slate-300 light:text-gray-700">Target Weight (Kg)</Label>
                            <Input type="number" step="0.01" placeholder="0.00" className="bg-slate-800 light:bg-gray-50 border-slate-700 light:border-gray-300 text-white light:text-gray-900" />
                          </div>
                          <Button className="w-full">
                            Create Order
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div 
                      key={order.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-300 hover:shadow-lg
                                ${activeOrder?.id === order.id 
                                  ? 'border-cyan-500/50 bg-cyan-500/10' 
                                  : 'border-slate-700/30 light:border-gray-200 bg-slate-800/30 light:bg-gray-50'
                                } hover:border-cyan-500/30`}
                      onClick={() => setActiveOrder(order)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="text-sm font-mono text-cyan-400 light:text-blue-600">
                              #{order.orderNumber}
                            </div>
                            <Badge className={`border ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1 capitalize">{order.status}</span>
                            </Badge>
                          </div>
                          <div className="text-white light:text-gray-900 font-medium mt-1">
                            {order.productName}
                          </div>
                          <div className="text-sm text-slate-400 light:text-gray-600 mt-1">
                            Target: {order.targetWeight}kg | Batch: {order.batchNumber}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white light:text-gray-900">
                            {order.currentWeight.toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-400 light:text-gray-600">
                            / {order.targetWeight}kg
                          </div>
                        </div>
                      </div>
                      {order.status === 'active' && (
                        <div className="mt-3">
                          <Progress 
                            value={(order.currentWeight / order.targetWeight) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Order Control Panel */}
          <div className="space-y-6">
            
            {/* Current Order Display */}
            {activeOrder && (
              <Card className="bg-slate-950/50 light:bg-white border-slate-700/30 light:border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-white light:text-gray-900">
                    <Target className="h-5 w-5 mr-2 text-cyan-400 light:text-blue-600" />
                    Active Order
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-6 border-2 border-dashed border-slate-600 light:border-gray-300 rounded-lg">
                      <div className="text-sm text-slate-400 light:text-gray-600 mb-2">Current Weight</div>
                      <div className="text-4xl font-bold text-green-400 light:text-green-600">
                        {activeOrder.currentWeight.toFixed(2)}Kg
                      </div>
                      <div className="text-sm text-slate-400 light:text-gray-600 mt-1">
                        Target: {activeOrder.targetWeight}Kg
                      </div>
                      <div className="mt-3">
                        <Progress 
                          value={(activeOrder.currentWeight / activeOrder.targetWeight) * 100} 
                          className="h-3"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400 light:text-gray-600">Order Number:</span>
                        <span className="text-white light:text-gray-900 font-mono">#{activeOrder.orderNumber}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400 light:text-gray-600">Formula:</span>
                        <span className="text-white light:text-gray-900">{activeOrder.formula}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400 light:text-gray-600">Operator:</span>
                        <span className="text-white light:text-gray-900">{activeOrder.operator}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400 light:text-gray-600">Batch:</span>
                        <span className="text-white light:text-gray-900">{activeOrder.batchNumber}</span>
                      </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex space-x-2">
                      {activeOrder.status === 'pending' && (
                        <Button onClick={startDosing} className="flex-1">
                          <Play className="h-4 w-4 mr-2" />
                          Start
                        </Button>
                      )}
                      {activeOrder.status === 'active' && (
                        <>
                          <Button onClick={pauseDosing} variant="outline">
                            <Pause className="h-4 w-4" />
                          </Button>
                          <Button onClick={stopDosing} variant="outline">
                            <Square className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button onClick={resetDosing} variant="outline">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scale Display */}
            <Card className="bg-slate-950/50 light:bg-white border-slate-700/30 light:border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-white light:text-gray-900">
                  <Scale className="h-5 w-5 mr-2 text-cyan-400 light:text-blue-600" />
                  Scale Reading
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4 bg-slate-800/50 light:bg-gray-100 rounded-lg">
                  <div className="text-sm text-slate-400 light:text-gray-600 mb-2">Live Weight</div>
                  <div className="text-3xl font-mono font-bold text-cyan-400 light:text-blue-600">
                    10.30 Kg
                  </div>
                  <div className="text-xs text-green-400 light:text-green-600 mt-1">
                    ± 0.001 Kg accuracy
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dosing Ingredients Progress */}
        {activeOrder && (
          <Card className="bg-slate-950/50 light:bg-white border-slate-700/30 light:border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-white light:text-gray-900">
                <Beaker className="h-5 w-5 mr-2 text-cyan-400 light:text-blue-600" />
                Dosing Progress - {activeOrder.productName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-slate-700/30 light:border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/30 light:border-gray-200">
                      <TableHead className="text-white light:text-gray-900">Material</TableHead>
                      <TableHead className="text-white light:text-gray-900">Target</TableHead>
                      <TableHead className="text-white light:text-gray-900">Current</TableHead>
                      <TableHead className="text-white light:text-gray-900">Progress</TableHead>
                      <TableHead className="text-white light:text-gray-900">Status</TableHead>
                      <TableHead className="text-white light:text-gray-900">Est. Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingredients.map((ingredient) => (
                      <TableRow key={ingredient.id} className="border-slate-700/30 light:border-gray-200">
                        <TableCell>
                          <div>
                            <div className="text-white light:text-gray-900 font-medium">{ingredient.materialName}</div>
                            <div className="text-sm text-slate-400 light:text-gray-600">{ingredient.materialCode}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300 light:text-gray-700">
                          {ingredient.targetWeight.toFixed(2)} kg
                        </TableCell>
                        <TableCell className="text-white light:text-gray-900 font-mono">
                          {ingredient.currentWeight.toFixed(2)} kg
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress 
                              value={(ingredient.currentWeight / ingredient.targetWeight) * 100} 
                              className="h-2"
                            />
                            <div className="text-xs text-slate-400 light:text-gray-600">
                              {((ingredient.currentWeight / ingredient.targetWeight) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`border ${getStatusColor(ingredient.status)}`}>
                            {getStatusIcon(ingredient.status)}
                            <span className="ml-1 capitalize">{ingredient.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300 light:text-gray-700">
                          {ingredient.status === 'dosing' ? `${ingredient.estimatedTime}s` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </WaterSystemLayout>
  )
}