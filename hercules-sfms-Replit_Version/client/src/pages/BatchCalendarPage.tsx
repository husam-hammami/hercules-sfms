import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Grid,
  Divider,
  Chip,
  Card,
  CardContent,
  Tooltip,
} from '@mui/material';
import { WaterSystemLayout } from '@/components/water-system/WaterSystemLayout';
import { X, Calendar, Package, TrendingUp, AlertCircle, Factory, Clock, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Pie, Bar } from 'react-chartjs-2';
import { useTheme } from '@/contexts/ThemeContext';

interface BatchData {
  date: string;
  dayName: string;
  dayNumber: number;
  production: number;
  batches: number;
  products: number;
  weight: number;
  status?: 'active' | 'completed' | 'pending';
  productDetails?: {
    name: string;
    quantity: number;
    color: string;
    percentage?: number;
  }[];
  efficiency?: number;
  utilization?: number;
  isToday?: boolean;
  isWeekend?: boolean;
}

const generateMonthData = (month: number, year: number): BatchData[] => {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  
  // Demo products from the actual system
  const productList = [
    { name: 'Broiler Starter', color: '#00bcd4' },
    { name: 'Layer Grower', color: '#8b5cf6' },
    { name: 'Ruminant Feed', color: '#00E676' },
    { name: 'Broiler Finisher', color: '#FFB020' },
    { name: 'Premium Feed Mix A', color: '#FF5252' },
    { name: 'Protein Blend Special', color: '#4ecdc4' },
    { name: 'Grain Meal Standard', color: '#a29bfe' },
    { name: 'Feed Mix B Economy', color: '#fdcb6e' },
    { name: 'Starter Feed Premium', color: '#e17055' },
  ];

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const today = new Date();
  
  const monthData: BatchData[] = [];
  
  // Generate data for each day of the month (no empty days at beginning)
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPast = date < today;
    const isToday = date.toDateString() === today.toDateString();
    
    // Generate production data (less on weekends)
    const hasProduction = !isWeekend || Math.random() > 0.7;
    const production = hasProduction ? 
      (isWeekend ? 50 + Math.random() * 100 : 200 + Math.random() * 200) : 0;
    
    // Generate product details
    const productDetails = hasProduction ? 
      productList
        .sort(() => Math.random() - 0.5) // Randomize order
        .slice(0, 3 + Math.floor(Math.random() * 6)) // Random number of products
        .map((product) => {
          const quantity = 10000 + Math.random() * 50000;
          return {
            ...product,
            quantity,
            percentage: 0
          };
        }) : [];
    
    // Calculate percentages
    const totalQuantity = productDetails.reduce((sum, p) => sum + p.quantity, 0);
    productDetails.forEach(p => {
      p.percentage = totalQuantity > 0 ? (p.quantity / totalQuantity) * 100 : 0;
    });
    
    monthData.push({
      date: `${day} ${monthNames[month].slice(0, 3)}`,
      dayName: dayNames[dayOfWeek],
      dayNumber: day,
      production: Math.round(production * 100) / 100,
      batches: hasProduction ? Math.floor(20 + Math.random() * 140) : 0,
      products: productDetails.length,
      weight: Math.round(production * 1000),
      status: isPast ? 'completed' : (isToday ? 'active' : 'pending'),
      productDetails,
      efficiency: hasProduction ? Math.round(75 + Math.random() * 20) : 0,
      utilization: hasProduction ? Math.round(70 + Math.random() * 25) : 0,
      isToday,
      isWeekend
    });
  }
  
  return monthData;
};

