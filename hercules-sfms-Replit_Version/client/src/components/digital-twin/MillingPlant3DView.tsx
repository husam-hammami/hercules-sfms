import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment,
  Stats,
  Grid,
  GizmoHelper,
  GizmoViewport
} from '@react-three/drei';
import { Box, Button, ButtonGroup, CircularProgress, Chip } from '@mui/material';
import { 
  Eye, 
  RotateCw, 
  ZoomIn, 
  ZoomOut,
  Video,
  Maximize,
  Activity
} from 'lucide-react';
import { MillingPlantScene } from './MillingPlantScene';
import * as THREE from 'three';

interface MillingPlant3DViewProps {
  data: any;
  theme: 'light' | 'dark';
  showStats?: boolean;
  showGrid?: boolean;
  showGizmo?: boolean;
}

// Camera preset positions
const CAMERA_PRESETS = {
  overview: { position: [30, 20, 30], target: [0, 0, 0], label: 'Overview' },
  silos: { position: [0, 15, 25], target: [0, 5, 0], label: 'Silos View' },
  processing: { position: [10, 12, -20], target: [0, 3, -10], label: 'Processing Area' },
  conveyor: { position: [20, 10, 15], target: [0, 2, 5], label: 'Conveyor System' },
  aerial: { position: [0, 40, 0.1], target: [0, 0, 0], label: 'Aerial View' },
  ground: { position: [25, 2, 25], target: [0, 5, 0], label: 'Ground Level' }
};

export function MillingPlant3DView({ 
  data, 
  theme,
  showStats = false,
  showGrid = true,
  showGizmo = true
}: MillingPlant3DViewProps) {
  const [cameraView, setCameraView] = useState('overview');
  const [autoRotate, setAutoRotate] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isLight = theme === 'light';
  
  // Handle fullscreen
  const toggleFullscreen = () => {
    const container = document.getElementById('3d-view-container');
    if (!document.fullscreenElement && container) {
      container.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <Box
      id="3d-view-container"
      sx={{
        position: 'relative',
        width: '100%',
        height: isFullscreen ? '100vh' : '600px',
        background: isLight 
          ? 'linear-gradient(180deg, #e0f2fe 0%, #bae6fd 50%, #e0f2fe 100%)' 
          : 'linear-gradient(180deg, #020617 0%, #0f172a 50%, #020617 100%)',
        borderRadius: isFullscreen ? 0 : 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
      }}
    >
      {/* Live Indicator */}
      <Chip
        label="3D LIVE"
        color="error"
        size="small"
        icon={<Activity size={14} />}
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
          animation: 'pulse 2s infinite',
          fontWeight: 600,
          background: 'rgba(244, 67, 54, 0.9)',
          backdropFilter: 'blur(4px)'
        }}
      />

      {/* Camera Controls */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {/* View Presets */}
        <ButtonGroup 
          orientation="vertical" 
          size="small"
          sx={{
            background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: 1,
          }}
        >
          {Object.entries(CAMERA_PRESETS).map(([key, preset]) => (
            <Button
              key={key}
              onClick={() => setCameraView(key)}
              startIcon={<Eye size={14} />}
              sx={{
                justifyContent: 'flex-start',
                fontSize: '0.75rem',
                color: cameraView === key ? '#00e5ff' : 'inherit',
                borderColor: cameraView === key ? '#00e5ff' : 'inherit',
                '&:hover': {
                  background: isLight 
                    ? 'rgba(0, 229, 255, 0.1)' 
                    : 'rgba(0, 229, 255, 0.2)',
                }
              }}
            >
              {preset.label}
            </Button>
          ))}
        </ButtonGroup>

        {/* Control Buttons */}
        <ButtonGroup 
          orientation="vertical" 
          size="small"
          sx={{
            background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: 1,
          }}
        >
          <Button
            onClick={() => setAutoRotate(!autoRotate)}
            color={autoRotate ? 'primary' : 'inherit'}
            startIcon={<RotateCw size={14} />}
          >
            {autoRotate ? 'Stop' : 'Auto'} Rotate
          </Button>
          <Button
            onClick={toggleFullscreen}
            startIcon={<Maximize size={14} />}
          >
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </Button>
        </ButtonGroup>
      </Box>

      {/* Three.js Canvas */}
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ 
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        {/* Camera with smooth transitions */}
        <PerspectiveCamera
          makeDefault
          position={CAMERA_PRESETS[cameraView as keyof typeof CAMERA_PRESETS].position as [number, number, number]}
          fov={50}
        />
        
        {/* Orbit Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
          minDistance={5}
          maxDistance={100}
          maxPolarAngle={Math.PI * 0.85}
          target={CAMERA_PRESETS[cameraView as keyof typeof CAMERA_PRESETS].target as [number, number, number]}
        />

        {/* Lighting */}
        <ambientLight intensity={isLight ? 0.5 : 0.3} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={isLight ? 1 : 0.8}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={100}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />
        <directionalLight
          position={[-10, 10, -10]}
          intensity={isLight ? 0.3 : 0.2}
          color="#00e5ff"
        />
        <pointLight position={[0, 10, 0]} intensity={0.5} color="#ff00ff" />
        
        {/* Fog for depth */}
        <fog 
          attach="fog" 
          args={[isLight ? '#e0f2fe' : '#020617', 30, 100]} 
        />

        {/* Environment */}
        <Environment preset={isLight ? "city" : "night"} />

        {/* Main Scene */}
        <Suspense fallback={<LoadingMesh />}>
          <MillingPlantScene data={data} theme={theme} />
        </Suspense>

        {/* Optional Grid */}
        {showGrid && (
          <Grid
            args={[100, 100]}
            cellSize={2}
            cellThickness={0.5}
            cellColor={isLight ? '#94a3b8' : '#1e293b'}
            sectionSize={10}
            sectionThickness={1}
            sectionColor={isLight ? '#64748b' : '#334155'}
            fadeDistance={100}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={true}
          />
        )}

        {/* Gizmo Helper */}
        {showGizmo && (
          <GizmoHelper
            alignment="bottom-left"
            margin={[80, 80]}
            renderPriority={2}
          >
            <GizmoViewport
              axisColors={['#FF5252', '#00E676', '#2196F3']}
              labelColor="white"
            />
          </GizmoHelper>
        )}

        {/* Performance Stats */}
        {showStats && <Stats />}
      </Canvas>

      {/* Loading Overlay */}
      <Suspense fallback={null}>
        <LoadingOverlay />
      </Suspense>
    </Box>
  );
}

// Loading mesh component
function LoadingMesh() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#00e5ff" wireframe />
    </mesh>
  );
}

// Loading overlay component
function LoadingOverlay() {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  
  if (!isLoading) return null;
  
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        zIndex: 100,
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress size={48} sx={{ color: '#00e5ff' }} />
        <Typography variant="h6" sx={{ mt: 2, color: 'white' }}>
          Loading 3D Visualization...
        </Typography>
      </Box>
    </Box>
  );
}

// Import Typography
import { Typography } from '@mui/material';