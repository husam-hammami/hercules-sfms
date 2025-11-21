import React, { createContext, useContext, useState, useEffect } from 'react';
import { globalSimulator } from '@/lib/plc-data-simulator';

// Types
interface PlcConfiguration {
  id: string;
  name: string;
  brand: string;
  model: string;
  ipAddress: string;
  port: number;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  isActive: boolean;
  facilityId: string;
}

interface PlcTag {
  id: string;
  plcId: string;
  plcName?: string;
  tagName: string;
  address: string;
  dataType: string;
  accessType: string;
  unit?: string;
  description?: string;
  isEnabled: boolean;
  lastValue?: number | boolean | string | null;
  lastReadTime?: Date;
  quality?: 'good' | 'bad' | 'uncertain';
  trend?: 'up' | 'down' | 'stable';
}

interface DemoDataContextType {
  plcConfigs: PlcConfiguration[];
  plcTags: PlcTag[];
  addPlcConfig: (config: PlcConfiguration) => void;
  updatePlcConfig: (id: string, updates: Partial<PlcConfiguration>) => void;
  deletePlcConfig: (id: string) => void;
  addPlcTag: (tag: PlcTag) => void;
  updatePlcTag: (id: string, updates: Partial<PlcTag>) => void;
  deletePlcTag: (id: string) => void;
  getTagsByPlc: (plcId: string) => PlcTag[];
  getPlcById: (plcId: string) => PlcConfiguration | undefined;
}

const DemoDataContext = createContext<DemoDataContextType | undefined>(undefined);

// Initial demo data for a better demo experience
const initialPlcConfigs: PlcConfiguration[] = [
  {
    id: '1',
    name: 'Main Production Line',
    brand: 'Siemens',
    model: 'S7-1200',
    ipAddress: '192.168.1.100',
    port: 102,
    connectionStatus: 'connected',
    isActive: true,
    facilityId: '1'
  },
  {
    id: '2',
    name: 'Water Treatment PLC',
    brand: 'Allen Bradley',
    model: 'CompactLogix',
    ipAddress: '192.168.1.101',
    port: 44818,
    connectionStatus: 'connected',
    isActive: true,
    facilityId: '1'
  },
  {
    id: '3',
    name: 'Chemical Dosing System',
    brand: 'Schneider',
    model: 'Modicon M580',
    ipAddress: '192.168.1.102',
    port: 502,
    connectionStatus: 'connected',
    isActive: true,
    facilityId: '1'
  }
];

const initialPlcTags: PlcTag[] = [
  // Siemens PLC tags
  {
    id: 'tag1',
    plcId: '1',
    plcName: 'Main Production Line',
    tagName: 'Tank_Level_1',
    address: 'DB100.DBD0',
    dataType: 'REAL',
    accessType: 'read',
    unit: 'm³',
    description: 'Main water tank level',
    isEnabled: true,
    lastValue: 75.5,
    lastReadTime: new Date(),
    quality: 'good',
    trend: 'up'
  },
  {
    id: 'tag2',
    plcId: '1',
    plcName: 'Main Production Line',
    tagName: 'Pump_Status',
    address: 'M10.0',
    dataType: 'BOOL',
    accessType: 'read-write',
    description: 'Main pump running status',
    isEnabled: true,
    lastValue: true,
    lastReadTime: new Date(),
    quality: 'good',
    trend: 'stable'
  },
  {
    id: 'tag3',
    plcId: '1',
    plcName: 'Main Production Line',
    tagName: 'Flow_Rate',
    address: 'DB100.DBD4',
    dataType: 'REAL',
    accessType: 'read',
    unit: 'L/min',
    description: 'Water flow rate sensor',
    isEnabled: true,
    lastValue: 120.3,
    lastReadTime: new Date(),
    quality: 'good',
    trend: 'stable'
  },
  // Allen Bradley PLC tags
  {
    id: 'tag4',
    plcId: '2',
    plcName: 'Water Treatment PLC',
    tagName: 'pH_Level',
    address: 'F8:10',
    dataType: 'REAL',
    accessType: 'read',
    unit: 'pH',
    description: 'Water pH level sensor',
    isEnabled: true,
    lastValue: 7.2,
    lastReadTime: new Date(),
    quality: 'good',
    trend: 'stable'
  },
  {
    id: 'tag5',
    plcId: '2',
    plcName: 'Water Treatment PLC',
    tagName: 'Chlorine_Level',
    address: 'F8:11',
    dataType: 'REAL',
    accessType: 'read',
    unit: 'ppm',
    description: 'Chlorine concentration',
    isEnabled: true,
    lastValue: 2.5,
    lastReadTime: new Date(),
    quality: 'good',
    trend: 'down'
  },
  {
    id: 'tag6',
    plcId: '2',
    plcName: 'Water Treatment PLC',
    tagName: 'Filter_Status',
    address: 'B3:0/1',
    dataType: 'BOOL',
    accessType: 'read',
    description: 'Water filter operational status',
    isEnabled: true,
    lastValue: true,
    lastReadTime: new Date(),
    quality: 'good',
    trend: 'stable'
  },
  // Schneider PLC tags
  {
    id: 'tag7',
    plcId: '3',
    plcName: 'Chemical Dosing System',
    tagName: 'Chemical_Tank_A',
    address: '%MW100',
    dataType: 'INT',
    accessType: 'read',
    unit: '%',
    description: 'Chemical tank A level',
    isEnabled: true,
    lastValue: 85,
    lastReadTime: new Date(),
    quality: 'good',
    trend: 'down'
  },
  {
    id: 'tag8',
    plcId: '3',
    plcName: 'Chemical Dosing System',
    tagName: 'Dosing_Pump_Speed',
    address: '%MW101',
    dataType: 'INT',
    accessType: 'read-write',
    unit: 'RPM',
    description: 'Chemical dosing pump speed',
    isEnabled: true,
    lastValue: 450,
    lastReadTime: new Date(),
    quality: 'good',
    trend: 'stable'
  },
  {
    id: 'tag9',
    plcId: '3',
    plcName: 'Chemical Dosing System',
    tagName: 'Temperature_Chemical',
    address: '%MW102',
    dataType: 'REAL',
    accessType: 'read',
    unit: '°C',
    description: 'Chemical storage temperature',
    isEnabled: true,
    lastValue: 22.8,
    lastReadTime: new Date(),
    quality: 'good',
    trend: 'up'
  }
];

