import React, { Component, ReactNode } from 'react';
import { Alert, AlertTitle, Box, Button } from '@mui/material';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary specifically designed for Three.js/React Three Fiber components
 * Catches rendering errors and provides fallback UI
 */
export class ThreeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('Three.js Error Boundary caught error:', error);
    console.error('Error Info:', errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // If custom fallback is provided, use it
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            p: 4,
            background: 'linear-gradient(135deg, rgba(255,0,0,0.05) 0%, rgba(255,100,0,0.05) 100%)',
            borderRadius: 2,
            border: '1px solid rgba(255,100,0,0.2)'
          }}
        >
          <Alert 
            severity="error"
            icon={<AlertTriangle size={24} />}
            sx={{ 
              maxWidth: 600,
              width: '100%',
              mb: 3
            }}
          >
            <AlertTitle sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
              3D Visualization Error
            </AlertTitle>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                The 3D visualization encountered an error and cannot be displayed.
              </Typography>
              {this.state.error && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block',
                    mt: 2,
                    p: 1,
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    borderRadius: 1,
                    fontFamily: 'monospace'
                  }}
                >
                  {this.state.error.message}
                </Typography>
              )}
            </Box>
          </Alert>
          
          <Button
            variant="contained"
            startIcon={<RefreshCw size={18} />}
            onClick={this.handleReset}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              }
            }}
          >
            Try Again
          </Button>
          
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ mt: 2, textAlign: 'center' }}
          >
            If the problem persists, the 2D dashboard view is still available
          </Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Import required Typography
import { Typography } from '@mui/material';