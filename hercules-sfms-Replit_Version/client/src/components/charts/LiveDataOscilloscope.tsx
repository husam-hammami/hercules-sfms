import { useEffect, useRef, useState } from 'react';
import { Line, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface DataPoint {
  tagId: string;
  tagName: string;
  value: number;
  timestamp: Date;
}

interface LiveDataOscilloscopeProps {
  data: DataPoint[];
  mode?: 'oscilloscope' | 'radar' | 'waterfall';
  height?: number;
}

export function LiveDataOscilloscope({ 
  data, 
  mode = 'oscilloscope',
  height = 300 
}: LiveDataOscilloscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [dataHistory, setDataHistory] = useState<Record<string, number[]>>({});
  const maxPoints = 60; // Show last 60 data points

  // Update data history
  useEffect(() => {
    const newHistory = { ...dataHistory };
    
    data.forEach(point => {
      if (!newHistory[point.tagId]) {
        newHistory[point.tagId] = [];
      }
      
      newHistory[point.tagId].push(point.value);
      
      // Keep only last maxPoints
      if (newHistory[point.tagId].length > maxPoints) {
        newHistory[point.tagId].shift();
      }
    });
    
    setDataHistory(newHistory);
  }, [data]);

  // Oscilloscope mode - canvas based for performance
  useEffect(() => {
    if (mode !== 'oscilloscope' || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const draw = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      // Clear with fade effect for trail
      ctx.fillStyle = 'rgba(15, 23, 42, 0.1)';
      ctx.fillRect(0, 0, width, height);

      // Draw grid
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
      ctx.lineWidth = 0.5;
      
      // Vertical grid lines
      for (let x = 0; x < width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Horizontal grid lines
      for (let y = 0; y < height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw waveforms
      const colors = [
        'rgb(6, 182, 212)',
        'rgb(34, 197, 94)',
        'rgb(168, 85, 247)',
        'rgb(251, 146, 60)',
        'rgb(250, 204, 21)'
      ];

      let colorIndex = 0;
      Object.entries(dataHistory).forEach(([tagId, values]) => {
        if (values.length < 2) return;

        const color = colors[colorIndex % colors.length];
        colorIndex++;

        // Draw glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        ctx.beginPath();
        values.forEach((value, index) => {
          const x = (index / maxPoints) * width;
          const normalizedValue = Math.max(0, Math.min(1, value / 100));
          const y = height - (normalizedValue * height * 0.8) - height * 0.1;

          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            // Smooth curve
            const prevX = ((index - 1) / maxPoints) * width;
            const prevValue = values[index - 1];
            const prevY = height - ((prevValue / 100) * height * 0.8) - height * 0.1;
            
            const cpx = (prevX + x) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpx, (prevY + y) / 2);
            ctx.quadraticCurveTo(cpx, (prevY + y) / 2, x, y);
          }
        });
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw current value point with pulse effect
        if (values.length > 0) {
          const lastValue = values[values.length - 1];
          const lastX = ((values.length - 1) / maxPoints) * width;
          const lastY = height - ((lastValue / 100) * height * 0.8) - height * 0.1;

          // Pulsing dot
          const pulseSize = 4 + Math.sin(Date.now() * 0.005) * 2;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(lastX, lastY, pulseSize, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw scan line
      const scanX = (Date.now() % 3000) / 3000 * width;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, height);
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mode, dataHistory]);

  // Radar chart for multi-tag comparison
  if (mode === 'radar') {
    const radarData = {
      labels: Object.keys(dataHistory).map(id => 
        data.find(d => d.tagId === id)?.tagName || id
      ),
      datasets: [{
        label: 'Current Values',
        data: Object.values(dataHistory).map(values => 
          values[values.length - 1] || 0
        ),
        backgroundColor: 'rgba(6, 182, 212, 0.2)',
        borderColor: 'rgb(6, 182, 212)',
        pointBackgroundColor: 'rgb(6, 182, 212)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(6, 182, 212)'
      }]
    };

    const radarOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        r: {
          angleLines: {
            color: 'rgba(6, 182, 212, 0.2)'
          },
          grid: {
            color: 'rgba(6, 182, 212, 0.2)'
          },
          pointLabels: {
            color: 'rgb(6, 182, 212)',
            font: { size: 10 }
          },
          ticks: {
            color: 'rgb(148, 163, 184)',
            backdropColor: 'transparent'
          }
        }
      }
    };

    return (
      <div style={{ height: `${height}px` }}>
        <Radar data={radarData} options={radarOptions} />
      </div>
    );
  }

  // Oscilloscope mode
  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: `${height}px`,
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 1) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
        borderRadius: '8px'
      }}
    />
  );
}

// Sparkline component for inline mini charts
export function Sparkline({ 
  values = [], 
  width = 100, 
  height = 30,
  color = 'rgb(6, 182, 212)'
}: { 
  values?: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || values.length < 2) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Find min/max for scaling
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    // Draw sparkline
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    values.forEach((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw last point
    const lastValue = values[values.length - 1];
    const lastX = width;
    const lastY = height - ((lastValue - min) / range) * height;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lastX - 2, lastY, 2, 0, Math.PI * 2);
    ctx.fill();

  }, [values, width, height, color]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle'
      }}
    />
  );
}