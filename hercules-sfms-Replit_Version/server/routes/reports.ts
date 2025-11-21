import express from 'express'
import { authenticateToken } from '../middleware/auth'
import { demoStorage } from '../demoStorage'

const router = express.Router()

// Report Configuration Interface
interface ReportColumn {
  id: string
  label: string
  tagId?: string // PLC Tag ID to fetch data from
  calculation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'diff'
  formula?: string // Custom formula like "tagA - tagB"
  unit?: string
  visible: boolean
  order: number
}

interface ReportConfig {
  id: string
  name: string
  type: 'daily' | 'weekly' | 'monthly' | 'detailed' | 'material'
  columns: ReportColumn[]
  groupBy?: string[] // Group by product, batch, line, etc.
  filters?: any
  createdBy: string
  updatedAt: Date
}

// Get report configurations for user
router.get('/configs', authenticateToken, async (req: any, res) => {
  try {
    // In production, fetch from database
    const configs = await getReportConfigs(req.tenantId)
    res.json(configs)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report configs' })
  }
})

// Create/Update report configuration
router.post('/config', authenticateToken, async (req: any, res) => {
  try {
    const config: ReportConfig = {
      ...req.body,
      updatedAt: new Date(),
      createdBy: req.userId
    }
    
    // Validate columns have valid tag mappings
    const validTags = await validateTagMappings(config.columns, req.tenantId)
    if (!validTags.valid) {
      return res.status(400).json({ error: 'Invalid tag mappings', details: validTags.errors })
    }
    
    // Save configuration
    const savedConfig = await saveReportConfig(config, req.tenantId)
    res.json(savedConfig)
  } catch (error) {
    res.status(500).json({ error: 'Failed to save report config' })
  }
})

// Get report data based on configuration
router.post('/generate', authenticateToken, async (req: any, res) => {
  try {
    const { configId, startDate, endDate, filters } = req.body
    
    // Fetch report configuration
    const config = await getReportConfig(configId, req.tenantId)
    if (!config) {
      return res.status(404).json({ error: 'Report configuration not found' })
    }
    
    // Fetch PLC tag data for the period
    const tagData = await fetchTagData({
      tagIds: config.columns.filter(c => c.tagId).map(c => c.tagId!),
      startDate,
      endDate,
      tenantId: req.tenantId
    })
    
    // Process data based on configuration
    const reportData = processReportData(tagData, config, filters)
    
    res.json({
      config,
      data: reportData,
      metadata: {
        generated: new Date(),
        period: { startDate, endDate },
        recordCount: reportData.length
      }
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

// Helper functions (in production these would use real database)
async function getReportConfigs(tenantId: string): Promise<ReportConfig[]> {
  // Default configurations that can be customized
  return [
    {
      id: 'daily-production',
      name: 'Daily Production Summary',
      type: 'daily',
      columns: [
        { id: 'product', label: 'Product Name', visible: true, order: 1 },
        { id: 'batches', label: 'No Of Batches', calculation: 'count', visible: true, order: 2 },
        { id: 'setpoint', label: 'Sum SP', tagId: 'sp_total', calculation: 'sum', unit: 'kg', visible: true, order: 3 },
        { id: 'actual', label: 'Sum Act', tagId: 'act_total', calculation: 'sum', unit: 'kg', visible: true, order: 4 },
        { id: 'error_kg', label: 'Err Kg', formula: 'actual - setpoint', unit: 'kg', visible: true, order: 5 },
        { id: 'error_pct', label: 'Err %', formula: '((actual - setpoint) / setpoint) * 100', unit: '%', visible: true, order: 6 }
      ],
      groupBy: ['product', 'date'],
      createdBy: 'system',
      updatedAt: new Date()
    }
  ]
}

async function getReportConfig(configId: string, tenantId: string): Promise<ReportConfig | null> {
  const configs = await getReportConfigs(tenantId)
  return configs.find(c => c.id === configId) || null
}

async function saveReportConfig(config: ReportConfig, tenantId: string): Promise<ReportConfig> {
  // In production, save to database
  // For now, return the config
  return config
}

async function validateTagMappings(columns: ReportColumn[], tenantId: string): Promise<{ valid: boolean, errors?: string[] }> {
  const errors: string[] = []
  
  for (const column of columns) {
    if (column.tagId) {
      // Check if tag exists and belongs to tenant
      const tag = demoStorage.plcTags.get(column.tagId)
      if (!tag) {
        errors.push(`Tag ${column.tagId} not found for column ${column.label}`)
      }
    }
  }
  
  return { valid: errors.length === 0, errors }
}

async function fetchTagData(params: {
  tagIds: string[],
  startDate: Date,
  endDate: Date,
  tenantId: string
}): Promise<any[]> {
  const data: any[] = []
  
  // In production, query historical database
  // For demo, generate sample data based on tag configuration
  for (const tagId of params.tagIds) {
    const tag = demoStorage.plcTags.get(tagId)
    if (tag) {
      // Generate time-series data for the period
      const days = Math.ceil((params.endDate.getTime() - params.startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      for (let i = 0; i < days; i++) {
        const timestamp = new Date(params.startDate.getTime() + i * 24 * 60 * 60 * 1000)
        
        data.push({
          tagId,
          tagName: tag.tagName,
          value: generateValueForTag(tag),
          timestamp,
          quality: 'good'
        })
      }
    }
  }
  
  return data
}

function generateValueForTag(tag: any): number {
  const min = tag.minValue || 0
  const max = tag.maxValue || 100
  return min + Math.random() * (max - min)
}

function processReportData(tagData: any[], config: ReportConfig, filters: any): any[] {
  const processed: any[] = []
  
  // Group data based on configuration
  const grouped = groupDataBy(tagData, config.groupBy || [])
  
  // Apply calculations for each column
  for (const group of Object.values(grouped)) {
    const row: any = {}
    
    for (const column of config.columns) {
      if (!column.visible) continue
      
      if (column.calculation) {
        row[column.id] = calculateValue(group as any[], column.calculation)
      } else if (column.formula) {
        row[column.id] = evaluateFormula(column.formula, row)
      } else {
        row[column.id] = (group as any[])[0]?.[column.id] || ''
      }
    }
    
    processed.push(row)
  }
  
  return processed
}

function groupDataBy(data: any[], groupByFields: string[]): Record<string, any[]> {
  return data.reduce((acc, item) => {
    const key = groupByFields.map(field => item[field] || '').join('-')
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, any[]>)
}

function calculateValue(data: any[], calculation: string): number {
  const values = data.map(d => d.value).filter(v => typeof v === 'number')
  
  switch (calculation) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0)
    case 'avg':
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
    case 'min':
      return Math.min(...values)
    case 'max':
      return Math.max(...values)
    case 'count':
      return values.length
    default:
      return 0
  }
}

function evaluateFormula(formula: string, context: any): number {
  // Simple formula evaluation (in production use a proper expression parser)
  try {
    // Replace variable names with values
    let expression = formula
    for (const [key, value] of Object.entries(context)) {
      expression = expression.replace(new RegExp(key, 'g'), String(value))
    }
    
    // Safely evaluate (in production use a proper math expression library)
    // For now, just handle basic operations
    return eval(expression)
  } catch {
    return 0
  }
}

export default router