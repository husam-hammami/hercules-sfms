import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Settings, Eye, EyeOff, GripVertical, Plus, Trash2, Database } from 'lucide-react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ReportColumn {
  id: string
  label: string
  tagId?: string
  calculation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'diff'
  formula?: string
  unit?: string
  visible: boolean
  order: number
  dataSource?: 'plc' | 'manual' | 'calculated'
}

interface PLCTag {
  id: string
  name: string
  address: string
  dataType: string
  unit?: string
}

interface Props {
  columns: ReportColumn[]
  availableTags: PLCTag[]
  onColumnsChange: (columns: ReportColumn[]) => void
  reportType: string
}

// Sortable column item
function SortableColumn({ column, tags, onChange, onDelete }: {
  column: ReportColumn
  tags: PLCTag[]
  onChange: (updates: Partial<ReportColumn>) => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-slate-700 light:bg-gray-50 rounded-lg p-3 mb-2 border border-slate-600 light:border-gray-300"
    >
      <div className="flex items-start gap-3">
        <div {...attributes} {...listeners} className="cursor-move mt-2">
          <GripVertical className="h-5 w-5 text-slate-400 light:text-gray-500" />
        </div>
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <Input
              value={column.label}
              onChange={(e) => onChange({ label: e.target.value })}
              placeholder="Column Name"
              className="max-w-xs bg-slate-600 light:bg-white border-slate-500 light:border-gray-400 text-white light:text-gray-900"
            />
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {column.visible ? (
                  <Eye className="h-4 w-4 text-cyan-400 light:text-blue-600" />
                ) : (
                  <EyeOff className="h-4 w-4 text-slate-400 light:text-gray-500" />
                )}
                <Switch
                  checked={column.visible}
                  onCheckedChange={(visible) => onChange({ visible })}
                />
              </div>
              
              <Button
                onClick={onDelete}
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300 light:text-red-600 light:hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={column.dataSource || 'plc'}
              onValueChange={(value) => onChange({ dataSource: value as any })}
            >
              <SelectTrigger className="bg-slate-600 light:bg-white border-slate-500 light:border-gray-400 text-white light:text-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plc">PLC Tag</SelectItem>
                <SelectItem value="calculated">Calculated</SelectItem>
                <SelectItem value="manual">Manual Entry</SelectItem>
              </SelectContent>
            </Select>
            
            {column.dataSource === 'plc' && (
              <Select
                value={column.tagId || ''}
                onValueChange={(tagId) => {
                  const tag = tags.find(t => t.id === tagId)
                  onChange({ 
                    tagId, 
                    unit: tag?.unit 
                  })
                }}
              >
                <SelectTrigger className="bg-slate-600 light:bg-white border-slate-500 light:border-gray-400 text-white light:text-gray-900">
                  <SelectValue placeholder="Select Tag" />
                </SelectTrigger>
                <SelectContent>
                  {tags.map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name} ({tag.address})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {column.dataSource === 'calculated' && (
              <>
                <Select
                  value={column.calculation || ''}
                  onValueChange={(calculation) => onChange({ calculation: calculation as any })}
                >
                  <SelectTrigger className="bg-slate-600 light:bg-white border-slate-500 light:border-gray-400 text-white light:text-gray-900">
                    <SelectValue placeholder="Calculation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sum">Sum</SelectItem>
                    <SelectItem value="avg">Average</SelectItem>
                    <SelectItem value="min">Minimum</SelectItem>
                    <SelectItem value="max">Maximum</SelectItem>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="diff">Difference</SelectItem>
                  </SelectContent>
                </Select>
                
                <Input
                  value={column.formula || ''}
                  onChange={(e) => onChange({ formula: e.target.value })}
                  placeholder="Formula (e.g., actual - setpoint)"
                  className="bg-slate-600 light:bg-white border-slate-500 light:border-gray-400 text-white light:text-gray-900"
                />
              </>
            )}
            
            <Input
              value={column.unit || ''}
              onChange={(e) => onChange({ unit: e.target.value })}
              placeholder="Unit (kg, %, etc)"
              className="bg-slate-600 light:bg-white border-slate-500 light:border-gray-400 text-white light:text-gray-900"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReportColumnConfig({ columns, availableTags, onColumnsChange, reportType }: Props) {
  const [localColumns, setLocalColumns] = useState(columns)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = localColumns.findIndex(c => c.id === active.id)
    const newIndex = localColumns.findIndex(c => c.id === over.id)

    const updated = [...localColumns]
    const [removed] = updated.splice(oldIndex, 1)
    updated.splice(newIndex, 0, removed)
    
    // Update order numbers
    const reordered = updated.map((col, idx) => ({ ...col, order: idx + 1 }))
    setLocalColumns(reordered)
    onColumnsChange(reordered)
  }

  const updateColumn = (id: string, updates: Partial<ReportColumn>) => {
    const updated = localColumns.map(col => 
      col.id === id ? { ...col, ...updates } : col
    )
    setLocalColumns(updated)
    onColumnsChange(updated)
  }

  const addColumn = () => {
    const newColumn: ReportColumn = {
      id: `col_${Date.now()}`,
      label: 'New Column',
      visible: true,
      order: localColumns.length + 1,
      dataSource: 'plc'
    }
    const updated = [...localColumns, newColumn]
    setLocalColumns(updated)
    onColumnsChange(updated)
  }

  const deleteColumn = (id: string) => {
    const updated = localColumns
      .filter(col => col.id !== id)
      .map((col, idx) => ({ ...col, order: idx + 1 }))
    setLocalColumns(updated)
    onColumnsChange(updated)
  }

  // Get suggested columns based on report type
  const getSuggestedColumns = () => {
    switch (reportType) {
      case 'daily':
        return ['Product Name', 'Batches Count', 'Total Setpoint', 'Total Actual', 'Error', 'Error %']
      case 'material':
        return ['Material Code', 'Material Name', 'Planned Qty', 'Actual Qty', 'Variance', 'Variance %']
      default:
        return []
    }
  }

  return (
    <Card className="bg-slate-800/50 light:bg-white border-slate-700 light:border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white light:text-gray-900">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-cyan-400 light:text-blue-600" />
            Report Column Configuration
          </div>
          <Button
            onClick={addColumn}
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700 light:bg-blue-600 light:hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Column
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="mb-4 p-3 bg-slate-700/50 light:bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Database className="h-4 w-4 text-cyan-400 light:text-blue-600 mt-1" />
            <div className="text-sm text-slate-300 light:text-gray-700">
              <p className="font-semibold mb-1">How Report Data Works in Production:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>PLC Tag:</strong> Real-time data from your configured PLC tags</li>
                <li>• <strong>Calculated:</strong> Apply formulas to tag values (sum, avg, etc.)</li>
                <li>• <strong>Manual:</strong> User-entered static values</li>
                <li>• Drag columns to reorder, toggle visibility as needed</li>
              </ul>
              <p className="mt-2 text-xs">
                <strong>Suggested columns for {reportType} report:</strong> {getSuggestedColumns().join(', ')}
              </p>
            </div>
          </div>
        </div>
        
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={localColumns.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {localColumns.map(column => (
              <SortableColumn
                key={column.id}
                column={column}
                tags={availableTags}
                onChange={(updates) => updateColumn(column.id, updates)}
                onDelete={() => deleteColumn(column.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
        
        {localColumns.length === 0 && (
          <div className="text-center py-8 text-slate-400 light:text-gray-500">
            <p>No columns configured. Click "Add Column" to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}