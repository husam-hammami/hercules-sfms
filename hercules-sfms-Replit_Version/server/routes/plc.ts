// API Routes for PLC Communication
import { Router } from 'express'
import PLCManager from '../plc/s7-integration'

const router = Router()

// Read value from PLC
router.post('/read', async (req, res) => {
  try {
    const { plcName, dbNumber, offset, dataType } = req.body

    // Validate request
    if (!plcName || !dbNumber || offset === undefined || !dataType) {
      return res.status(400).json({ 
        error: 'Missing required fields: plcName, dbNumber, offset, dataType' 
      })
    }

    // Get PLC client
    const plcManager = PLCManager.getInstance()
    const plc = plcManager.getPLC(plcName)
    
    if (!plc) {
      return res.status(404).json({ 
        error: `PLC '${plcName}' not found or not connected` 
      })
    }

    // Read from PLC
    const value = await plc.readPLC({
      area: 'DB',
      dbNumber,
      offset,
      dataType
    })

    res.json({
      success: true,
      address: `DB${dbNumber}.DB${dataType === 'int' ? 'W' : dataType === 'float' ? 'D' : 'B'}${offset}`,
      value,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('PLC read error:', error)
    res.status(500).json({ 
      error: 'Failed to read from PLC',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Write value to PLC
router.post('/write', async (req, res) => {
  try {
    const { plcName, dbNumber, offset, dataType, value } = req.body

    // Validate request
    if (!plcName || !dbNumber || offset === undefined || !dataType || value === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: plcName, dbNumber, offset, dataType, value' 
      })
    }

    // Get PLC client
    const plcManager = PLCManager.getInstance()
    const plc = plcManager.getPLC(plcName)
    
    if (!plc) {
      return res.status(404).json({ 
        error: `PLC '${plcName}' not found or not connected` 
      })
    }

    // Write to PLC
    const success = await plc.writePLC({
      area: 'DB',
      dbNumber,
      offset,
      dataType,
      value
    })

    res.json({
      success,
      address: `DB${dbNumber}.DB${dataType === 'int' ? 'W' : dataType === 'float' ? 'D' : 'B'}${offset}`,
      value,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('PLC write error:', error)
    res.status(500).json({ 
      error: 'Failed to write to PLC',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get PLC connection status
router.get('/status', async (req, res) => {
  try {
    const plcManager = PLCManager.getInstance()
    const { plcName } = req.query

    if (plcName) {
      // Get specific PLC status
      const plc = plcManager.getPLC(plcName as string)
      if (!plc) {
        return res.status(404).json({ error: `PLC '${plcName}' not found` })
      }

      res.json({
        plcName,
        connected: plc.isConnected(),
        timestamp: new Date().toISOString()
      })
    } else {
      // Get all PLC statuses (this would need to be implemented in PLCManager)
      res.json({
        message: 'Use ?plcName=<name> to check specific PLC status',
        availablePLCs: ['primary_line', 'secondary_line', 'filtration']
      })
    }

  } catch (error) {
    console.error('PLC status error:', error)
    res.status(500).json({ 
      error: 'Failed to get PLC status',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Test PLC connection
router.post('/test-connection', async (req, res) => {
  try {
    const { host, port = 102, rack = 0, slot = 1 } = req.body

    if (!host) {
      return res.status(400).json({ error: 'Host is required' })
    }

    // Create temporary test connection
    const { S7PLCClient } = await import('../plc/s7-integration')
    const testClient = new S7PLCClient({ host, port, rack, slot })

    const connected = await testClient.connect()
    
    if (connected) {
      await testClient.disconnect()
      res.json({ 
        success: true, 
        message: `Successfully connected to PLC at ${host}:${port}` 
      })
    } else {
      res.status(500).json({ 
        success: false, 
        message: `Failed to connect to PLC at ${host}:${port}` 
      })
    }

  } catch (error) {
    console.error('PLC test connection error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router