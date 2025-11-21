import { storage } from './storage';

async function addTestPlcConfiguration() {
  const userId = 'c33e716c2f1f07f9cf6acb56aed97243c';
  
  try {
    console.log('Adding test PLC configuration for user:', userId);
    
    // Create a test PLC device
    const plcDevice = await storage.upsertPlcDevice({
      userId,
      name: 'Test PLC 1',
      brand: 'siemens',
      model: 'S7-1200',
      protocol: 'S7',
      ipAddress: '192.168.1.100',
      port: 102,
      rackNumber: 0,
      slotNumber: 1,
      status: 'active'
    });
    
    console.log('Created PLC device:', plcDevice);
    
    // Add some tags to the PLC
    const tags = [
      {
        plcId: plcDevice.id,
        name: 'Temperature_Sensor_1',
        address: 'DB1.DBD0',
        dataType: 'REAL',
        unit: '°C',
        scanRate: 1000,
        enabled: true,
        minValue: 0,
        maxValue: 100,
        alarmLow: 10,
        alarmHigh: 90
      },
      {
        plcId: plcDevice.id,
        name: 'Pressure_Sensor_1',
        address: 'DB1.DBD4',
        dataType: 'REAL',
        unit: 'bar',
        scanRate: 1000,
        enabled: true,
        minValue: 0,
        maxValue: 10,
        alarmLow: 1,
        alarmHigh: 8
      },
      {
        plcId: plcDevice.id,
        name: 'Flow_Rate_1',
        address: 'DB1.DBD8',
        dataType: 'REAL',
        unit: 'm³/h',
        scanRate: 2000,
        enabled: true,
        minValue: 0,
        maxValue: 1000
      },
      {
        plcId: plcDevice.id,
        name: 'Pump_Status',
        address: 'M0.0',
        dataType: 'BOOL',
        scanRate: 500,
        enabled: true
      },
      {
        plcId: plcDevice.id,
        name: 'Tank_Level',
        address: 'DB2.DBW0',
        dataType: 'INT',
        unit: '%',
        scanRate: 5000,
        enabled: true,
        minValue: 0,
        maxValue: 100,
        alarmLow: 20,
        alarmHigh: 95
      }
    ];
    
    console.log('Adding tags to PLC...');
    for (const tag of tags) {
      const createdTag = await storage.createPlcTag(tag);
      console.log('Created tag:', createdTag.name, '- ID:', createdTag.id);
    }
    
    // Verify the configuration
    const allDevices = await storage.getAllPlcDevices(userId);
    console.log('\n=== Verification ===');
    console.log('Total PLC devices for user:', allDevices.length);
    
    for (const device of allDevices) {
      const deviceTags = await storage.getPlcTagsByPlcId(device.id);
      console.log(`PLC "${device.name}" has ${deviceTags.length} tags`);
    }
    
    console.log('\n✅ Test PLC configuration added successfully!');
    console.log('You can now test the /api/gateway/config endpoint again to see the PLC configurations.');
    
  } catch (error) {
    console.error('Error adding test configuration:', error);
  }
}

addTestPlcConfiguration();