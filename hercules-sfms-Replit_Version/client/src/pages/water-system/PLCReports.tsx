import { useState, useMemo } from 'react'
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Calendar, Filter, Download, Printer, Database, Activity, BarChart3, Layers, Package, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import herculesLogo from '@assets/Herc_Logo_v2.0_1750925836065.png'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable
  }
}

// Types for PLC reporting data
interface PLCReportData {
  orderId: string
  batchId: string
  productName: string
  binNumber: string
  binName: string
  matCode: string
  matName: string
  qtySpSetpoint: number
  qtyOut: number
  dosed: boolean
  timestamp: string
  lineNumber: string
}

interface ReportFilters {
  startDate: string
  endDate: string
  selectedBins: string[]
  selectedBatches: string[]
  selectedLines: string[]
}

// Mock data generator for PLC reports
const generatePLCReportData = (reportType: string, count: number = 50): PLCReportData[] => {
  const materials = [
    { code: 'CHL001', name: 'Chlorine Solution' },
    { code: 'COG002', name: 'Coagulant PAC' },
    { code: 'FLC003', name: 'Flocculant Polymer' },
    { code: 'ALM004', name: 'Aluminum Sulfate' },
    { code: 'LIM005', name: 'Lime Slurry' },
    { code: 'SOD006', name: 'Sodium Hypochlorite' },
    { code: 'POT007', name: 'Potassium Permanganate' },
    { code: 'FER008', name: 'Ferric Chloride' },
    { code: 'ACT009', name: 'Activated Carbon' },
    { code: 'POL010', name: 'Polymer Solution' }
  ]

  const products = [
    'Water Treatment Formula A',
    'Coagulation Mix Type B',
    'Disinfection Blend C',
    'pH Balance Solution D',
    'Clarification Mix E'
  ]

  const bins = [
    { number: 'BIN001', name: 'Primary Chemical Storage' },
    { number: 'BIN002', name: 'Secondary Treatment Tank' },
    { number: 'BIN003', name: 'Coagulation Chamber' },
    { number: 'BIN004', name: 'Flocculation Basin' },
    { number: 'BIN005', name: 'Settling Tank' },
    { number: 'BIN006', name: 'Filtration Unit' },
    { number: 'BIN007', name: 'Disinfection Chamber' },
    { number: 'BIN008', name: 'pH Adjustment Tank' },
    { number: 'BIN009', name: 'Storage Reservoir' },
    { number: 'BIN010', name: 'Distribution Tank' }
  ]

  const lines = ['Line1', 'Line2', 'MixLine1', 'MixLine2']
  
  // Generate batches with multiple materials each
  const batches: PLCReportData[] = []
  const numBatches = Math.floor(count / 4) // Each batch will have 3-5 materials
  
  for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
    const product = products[Math.floor(Math.random() * products.length)]
    const line = lines[Math.floor(Math.random() * lines.length)]
    
    const baseDate = new Date()
    const daysAgo = Math.floor(Math.random() * 30)
    const timestamp = new Date(baseDate.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    
    const batchId = `BATCH-${String(batchIndex + 1).padStart(4, '0')}`
    const orderId = `ORD-${String(Math.floor(batchIndex / 3) + 1).padStart(4, '0')}`
    
    // Each batch has 3-5 different materials
    const materialsPerBatch = 3 + Math.floor(Math.random() * 3)
    // Use more realistic material combinations for batches
    const materialCombinations = [
      ['CHL001', 'COG002', 'FLC003', 'ALM004'], // Coagulation batch
      ['SOD006', 'POT007', 'LIM005'], // Disinfection batch  
      ['FER008', 'ACT009', 'POL010', 'LIM005'], // Filtration batch
      ['CHL001', 'ALM004', 'LIM005'], // pH adjustment batch
      ['COG002', 'FLC003', 'POL010'] // Flocculation batch
    ]
    
    const combIndex = batchIndex % materialCombinations.length
    const selectedMaterialCodes = materialCombinations[combIndex]
    const selectedMaterials = materials.filter(m => selectedMaterialCodes.includes(m.code))
    
    selectedMaterials.forEach((material, materialIndex) => {
      const bin = bins[Math.floor(Math.random() * bins.length)]
      const setpoint = 50 + Math.random() * 200 // Smaller quantities per material
      const actual = setpoint * (0.95 + Math.random() * 0.1) // ±5% variation
      const dosed = Math.random() > 0.15 // 85% chance of being dosed (true)
      
      if (dosed) { // Only include dosed items
        batches.push({
          orderId: orderId,
          batchId: batchId,
          productName: product,
          binNumber: bin.number,
          binName: bin.name,
          matCode: material.code,
          matName: material.name,
          qtySpSetpoint: parseFloat(setpoint.toFixed(2)),
          qtyOut: parseFloat(actual.toFixed(2)),
          dosed: dosed,
          timestamp: timestamp.toISOString(),
          lineNumber: line
        })
      }
    })
  }
  
  return batches.sort((a, b) => {
    // Sort by batch ID first, then by material code for consistent ordering
    if (a.batchId !== b.batchId) {
      return b.batchId.localeCompare(a.batchId)
    }
    return a.matCode.localeCompare(b.matCode)
  })
}

