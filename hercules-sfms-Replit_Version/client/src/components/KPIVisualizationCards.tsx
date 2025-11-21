import { useEffect, useRef } from 'react';

interface MiniChartProps {
  type: 'progress' | 'sparkline' | 'donut' | 'bars' | 'trend' | 'gauge';
  value: number;
  max?: number;
  data?: number[];
  color: string;
}

function MiniChart({ type, value, max = 100, data = [], color }: MiniChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;

    switch (type) {
      case 'progress':
        // Clean circular progress ring
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 4;
        const progress = value / max;
        
        // Background circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = `${color}30`;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Progress arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * progress));
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Progress indicator dot
        const dotAngle = -Math.PI / 2 + (2 * Math.PI * progress);
        const dotX = centerX + Math.cos(dotAngle) * radius;
        const dotY = centerY + Math.sin(dotAngle) * radius;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        break;

      case 'sparkline':
        // Mini line chart
        if (data.length > 1) {
          const stepX = width / (data.length - 1);
          const minVal = Math.min(...data);
          const maxVal = Math.max(...data);
          const range = maxVal - minVal || 1;
          
          ctx.beginPath();
          data.forEach((val, i) => {
            const x = i * stepX;
            const y = height - ((val - minVal) / range) * height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
          
          // Fill area under curve
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          ctx.fillStyle = `${color}20`;
          ctx.fill();
        }
        break;

      case 'donut':
        // Clean donut chart
        const donutCenterX = width / 2;
        const donutCenterY = height / 2;
        const outerRadius = Math.min(width, height) / 2 - 3;
        const innerRadius = outerRadius * 0.55;
        const donutProgress = value / max;
        
        // Background donut
        ctx.beginPath();
        ctx.arc(donutCenterX, donutCenterY, outerRadius, 0, 2 * Math.PI);
        ctx.arc(donutCenterX, donutCenterY, innerRadius, 0, 2 * Math.PI, true);
        ctx.fillStyle = `${color}20`;
        ctx.fill();
        
        // Progress donut
        ctx.beginPath();
        ctx.arc(donutCenterX, donutCenterY, outerRadius, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * donutProgress));
        ctx.arc(donutCenterX, donutCenterY, innerRadius, -Math.PI / 2 + (2 * Math.PI * donutProgress), -Math.PI / 2, true);
        ctx.fillStyle = color;
        ctx.fill();
        
        // Center indicator dot
        ctx.beginPath();
        ctx.arc(donutCenterX, donutCenterY, 2, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        break;

      case 'bars':
        // Mini bar chart
        if (data.length > 0) {
          const barWidth = width / data.length * 0.8;
          const barSpacing = width / data.length * 0.2;
          const maxBarVal = Math.max(...data);
          
          data.forEach((val, i) => {
            const barHeight = (val / maxBarVal) * height;
            const x = i * (barWidth + barSpacing) + barSpacing / 2;
            const y = height - barHeight;
            
            ctx.fillStyle = i === data.length - 1 ? color : `${color}60`;
            ctx.fillRect(x, y, barWidth, barHeight);
          });
        }
        break;

      case 'trend':
        // Trend arrow indicator
        const trendCenterX = width / 2;
        const trendCenterY = height / 2;
        const arrowSize = Math.min(width, height) / 3;
        
        ctx.beginPath();
        if (value > 0) {
          // Up arrow
          ctx.moveTo(trendCenterX, trendCenterY - arrowSize);
          ctx.lineTo(trendCenterX - arrowSize/2, trendCenterY + arrowSize/2);
          ctx.lineTo(trendCenterX + arrowSize/2, trendCenterY + arrowSize/2);
        } else {
          // Down arrow
          ctx.moveTo(trendCenterX, trendCenterY + arrowSize);
          ctx.lineTo(trendCenterX - arrowSize/2, trendCenterY - arrowSize/2);
          ctx.lineTo(trendCenterX + arrowSize/2, trendCenterY - arrowSize/2);
        }
        ctx.closePath();
        ctx.fill();
        break;

      case 'gauge':
        // Clean semi-circular gauge
        const gaugeCenterX = width / 2;
        const gaugeCenterY = height * 0.75;
        const gaugeRadius = Math.min(width, height) / 2 - 4;
        const gaugeProgress = value / max;
        const startAngle = Math.PI;
        const endAngle = 2 * Math.PI;
        
        // Background arc
        ctx.beginPath();
        ctx.arc(gaugeCenterX, gaugeCenterY, gaugeRadius, startAngle, endAngle);
        ctx.strokeStyle = `${color}30`;
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Progress arc
        ctx.beginPath();
        ctx.arc(gaugeCenterX, gaugeCenterY, gaugeRadius, startAngle, startAngle + (endAngle - startAngle) * gaugeProgress);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Needle indicator
        const needleAngle = startAngle + (endAngle - startAngle) * gaugeProgress;
        const needleX = gaugeCenterX + Math.cos(needleAngle) * (gaugeRadius - 2);
        const needleY = gaugeCenterY + Math.sin(needleAngle) * (gaugeRadius - 2);
        ctx.beginPath();
        ctx.moveTo(gaugeCenterX, gaugeCenterY);
        ctx.lineTo(needleX, needleY);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
    }
  }, [type, value, max, data, color]);

  return <canvas ref={canvasRef} width={60} height={30} className="opacity-90" />;
}

