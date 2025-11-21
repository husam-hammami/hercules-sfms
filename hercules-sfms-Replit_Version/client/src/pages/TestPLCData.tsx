import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPLCData() {
  const [plcData, setPlcData] = useState(null);
  const [facilities, setFacilities] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPLCData = async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionId = localStorage.getItem('sessionId');
      const headers = sessionId ? { 'X-Session-Id': sessionId } : {};
      
      // Fetch PLC configurations
      const plcRes = await fetch('/api/plc-configurations', {
        credentials: 'include',
        headers
      });
      
      console.log('PLC Response status:', plcRes.status);
      const plcDataResult = await plcRes.json();
      console.log('PLC Data:', plcDataResult);
      setPlcData(plcDataResult);
      
      // Fetch facilities
      const facilRes = await fetch('/api/facilities', {
        credentials: 'include',
        headers
      });
      
      console.log('Facilities Response status:', facilRes.status);
      const facilDataResult = await facilRes.json();
      console.log('Facilities Data:', facilDataResult);
      setFacilities(facilDataResult);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPLCData();
  }, []);

  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Test PLC Data Fetching</CardTitle>
          <Button onClick={fetchPLCData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh Data'}
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-red-600 mb-4">Error: {error}</div>
          )}
          
          <div className="space-y-4">
            <div>
              <h3 className="font-bold">PLC Configurations:</h3>
              <pre className="bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(plcData, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-bold">Facilities:</h3>
              <pre className="bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(facilities, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}