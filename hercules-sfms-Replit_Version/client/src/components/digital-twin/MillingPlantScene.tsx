import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface MillingPlantSceneProps {
  data: any;
  theme: 'light' | 'dark';
}

// Simple Silo Component
function Silo({ position, fillLevel, index, theme }: any) {
  const meshRef = useRef<THREE.Group>(null);
  const fillRef = useRef<THREE.Mesh>(null);
  const isLight = theme === 'light';
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime + index * 0.5) * 0.05;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Silo Body */}
      <Cylinder 
        args={[2, 2, 8, 32]}
        position={[0, 4, 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial 
          color={isLight ? "#e2e8f0" : "#334155"}
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0.9}
        />
      </Cylinder>
      
      {/* Silo Top Cone */}
      <Cylinder 
        args={[2.2, 2, 1, 32]}
        position={[0, 8.5, 0]}
        castShadow
      >
        <meshPhysicalMaterial 
          color={isLight ? "#94a3b8" : "#475569"}
          metalness={0.9}
          roughness={0.1}
        />
      </Cylinder>
      
      {/* Fill Level Indicator */}
      <Cylinder 
        ref={fillRef}
        args={[1.95, 1.95, fillLevel * 0.08, 32]}
        position={[0, fillLevel * 0.04, 0]}
      >
        <meshPhysicalMaterial 
          color={fillLevel > 80 ? "#FF5252" : fillLevel > 50 ? "#FFB020" : "#00E676"}
          emissive={fillLevel > 80 ? "#FF5252" : fillLevel > 50 ? "#FFB020" : "#00E676"}
          emissiveIntensity={0.3}
          transparent
          opacity={0.7}
        />
      </Cylinder>
      
      {/* Status Light */}
      <Sphere args={[0.3, 16, 16]} position={[0, 10, 0]}>
        <meshPhysicalMaterial 
          color={fillLevel > 80 ? "#FF5252" : "#00E676"}
          emissive={fillLevel > 80 ? "#FF5252" : "#00E676"}
          emissiveIntensity={0.5}
        />
      </Sphere>
    </group>
  );
}

// Conveyor Belt Component
function ConveyorBelt({ start, end, speed, theme }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isLight = theme === 'light';
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += speed * 0.01;
    }
  });

  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  
  return (
    <group position={midpoint}>
      {/* Belt Surface */}
      <Box 
        ref={meshRef}
        args={[length, 0.5, 2]}
        rotation={[0, Math.atan2(direction.x, direction.z), 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial 
          color={isLight ? "#64748b" : "#1e293b"}
          metalness={0.6}
          roughness={0.4}
        />
      </Box>
      
      {/* Belt Supports */}
      {[0, 0.33, 0.66, 1].map((t, i) => (
        <Box
          key={i}
          args={[0.3, 2, 0.3]}
          position={[
            start.x + direction.x * t,
            -1,
            start.z + direction.z * t
          ]}
        >
          <meshStandardMaterial color={isLight ? "#94a3b8" : "#334155"} />
        </Box>
      ))}
    </group>
  );
}

// Processing Building
function ProcessingBuilding({ theme }: { theme: 'light' | 'dark' }) {
  const isLight = theme === 'light';
  const buildingRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (buildingRef.current) {
      buildingRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.01;
    }
  });
  
  return (
    <group position={[0, 3, -10]}>
      <Box 
        ref={buildingRef}
        args={[10, 6, 8]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial 
          color={isLight ? "#cbd5e1" : "#1e293b"}
          metalness={0.7}
          roughness={0.3}
        />
      </Box>
      
      {/* Windows */}
      {[-3, -1, 1, 3].map((x) => (
        <Box
          key={x}
          args={[1.5, 1, 0.1]}
          position={[x, 1, 4.05]}
        >
          <meshPhysicalMaterial 
            color="#00E5FF"
            emissive="#00E5FF"
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </Box>
      ))}
      
      {/* Roof Equipment */}
      <Cylinder args={[0.5, 0.5, 2, 16]} position={[2, 4, 0]}>
        <meshStandardMaterial color={isLight ? "#94a3b8" : "#475569"} />
      </Cylinder>
      <Cylinder args={[0.5, 0.5, 2, 16]} position={[-2, 4, 0]}>
        <meshStandardMaterial color={isLight ? "#94a3b8" : "#475569"} />
      </Cylinder>
    </group>
  );
}