// Report filtering logic
const filterReportData = (data: PLCReportData[], filters: ReportFilters, reportType: string): PLCReportData[] => {
  let filtered = data

  // Date filtering
  if (filters.startDate) {
    filtered = filtered.filter(item => item.timestamp >= filters.startDate)
  }
  if (filters.endDate) {
    filtered = filtered.filter(item => item.timestamp <= filters.endDate)
  }

  // Bin filtering
  if (filters.selectedBins.length > 0) {
    filtered = filtered.filter(item => filters.selectedBins.includes(item.binNumber))
  }

  // Batch filtering
  if (filters.selectedBatches.length > 0) {
    filtered = filtered.filter(item => filters.selectedBatches.includes(item.batchId))
  }

  // Line filtering
  if (filters.selectedLines.length > 0) {
    filtered = filtered.filter(item => filters.selectedLines.includes(item.lineNumber))
  }

  return filtered
}

// Aggregate data for summary reports by product
const aggregateByProduct = (data: PLCReportData[], groupBy: 'day' | 'week' | 'month') => {
  const grouped = data.reduce((acc, item) => {
    const date = new Date(item.timestamp)
    let periodKey: string

    switch (groupBy) {
      case 'day':
        periodKey = date.toISOString().split('T')[0]
        break
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        periodKey = weekStart.toISOString().split('T')[0]
        break
      case 'month':
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      default:
        periodKey = date.toISOString().split('T')[0]
    }

    const key = `${periodKey}-${item.productName}`

    if (!acc[key]) {
      acc[key] = {
        period: periodKey,
        productName: item.productName,
        noOfBatches: 0,
        sumSP: 0,
        sumAct: 0,
        errKg: 0,
        errPercent: 0
      }
    }

    acc[key].noOfBatches++
    acc[key].sumSP += item.qtySpSetpoint
    acc[key].sumAct += item.qtyOut

    return acc
  }, {} as any)

  return Object.values(grouped).map((item: any) => ({
    ...item,
    errKg: parseFloat((item.sumAct - item.sumSP).toFixed(2)),
    errPercent: parseFloat((((item.sumAct - item.sumSP) / item.sumSP) * 100).toFixed(2))
  }))
}

// Aggregate data for material consumption report
const aggregateByMaterial = (data: PLCReportData[]) => {
  const grouped = data.reduce((acc, item) => {
    const key = item.matCode

    if (!acc[key]) {
      acc[key] = {
        materialName: item.matName,
        code: item.matCode,
        plannedKG: 0,
        actualKG: 0,
        differencePercent: 0
      }
    }

    acc[key].plannedKG += item.qtySpSetpoint
    acc[key].actualKG += item.qtyOut

    return acc
  }, {} as any)

  return Object.values(grouped).map((item: any) => ({
    ...item,
    plannedKG: parseFloat(item.plannedKG.toFixed(2)),
    actualKG: parseFloat(item.actualKG.toFixed(2)),
    differencePercent: parseFloat((((item.actualKG - item.plannedKG) / item.plannedKG) * 100).toFixed(2))
  }))
}

