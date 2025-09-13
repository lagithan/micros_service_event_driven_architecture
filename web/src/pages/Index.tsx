import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Navbar from '@/components/layout/Navbar'
import LogisticsScene from '@/components/3d/LogisticsScene'
import { Truck } from 'lucide-react'
import heroImage from '@/assets/hero-logistics.jpg'

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden mt-12">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* 3D Scene Overlay */}
        <div className="absolute inset-0 z-10 opacity-30">
          <LogisticsScene />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8 animate-slide-up">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
              Next-Generation
              <span className="block text-gradient-primary text-9xl">
                Logistics Portal
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
              Streamline your delivery operations with intelligent tracking and automated logistics solutions 
              designed for modern businesses.
            </p>

            {/* Footer info moved inside hero */}
            <div className="pt-16 text-center">
              <p className="text-gray-300">&copy; 2024 Swift Logistics (Pvt) Ltd. All rights reserved.</p>
              <p className="text-sm text-gray-400 mt-1">Advanced logistics solutions for modern businesses.</p>
            </div>


          </div>
        </div>
      </section>
    </div>
  )
}