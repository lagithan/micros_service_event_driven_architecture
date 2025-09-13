import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box } from '@react-three/drei'
import * as THREE from 'three'

interface FloatingBoxProps {
  position: [number, number, number]
  color: string
  speed?: number
  scale?: number
}

export default function FloatingBox({ position, color, speed = 1, scale = 1 }: FloatingBoxProps) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * speed) * 0.2
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * speed * 0.8) * 0.3
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed) * 0.5
    }
  })

  return (
    <Box ref={meshRef} position={position} scale={scale}>
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} />
    </Box>
  )
}