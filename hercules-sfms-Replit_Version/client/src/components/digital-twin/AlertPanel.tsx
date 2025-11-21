import React from 'react';
import { Paper, Typography, Box, Chip, IconButton } from '@mui/material';
import { AlertTriangle, AlertCircle, X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Alert {
  id: number;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
}

interface AlertPanelProps {
  alerts: Alert[];
  theme: 'light' | 'dark';
}

export function AlertPanel({ alerts, theme }: AlertPanelProps) {
  const isLight = theme === 'light';
  const [dismissedAlerts, setDismissedAlerts] = React.useState<number[]>([]);
  
  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.includes(alert.id)).slice(-5);
  
  const handleDismiss = (id: number) => {
    setDismissedAlerts(prev => [...prev, id]);
  };
  
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle size={16} />;
      case 'warning':
        return <AlertCircle size={16} />;
      default:
        return <Bell size={16} />;
    }
  };
  
  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error':
        return '#FF5252';
      case 'warning':
        return '#FFB020';
      default:
        return '#00bcd4';
    }
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 80,
        right: 20,
        maxWidth: '320px',
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: isLight ? '#475569' : '#94a3b8',
          fontWeight: 600,
          letterSpacing: '0.05em',
          fontSize: '0.75rem',
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <Bell size={14} />
        SYSTEM ALERTS
      </Typography>
      
      <AnimatePresence>
        {visibleAlerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <Paper
              elevation={2}
              sx={{
                p: 1.5,
                background: isLight
                  ? 'rgba(255, 255, 255, 0.95)'
                  : 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${getAlertColor(alert.type)}40`,
                borderLeft: `3px solid ${getAlertColor(alert.type)}`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                animation: 'alertPulse 2s infinite'
              }}
            >
              <Box
                sx={{
                  p: 0.5,
                  borderRadius: '6px',
                  background: `${getAlertColor(alert.type)}15`,
                  color: getAlertColor(alert.type),
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {getAlertIcon(alert.type)}
              </Box>
              
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    color: isLight ? '#1e293b' : '#f1f5f9',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    mb: 0.5
                  }}
                >
                  {alert.message}
                </Typography>
                <Typography
                  sx={{
                    color: isLight ? '#64748b' : '#94a3b8',
                    fontSize: '0.7rem'
                  }}
                >
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </Typography>
              </Box>
              
              <IconButton
                size="small"
                onClick={() => handleDismiss(alert.id)}
                sx={{
                  p: 0.5,
                  color: isLight ? '#64748b' : '#94a3b8',
                  '&:hover': {
                    color: isLight ? '#1e293b' : '#f1f5f9'
                  }
                }}
              >
                <X size={14} />
              </IconButton>
            </Paper>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {visibleAlerts.length === 0 && (
        <Paper
          elevation={1}
          sx={{
            p: 2,
            background: isLight
              ? 'rgba(255, 255, 255, 0.9)'
              : 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(10px)',
            border: isLight
              ? '1px solid rgba(226, 232, 240, 0.5)'
              : '1px solid rgba(100, 116, 139, 0.3)',
            borderRadius: '8px',
            textAlign: 'center'
          }}
        >
          <Typography
            sx={{
              color: isLight ? '#94a3b8' : '#64748b',
              fontSize: '0.875rem'
            }}
          >
            No active alerts
          </Typography>
          <Typography
            sx={{
              color: '#00E676',
              fontSize: '0.75rem',
              mt: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5
            }}
          >
            <Box
              component="span"
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#00E676',
                display: 'inline-block'
              }}
            />
            All systems operational
          </Typography>
        </Paper>
      )}
      
    </Box>
  );
}