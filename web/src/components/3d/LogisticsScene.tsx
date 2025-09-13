import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Float } from '@react-three/drei'
import { Suspense } from 'react'
import FloatingBox from './FloatingBox'

interface LogisticsSceneProps {
  className?: string
  interactive?: boolean
}

export default function LogisticsScene({ className = "", interactive = false }: LogisticsSceneProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
        <Suspense fallback={null}>
          <Environment preset="studio" />
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          
          {/* Floating logistics elements */}
          <Float speed={1.2} rotationIntensity={0.5} floatIntensity={0.5}>
            <FloatingBox position={[-3, 2, 0]} color="#3b82f6" speed={0.8} scale={0.8} />
          </Float>
          
          <Float speed={0.8} rotationIntensity={0.3} floatIntensity={0.3}>
            <FloatingBox position={[3, -1, -2]} color="#f97316" speed={1.2} scale={1.2} />
          </Float>
          
          <Float speed={1.5} rotationIntensity={0.7} floatIntensity={0.7}>
            <FloatingBox position={[0, -2, 1]} color="#06b6d4" speed={0.6} scale={0.6} />
          </Float>
          
          <Float speed={0.9} rotationIntensity={0.4} floatIntensity={0.4}>
            <FloatingBox position={[-2, -1, 2]} color="#8b5cf6" speed={1.1} scale={0.9} />
          </Float>
          
          <Float speed={1.3} rotationIntensity={0.6} floatIntensity={0.6}>
            <FloatingBox position={[4, 1, -1]} color="#10b981" speed={0.9} scale={0.7} />
          </Float>

          {interactive && <OrbitControls enableZoom={false} enablePan={false} />}
        </Suspense>
      </Canvas>
    </div>
  )
}