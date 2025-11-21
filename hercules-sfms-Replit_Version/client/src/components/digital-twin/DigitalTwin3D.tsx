import { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, Grid, Chip } from '@mui/material';
import gsap from 'gsap';
import './DigitalTwin3D.css';

interface PlantDataProps {
  shipDocked: boolean;
  shipUnloadingProgress: number;
  intakeMaterials: any[];
  processingActive: boolean;
  processingRate: number;
  baggingLines: any;
  truckBays: any[];
  conveyorActive: boolean[];
  efficiency: number;
  systemStatus: string;
  totalProduction: number;
  powerConsumption: number;
  dailyProduction: number;
  mixingStation: any;
  moistureSensors: any;
  dryerStatus: any;
  revenue: number;
  theme?: 'light' | 'dark';
}

export function DigitalTwin3D({ plantData, theme = 'light' }: { plantData: PlantDataProps; theme?: 'light' | 'dark' }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const silosRef = useRef<HTMLDivElement[]>([]);
  const shipRef = useRef<HTMLDivElement>(null);
  const conveyorsRef = useRef<HTMLDivElement[]>([]);
  const processingRef = useRef<HTMLDivElement>(null);
  const trucksRef = useRef<HTMLDivElement[]>([]);
  const particlesRef = useRef<HTMLDivElement>(null);
  
  const [animationTimeline, setAnimationTimeline] = useState<gsap.core.Timeline | null>(null);

  // Initialize GSAP animations
  useEffect(() => {
    if (!containerRef.current || !sceneRef.current) return;

    // Create master timeline
    const tl = gsap.timeline({ repeat: -1 });
    
    // Set up 3D perspective context
    gsap.context(() => {
      // Initial scene setup with 3D perspective
      gsap.set(sceneRef.current, {
        perspective: 1500,
        transformStyle: 'preserve-3d',
        transformOrigin: 'center center'
      });

      // Animate ship if docked
      if (plantData.shipDocked && shipRef.current) {
        // Ship bobbing animation on water
        gsap.to(shipRef.current, {
          y: '+=10',
          rotateZ: 2,
          duration: 3,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true
        });

        // Wave effect animation
        gsap.to('.wave-effect', {
          scale: 1.2,
          opacity: 0,
          duration: 2,
          stagger: 0.3,
          repeat: -1,
          ease: 'power2.out'
        });

        // Crane animation for unloading
        gsap.to('.crane-arm', {
          rotateZ: plantData.shipUnloadingProgress > 50 ? -15 : 15,
          duration: 4,
          ease: 'power2.inOut',
          repeat: -1,
          yoyo: true
        });
      }

      // Animate silos with realistic filling
      silosRef.current.forEach((silo, index) => {
        if (!silo) return;
        const material = plantData.intakeMaterials[index];
        
        // 3D rotation for cylindrical effect
        gsap.set(silo, {
          rotateY: index * 15,
          transformStyle: 'preserve-3d',
          z: -50 + index * 10
        });

        // Liquid filling animation
        const fillElement = silo.querySelector('.silo-fill');
        if (fillElement) {
          gsap.to(fillElement, {
            height: `${material.level}%`,
            duration: 2,
            ease: 'power2.inOut',
            onUpdate: function() {
              // Add wave effect on top of liquid
              gsap.to(fillElement.querySelector('.liquid-wave'), {
                backgroundPositionX: '+=100px',
                duration: 3,
                ease: 'none'
              });
            }
          });
        }

        // Pulsing glow for active silos
        if (material.level > 70) {
          gsap.to(silo.querySelector('.silo-glow'), {
            opacity: 0.8,
            scale: 1.1,
            duration: 1.5,
            repeat: -1,
            yoyo: true,
            ease: 'power2.inOut'
          });
        }

        // Metallic sheen animation
        gsap.to(silo.querySelector('.metallic-sheen'), {
          backgroundPosition: '200% 0%',
          duration: 5,
          repeat: -1,
          ease: 'none'
        });
      });

      // Conveyor belt animations
      conveyorsRef.current.forEach((conveyor, index) => {
        if (!conveyor || !plantData.conveyorActive[index]) return;

        // Belt texture movement
        gsap.to(conveyor.querySelector('.belt-texture'), {
          backgroundPositionX: '+=500px',
          duration: 2,
          repeat: -1,
          ease: 'none'
        });

        // Material particles flowing
        const particles = conveyor.querySelectorAll('.material-particle');
        gsap.to(particles, {
          x: '+=600',
          duration: 3,
          stagger: 0.2,
          repeat: -1,
          ease: 'none',
          onRepeat: function() {
            // Reset particles to start position
            gsap.set(particles, { x: 0 });
          }
        });

        // 3D perspective on belt
        gsap.set(conveyor, {
          rotateX: -15,
          transformOrigin: 'center bottom',
          transformStyle: 'preserve-3d'
        });
      });

      // Processing plant animations
      if (processingRef.current && plantData.processingActive) {
        // Rotating machinery
        gsap.to('.machinery-gear', {
          rotation: 360,
          duration: 5,
          repeat: -1,
          ease: 'none',
          stagger: {
            each: 0.1,
            from: 'random'
          }
        });

        // Steam effect from chimneys
        gsap.to('.steam-particle', {
          y: -200,
          opacity: 0,
          scale: 2,
          duration: 3,
          stagger: 0.2,
          repeat: -1,
          ease: 'power2.out'
        });

        // Pulsing lights for active processes
        gsap.to('.process-light', {
          opacity: 1,
          scale: 1.2,
          duration: 0.5,
          repeat: -1,
          yoyo: true,
          ease: 'power2.inOut',
          stagger: {
            each: 0.1,
            from: 'random'
          }
        });

        // Vibration effect when running
        gsap.to(processingRef.current, {
          x: '+=1',
          y: '+=0.5',
          duration: 0.1,
          repeat: -1,
          yoyo: true,
          ease: 'none'
        });
      }

      // Bagging line animations
      if (plantData.baggingLines.line1.active) {
        // Bags dropping and filling
        gsap.to('.bag-drop', {
          y: 100,
          duration: 1,
          repeat: -1,
          ease: 'bounce.out',
          stagger: 0.5
        });

        // Palletizing stacking
        gsap.to('.pallet-stack', {
          y: -10,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: 'steps(5)',
          stagger: 0.3
        });

        // Shrink wrap spinning
        gsap.to('.shrink-wrap', {
          rotateY: 360,
          duration: 3,
          repeat: -1,
          ease: 'none'
        });
      }

      // Truck loading animations
      trucksRef.current.forEach((truck, index) => {
        const bay = plantData.truckBays[index];
        if (!truck || !bay.occupied) return;

        // Truck arrival animation
        gsap.fromTo(truck, {
          x: -300,
          opacity: 0
        }, {
          x: 0,
          opacity: 1,
          duration: 2,
          ease: 'power2.out'
        });

        // Hydraulic lift movement
        gsap.to(truck.querySelector('.hydraulic-lift'), {
          y: -20,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: 'power2.inOut'
        });

        // Material flow animation
        gsap.to(truck.querySelector('.material-flow'), {
          scaleY: bay.loadingProgress / 100,
          duration: 1,
          ease: 'power2.out'
        });

        // Exhaust smoke effect
        gsap.to(truck.querySelector('.exhaust-smoke'), {
          y: -50,
          opacity: 0,
          scale: 1.5,
          duration: 2,
          repeat: -1,
          ease: 'power2.out'
        });
      });

      // Ambient particle effects
      if (particlesRef.current) {
        const particles = particlesRef.current.querySelectorAll('.dust-particle');
        gsap.to(particles, {
          x: 'random(-100, 100)',
          y: 'random(-50, -150)',
          opacity: 0,
          duration: 'random(3, 5)',
          repeat: -1,
          stagger: {
            each: 0.1,
            from: 'random'
          }
        });
      }

      // Dynamic shadows based on light source
      gsap.to('.dynamic-shadow', {
        skewX: 'random(-5, 5)',
        opacity: 'random(0.3, 0.6)',
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      // Ambient lighting changes (day/night cycle simulation)
      const lightingCycle = gsap.timeline({ repeat: -1 });
      lightingCycle
        .to('.ambient-light', {
          background: 'linear-gradient(180deg, rgba(255,200,100,0.3) 0%, rgba(255,150,50,0.5) 100%)',
          duration: 10,
          ease: 'none'
        })
        .to('.ambient-light', {
          background: 'linear-gradient(180deg, rgba(100,150,255,0.3) 0%, rgba(50,100,200,0.5) 100%)',
          duration: 10,
          ease: 'none'
        });

    }, containerRef.current);

    // Viewport-based animations
    const handleScroll = () => {
      if (!containerRef.current || !sceneRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const isInView = rect.top < window.innerHeight && rect.bottom > 0;
      
      if (isInView) {
        gsap.to(sceneRef.current, {
          rotateY: 5,
          duration: 1,
          ease: 'power2.out'
        });
      } else {
        gsap.to(sceneRef.current, {
          rotateY: 0,
          duration: 1,
          ease: 'power2.out'
        });
      }
    };

    window.addEventListener('scroll', handleScroll);
    setAnimationTimeline(tl);

    return () => {
      tl.kill();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [plantData]);

  // Parallax effect on mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!sceneRef.current) return;
      
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      const xRotation = ((clientY / innerHeight) - 0.5) * 10;
      const yRotation = ((clientX / innerWidth) - 0.5) * 10;
      
      gsap.to(sceneRef.current, {
        rotateX: xRotation,
        rotateY: yRotation,
        duration: 0.5,
        ease: 'power2.out'
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div ref={containerRef} className={`digital-twin-3d ${theme}`}>
      <div className="ambient-light"></div>
      <div ref={sceneRef} className="scene-3d">
        {/* Marine Dock Section */}
        <div className="dock-section">
          <div ref={shipRef} className="ship-container">
            <div className="ship-body">
              <div className="crane-arm"></div>
              <div className="wave-effect"></div>
              <div className="wave-effect"></div>
              <div className="wave-effect"></div>
            </div>
            <div className="loading-indicator">
              <div className="progress-bar" style={{ width: `${plantData.shipUnloadingProgress}%` }}></div>
            </div>
          </div>
        </div>

        {/* Silos Section */}
        <div className="silos-section">
          {plantData.intakeMaterials.map((material, i) => (
            <div 
              key={i} 
              ref={el => { if (el) silosRef.current[i] = el; }}
              className="silo-3d"
            >
              <div className="silo-body">
                <div className="metallic-sheen"></div>
                <div className="silo-fill">
                  <div className="liquid-wave"></div>
                </div>
                <div className="silo-glow"></div>
                <div className="level-indicator">{material.level}%</div>
              </div>
              <div className="silo-label">{material.type}</div>
              <div className="moisture-indicator">M: {material.moistureLevel}%</div>
              <div className="dynamic-shadow"></div>
            </div>
          ))}
        </div>

        {/* Conveyor Belts */}
        <div className="conveyors-section">
          {plantData.conveyorActive.map((active, i) => (
            <div 
              key={i}
              ref={el => { if (el) conveyorsRef.current[i] = el; }}
              className={`conveyor-3d ${active ? 'active' : ''}`}
            >
              <div className="belt-texture"></div>
              <div className="material-flow">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="material-particle"></div>
                ))}
              </div>
              <div className="conveyor-supports"></div>
            </div>
          ))}
        </div>

        {/* Processing Plant */}
        <div ref={processingRef} className="processing-plant-3d">
          <div className="plant-building">
            <div className="windows">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="window">
                  <div className="machinery-gear"></div>
                </div>
              ))}
            </div>
            <div className="chimneys">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="chimney">
                  <div className="steam-particle"></div>
                  <div className="steam-particle"></div>
                  <div className="steam-particle"></div>
                </div>
              ))}
            </div>
            <div className="process-lights">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="process-light"></div>
              ))}
            </div>
          </div>
          <div className="dynamic-shadow"></div>
        </div>

        {/* Bagging Section */}
        <div className="bagging-section-3d">
          <div className="bagging-lines">
            {Object.keys(plantData.baggingLines).map((line, i) => (
              <div key={i} className={`bagging-line ${plantData.baggingLines[line].active ? 'active' : ''}`}>
                <div className="bag-drop"></div>
                <div className="conveyor-belt"></div>
                <div className="pallet-stack"></div>
                <div className="shrink-wrap"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Truck Loading */}
        <div className="truck-loading-3d">
          {plantData.truckBays.map((bay, i) => (
            <div 
              key={i}
              ref={el => { if (el) trucksRef.current[i] = el; }}
              className={`truck-bay ${bay.occupied ? 'occupied' : ''}`}
            >
              {bay.occupied && (
                <div className="truck">
                  <div className="truck-body">
                    <div className="hydraulic-lift"></div>
                    <div className="material-flow"></div>
                    <div className="exhaust-smoke"></div>
                  </div>
                  <div className="loading-progress">
                    <div className="progress-fill" style={{ width: `${bay.loadingProgress}%` }}></div>
                  </div>
                </div>
              )}
              <div className="bay-number">Bay {bay.id}</div>
              <div className="dynamic-shadow"></div>
            </div>
          ))}
        </div>

        {/* Particle System */}
        <div ref={particlesRef} className="particle-system">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="dust-particle"></div>
          ))}
        </div>
      </div>
    </div>
  );
}