// Report table components
interface ReportTableProps {
  data: PLCReportData[]
  reportType: string
}

// Product Summary Report Table (Daily, Weekly, Monthly)
function ProductSummaryTable({ data }: { data: any[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700 light:border-gray-300">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-cyan-500 to-blue-600 border-b-2 border-cyan-400/50">
            <th className="text-left py-3 px-4 text-white font-semibold text-sm uppercase tracking-wide">Product Name</th>
            <th className="text-left py-3 px-4 text-white font-semibold text-sm uppercase tracking-wide">No Of Batches</th>
            <th className="text-left py-3 px-4 text-white font-semibold text-sm uppercase tracking-wide">Sum SP</th>
            <th className="text-left py-3 px-4 text-white font-semibold text-sm uppercase tracking-wide">Sum Act</th>
            <th className="text-left py-3 px-4 text-white font-semibold text-sm uppercase tracking-wide">Err Kg</th>
            <th className="text-left py-3 px-4 text-white font-semibold text-sm uppercase tracking-wide">Err %</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} className={`border-b border-slate-700/30 light:border-gray-200 hover:bg-slate-600/20 light:hover:bg-blue-50 transition-colors ${
              index % 2 === 0 
                ? 'bg-slate-800/30 light:bg-gray-50' 
                : 'bg-slate-800/10 light:bg-white'
            }`}>
              <td className="py-3 px-4 text-white light:text-gray-900 text-sm font-medium">{row.productName}</td>
              <td className="py-3 px-4 text-cyan-400 light:text-blue-600 text-sm font-medium">{row.noOfBatches}</td>
              <td className="py-3 px-4 text-green-400 light:text-green-600 text-sm font-medium">{row.sumSP.toFixed(2)}</td>
              <td className="py-3 px-4 text-blue-400 light:text-blue-700 text-sm font-medium">{row.sumAct.toFixed(2)}</td>
              <td className="py-3 px-4 text-orange-400 light:text-orange-600 text-sm font-medium">{row.errKg}</td>
              <td className="py-3 px-4 text-purple-400 light:text-purple-600 text-sm font-medium">{row.errPercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Material Consumption Report Table
function MaterialConsumptionTable({ data }: { data: any[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700 light:border-gray-300">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-cyan-500 to-blue-600 border-b-2 border-cyan-400/50">
            <th className="text-left py-3 px-4 text-white font-semibold text-sm uppercase tracking-wide">Material Name</th>
            <th className="text-left py-3 px-4 text-white font-semibold text-sm uppercase tracking-wide">Code</th>
            <th className="text-left py-3 px-4 text-white font-semibold text-sm uppercase tracking-wide">Planned KG</th>
            <th className="text-left py-3 px-4 text-white font-semibold text-sm uppercase tracking-wide">Actual KG</th>
            <th className="text-left py-3 px-4 text-white font-semibold text-sm uppercase tracking-wide">Difference %</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} className={`border-b border-slate-700/30 light:border-gray-200 hover:bg-slate-600/20 light:hover:bg-blue-50 transition-colors ${
              index % 2 === 0 
                ? 'bg-slate-800/30 light:bg-gray-50' 
                : 'bg-slate-800/10 light:bg-white'
            }`}>
              <td className="py-3 px-4 text-white light:text-gray-900 text-sm font-medium">{row.materialName}</td>
              <td className="py-3 px-4 text-orange-400 light:text-orange-600 font-mono text-sm font-medium">{row.code}</td>
              <td className="py-3 px-4 text-green-400 light:text-green-600 text-sm font-medium">{row.plannedKG.toFixed(2)}</td>
              <td className="py-3 px-4 text-blue-400 light:text-blue-700 text-sm font-medium">{row.actualKG.toFixed(2)}</td>
              <td className="py-3 px-4 text-purple-400 light:text-purple-600 text-sm font-medium">{row.differencePercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Detailed Report Table with batch grouping - Modern Professional Design
function DetailedReportTable({ data }: ReportTableProps) {
  // Group data by batch ID
  const groupedData = useMemo(() => {
    const groups = data.reduce((acc, item) => {
      if (!acc[item.batchId]) {
        acc[item.batchId] = {
          batch: item,
          materials: []
        }
      }
      acc[item.batchId].materials.push(item)
      return acc
    }, {} as any)
    
    return Object.values(groups)
  }, [data])

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700/50 dark:border-slate-600/50 shadow-2xl bg-slate-900/95 dark:bg-slate-800/95 light:bg-white light:border-gray-300">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-cyan-500 to-blue-600 border-b-2 border-cyan-400/50">
            <th className="text-left py-4 px-6 text-white font-bold text-xs uppercase tracking-wider w-1/4 border-r border-slate-600/30">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                <span>Batch Information</span>
              </div>
            </th>
            <th className="text-left py-4 px-4 text-white font-bold text-xs uppercase tracking-wider border-r border-slate-600/30">Material Name</th>
            <th className="text-left py-4 px-4 text-white font-bold text-xs uppercase tracking-wider border-r border-slate-600/30">Code</th>
            <th className="text-left py-4 px-4 text-white font-bold text-xs uppercase tracking-wider border-r border-slate-600/30">Set Point</th>
            <th className="text-left py-4 px-4 text-white font-bold text-xs uppercase tracking-wider border-r border-slate-600/30">Actual</th>
            <th className="text-left py-4 px-4 text-white font-bold text-xs uppercase tracking-wider border-r border-slate-600/30">Err Kg</th>
            <th className="text-left py-4 px-4 text-white font-bold text-xs uppercase tracking-wider">Err %</th>
          </tr>
        </thead>
        <tbody>
          {groupedData.map((group: any, groupIndex) => {
            const batch = group.batch
            const materials = group.materials
            
            return materials.map((material: PLCReportData, materialIndex: number) => {
              const errKg = material.qtyOut - material.qtySpSetpoint
              const errPercent = ((errKg / material.qtySpSetpoint) * 100).toFixed(2)
              const isFirstMaterial = materialIndex === 0
              const rowIndex = groupIndex * materials.length + materialIndex
              
              return (
                <tr key={`${batch.batchId}-${materialIndex}`} className={`
                  border-b border-slate-700/20 dark:border-slate-600/20 light:border-gray-200
                  hover:bg-slate-700/30 dark:hover:bg-slate-600/30 light:hover:bg-slate-100
                  transition-all duration-200 ease-in-out
                  ${rowIndex % 2 === 0 
                    ? 'bg-slate-800/20 dark:bg-slate-700/20 light:bg-gray-50/80' 
                    : 'bg-slate-800/10 dark:bg-slate-700/10 light:bg-white'
                  }
                `}>
                  {isFirstMaterial ? (
                    <td 
                      rowSpan={materials.length} 
                      className="py-4 px-6 bg-slate-700/30 dark:bg-slate-600/30 light:bg-slate-100 border-r border-slate-600/40 dark:border-slate-500/40 light:border-gray-300 align-top"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                          <div className="text-white dark:text-slate-100 light:text-gray-900 font-bold text-sm tracking-wide">
                            {batch.batchId}
                          </div>
                        </div>
                        <div className="text-slate-300 dark:text-slate-300 light:text-gray-800 text-xs font-medium">
                          {batch.productName}
                        </div>
                        <div className="text-slate-400 dark:text-slate-400 light:text-gray-700 text-xs">
                          📅 {new Date(batch.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-slate-400 dark:text-slate-400 light:text-gray-700 text-xs">
                          🏭 {batch.lineNumber}
                        </div>
                        <div className="inline-flex items-center space-x-1 bg-slate-600/40 dark:bg-slate-500/40 light:bg-slate-200 px-2 py-1 rounded-md">
                          <span className="text-slate-300 dark:text-slate-300 light:text-gray-800 text-xs font-bold">
                            ⚖️ {materials.reduce((sum: number, m: PLCReportData) => sum + m.qtyOut, 0).toFixed(0)} kg
                          </span>
                        </div>
                      </div>
                    </td>
                  ) : null}
                  <td className="py-3 px-4 border-r border-slate-700/20 dark:border-slate-600/20 light:border-gray-200">
                    <div className="text-white dark:text-slate-100 light:text-gray-800 text-sm font-medium">
                      {material.matName}
                    </div>
                  </td>
                  <td className="py-3 px-4 border-r border-slate-700/20 dark:border-slate-600/20 light:border-gray-200">
                    <div className="text-orange-400 dark:text-orange-300 light:text-orange-700 font-mono text-sm font-semibold bg-orange-500/10 dark:bg-orange-500/10 light:bg-orange-100 px-2 py-1 rounded">
                      {material.matCode}
                    </div>
                  </td>
                  <td className="py-3 px-4 border-r border-slate-700/20 dark:border-slate-600/20 light:border-gray-200">
                    <div className="text-blue-400 dark:text-blue-300 light:text-blue-700 text-sm font-semibold bg-blue-500/10 dark:bg-blue-500/10 light:bg-blue-100 px-2 py-1 rounded text-center">
                      {material.qtySpSetpoint.toFixed(2)}
                    </div>
                  </td>
                  <td className="py-3 px-4 border-r border-slate-700/20 dark:border-slate-600/20 light:border-gray-200">
                    <div className="text-cyan-400 dark:text-cyan-300 light:text-cyan-700 text-sm font-semibold bg-cyan-500/10 dark:bg-cyan-500/10 light:bg-cyan-100 px-2 py-1 rounded text-center">
                      {material.qtyOut.toFixed(2)}
                    </div>
                  </td>
                  <td className="py-3 px-4 border-r border-slate-700/20 dark:border-slate-600/20 light:border-gray-200">
                    <div className="text-yellow-400 dark:text-yellow-300 light:text-yellow-700 text-sm font-semibold bg-yellow-500/10 dark:bg-yellow-500/10 light:bg-yellow-100 px-2 py-1 rounded text-center">
                      {errKg.toFixed(2)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className={`text-sm font-bold px-2 py-1 rounded text-center ${
                      Math.abs(parseFloat(errPercent)) > 5 
                        ? 'text-red-400 dark:text-red-300 light:text-red-700 bg-red-500/10 dark:bg-red-500/10 light:bg-red-100 border border-red-500/30' 
                        : 'text-slate-400 dark:text-slate-300 light:text-slate-700 bg-slate-500/10 dark:bg-slate-500/10 light:bg-slate-100 border border-slate-500/30'
                    }`}>
                      {errPercent}%
                    </div>
                  </td>
                </tr>
              )
            })
          })}
        </tbody>
      </table>
    </div>
  )
}





// PDF Export Functions
const generatePDF = async (
  data: PLCReportData[], 
  reportType: string, 
  filters: ReportFilters,
  aggregatedData?: any[]
) => {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.width
  const pageHeight = pdf.internal.pageSize.height
  
  // Clean PDF background
  pdf.setFillColor(255, 255, 255) // white background
  pdf.rect(0, 0, pageWidth, pageHeight, 'F')
  
  // Clean header section with dark background like screenshot
  pdf.setFillColor(45, 55, 72) // dark blue-gray header
  pdf.rect(0, 0, pageWidth, 40, 'F')
  
  // HERCULES title in white text like screenshot
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(255, 255, 255)
  pdf.text('HERCULES', 20, 18)
  
  // v2.0 subtitle
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(200, 200, 200)
  pdf.text('v2.0', 20, 28)
  
  // Smart Factory Management System
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'normal')  
  pdf.setTextColor(255, 255, 255)
  pdf.text('Smart Factory Management System', 90, 18)
  
  // Report type and timestamp
  pdf.setFontSize(8)
  pdf.setTextColor(200, 200, 200)
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 65, 18)
  
  // Report details section
  pdf.setFillColor(248, 250, 252) // light gray background
  pdf.rect(0, 40, pageWidth, 25, 'F')
  
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(6, 182, 212)
  pdf.text(`${reportType.toUpperCase()} PRODUCTION REPORT`, 20, 53)
  
  // Filters and date range
  let yPos = 60
  if (filters.startDate || filters.endDate) {
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(71, 85, 105)
    const dateRange = `Date Range: ${filters.startDate || 'All'} → ${filters.endDate || 'All'}`
    pdf.text(dateRange, 20, yPos)
    yPos += 5
  }

  if (filters.selectedLines.length > 0 || filters.selectedBins.length > 0) {
    pdf.setFontSize(8)
    pdf.setTextColor(100, 116, 139)
    if (filters.selectedLines.length > 0) {
      pdf.text(`Lines: ${filters.selectedLines.join(', ')}`, 20, yPos)
      yPos += 4
    }
    if (filters.selectedBins.length > 0) {
      pdf.text(`Bins: ${filters.selectedBins.join(', ')}`, 20, yPos)
      yPos += 4
    }
  }

  yPos = 75

  if (reportType === 'detailed') {
    // Detailed report table
    const tableData = data.map(item => [
      item.orderId,
      item.batchId,
      item.productName,
      item.binName,
      item.matName,
      item.qtySpSetpoint.toFixed(2),
      item.qtyOut.toFixed(2),
      item.dosed ? 'Yes' : 'No',
      new Date(item.timestamp).toLocaleString(),
      item.lineNumber
    ])

    autoTable(pdf, {
      head: [['Order ID', 'Batch ID', 'Product', 'Bin', 'Material', 'SP Qty', 'Act Qty', 'Dosed', 'Timestamp', 'Line']],
      body: tableData,
      startY: yPos,
      styles: { 
        fontSize: 8,
        textColor: [51, 65, 85],
        fillColor: [255, 255, 255],
        lineColor: [203, 213, 225],
        lineWidth: 0.3
      },
      headStyles: { 
        fillColor: [6, 182, 212],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252]
      },
      margin: { left: 10, right: 10 }
    })
  } else if (aggregatedData) {
    // Summary report table
    const tableData = aggregatedData.map(item => [
      item.period,
      item.productName || item.materialName,
      item.noOfBatches?.toString() || '',
      item.sumSP?.toFixed(2) || item.plannedKG?.toFixed(2) || '',
      item.sumAct?.toFixed(2) || item.actualKG?.toFixed(2) || '',
      item.errKg?.toFixed(2) || '',
      item.errPercent ? `${item.errPercent.toFixed(2)}%` : `${item.differencePercent?.toFixed(2)}%` || ''
    ])

    const headers = reportType === 'material' 
      ? ['Period', 'Material', 'Batches', 'Planned', 'Actual', 'Diff (kg)', 'Diff (%)']
      : ['Period', 'Product', 'Batches', 'SP Total', 'Act Total', 'Error (kg)', 'Error (%)']

    autoTable(pdf, {
      head: [headers],
      body: tableData,
      startY: yPos,
      styles: { 
        fontSize: 10,
        textColor: [51, 65, 85],
        fillColor: [255, 255, 255],
        lineColor: [203, 213, 225],
        lineWidth: 0.3
      },
      headStyles: { 
        fillColor: [6, 182, 212],
        textColor: [255, 255, 255],
        fontSize: 11,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252]
      },
      margin: { left: 10, right: 10 }
    })
  }

  // Clean professional footer
  const pageCount = pdf.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    
    // Footer separator line
    pdf.setDrawColor(6, 182, 212)
    pdf.setLineWidth(2)
    pdf.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25)
    
    // Footer text
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(6, 182, 212)
    pdf.text('HERCULES - SMART FACTORY MANAGEMENT SYSTEM', 20, pageHeight - 15)
    
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(71, 85, 105)
    pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 15)
    pdf.text('CONFIDENTIAL - Factory Production Data', 20, pageHeight - 8)
  }

  // Save the PDF
  const fileName = `Hercules_Production_Report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`
  pdf.save(fileName)
}

const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Main PLC Reports component
function PLCReportsContent() {
  const [activeTab, setActiveTab] = useState('daily')
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: '',
    endDate: '',
    selectedBins: [],
    selectedBatches: [],
    selectedLines: []
  })

  // Generate mock data
  const rawData = useMemo(() => generatePLCReportData('all', 300), [])
  
  // Get unique values for filters
  const availableBins = useMemo(() => Array.from(new Set(rawData.map(item => item.binNumber))), [rawData])
  const availableBatches = useMemo(() => Array.from(new Set(rawData.map(item => item.batchId))), [rawData])
  const availableLines = useMemo(() => Array.from(new Set(rawData.map(item => item.lineNumber))), [rawData])

  // Filter data based on current filters
  const filteredData = useMemo(() => filterReportData(rawData, filters, activeTab), [rawData, filters, activeTab])

  // Generate aggregated data for summary reports
  const dailyData = useMemo(() => aggregateByProduct(filteredData, 'day'), [filteredData])
  const weeklyData = useMemo(() => aggregateByProduct(filteredData, 'week'), [filteredData])
  const monthlyData = useMemo(() => aggregateByProduct(filteredData, 'month'), [filteredData])
  const materialData = useMemo(() => aggregateByMaterial(filteredData), [filteredData])



  return (
    <div className="space-y-4">
      {/* Filters with Export Actions */}
      <Card className="bg-slate-800/30 light:bg-white border-slate-700 light:border-gray-200 light:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white light:text-gray-900 flex items-center gap-2 text-lg">
              <Filter className="h-4 w-4 text-cyan-400 light:text-blue-600" />
              Report Filters
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  const currentData = activeTab === 'daily' ? dailyData : 
                                    activeTab === 'weekly' ? weeklyData : 
                                    activeTab === 'monthly' ? monthlyData : 
                                    activeTab === 'material' ? materialData : filteredData
                  exportToCSV(currentData, `Hercules_${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`)
                }} 
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                onClick={() => {
                  const currentData = activeTab === 'daily' ? dailyData : 
                                    activeTab === 'weekly' ? weeklyData : 
                                    activeTab === 'monthly' ? monthlyData : 
                                    activeTab === 'material' ? materialData : filteredData
                  generatePDF(filteredData, activeTab, filters, currentData !== filteredData ? currentData : undefined)
                }} 
                size="sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button onClick={() => window.print()} size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-slate-300 light:text-gray-700 text-xs mb-1 block">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300 text-white light:text-gray-700 h-8 text-sm"
              />
            </div>
            
            <div>
              <label className="text-slate-300 light:text-gray-700 text-xs mb-1 block">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300 text-white light:text-gray-700 h-8 text-sm"
              />
            </div>
            
            <div>
              <label className="text-slate-300 light:text-gray-700 text-xs mb-1 block">Production Lines</label>
              <Select onValueChange={(value) => setFilters({ ...filters, selectedLines: value === 'all' ? [] : [value] })}>
                <SelectTrigger className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300 text-white light:text-gray-700 h-8 text-sm">
                  <SelectValue placeholder="All Lines" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300">
                  <SelectItem value="all">All Lines</SelectItem>
                  {availableLines.map(line => (
                    <SelectItem key={line} value={line}>{line}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-slate-300 light:text-gray-700 text-xs mb-1 block">Bins</label>
              <Select onValueChange={(value) => setFilters({ ...filters, selectedBins: value === 'all' ? [] : [value] })}>
                <SelectTrigger className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300 text-white light:text-gray-700 h-8 text-sm">
                  <SelectValue placeholder="All Bins" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300">
                  <SelectItem value="all">All Bins</SelectItem>
                  {availableBins.slice(0, 10).map(bin => (
                    <SelectItem key={bin} value={bin}>{bin}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-slate-300 light:text-gray-700 text-xs mb-1 block">Batches</label>
              <Select onValueChange={(value) => setFilters({ ...filters, selectedBatches: value === 'all' ? [] : [value] })}>
                <SelectTrigger className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300 text-white light:text-gray-700 h-8 text-sm">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 light:bg-white border-slate-600 light:border-gray-300">
                  <SelectItem value="all">All Batches</SelectItem>
                  {availableBatches.slice(0, 15).map(batch => (
                    <SelectItem key={batch} value={batch}>{batch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end gap-2">
              <Button
                onClick={() => setFilters({
                  startDate: '',
                  endDate: '',
                  selectedBins: [],
                  selectedBatches: [],
                  selectedLines: []
                })}
                size="sm"
                className="h-8"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-slate-800/50 light:bg-gray-100 border border-slate-700 light:border-gray-200">
          <TabsTrigger value="daily" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/25">
            <Activity className="h-4 w-4 mr-2" />
            Daily Report
          </TabsTrigger>
          <TabsTrigger value="weekly" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/25">
            <BarChart3 className="h-4 w-4 mr-2" />
            Weekly Report
          </TabsTrigger>
          <TabsTrigger value="monthly" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/25">
            <Calendar className="h-4 w-4 mr-2" />
            Monthly Report
          </TabsTrigger>
          <TabsTrigger value="detailed" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/25">
            <Layers className="h-4 w-4 mr-2" />
            Detailed Report
          </TabsTrigger>
          <TabsTrigger value="material" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/25">
            <Package className="h-4 w-4 mr-2" />
            Material Consumption
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-3">
          <Card className="bg-slate-800/30 light:bg-white border-slate-700 light:border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-white light:text-gray-900 text-lg">Daily Production Summary</CardTitle>
              <CardDescription className="text-slate-300 light:text-gray-600 text-sm">
                Daily aggregated production data from Mix Line 1 & 2 ({filteredData.length} records)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ProductSummaryTable data={dailyData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="mt-3">
          <Card className="bg-slate-800/30 light:bg-white border-slate-700 light:border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-white light:text-gray-900 text-lg">Weekly Production Summary</CardTitle>
              <CardDescription className="text-slate-300 light:text-gray-600 text-sm">
                Weekly aggregated production data from Mix Line 1 & 2 ({filteredData.length} records)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ProductSummaryTable data={weeklyData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="mt-3">
          <Card className="bg-slate-800/30 light:bg-white border-slate-700 light:border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-white light:text-gray-900 text-lg">Monthly Production Summary</CardTitle>
              <CardDescription className="text-slate-300 light:text-gray-600 text-sm">
                Monthly aggregated production data from Mix Line 1 & 2 ({filteredData.length} records)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ProductSummaryTable data={monthlyData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="mt-3">
          <Card className="bg-slate-800/30 light:bg-white border-slate-700 light:border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-white light:text-gray-900 text-lg">Detailed Batch Report</CardTitle>
              <CardDescription className="text-slate-300 light:text-gray-600 text-sm">
                Complete batch-level data with all Mix Line information ({filteredData.length} records)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <DetailedReportTable data={filteredData} reportType="detailed" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="material" className="mt-3">
          <Card className="bg-slate-800/30 light:bg-white border-slate-700 light:border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-white light:text-gray-900 text-lg">Material Consumption Analysis</CardTitle>
              <CardDescription className="text-slate-300 light:text-gray-600 text-sm">
                Material usage efficiency and consumption patterns ({filteredData.length} records)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <MaterialConsumptionTable data={materialData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function PLCReports() {
  return (
    <WaterSystemLayout 
      title="Reports & Analytics" 
      subtitle="Generate insights and reports from your PLC data"
    >
      <PLCReportsContent />
    </WaterSystemLayout>
  )
}