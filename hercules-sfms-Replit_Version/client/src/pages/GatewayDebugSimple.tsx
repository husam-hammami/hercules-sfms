import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout';

export default function GatewayDebugSimple() {
  return (
    <WaterSystemLayout 
      title="Gateway Debug Console"
      subtitle="Real-time monitoring and debugging for all gateways"
    >
      <div className="p-6 space-y-6 bg-black/95">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Gateway Debug Console - Simple Test
        </h1>
        <p className="text-gray-400 mt-1">This is a simple test page to verify routing works.</p>
      </div>
    </WaterSystemLayout>
  );
}