export function DemoDataProvider({ children }: { children: React.ReactNode }) {
  const [plcConfigs, setPlcConfigs] = useState<PlcConfiguration[]>(initialPlcConfigs);
  const [plcTags, setPlcTags] = useState<PlcTag[]>(initialPlcTags);
  
  // Initialize simulator with initial tags
  useEffect(() => {
    initialPlcTags.forEach(tag => {
      globalSimulator.addTag({
        tagId: tag.id,
        tagName: tag.tagName,
        plcId: tag.plcId,
        address: tag.address,
        dataType: tag.dataType
      });
    });
    
    // Start simulation
    globalSimulator.start(2000);
    
    // Subscribe to updates
    const unsubscribe = globalSimulator.subscribe((simTags) => {
      setPlcTags(prev => prev.map(tag => {
        const simTag = simTags.find(st => st.tagId === tag.id);
        if (simTag) {
          return {
            ...tag,
            lastValue: simTag.value,
            quality: simTag.quality,
            trend: simTag.trend,
            lastReadTime: simTag.timestamp
          };
        }
        // If tag doesn't have simulator data yet, ensure it's added
        if (!simTag && tag.isEnabled) {
          globalSimulator.ensureTagExists({
            tagId: tag.id,
            tagName: tag.tagName,
            plcId: tag.plcId,
            address: tag.address,
            dataType: tag.dataType
          });
        }
        return tag;
      }));
    });
    
    return () => {
      unsubscribe();
      globalSimulator.stop();
    };
  }, []);
  
  const addPlcConfig = (config: PlcConfiguration) => {
    setPlcConfigs(prev => [...prev, config]);
  };
  
  const updatePlcConfig = (id: string, updates: Partial<PlcConfiguration>) => {
    setPlcConfigs(prev => prev.map(config => 
      config.id === id ? { ...config, ...updates } : config
    ));
  };
  
  const deletePlcConfig = (id: string) => {
    setPlcConfigs(prev => prev.filter(config => config.id !== id));
    // Also delete associated tags
    setPlcTags(prev => prev.filter(tag => tag.plcId !== id));
  };
  
  const addPlcTag = (tag: PlcTag) => {
    // Add to state
    setPlcTags(prev => [...prev, tag]);
    
    // Immediately add to simulator for live/historical data
    globalSimulator.ensureTagExists({
      tagId: tag.id,
      tagName: tag.tagName,
      plcId: tag.plcId,
      address: tag.address,
      dataType: tag.dataType
    });
  };
  
  const updatePlcTag = (id: string, updates: Partial<PlcTag>) => {
    setPlcTags(prev => prev.map(tag => {
      if (tag.id === id) {
        const updatedTag = { ...tag, ...updates };
        // If tag properties changed, update simulator
        if (updates.dataType || updates.address) {
          globalSimulator.ensureTagExists({
            tagId: updatedTag.id,
            tagName: updatedTag.tagName,
            plcId: updatedTag.plcId,
            address: updatedTag.address,
            dataType: updatedTag.dataType
          });
        }
        return updatedTag;
      }
      return tag;
    }));
  };
  
  const deletePlcTag = (id: string) => {
    setPlcTags(prev => prev.filter(tag => tag.id !== id));
    globalSimulator.removeTag(id);
  };
  
  const getTagsByPlc = (plcId: string) => {
    return plcTags.filter(tag => tag.plcId === plcId);
  };
  
  const getPlcById = (plcId: string) => {
    return plcConfigs.find(plc => plc.id === plcId);
  };
  
  return (
    <DemoDataContext.Provider value={{
      plcConfigs,
      plcTags,
      addPlcConfig,
      updatePlcConfig,
      deletePlcConfig,
      addPlcTag,
      updatePlcTag,
      deletePlcTag,
      getTagsByPlc,
      getPlcById
    }}>
      {children}
    </DemoDataContext.Provider>
  );
}

export function useDemoData() {
  const context = useContext(DemoDataContext);
  if (!context) {
    throw new Error('useDemoData must be used within a DemoDataProvider');
  }
  return context;
}