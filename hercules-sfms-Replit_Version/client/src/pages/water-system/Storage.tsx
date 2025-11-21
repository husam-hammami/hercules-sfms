import React, { useState } from 'react'
import { WaterSystemLayout } from '../../components/water-system/WaterSystemLayout'
import { KPICard } from '../../components/water-system/KPICard'
import { Search, Filter, Plus, Settings, MapPin, Package, Warehouse, Container, Archive, Edit, Trash2, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiRequest } from '@/lib/queryClient'
import type { BinMaterial, Material, StorageBin } from '@shared/schema'

const binMaterialSchema = z.object({
  binName: z.string().min(1, 'Bin name is required'),
  materialName: z.string().min(1, 'Material is required'),
  materialCode: z.string().min(1, 'Material code is required'),
  hlActive: z.boolean().default(true),
  lockActive: z.boolean().default(false),
})

type BinMaterialForm = z.infer<typeof binMaterialSchema>

export default function Storage() {
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<BinMaterial | null>(null)
  const queryClient = useQueryClient()

  // Fetch data
  const { data: binMaterials = [], isLoading: loadingBinMaterials } = useQuery<BinMaterial[]>({
    queryKey: ['/api/bin-materials'],
  })

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  })

  const { data: storageBins = [] } = useQuery<StorageBin[]>({
    queryKey: ['/api/storage-bins'],
  })

  // Form setup
  const form = useForm<BinMaterialForm>({
    resolver: zodResolver(binMaterialSchema),
    defaultValues: {
      binName: '',
      materialName: '',
      materialCode: '',
      hlActive: true,
      lockActive: false,
    },
  })

  // Mutations
  const createAssignmentMutation = useMutation({
    mutationFn: (data: BinMaterialForm) => apiRequest('/api/bin-materials', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bin-materials'] })
      setShowAssignDialog(false)
      form.reset()
    },
  })

  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BinMaterialForm> }) =>
      apiRequest(`/api/bin-materials/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bin-materials'] })
      setEditingAssignment(null)
    },
  })

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/bin-materials/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bin-materials'] })
    },
  })

  // Form handlers
  const onSubmit = (data: BinMaterialForm) => {
    const selectedMaterial = materials.find((m) => m.name === data.materialName)
    if (selectedMaterial) {
      createAssignmentMutation.mutate({
        ...data,
        materialCode: selectedMaterial.code,
      })
    }
  }

  const handleEdit = (assignment: BinMaterial) => {
    setEditingAssignment(assignment)
  }

  const handleToggleHL = (id: number, currentValue: boolean) => {
    updateAssignmentMutation.mutate({
      id,
      data: { hlActive: !currentValue },
    })
  }

  const handleToggleLock = (id: number, currentValue: boolean) => {
    updateAssignmentMutation.mutate({
      id,
      data: { lockActive: !currentValue },
    })
  }

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to remove this bin assignment?')) {
      deleteAssignmentMutation.mutate(id)
    }
  }
  return (
    <WaterSystemLayout 
      title="Storage Management" 
      subtitle="Warehouse zones, storage bins, and material assignments"
    >
      <div className="space-y-6">
        
        {/* Storage KPI Cards */}
        <div className="grid grid-cols-6 gap-4">
          <KPICard
            title="TOTAL BINS"
            value="108"
            subtitle="Storage Units"
            icon="activity"
            color="blue"
            chartType="bar"
          />
          <KPICard
            title="OCCUPIED"
            value="78"
            subtitle="Active Bins"
            icon="gauge"
            color="green"
            chartType="gauge"
          />
          <KPICard
            title="AVAILABLE"
            value="30"
            subtitle="Free Capacity"
            icon="activity"
            color="cyan"
            chartType="line"
          />
          <KPICard
            title="ZONES"
            value="4"
            subtitle="Warehouse Areas"
            icon="gauge"
            color="orange"
            chartType="circle"
          />
          <KPICard
            title="CAPACITY"
            value="85%"
            subtitle="Utilization"
            icon="activity"
            color="purple"
            chartType="gauge"
          />
          <KPICard
            title="EFFICIENCY"
            value="92%"
            subtitle="Space Usage"
            icon="gauge"
            color="green"
            chartType="line"
          />
        </div>

        {/* Bin Material Assignment Interface */}
        <div className="bg-slate-950/50 border border-slate-700/30 rounded-lg backdrop-blur-sm">
          {/* Header with Assign Button */}
          <div className="p-6 border-b border-slate-700/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Link className="h-5 w-5 text-cyan-400" />
                Bin Material Assignments
              </h3>
              <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Material to Bin
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Assign Material to Bin</DialogTitle>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="binName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Bin Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter bin name (e.g., BIN-001)"
                                className="bg-slate-800/50 border-slate-600 text-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="materialName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Material</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                                  <SelectValue placeholder="Select material" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-800 border-slate-600">
                                {materials.map((material: Material) => (
                                  <SelectItem key={material.id} value={material.name}>
                                    {material.name} ({material.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="hlActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-600 p-3 bg-slate-800/30">
                              <div className="space-y-0.5">
                                <FormLabel className="text-slate-300 text-sm">HL Active</FormLabel>
                                <div className="text-xs text-slate-400">Enable high-level sensor</div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="lockActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-600 p-3 bg-slate-800/30">
                              <div className="space-y-0.5">
                                <FormLabel className="text-slate-300 text-sm">Lock Active</FormLabel>
                                <div className="text-xs text-slate-400">Enable bin lock</div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button
                          type="submit"
                          disabled={createAssignmentMutation.isPending}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white flex-1"
                        >
                          {createAssignmentMutation.isPending ? 'Assigning...' : 'Assign Material'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAssignDialog(false)}
                          className="border-slate-600 text-slate-300 hover:bg-slate-800"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Assignments Table */}
          <div className="p-6">
            {loadingBinMaterials ? (
              <div className="text-center py-8 text-slate-400">Loading assignments...</div>
            ) : binMaterials.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Package className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                <p className="text-lg font-medium">No bin assignments found</p>
                <p className="text-sm">Start by assigning materials to storage bins</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/30">
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Bin Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Material Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Material Code</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">HL Active</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Lock Active</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {binMaterials.map((assignment: BinMaterial) => (
                      <tr key={assignment.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-white font-medium">{assignment.binName}</td>
                        <td className="px-4 py-3 text-white">{assignment.materialName}</td>
                        <td className="px-4 py-3 text-cyan-400 font-mono">{assignment.materialCode}</td>
                        <td className="px-4 py-3">
                          <Switch
                            checked={assignment.hlActive ?? false}
                            onCheckedChange={() => handleToggleHL(assignment.id, assignment.hlActive ?? false)}
                            disabled={updateAssignmentMutation.isPending}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Switch
                            checked={assignment.lockActive ?? false}
                            onCheckedChange={() => handleToggleLock(assignment.id, assignment.lockActive ?? false)}
                            disabled={updateAssignmentMutation.isPending}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(assignment.id)}
                              disabled={deleteAssignmentMutation.isPending}
                              className="bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30 h-7 px-2"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Assignment Dialog for New Assignments */}
      </div>
    </WaterSystemLayout>
  )
}