// Main Scene Component
export function MillingPlantScene({ data, theme }: MillingPlantSceneProps) {
  const isLight = theme === 'light';
  
  return (
    <group>
      {/* Ground Plane */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.1, 0]}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial 
          color={isLight ? "#e2e8f0" : "#0f172a"}
          roughness={0.8}
        />
      </mesh>
      
      {/* Grid Lines */}
      <gridHelper 
        args={[100, 50, isLight ? "#94a3b8" : "#1e293b", isLight ? "#cbd5e1" : "#334155"]} 
        position={[0, 0, 0]}
      />
      
      {/* Silos Row */}
      {data.siloLevels.map((level: number, index: number) => (
        <Silo 
          key={index}
          position={[(index - 2.5) * 5, 0, 0]}
          fillLevel={level}
          index={index}
          theme={theme}
        />
      ))}
      
      {/* Conveyor System */}
      <ConveyorBelt 
        start={new THREE.Vector3(-12, 1, 5)}
        end={new THREE.Vector3(0, 1, 10)}
        speed={data.conveyorSpeed}
        theme={theme}
      />
      <ConveyorBelt 
        start={new THREE.Vector3(0, 1, 10)}
        end={new THREE.Vector3(12, 1, 5)}
        speed={data.conveyorSpeed}
        theme={theme}
      />
      
      {/* Processing Building */}
      <ProcessingBuilding theme={theme} />
      
      {/* Packaging Area */}
      <group position={[15, 0, -5]}>
        <Box args={[8, 4, 6]} position={[0, 2, 0]} castShadow>
          <meshPhysicalMaterial 
            color={isLight ? "#cbd5e1" : "#334155"}
            metalness={0.6}
            roughness={0.4}
          />
        </Box>
        
        {/* Loading Bay */}
        <Box args={[3, 0.2, 4]} position={[5, 0.1, 0]}>
          <meshStandardMaterial color={isLight ? "#fbbf24" : "#f59e0b"} />
        </Box>
      </group>
      
      {/* Storage Tanks */}
      <group position={[-15, 0, -8]}>
        <Cylinder args={[3, 3, 5, 32]} position={[0, 2.5, 0]} castShadow>
          <meshPhysicalMaterial 
            color={isLight ? "#94a3b8" : "#475569"}
            metalness={0.8}
            roughness={0.2}
          />
        </Cylinder>
        <Cylinder args={[3, 3, 5, 32]} position={[7, 2.5, 0]} castShadow>
          <meshPhysicalMaterial 
            color={isLight ? "#94a3b8" : "#475569"}
            metalness={0.8}
            roughness={0.2}
          />
        </Cylinder>
      </group>
      
      {/* Animated Particles for Activity */}
      {Array.from({ length: 20 }).map((_, i) => (
        <Particle key={i} index={i} theme={theme} />
      ))}
    </group>
  );
}

// Particle Component for visual activity
function Particle({ index, theme }: { index: number; theme: 'light' | 'dark' }) {
  const ref = useRef<THREE.Mesh>(null);
  const isLight = theme === 'light';
  
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime + index;
      ref.current.position.x = Math.sin(t) * 20;
      ref.current.position.y = Math.abs(Math.sin(t * 2)) * 10 + 2;
      ref.current.position.z = Math.cos(t) * 20;
      ref.current.scale.setScalar(Math.sin(t * 3) * 0.5 + 0.5);
    }
  });
  
  return (
    <Sphere ref={ref} args={[0.1, 8, 8]}>
      <meshPhysicalMaterial
        color={isLight ? "#3b82f6" : "#60a5fa"}
        emissive={isLight ? "#3b82f6" : "#60a5fa"}
        emissiveIntensity={0.5}
        transparent
        opacity={0.6}
      />
    </Sphere>
  );
}