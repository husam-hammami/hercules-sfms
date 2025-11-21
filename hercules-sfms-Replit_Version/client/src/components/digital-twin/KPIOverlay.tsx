import React from 'react';
import { Paper, Typography, Box, LinearProgress } from '@mui/material';
import { TrendingUp, Package, Gauge, Zap, Thermometer, Droplet } from 'lucide-react';

interface KPIOverlayProps {
  data: any;
  theme: 'light' | 'dark';
}

export function KPIOverlay({ data, theme }: KPIOverlayProps) {
  const isLight = theme === 'light';
  
  const kpiCards = [
    {
      icon: TrendingUp,
      label: 'Production Rate',
      value: `${data.totalProduction.toLocaleString()} T`,
      color: '#00E676',
      trend: '+2.3%'
    },
    {
      icon: Gauge,
      label: 'Efficiency',
      value: `${data.efficiency.toFixed(1)}%`,
      color: data.efficiency > 85 ? '#00E676' : '#FFB020',
      progress: data.efficiency
    },
    {
      icon: Package,
      label: 'Packaging Rate',
      value: `${data.packagingRate} bags/min`,
      color: '#8b5cf6',
      trend: '+5'
    },
    {
      icon: Zap,
      label: 'Power Usage',
      value: `${data.powerConsumption} kW`,
      color: data.powerConsumption > 1500 ? '#FFB020' : '#00bcd4',
      progress: (data.powerConsumption / 2000) * 100
    }
  ];

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 60,
        left: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        maxWidth: '300px'
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: isLight ? '#475569' : '#94a3b8',
          fontWeight: 600,
          letterSpacing: '0.05em',
          fontSize: '0.75rem',
          mb: 1
        }}
      >
        KEY PERFORMANCE INDICATORS
      </Typography>
      
      {kpiCards.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Paper
            key={index}
            elevation={2}
            sx={{
              p: 2,
              background: isLight
                ? 'rgba(255, 255, 255, 0.95)'
                : 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(10px)',
              border: isLight
                ? '1px solid rgba(226, 232, 240, 0.5)'
                : '1px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '12px',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateX(4px)',
                borderColor: kpi.color,
                boxShadow: `0 4px 20px ${kpi.color}20`
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: '8px',
                  background: `${kpi.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icon size={20} style={{ color: kpi.color }} />
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: isLight ? '#64748b' : '#94a3b8',
                    fontSize: '0.75rem',
                    mb: 0.5
                  }}
                >
                  {kpi.label}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: isLight ? '#1e293b' : '#f1f5f9',
                      fontWeight: 700,
                      fontSize: '1.125rem',
                      lineHeight: 1
                    }}
                  >
                    {kpi.value}
                  </Typography>
                  {kpi.trend && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: kpi.color,
                        fontSize: '0.7rem',
                        fontWeight: 600
                      }}
                    >
                      {kpi.trend}
                    </Typography>
                  )}
                </Box>
                
                {kpi.progress !== undefined && (
                  <LinearProgress
                    variant="determinate"
                    value={kpi.progress}
                    sx={{
                      mt: 1,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: isLight
                        ? 'rgba(0, 0, 0, 0.05)'
                        : 'rgba(255, 255, 255, 0.05)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: kpi.color,
                        borderRadius: 2
                      }
                    }}
                  />
                )}
              </Box>
            </Box>
          </Paper>
        );
      })}
      
      {/* Environment Metrics */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          background: isLight
            ? 'rgba(255, 255, 255, 0.95)'
            : 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          border: isLight
            ? '1px solid rgba(226, 232, 240, 0.5)'
            : '1px solid rgba(100, 116, 139, 0.3)',
          borderRadius: '12px',
          display: 'flex',
          gap: 2,
          mt: 1
        }}
      >
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Thermometer size={16} style={{ color: '#FF5252' }} />
          <Box>
            <Typography
              variant="body2"
              sx={{
                color: isLight ? '#64748b' : '#94a3b8',
                fontSize: '0.65rem'
              }}
            >
              Temp
            </Typography>
            <Typography
              sx={{
                color: isLight ? '#1e293b' : '#f1f5f9',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            >
              {data.temperature}°C
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Droplet size={16} style={{ color: '#00bcd4' }} />
          <Box>
            <Typography
              variant="body2"
              sx={{
                color: isLight ? '#64748b' : '#94a3b8',
                fontSize: '0.65rem'
              }}
            >
              Humidity
            </Typography>
            <Typography
              sx={{
                color: isLight ? '#1e293b' : '#f1f5f9',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            >
              {data.humidity}%
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}