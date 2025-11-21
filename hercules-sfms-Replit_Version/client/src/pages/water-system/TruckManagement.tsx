import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout'
import { KPICard } from '@/components/water-system/KPICard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Truck, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  User, 
  Wrench,
  UserCheck,
  Calendar
} from 'lucide-react'
import type { Truck as TruckType, Driver, TruckMaintenance } from '@shared/schema'

// Form schemas
const truckSchema = z.object({
  licensePlate: z.string().min(1, 'License plate is required'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number().min(1990, 'Year must be 1990 or later'),
  maxCapacity: z.number().min(0.1, 'Capacity must be greater than 0'),
  ownerCompany: z.string().min(1, 'Owner company is required'),
  contactNumber: z.string().min(1, 'Contact number is required'),
  status: z.enum(['active', 'inactive', 'maintenance'])
})

const driverSchema = z.object({
  driverName: z.string().min(1, 'Driver name is required'),
  licenseNumber: z.string().min(1, 'License number is required'),
  licenseType: z.string().min(1, 'License type is required'),
  company: z.string().min(1, 'Company is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  licenseExpiry: z.string().min(1, 'License expiry is required'),
  status: z.enum(['active', 'inactive'])
})

const maintenanceSchema = z.object({
  truckId: z.number().min(1, 'Truck is required'),
  maintenanceType: z.enum(['scheduled', 'unscheduled']),
  description: z.string().min(1, 'Description is required'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
  cost: z.number().optional(),
  serviceProvider: z.string().min(1, 'Service provider is required')
})

// Hooks for data fetching
const useTrucks = () => {
  return useQuery<TruckType[]>({
    queryKey: ['/api/trucks'],
  })
}

const useDrivers = () => {
  return useQuery<Driver[]>({
    queryKey: ['/api/drivers'],
  })
}

const useTruckMaintenance = () => {
  return useQuery<TruckMaintenance[]>({
    queryKey: ['/api/truck-maintenance'],
  })
}

export function TruckManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [activeTab, setActiveTab] = useState('trucks')
  const [isAddTruckOpen, setIsAddTruckOpen] = useState(false)
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false)
  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false)

  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Data fetching
  const { data: trucks = [] } = useTrucks()
  const { data: drivers = [] } = useDrivers()
  const { data: maintenance = [] } = useTruckMaintenance()

  // Mutations
  const addTruckMutation = useMutation({
    mutationFn: async (truck: z.infer<typeof truckSchema>) => {
      const response = await fetch('/api/trucks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(truck)
      })
      if (!response.ok) throw new Error('Failed to add truck')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trucks'] })
      setIsAddTruckOpen(false)
      toast({
        title: "Success",
        description: "Truck added successfully",
      })
    }
  })

  const addDriverMutation = useMutation({
    mutationFn: async (driver: z.infer<typeof driverSchema>) => {
      const response = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driver)
      })
      if (!response.ok) throw new Error('Failed to add driver')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] })
      setIsAddDriverOpen(false)
      toast({
        title: "Success",
        description: "Driver added successfully",
      })
    }
  })

  const addMaintenanceMutation = useMutation({
    mutationFn: async (maintenanceData: z.infer<typeof maintenanceSchema>) => {
      const response = await fetch('/api/truck-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenanceData)
      })
      if (!response.ok) throw new Error('Failed to add maintenance')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/truck-maintenance'] })
      setIsAddMaintenanceOpen(false)
      toast({
        title: "Success",
        description: "Maintenance scheduled successfully",
      })
    }
  })

  // Forms
  const truckForm = useForm<z.infer<typeof truckSchema>>({
    resolver: zodResolver(truckSchema),
    defaultValues: {
      licensePlate: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      maxCapacity: 0,
      ownerCompany: '',
      contactNumber: '',
      status: 'active'
    }
  })

  const driverForm = useForm<z.infer<typeof driverSchema>>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      driverName: '',
      licenseNumber: '',
      licenseType: '',
      company: '',
      phoneNumber: '',
      licenseExpiry: '',
      status: 'active'
    }
  })

  const maintenanceForm = useForm<z.infer<typeof maintenanceSchema>>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      truckId: 0,
      maintenanceType: 'scheduled',
      description: '',
      scheduledDate: '',
      status: 'scheduled',
      serviceProvider: ''
    }
  })

  // Calculate KPIs
  const totalTrucks = trucks.length
  const activeTrucks = trucks.filter(t => t.status === 'active').length
  const activeDrivers = drivers.filter(d => d.status === 'active').length
  const pendingMaintenance = maintenance.filter(m => m.status === 'scheduled').length

  // Filter trucks
  const filteredTrucks = trucks.filter(truck => {
    const matchesSearch = truck.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         truck.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         truck.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         truck.ownerCompany.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || truck.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Filter drivers
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.company.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || driver.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const onSubmitTruck = (data: z.infer<typeof truckSchema>) => {
    addTruckMutation.mutate(data)
  }

  const onSubmitDriver = (data: z.infer<typeof driverSchema>) => {
    addDriverMutation.mutate(data)
  }

  const onSubmitMaintenance = (data: z.infer<typeof maintenanceSchema>) => {
    addMaintenanceMutation.mutate(data)
  }

  return (
    <WaterSystemLayout 
      title="Truck Fleet Management"
      subtitle="Comprehensive vehicle and driver management system"
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard 
          title="Total Trucks" 
          value={totalTrucks.toString()}
          icon="package"
          color="blue"
          chartType="bar"
        />
        <KPICard 
          title="Active Trucks" 
          value={activeTrucks.toString()}
          icon="activity"
          color="green"
          chartType="circle"
        />
        <KPICard 
          title="Active Drivers" 
          value={activeDrivers.toString()}
          icon="activity"
          color="cyan"
          chartType="line"
        />
        <KPICard 
          title="Pending Maintenance" 
          value={pendingMaintenance.toString()}
          icon="gauge"
          color="orange"
          chartType="gauge"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <Button
          variant={activeTab === 'trucks' ? 'default' : 'outline'}
          onClick={() => setActiveTab('trucks')}
        >
          <Truck className="h-4 w-4 mr-2" />
          Trucks
        </Button>
        <Button
          variant={activeTab === 'drivers' ? 'default' : 'outline'}
          onClick={() => setActiveTab('drivers')}
        >
          <User className="h-4 w-4 mr-2" />
          Drivers
        </Button>
        <Button
          variant={activeTab === 'maintenance' ? 'default' : 'outline'}
          onClick={() => setActiveTab('maintenance')}
        >
          <Wrench className="h-4 w-4 mr-2" />
          Maintenance
        </Button>
      </div>

      {/* Trucks Tab */}
      {activeTab === 'trucks' && (
        <Card className="bg-slate-950/50 border-slate-700/30 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <Truck className="h-6 w-6 text-cyan-400" />
                Truck Management
              </CardTitle>
              <Dialog open={isAddTruckOpen} onOpenChange={setIsAddTruckOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Truck
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Add New Truck</DialogTitle>
                  </DialogHeader>
                  <Form {...truckForm}>
                    <form onSubmit={truckForm.handleSubmit(onSubmitTruck)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={truckForm.control}
                          name="licensePlate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">License Plate</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-slate-800 border-slate-600 text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={truckForm.control}
                          name="make"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Make</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-slate-800 border-slate-600 text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={truckForm.control}
                          name="model"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Model</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-slate-800 border-slate-600 text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={truckForm.control}
                          name="year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Year</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  className="bg-slate-800 border-slate-600 text-white" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={truckForm.control}
                          name="maxCapacity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Max Capacity (tons)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.1"
                                  {...field} 
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  className="bg-slate-800 border-slate-600 text-white" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={truckForm.control}
                          name="ownerCompany"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Owner Company</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-slate-800 border-slate-600 text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={truckForm.control}
                          name="contactNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Contact Number</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-slate-800 border-slate-600 text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={truckForm.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                  <SelectItem value="maintenance">Maintenance</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsAddTruckOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          className="bg-green-600 hover:bg-green-700"
                          disabled={addTruckMutation.isPending}
                        >
                          {addTruckMutation.isPending ? 'Adding...' : 'Add Truck'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Filters */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Search Trucks</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search license plate, make, model..."
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">License Plate</TableHead>
                  <TableHead className="text-slate-300">Make/Model</TableHead>
                  <TableHead className="text-slate-300">Year</TableHead>
                  <TableHead className="text-slate-300">Capacity</TableHead>
                  <TableHead className="text-slate-300">Owner Company</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Contact</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrucks.map((truck) => (
                  <TableRow key={truck.id} className="border-slate-700 hover:bg-slate-800/30">
                    <TableCell className="text-cyan-400 font-medium">{truck.licensePlate}</TableCell>
                    <TableCell className="text-white">{truck.make} {truck.model}</TableCell>
                    <TableCell className="text-slate-300">{truck.year}</TableCell>
                    <TableCell className="text-slate-300">{truck.maxCapacity}t</TableCell>
                    <TableCell className="text-slate-300">{truck.ownerCompany}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={truck.status === 'active' ? 'default' : 
                                truck.status === 'maintenance' ? 'destructive' : 'secondary'}
                        className={truck.status === 'active' ? 'bg-green-600' : 
                                  truck.status === 'maintenance' ? 'bg-red-600' : 'bg-slate-600'}
                      >
                        {truck.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">{truck.contactNumber}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="text-cyan-400 hover:text-cyan-300">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-yellow-400 hover:text-yellow-300">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Drivers Tab */}
      {activeTab === 'drivers' && (
        <Card className="bg-slate-950/50 border-slate-700/30 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <User className="h-6 w-6 text-cyan-400" />
                Driver Management
              </CardTitle>
              <Dialog open={isAddDriverOpen} onOpenChange={setIsAddDriverOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Driver
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Add New Driver</DialogTitle>
                  </DialogHeader>
                  <Form {...driverForm}>
                    <form onSubmit={driverForm.handleSubmit(onSubmitDriver)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={driverForm.control}
                          name="driverName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Driver Name</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-slate-800 border-slate-600 text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={driverForm.control}
                          name="licenseNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">License Number</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-slate-800 border-slate-600 text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={driverForm.control}
                          name="licenseType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">License Type</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-slate-800 border-slate-600 text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={driverForm.control}
                          name="company"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Company</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-slate-800 border-slate-600 text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={driverForm.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Phone Number</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-slate-800 border-slate-600 text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={driverForm.control}
                          name="licenseExpiry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">License Expiry</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field} 
                                  className="bg-slate-800 border-slate-600 text-white" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={driverForm.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsAddDriverOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          className="bg-green-600 hover:bg-green-700"
                          disabled={addDriverMutation.isPending}
                        >
                          {addDriverMutation.isPending ? 'Adding...' : 'Add Driver'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Filters */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Search Drivers</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search name, license, company..."
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Driver Name</TableHead>
                  <TableHead className="text-slate-300">License Number</TableHead>
                  <TableHead className="text-slate-300">License Type</TableHead>
                  <TableHead className="text-slate-300">Company</TableHead>
                  <TableHead className="text-slate-300">Phone</TableHead>
                  <TableHead className="text-slate-300">License Expiry</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((driver) => (
                  <TableRow key={driver.id} className="border-slate-700 hover:bg-slate-800/30">
                    <TableCell className="text-cyan-400 font-medium">{driver.driverName}</TableCell>
                    <TableCell className="text-white">{driver.licenseNumber}</TableCell>
                    <TableCell className="text-slate-300">{driver.licenseType}</TableCell>
                    <TableCell className="text-slate-300">{driver.company}</TableCell>
                    <TableCell className="text-slate-300">{driver.phoneNumber}</TableCell>
                    <TableCell className="text-slate-300">
                      {new Date(driver.licenseExpiry).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={driver.status === 'active' ? 'default' : 'secondary'}
                        className={driver.status === 'active' ? 'bg-green-600' : 'bg-slate-600'}
                      >
                        {driver.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="text-cyan-400 hover:text-cyan-300">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-yellow-400 hover:text-yellow-300">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <Card className="bg-slate-950/50 border-slate-700/30 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <Wrench className="h-6 w-6 text-cyan-400" />
                Truck Maintenance
              </CardTitle>
              <Dialog open={isAddMaintenanceOpen} onOpenChange={setIsAddMaintenanceOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Maintenance
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Schedule Maintenance</DialogTitle>
                  </DialogHeader>
                  <Form {...maintenanceForm}>
                    <form onSubmit={maintenanceForm.handleSubmit(onSubmitMaintenance)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={maintenanceForm.control}
                          name="truckId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Truck</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {trucks.map((truck) => (
                                    <SelectItem key={truck.id} value={truck.id.toString()}>
                                      {truck.licensePlate} - {truck.make} {truck.model}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={maintenanceForm.control}
                          name="maintenanceType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Maintenance Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="scheduled">Scheduled</SelectItem>
                                  <SelectItem value="unscheduled">Unscheduled</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={maintenanceForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel className="text-slate-300">Description</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-slate-800 border-slate-600 text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={maintenanceForm.control}
                          name="scheduledDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Scheduled Date</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field} 
                                  className="bg-slate-800 border-slate-600 text-white" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={maintenanceForm.control}
                          name="serviceProvider"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Service Provider</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-slate-800 border-slate-600 text-white" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={maintenanceForm.control}
                          name="cost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Estimated Cost</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  {...field} 
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  className="bg-slate-800 border-slate-600 text-white" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={maintenanceForm.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-300">Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="scheduled">Scheduled</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsAddMaintenanceOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          className="bg-green-600 hover:bg-green-700"
                          disabled={addMaintenanceMutation.isPending}
                        >
                          {addMaintenanceMutation.isPending ? 'Scheduling...' : 'Schedule Maintenance'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Truck</TableHead>
                  <TableHead className="text-slate-300">Maintenance Type</TableHead>
                  <TableHead className="text-slate-300">Description</TableHead>
                  <TableHead className="text-slate-300">Scheduled Date</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Cost</TableHead>
                  <TableHead className="text-slate-300">Service Provider</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenance.map((maint) => {
                  const truck = trucks.find(t => t.id === maint.truckId);
                  return (
                    <TableRow key={maint.id} className="border-slate-700 hover:bg-slate-800/30">
                      <TableCell className="text-cyan-400 font-medium">
                        {truck?.licensePlate || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-white">{maint.maintenanceType}</TableCell>
                      <TableCell className="text-slate-300">{maint.description}</TableCell>
                      <TableCell className="text-slate-300">
                        {new Date(maint.scheduledDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={maint.status === 'completed' ? 'default' : 
                                  maint.status === 'in_progress' ? 'destructive' : 'secondary'}
                          className={maint.status === 'completed' ? 'bg-green-600' : 
                                    maint.status === 'in_progress' ? 'bg-orange-600' : 'bg-slate-600'}
                        >
                          {maint.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {maint.cost ? `$${maint.cost}` : 'TBD'}
                      </TableCell>
                      <TableCell className="text-slate-300">{maint.serviceProvider}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" className="text-cyan-400 hover:text-cyan-300">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-yellow-400 hover:text-yellow-300">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
    </WaterSystemLayout>
  )
}