// 3D Futuristic Production Status Pie Chart
function ProductionStatusChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 8;

    // Production status data - meaningful for management
    const productionData = [
      { label: 'Running', value: 75, color: '#00ff88', lightColor: '#88ffcc' }, // Green - Running facilities
      { label: 'Maintenance', value: 15, color: '#ff8800', lightColor: '#ffcc88' }, // Orange - Planned maintenance
      { label: 'Offline', value: 10, color: '#ff4444', lightColor: '#ff8888' } // Red - Offline facilities
    ];

    const total = productionData.reduce((sum, item) => sum + item.value, 0);
    
    ctx.clearRect(0, 0, width, height);

    // Create 3D depth effect with shadows
    let currentAngle = -Math.PI / 2; // Start from top

    // Draw 3D shadow/depth layers
    for (let depth = 4; depth >= 0; depth--) {
      let shadowAngle = currentAngle;
      
      productionData.forEach((segment, index) => {
        const segmentAngle = (segment.value / total) * 2 * Math.PI;
        
        // Create 3D shadow effect
        ctx.beginPath();
        ctx.moveTo(centerX + depth, centerY + depth);
        ctx.arc(centerX + depth, centerY + depth, radius - depth, shadowAngle, shadowAngle + segmentAngle);
        ctx.closePath();
        
        // Shadow gradient
        const shadowOpacity = (4 - depth) * 0.15;
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
        ctx.fill();
        
        shadowAngle += segmentAngle;
      });
    }

    // Draw main pie segments with gradients
    currentAngle = -Math.PI / 2;
    
    productionData.forEach((segment, index) => {
      const segmentAngle = (segment.value / total) * 2 * Math.PI;
      
      // Create radial gradient for 3D effect
      const gradient = ctx.createRadialGradient(
        centerX - radius * 0.3, centerY - radius * 0.3, 0,
        centerX, centerY, radius
      );
      gradient.addColorStop(0, segment.lightColor);
      gradient.addColorStop(0.7, segment.color);
      gradient.addColorStop(1, segment.color + '80');

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Add subtle border for definition
      ctx.strokeStyle = segment.color;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Add animated glow effect
      ctx.shadowColor = segment.color;
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      currentAngle += segmentAngle;
    });

    // Reset shadow
    ctx.shadowBlur = 0;
    
    // Add center highlight for 3D effect
    const centerGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius * 0.3
    );
    centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    centerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.3, 0, 2 * Math.PI);
    ctx.fillStyle = centerGradient;
    ctx.fill();

    // Add animated scanning line
    const time = Date.now() * 0.003;
    const scanAngle = (time % (2 * Math.PI));
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(scanAngle) * radius,
      centerY + Math.sin(scanAngle) * radius
    );
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Add small center dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#00ffff';
    ctx.fill();

  }, []);

  // Animation loop for scanning line
  useEffect(() => {
    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        // Trigger re-render for animation
        const event = new Event('update');
        canvas.dispatchEvent(event);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <canvas 
        ref={canvasRef} 
        width={50} 
        height={50} 
        className="opacity-95 animate-float3d" 
        style={{ 
          filter: 'drop-shadow(0 0 4px rgba(0, 255, 255, 0.3))',
          transformStyle: 'preserve-3d'
        }}
      />
      {/* Floating energy particles around the chart */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-1 h-1 bg-green-400 rounded-full top-2 left-6 animate-energy-pulse" style={{ animationDelay: '0s' }}></div>
        <div className="absolute w-1 h-1 bg-orange-400 rounded-full top-6 right-2 animate-energy-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute w-1 h-1 bg-red-400 rounded-full bottom-2 left-4 animate-energy-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
    </div>
  );
}

export function KPIVisualizationCards() {
  // Real water treatment facility data
  const kpiData = {
    totalOutput: { value: 45.2, trend: [38, 42, 39, 44, 47, 45, 45.2], unit: 'K m³/day' },
    efficiency: { value: 94, target: 95, trend: [91, 93, 92, 94, 95, 93, 94], unit: '%' },
    energy: { value: 2.4, trend: [2.8, 2.6, 2.5, 2.3, 2.4, 2.5, 2.4], unit: 'kWh/m³' },
    facilities: { value: 8, total: 10, status: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0], unit: 'Online' },
    alerts: { value: 3, severity: [1, 2, 0, 1, 0, 2, 1], unit: 'Active' },
    quality: { value: 97, trend: [95, 96, 94, 97, 98, 96, 97], unit: 'Score' }
  };

  return (
    <div className="h-12 flex-shrink-0 grid grid-cols-6 gap-1 items-stretch">
      {/* Total Output - Sparkline + Numbers */}
      <div className="cyberpunk-card rounded-lg p-1 flex items-center border border-[hsl(180,100%,50%,0.3)]">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-[hsl(180,100%,50%)] font-mono tracking-wider leading-none">TOTAL OUTPUT</div>
          <div className="text-sm text-white font-mono font-bold leading-none">{kpiData.totalOutput.value}K</div>
          <div className="text-[10px] text-gray-400 font-mono leading-none">m³/day</div>
        </div>
        <div className="ml-2 chart-3d-hover rounded">
          <MiniChart 
            type="sparkline" 
            value={kpiData.totalOutput.value} 
            data={kpiData.totalOutput.trend}
            color="#00ffff" 
          />
        </div>
      </div>

      {/* Average Efficiency - Progress Ring + Numbers */}
      <div className="cyberpunk-card rounded-lg p-1 flex items-center border border-[hsl(158,100%,50%,0.3)]">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-[hsl(180,100%,50%)] font-mono tracking-wider leading-none">AVG EFFICIENCY</div>
          <div className="text-sm text-[hsl(158,100%,50%)] font-mono font-bold leading-none">{kpiData.efficiency.value}%</div>
          <div className="text-[10px] text-gray-400 font-mono leading-none">Target: {kpiData.efficiency.target}%</div>
        </div>
        <div className="ml-2 chart-3d-hover rounded">
          <MiniChart 
            type="progress" 
            value={kpiData.efficiency.value} 
            max={100}
            color="#00ff88" 
          />
        </div>
      </div>

      {/* Energy Usage - Gauge + Numbers */}
      <div className="cyberpunk-card rounded-lg p-1 flex items-center border border-[hsl(45,100%,50%,0.3)]">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-[hsl(180,100%,50%)] font-mono tracking-wider leading-none">ENERGY USAGE</div>
          <div className="text-sm text-[hsl(45,100%,50%)] font-mono font-bold leading-none">{kpiData.energy.value}</div>
          <div className="text-[10px] text-gray-400 font-mono leading-none">{kpiData.energy.unit}</div>
        </div>
        <div className="ml-2 chart-3d-hover rounded">
          <MiniChart 
            type="gauge" 
            value={kpiData.energy.value} 
            max={4}
            color="#ffaa00" 
          />
        </div>
      </div>

      {/* Facilities - Bar Chart + Numbers */}
      <div className="cyberpunk-card rounded-lg p-1 flex items-center border border-[hsl(158,100%,50%,0.3)]">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-[hsl(180,100%,50%)] font-mono tracking-wider leading-none">FACILITIES</div>
          <div className="text-sm text-[hsl(158,100%,50%)] font-mono font-bold leading-none">{kpiData.facilities.value}</div>
          <div className="text-[10px] text-gray-400 font-mono leading-none">{kpiData.facilities.unit}</div>
        </div>
        <div className="ml-2 chart-3d-hover rounded">
          <MiniChart 
            type="bars" 
            value={kpiData.facilities.value} 
            data={kpiData.facilities.status}
            color="#00ff88" 
          />
        </div>
      </div>

      {/* Production Status - 3D Multi-Color Pie Chart */}
      <div className="cyberpunk-card rounded-lg p-1 flex items-center border border-[hsl(120,100%,50%,0.3)] relative overflow-hidden">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-[hsl(180,100%,50%)] font-mono tracking-wider leading-none">PRODUCTION</div>
          <div className="text-sm text-[hsl(120,100%,50%)] font-mono font-bold leading-none">87%</div>
          <div className="text-[10px] text-gray-400 font-mono leading-none">Active</div>
        </div>
        <div className="ml-2 chart-3d-hover rounded relative">
          <ProductionStatusChart />
        </div>
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-blue-500/5 to-orange-500/5 animate-pulse pointer-events-none"></div>
      </div>

      {/* Quality Score - Sparkline + Numbers */}
      <div className="cyberpunk-card rounded-lg p-1 flex items-center border border-[hsl(158,100%,50%,0.3)]">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-[hsl(180,100%,50%)] font-mono tracking-wider leading-none">QUALITY SCORE</div>
          <div className="text-sm text-[hsl(158,100%,50%)] font-mono font-bold leading-none">{kpiData.quality.value}</div>
          <div className="text-[10px] text-gray-400 font-mono leading-none">Excellent</div>
        </div>
        <div className="ml-2 chart-3d-hover rounded">
          <MiniChart 
            type="sparkline" 
            value={kpiData.quality.value} 
            data={kpiData.quality.trend}
            color="#00ff88" 
          />
        </div>
      </div>
    </div>
  );
}