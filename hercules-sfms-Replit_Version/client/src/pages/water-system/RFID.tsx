import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { WaterSystemLayout } from '../../components/water-system/WaterSystemLayout'
import { KPICard } from '../../components/water-system/KPICard'
import { 
  Radio, 
  Search, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Filter, 
  Battery, 
  Signal, 
  AlertTriangle, 
  Package, 
  Truck, 
  Factory, 
  Zap,
  Eye,
  Plus,
  Edit,
  Trash2,
  Activity,
  Layers,
  Gauge
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

// Mock RFID data integrated with factory system
const rfidAssets = [
  {
    id: 1,
    rfidTag: "RFID-MTR-001",
    assetType: "material_batch",
    assetName: "Premium Feed Mix A - Batch #001",
    assetCode: "MTR-PFA-001",
    currentLocation: "Production Line 1 - Mixing Station",
    zone: "production",
    status: "active",
    materialName: "Premium Feed Mix A",
    productionOrderId: 1,
    weight: 2800,
    quantity: 2800,
    unit: "kg",
    temperature: 22.5,
    humidity: 45,
    batteryLevel: 87,
    signalStrength: 92,
    lastSeen: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
  },
  {
    id: 2,
    rfidTag: "RFID-CNT-002",
    assetType: "container",
    assetName: "Industrial Container #C-2024-45",
    assetCode: "CNT-2024-45",
    currentLocation: "Storage Zone B - Silo 3",
    zone: "storage",
    status: "active",
    materialName: "Corn Meal Standard",
    productionOrderId: null,
    weight: 1200,
    quantity: 1200,
    unit: "kg",
    temperature: 18.2,
    humidity: 38,
    batteryLevel: 74,
    signalStrength: 89,
    lastSeen: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
  },
  {
    id: 3,
    rfidTag: "RFID-PLT-003",
    assetType: "pallet",
    assetName: "Shipping Pallet #P-789",
    assetCode: "PLT-789",
    currentLocation: "Shipping Dock A",
    zone: "shipping",
    status: "active",
    materialName: "Mixed Product Pallets",
    productionOrderId: 2,
    weight: 850,
    quantity: 850,
    unit: "kg",
    temperature: 20.1,
    humidity: 42,
    batteryLevel: 91,
    signalStrength: 85,
    lastSeen: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
  },
  {
    id: 4,
    rfidTag: "RFID-EQP-004",
    assetType: "equipment",
    assetName: "Mobile Conveyor Unit #MCU-12",
    assetCode: "EQP-MCU-12",
    currentLocation: "Maintenance Bay 2",
    zone: "maintenance",
    status: "maintenance",
    materialName: "N/A",
    productionOrderId: null,
    weight: 0,
    quantity: 0,
    unit: "unit",
    temperature: 24.8,
    humidity: 50,
    batteryLevel: 23,
    signalStrength: 67,
    lastSeen: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
  },
  {
    id: 5,
    rfidTag: "RFID-MTR-005",
    assetType: "material_batch",
    assetName: "Vitamin Supplement Mix - Batch #003",
    assetCode: "MTR-VSM-003",
    currentLocation: "Production Line 1 - Dosing Station",
    zone: "production",
    status: "active",
    materialName: "Vitamin Supplement Mix",
    productionOrderId: 4,
    weight: 450,
    quantity: 450,
    unit: "kg",
    temperature: 21.7,
    humidity: 44,
    batteryLevel: 95,
    signalStrength: 94,
    lastSeen: new Date(Date.now() - 30 * 1000), // 30 seconds ago
  },
];

const rfidReaders = [
  { id: "RDR-001", name: "Production Line 1 - Entry", zone: "production", status: "online", lastPing: "30s ago" },
  { id: "RDR-002", name: "Storage Zone A", zone: "storage", status: "online", lastPing: "45s ago" },
  { id: "RDR-003", name: "Storage Zone B", zone: "storage", status: "offline", lastPing: "15m ago" },
  { id: "RDR-004", name: "Shipping Dock A", zone: "shipping", status: "online", lastPing: "1m ago" },
  { id: "RDR-005", name: "Maintenance Bay", zone: "maintenance", status: "online", lastPing: "2m ago" },
  { id: "RDR-006", name: "Receiving Dock", zone: "receiving", status: "online", lastPing: "1m ago" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-500/10 text-green-400 border-green-500/20'
    case 'maintenance':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    case 'inactive':
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    case 'lost':
      return 'bg-red-500/10 text-red-400 border-red-500/20'
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

const getZoneColor = (zone: string) => {
  switch (zone) {
    case 'production':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'storage':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    case 'shipping':
      return 'bg-green-500/10 text-green-400 border-green-500/20'
    case 'receiving':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    case 'maintenance':
      return 'bg-red-500/10 text-red-400 border-red-500/20'
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

const getBatteryColor = (level: number) => {
  if (level > 60) return 'text-green-400'
  if (level > 30) return 'text-yellow-400'
  return 'text-red-400'
}

const getSignalColor = (strength: number) => {
  if (strength > 80) return 'text-green-400'
  if (strength > 50) return 'text-yellow-400'
  return 'text-red-400'
}

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

export default function RFID() {
  const [searchTerm, setSearchTerm] = useState('')
  const [zoneFilter, setZoneFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [assetTypeFilter, setAssetTypeFilter] = useState('All')
  const [selectedAsset, setSelectedAsset] = useState<any>(null)

  // Filter assets
  const filteredAssets = rfidAssets.filter(asset => {
    const matchesSearch = asset.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.rfidTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.assetCode.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesZone = zoneFilter === 'All' || asset.zone === zoneFilter
    const matchesStatus = statusFilter === 'All' || asset.status === statusFilter
    const matchesType = assetTypeFilter === 'All' || asset.assetType === assetTypeFilter
    return matchesSearch && matchesZone && matchesStatus && matchesType
  })

  // Calculate KPIs
  const totalAssets = rfidAssets.length
  const activeAssets = rfidAssets.filter(a => a.status === 'active').length
  const onlineReaders = rfidReaders.filter(r => r.status === 'online').length
  const lowBatteryAssets = rfidAssets.filter(a => a.batteryLevel < 30).length
  const weakSignalAssets = rfidAssets.filter(a => a.signalStrength < 50).length
  const avgTemperature = rfidAssets.reduce((sum, a) => sum + a.temperature, 0) / rfidAssets.length

  return (
    <WaterSystemLayout 
      title="RFID Asset Tracking" 
      subtitle="Real-time asset monitoring and material flow tracking"
    >
      <div className="space-y-6">
        
        {/* RFID KPI Cards */}
        <div className="grid grid-cols-6 gap-4">
          <KPICard
            title="TOTAL ASSETS"
            value={totalAssets.toString()}
            subtitle="Tracked"
            icon="package"
            color="cyan"
            chartType="gauge"
          />
          <KPICard
            title="ACTIVE ASSETS"
            value={activeAssets.toString()}
            subtitle="Online"
            icon="activity"
            color="green"
            chartType="circle"
          />
          <KPICard
            title="RFID READERS"
            value={`${onlineReaders}/${rfidReaders.length}`}
            subtitle="Online"
            icon="radio"
            color="blue"
            chartType="bar"
          />
          <KPICard
            title="LOW BATTERY"
            value={lowBatteryAssets.toString()}
            subtitle="Alerts"
            icon="battery"
            color="orange"
            chartType="line"
          />
          <KPICard
            title="WEAK SIGNAL"
            value={weakSignalAssets.toString()}
            subtitle="Assets"
            icon="signal"
            color="red"
            chartType="gauge"
          />
          <KPICard
            title="AVG TEMP"
            value={`${avgTemperature.toFixed(1)}°C`}
            subtitle="Environment"
            icon="gauge"
            color="purple"
            chartType="line"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* RFID Asset Management */}
          <div className="lg:col-span-2 bg-slate-950/50 border border-slate-700/30 rounded-lg backdrop-blur-sm">
            <div className="p-6 border-b border-slate-700/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Radio className="h-6 w-6 text-cyan-400" />
                  Asset Tracking Dashboard
                </h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Register Asset
                </Button>
              </div>
              
              {/* Filters */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Search Assets</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search RFID tag, asset name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Zone Filter</label>
                  <Select value={zoneFilter} onValueChange={setZoneFilter}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="All">All Zones</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="storage">Storage</SelectItem>
                      <SelectItem value="shipping">Shipping</SelectItem>
                      <SelectItem value="receiving">Receiving</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Status Filter</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="All">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Asset Type</label>
                  <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="All">All Types</SelectItem>
                      <SelectItem value="material_batch">Material Batch</SelectItem>
                      <SelectItem value="container">Container</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="pallet">Pallet</SelectItem>
                      <SelectItem value="tool">Tool</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Assets Table */}
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/30">
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">RFID Tag</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Asset</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Zone</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Battery</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Signal</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Last Seen</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => (
                      <tr key={asset.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-cyan-400 font-mono text-sm">{asset.rfidTag}</td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-white font-medium text-sm">{asset.assetName}</div>
                            <div className="text-slate-400 text-xs">{asset.assetCode}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">{asset.currentLocation}</td>
                        <td className="px-4 py-3">
                          <Badge className={`px-2 py-1 text-xs font-medium rounded ${getZoneColor(asset.zone)}`}>
                            {asset.zone.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(asset.status)}`}>
                            {asset.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Battery className={`h-4 w-4 ${getBatteryColor(asset.batteryLevel)}`} />
                            <span className={`text-sm ${getBatteryColor(asset.batteryLevel)}`}>
                              {asset.batteryLevel}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Signal className={`h-4 w-4 ${getSignalColor(asset.signalStrength)}`} />
                            <span className={`text-sm ${getSignalColor(asset.signalStrength)}`}>
                              {asset.signalStrength}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">{formatTimeAgo(asset.lastSeen)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 w-7 p-0 bg-blue-600/20 border-blue-500 hover:bg-blue-600/30"
                              onClick={() => setSelectedAsset(asset)}
                            >
                              <Eye className="h-3 w-3 text-blue-400" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 w-7 p-0 bg-green-600/20 border-green-500 hover:bg-green-600/30"
                            >
                              <Edit className="h-3 w-3 text-green-400" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Asset Details & Reader Status */}
          <div className="space-y-6">
            
            {/* Selected Asset Details */}
            {selectedAsset && (
              <Card className="bg-slate-950/50 border-slate-700/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-cyan-400" />
                    Asset Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Asset Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">RFID Tag:</span>
                        <span className="text-cyan-400 font-mono text-sm">{selectedAsset.rfidTag}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">Asset Code:</span>
                        <span className="text-white text-sm">{selectedAsset.assetCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">Type:</span>
                        <span className="text-white text-sm capitalize">{selectedAsset.assetType.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Material Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">Material:</span>
                        <span className="text-white text-sm">{selectedAsset.materialName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">Quantity:</span>
                        <span className="text-white text-sm">{selectedAsset.quantity} {selectedAsset.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">Weight:</span>
                        <span className="text-white text-sm">{selectedAsset.weight} kg</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Environmental Data</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">Temperature:</span>
                        <span className="text-white text-sm">{selectedAsset.temperature}°C</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">Humidity:</span>
                        <span className="text-white text-sm">{selectedAsset.humidity}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Signal Status</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400 text-sm">Battery Level</span>
                          <span className={`text-sm ${getBatteryColor(selectedAsset.batteryLevel)}`}>
                            {selectedAsset.batteryLevel}%
                          </span>
                        </div>
                        <Progress value={selectedAsset.batteryLevel} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400 text-sm">Signal Strength</span>
                          <span className={`text-sm ${getSignalColor(selectedAsset.signalStrength)}`}>
                            {selectedAsset.signalStrength}%
                          </span>
                        </div>
                        <Progress value={selectedAsset.signalStrength} className="h-2" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* RFID Reader Status */}
            <Card className="bg-slate-950/50 border-slate-700/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-cyan-400" />
                  RFID Reader Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rfidReaders.map((reader) => (
                    <div key={reader.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded border border-slate-700/30">
                      <div>
                        <div className="text-white text-sm font-medium">{reader.name}</div>
                        <div className="text-slate-400 text-xs">{reader.id}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`px-2 py-1 text-xs ${getZoneColor(reader.zone)}`}>
                          {reader.zone}
                        </Badge>
                        <div className={`h-2 w-2 rounded-full ${reader.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className={`text-xs ${reader.status === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                          {reader.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Zone Distribution */}
            <Card className="bg-slate-950/50 border-slate-700/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-cyan-400" />
                  Asset Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['production', 'storage', 'shipping', 'receiving', 'maintenance'].map(zone => {
                    const count = rfidAssets.filter(a => a.zone === zone).length
                    const percentage = (count / rfidAssets.length) * 100
                    return (
                      <div key={zone}>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-300 text-sm capitalize">{zone}</span>
                          <span className="text-white text-sm">{count} assets</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </WaterSystemLayout>
  )
}