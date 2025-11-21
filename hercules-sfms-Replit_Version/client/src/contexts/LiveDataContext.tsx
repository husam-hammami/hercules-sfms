import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

interface LiveTagData {
  tagId: string;
  tagName: string;
  plcName: string;
  plcId: string;
  timestamp: Date;
  value: number | string | boolean;
  unit?: string;
  dataType: string;
  quality: string;
  trend?: 'up' | 'down' | 'stable';
}

interface LiveDataContextType {
  liveData: LiveTagData[];
  selectedTags: string[];
  isLiveMode: boolean;
  updateRate: number;
  tagHistoricalData: Record<string, { value: number, timestamp: Date }[]>;
  tagSparklines: Record<string, number[]>;
  setSelectedTags: (tags: string[]) => void;
  setIsLiveMode: (mode: boolean) => void;
  setUpdateRate: (rate: number) => void;
  refreshData: () => void;
  isLoadingData: boolean;
}

const LiveDataContext = createContext<LiveDataContextType | undefined>(undefined);

export const useLiveData = () => {
  const context = useContext(LiveDataContext);
  if (!context) {
    throw new Error('useLiveData must be used within a LiveDataProvider');
  }
  return context;
};

export const LiveDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [liveData, setLiveData] = useState<LiveTagData[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [updateRate, setUpdateRate] = useState(1000);
  const [tagHistoricalData, setTagHistoricalData] = useState<Record<string, { value: number, timestamp: Date }[]>>({});
  const [tagSparklines, setTagSparklines] = useState<Record<string, number[]>>({});
  const [isLoadingData, setIsLoadingData] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTime = useRef<number>(0);

  const fetchGatewayData = useCallback(async () => {
    if (selectedTags.length === 0 || !isLiveMode) {
      return;
    }

    // Prevent duplicate fetches
    const now = Date.now();
    if (now - lastFetchTime.current < updateRate * 0.8) {
      return;
    }
    lastFetchTime.current = now;

    setIsLoadingData(true);
    try {
      const params = new URLSearchParams();
      params.append('tagIds', selectedTags.join(','));
      const url = `/api/gateway/data?${params}`;
      
      const sessionId = localStorage.getItem('sessionId');
      const headers: any = {};
      if (sessionId) {
        headers['X-Session-Id'] = sessionId;
      }
      
      const response = await fetch(url, {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch gateway data: ${response.statusText}`);
      }
      
      const gatewayData = await response.json();
      
      if (gatewayData?.tagData && Array.isArray(gatewayData.tagData)) {
        const formattedData: LiveTagData[] = gatewayData.tagData.map((item: any) => {
          const previousValue = liveData.find(d => d.tagId === String(item.tagId))?.value;
          let trend: 'up' | 'down' | 'stable' = 'stable';
          
          if (typeof item.value === 'number' && typeof previousValue === 'number') {
            if (item.value > previousValue) trend = 'up';
            else if (item.value < previousValue) trend = 'down';
          }
          
          return {
            tagId: String(item.tagId),
            tagName: item.tagName || item.name || 'Unknown',
            plcName: item.plcName || 'Unknown PLC',
            plcId: String(item.plcId || ''),
            timestamp: new Date(item.lastUpdated || Date.now()),
            value: item.value !== undefined ? item.value : 0,
            quality: item.quality || 'Good',
            dataType: item.dataType || 'REAL',
            unit: item.unit || '',
            trend
          };
        });
        
        setLiveData(formattedData);
        
        // Update sparklines and historical data
        formattedData.forEach(data => {
          if (typeof data.value === 'number') {
            const numericValue = data.value;
            setTagSparklines(prev => ({
              ...prev,
              [data.tagId]: [...(prev[data.tagId] || []).slice(-50), numericValue]
            }));
            
            setTagHistoricalData(prev => ({
              ...prev,
              [data.tagId]: [...(prev[data.tagId] || []).slice(-100), {
                value: numericValue,
                timestamp: data.timestamp
              }]
            }));
          }
        });
      }
    } catch (error) {
      console.error('[LiveDataContext] Error fetching gateway data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedTags, isLiveMode, updateRate, liveData]);

  // Setup interval for fetching data
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isLiveMode && selectedTags.length > 0) {
      console.log('[LiveDataContext] Starting live data collection with rate:', updateRate);
      
      // Fetch immediately
      fetchGatewayData();
      
      // Setup interval
      intervalRef.current = setInterval(() => {
        fetchGatewayData();
      }, updateRate);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLiveMode, selectedTags, updateRate, fetchGatewayData]);

  const refreshData = useCallback(() => {
    fetchGatewayData();
  }, [fetchGatewayData]);

  // Clear all data when switching between demo and signed-in modes
  useEffect(() => {
    const clearAllData = () => {
      setLiveData([]);
      setSelectedTags([]);
      setTagHistoricalData({});
      setTagSparklines({});
      console.log('[LiveDataContext] Cleared all data due to mode switch');
    };

    // Monitor for authentication state changes
    const checkAuthChange = () => {
      const hasSession = !!localStorage.getItem('sessionId');
      const isDemoMode = localStorage.getItem('isDemoMode') === 'true';
      
      // Store previous state
      const prevHasSession = sessionStorage.getItem('prevHasSession') === 'true';
      const prevIsDemoMode = sessionStorage.getItem('prevIsDemoMode') === 'true';
      
      // If mode changed, clear data
      if (prevHasSession !== hasSession || prevIsDemoMode !== isDemoMode) {
        clearAllData();
      }
      
      // Update stored state
      sessionStorage.setItem('prevHasSession', String(hasSession));
      sessionStorage.setItem('prevIsDemoMode', String(isDemoMode));
    };

    // Check on mount
    checkAuthChange();
    
    // Setup interval to monitor changes
    const interval = setInterval(checkAuthChange, 500);
    
    return () => clearInterval(interval);
  }, []);

  const value = {
    liveData,
    selectedTags,
    isLiveMode,
    updateRate,
    tagHistoricalData,
    tagSparklines,
    setSelectedTags,
    setIsLiveMode,
    setUpdateRate,
    refreshData,
    isLoadingData
  };

  return (
    <LiveDataContext.Provider value={value}>
      {children}
    </LiveDataContext.Provider>
  );
};