export function BatchCalendarPage() {
  const { theme } = useTheme();
  const isLightMode = theme === 'light';
  const [selectedDay, setSelectedDay] = useState<BatchData | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const calendarData = generateMonthData(currentMonth, currentYear);
  
  // Calculate summary metrics
  const totalProduction = calendarData.reduce((sum, day) => sum + day.production, 0);
  const activeBatches = calendarData.reduce((sum, day) => sum + day.batches, 0);
  const totalProducts = new Set(calendarData.flatMap(day => day.productDetails?.map(p => p.name) || [])).size;
  const avgEfficiency = calendarData.filter(d => d.efficiency).reduce((sum, d, _, arr) => 
    sum + (d.efficiency || 0) / arr.length, 0) || 0;

  const handleDayClick = (day: BatchData) => {
    if (day.production > 0) {
      setSelectedDay(day);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return (
    <WaterSystemLayout
      title="Batch Calendar"
      subtitle="Production Schedule & Batch Management"
    >
      <Box sx={{ 
        p: 3, 
        background: isLightMode ? 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)' : 'linear-gradient(180deg, #0a0f1b 0%, #1a2332 100%)',
        minHeight: '100vh' 
      }}>
        {/* Month Navigation */}
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: 2,
            background: isLightMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(20px)',
            border: isLightMode ? '1px solid rgba(226, 232, 240, 0.5)' : '1px solid rgba(100, 116, 139, 0.2)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <IconButton 
            onClick={handlePrevMonth}
            sx={{ 
              color: isLightMode ? '#0097a7' : '#00bcd4',
              '&:hover': {
                backgroundColor: isLightMode ? 'rgba(0, 151, 167, 0.08)' : 'rgba(0, 188, 212, 0.1)'
              }
            }}
            data-testid="button-prev-month"
          >
            <ChevronLeft />
          </IconButton>
          
          <Typography variant="h5" sx={{ 
            fontWeight: 600, 
            color: isLightMode ? '#1e293b' : '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            letterSpacing: '-0.02em'
          }}>
            <Calendar size={24} style={{ color: isLightMode ? '#0097a7' : '#00bcd4' }} />
            {monthNames[currentMonth]} {currentYear}
          </Typography>
          
          <IconButton 
            onClick={handleNextMonth}
            sx={{ 
              color: isLightMode ? '#0097a7' : '#00bcd4',
              '&:hover': {
                backgroundColor: isLightMode ? 'rgba(0, 151, 167, 0.08)' : 'rgba(0, 188, 212, 0.1)'
              }
            }}
            data-testid="button-next-month"
          >
            <ChevronRight />
          </IconButton>
        </Paper>

        {/* Summary Cards - Professional Muted Colors */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                position: 'relative',
                p: 2,
                height: '90px',
                background: isLightMode 
                  ? 'linear-gradient(135deg, #0097a7 0%, #00838f 100%)'
                  : 'linear-gradient(135deg, rgba(0, 188, 212, 0.1) 0%, rgba(0, 188, 212, 0.05) 100%)',
                border: '1px solid',
                borderColor: isLightMode ? 'rgba(0, 151, 167, 0.2)' : 'rgba(0, 188, 212, 0.3)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: isLightMode ? '0 2px 8px rgba(0, 0, 0, 0.08)' : '0 4px 12px rgba(0, 188, 212, 0.15)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: isLightMode ? '0 4px 16px rgba(0, 0, 0, 0.12)' : '0 8px 24px rgba(0, 188, 212, 0.25)',
                }
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography sx={{ 
                    color: isLightMode ? 'rgba(255, 255, 255, 0.85)' : '#94a3b8',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    letterSpacing: '0.05em',
                    mb: 0.5
                  }}>
                    Total Production
                  </Typography>
                  <Typography sx={{ 
                    fontSize: '1.75rem',
                    fontWeight: 700, 
                    color: isLightMode ? '#ffffff' : '#00bcd4',
                    lineHeight: 1
                  }}>
                    {(totalProduction / 1000).toFixed(1)} T
                  </Typography>
                </Box>
                <Factory 
                  size={40} 
                  style={{ 
                    color: isLightMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 188, 212, 0.3)'
                  }} 
                />
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                position: 'relative',
                p: 2,
                height: '90px',
                background: isLightMode 
                  ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                  : 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
                border: '1px solid',
                borderColor: isLightMode ? 'rgba(124, 58, 237, 0.2)' : 'rgba(139, 92, 246, 0.3)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: isLightMode ? '0 2px 8px rgba(0, 0, 0, 0.08)' : '0 4px 12px rgba(139, 92, 246, 0.15)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: isLightMode ? '0 4px 16px rgba(0, 0, 0, 0.12)' : '0 8px 24px rgba(139, 92, 246, 0.25)',
                }
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography sx={{ 
                    color: isLightMode ? 'rgba(255, 255, 255, 0.85)' : '#94a3b8',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    letterSpacing: '0.05em',
                    mb: 0.5
                  }}>
                    Active Batches
                  </Typography>
                  <Typography sx={{ 
                    fontSize: '1.75rem',
                    fontWeight: 700, 
                    color: isLightMode ? '#ffffff' : '#8b5cf6',
                    lineHeight: 1
                  }}>
                    {activeBatches.toLocaleString()}
                  </Typography>
                </Box>
                <Package 
                  size={40} 
                  style={{ 
                    color: isLightMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(139, 92, 246, 0.3)'
                  }} 
                />
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                position: 'relative',
                p: 2,
                height: '90px',
                background: isLightMode 
                  ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                  : 'linear-gradient(135deg, rgba(0, 230, 118, 0.1) 0%, rgba(0, 230, 118, 0.05) 100%)',
                border: '1px solid',
                borderColor: isLightMode ? 'rgba(5, 150, 105, 0.2)' : 'rgba(0, 230, 118, 0.3)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: isLightMode ? '0 2px 8px rgba(0, 0, 0, 0.08)' : '0 4px 12px rgba(0, 230, 118, 0.15)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: isLightMode ? '0 4px 16px rgba(0, 0, 0, 0.12)' : '0 8px 24px rgba(0, 230, 118, 0.25)',
                }
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography sx={{ 
                    color: isLightMode ? 'rgba(255, 255, 255, 0.85)' : '#94a3b8',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    letterSpacing: '0.05em',
                    mb: 0.5
                  }}>
                    Product Varieties
                  </Typography>
                  <Typography sx={{ 
                    fontSize: '1.75rem',
                    fontWeight: 700, 
                    color: isLightMode ? '#ffffff' : '#00E676',
                    lineHeight: 1
                  }}>
                    {totalProducts}
                  </Typography>
                </Box>
                <BarChart3 
                  size={40} 
                  style={{ 
                    color: isLightMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 230, 118, 0.3)'
                  }} 
                />
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                position: 'relative',
                p: 2,
                height: '90px',
                background: isLightMode 
                  ? 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, rgba(255, 176, 32, 0.1) 0%, rgba(255, 176, 32, 0.05) 100%)',
                border: '1px solid',
                borderColor: isLightMode ? 'rgba(234, 88, 12, 0.2)' : 'rgba(255, 176, 32, 0.3)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: isLightMode ? '0 2px 8px rgba(0, 0, 0, 0.08)' : '0 4px 12px rgba(255, 176, 32, 0.15)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: isLightMode ? '0 4px 16px rgba(0, 0, 0, 0.12)' : '0 8px 24px rgba(255, 176, 32, 0.25)',
                }
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography sx={{ 
                    color: isLightMode ? 'rgba(255, 255, 255, 0.85)' : '#94a3b8',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    letterSpacing: '0.05em',
                    mb: 0.5
                  }}>
                    Avg Efficiency
                  </Typography>
                  <Typography sx={{ 
                    fontSize: '1.75rem',
                    fontWeight: 700, 
                    color: isLightMode ? '#ffffff' : '#FFB020',
                    lineHeight: 1
                  }}>
                    {Math.round(avgEfficiency)}%
                  </Typography>
                </Box>
                <TrendingUp 
                  size={40} 
                  style={{ 
                    color: isLightMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 176, 32, 0.3)'
                  }} 
                />
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Calendar Grid - Clean Layout with Day Headers */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            background: isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(10, 15, 27, 0.6)',
            backdropFilter: 'blur(20px)',
            border: isLightMode ? '1px solid rgba(226, 232, 240, 0.3)' : '1px solid rgba(100, 116, 139, 0.15)',
            borderRadius: '16px'
          }}
        >
          {/* Day Headers */}
          <Grid container sx={{ mb: 2 }}>
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <Grid item xs={12/7} key={day}>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    textAlign: 'center',
                    fontWeight: 600,
                    color: day === 'SAT' || day === 'SUN' ? 
                           (isLightMode ? '#ef4444' : '#FF5252') : 
                           (isLightMode ? '#475569' : '#cbd5e1'),
                    fontSize: '0.875rem',
                    letterSpacing: '0.05em'
                  }}
                >
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>

          {/* Calendar Days Grid - No Empty Days */}
          <Grid container spacing={1}>
            {calendarData.map((day, index) => (
              <Grid item xs={12/7} key={index}>
                <Paper
                  elevation={0}
                  onClick={() => handleDayClick(day)}
                  sx={{
                    p: 2,
                    minHeight: '140px',
                    cursor: day.production > 0 ? 'pointer' : 'default',
                    background: isLightMode ? 
                      'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)' : 
                      'linear-gradient(145deg, rgba(26, 35, 50, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)',
                    border: day.production > 0 ? 
                      (isLightMode ? '1px solid rgba(0, 151, 167, 0.2)' : '1px solid rgba(0, 188, 212, 0.4)') :
                      (isLightMode ? '1px solid rgba(226, 232, 240, 0.5)' : '1px solid rgba(71, 85, 105, 0.3)'),
                    borderRadius: '12px',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: day.production > 0 ? 
                      (isLightMode ? '0 1px 3px rgba(0, 0, 0, 0.05)' : '0 0 20px rgba(0, 188, 212, 0.1)') : 
                      'none',
                    '&:hover': day.production > 0 ? {
                      transform: 'translateY(-3px)',
                      borderColor: isLightMode ? '#0097a7' : '#00bcd4',
                      boxShadow: isLightMode ? 
                        '0 4px 12px rgba(0, 0, 0, 0.1)' :
                        '0 0 30px rgba(0, 188, 212, 0.3)'
                    } : {},
                  }}
                  data-testid={`day-card-${index}`}
                >
                  {/* Header with Day Info */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                      <Typography 
                        sx={{ 
                          color: day.isWeekend ? 
                                 (isLightMode ? '#ef4444' : '#FF5252') : 
                                 (isLightMode ? '#475569' : '#cbd5e1'),
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}
                      >
                        {day.dayName}
                      </Typography>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 700,
                          color: isLightMode ? '#1e293b' : '#f1f5f9',
                          fontSize: '1rem'
                        }}
                      >
                        {day.dayNumber} Nov
                      </Typography>
                    </Box>
                  </Box>

                  {/* Production Data */}
                  {day.production > 0 ? (
                    <Box>
                      <Typography 
                        sx={{ 
                          color: isLightMode ? '#059669' : '#00E676',
                          fontWeight: 700,
                          fontSize: '1.25rem',
                          mb: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}
                      >
                        <Factory size={14} />
                        {day.production.toFixed(2)} ton
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center' }}>
                        <Package size={12} style={{ color: isLightMode ? '#7c3aed' : '#8b5cf6' }} />
                        <Typography sx={{ 
                          color: isLightMode ? '#7c3aed' : '#8b5cf6', 
                          fontSize: '0.75rem' 
                        }}>
                          {day.products} products
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center' }}>
                        <BarChart3 size={12} style={{ color: isLightMode ? '#ea580c' : '#FFB020' }} />
                        <Typography sx={{ 
                          color: isLightMode ? '#ea580c' : '#FFB020', 
                          fontSize: '0.75rem' 
                        }}>
                          {day.batches} batches
                        </Typography>
                      </Box>
                      
                      <Typography sx={{ 
                        color: isLightMode ? '#64748b' : '#64748b', 
                        fontSize: '0.7rem',
                        mt: 1 
                      }}>
                        {(day.weight).toLocaleString()} kg
                      </Typography>
                    </Box>
                  ) : (
                    <Typography 
                      sx={{ 
                        color: isLightMode ? '#ef4444' : '#FF5252',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textAlign: 'center',
                        mt: 3
                      }}
                    >
                      No production
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Day Detail Modal */}
        <Dialog
          open={!!selectedDay}
          onClose={() => setSelectedDay(null)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              background: isLightMode ? 'rgba(255, 255, 255, 0.98)' : 'rgba(30, 41, 59, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: isLightMode ? '1px solid rgba(226, 232, 240, 0.5)' : '1px solid rgba(100, 116, 139, 0.3)'
            }
          }}
        >
          {selectedDay && (
            <>
              <DialogTitle sx={{ 
                borderBottom: isLightMode ? '1px solid #e2e8f0' : '1px solid rgba(100, 116, 139, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Calendar size={24} style={{ color: isLightMode ? '#0097a7' : '#00bcd4' }} />
                  <Box>
                    <Typography variant="h6" sx={{ color: isLightMode ? '#1e293b' : '#f1f5f9' }}>
                      {selectedDay.date}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      Production Details
                    </Typography>
                  </Box>
                </Box>
                <IconButton onClick={() => setSelectedDay(null)} size="small">
                  <X size={20} />
                </IconButton>
              </DialogTitle>
              
              <DialogContent sx={{ p: 3 }}>
                {/* Summary Metrics */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: '8px',
                      background: isLightMode ? '#f0fdfa' : 'rgba(0, 188, 212, 0.1)',
                      border: '1px solid rgba(0, 188, 212, 0.2)'
                    }}>
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                        Total Production
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#00bcd4', fontWeight: 600 }}>
                        {selectedDay.production} T
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: '8px',
                      background: isLightMode ? '#f5f3ff' : 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.2)'
                    }}>
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                        Total Batches
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#8b5cf6', fontWeight: 600 }}>
                        {selectedDay.batches}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: '8px',
                      background: isLightMode ? '#f0fdf4' : 'rgba(0, 230, 118, 0.1)',
                      border: '1px solid rgba(0, 230, 118, 0.2)'
                    }}>
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                        Efficiency
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#00E676', fontWeight: 600 }}>
                        {selectedDay.efficiency}%
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: '8px',
                      background: isLightMode ? '#fffbeb' : 'rgba(255, 176, 32, 0.1)',
                      border: '1px solid rgba(255, 176, 32, 0.2)'
                    }}>
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                        Utilization
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#FFB020', fontWeight: 600 }}>
                        {selectedDay.utilization}%
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ mb: 3 }} />

                {/* Product Distribution Chart */}
                {selectedDay.productDetails && selectedDay.productDetails.length > 0 && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" sx={{ mb: 2, color: isLightMode ? '#1e293b' : '#f1f5f9' }}>
                        Product Distribution
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        <Pie
                          data={{
                            labels: selectedDay.productDetails.map(p => p.name),
                            datasets: [{
                              data: selectedDay.productDetails.map(p => p.quantity),
                              backgroundColor: selectedDay.productDetails.map(p => p.color),
                              borderWidth: 0
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'right',
                                labels: {
                                  padding: 15,
                                  font: { size: 12 },
                                  color: isLightMode ? '#475569' : '#cbd5e1'
                                }
                              },
                              tooltip: {
                                callbacks: {
                                  label: (context) => {
                                    const label = context.label || '';
                                    const value = Math.round(context.parsed);
                                    const percentage = selectedDay.productDetails?.[context.dataIndex]?.percentage || 0;
                                    return `${label}: ${value.toLocaleString()} kg (${percentage.toFixed(1)}%)`;
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" sx={{ mb: 2, color: isLightMode ? '#1e293b' : '#f1f5f9' }}>
                        Production Details
                      </Typography>
                      <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {selectedDay.productDetails.map((product, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              p: 1.5,
                              mb: 1,
                              borderRadius: '8px',
                              background: isLightMode ? '#f8fafc' : 'rgba(15, 23, 42, 0.4)',
                              border: isLightMode ? '1px solid #e2e8f0' : '1px solid rgba(100, 116, 139, 0.3)'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor: product.color
                                  }}
                                />
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 500,
                                  color: isLightMode ? '#475569' : '#cbd5e1'
                                }}>
                                  {product.name}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ 
                                fontWeight: 600,
                                color: product.color 
                              }}>
                                {Math.round(product.quantity).toLocaleString()} kg
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </DialogContent>
            </>
          )}
        </Dialog>
      </Box>
    </WaterSystemLayout>
  );
}