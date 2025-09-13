import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Search, 
  Package, 
  MapPin, 
  Clock, 
  Truck, 
  CheckCircle,
  AlertCircle,
  Navigation,
  Phone,
  Mail,
  Calendar
} from 'lucide-react'

interface TrackingEvent {
  id: string
  timestamp: string
  status: string
  location: string
  description: string
  isCompleted: boolean
}

interface TrackingData {
  orderId: string
  status: string
  estimatedDelivery: string
  currentLocation: string
  customerName: string
  customerPhone: string
  customerEmail: string
  pickupAddress: string
  deliveryAddress: string
  priority: string
  items: Array<{
    name: string
    quantity: number
    weight: number
  }>
  events: TrackingEvent[]
}

const mockTrackingData: TrackingData = {
  orderId: "ORD-1735529825123",
  status: "In Transit",
  estimatedDelivery: "2024-01-15 14:30",
  currentLocation: "Colombo Distribution Center",
  customerName: "John Doe",
  customerPhone: "+94 77 123 4567",
  customerEmail: "john@example.com",
  pickupAddress: "123 Main Street, Colombo 03",
  deliveryAddress: "456 Galle Road, Mount Lavinia",
  priority: "express",
  items: [
    { name: "Electronics Package", quantity: 1, weight: 2.5 },
    { name: "Documents", quantity: 1, weight: 0.2 }
  ],
  events: [
    {
      id: "1",
      timestamp: "2024-01-14 09:00",
      status: "Order Created",
      location: "Online Portal",
      description: "Order has been created and is being processed",
      isCompleted: true
    },
    {
      id: "2", 
      timestamp: "2024-01-14 10:30",
      status: "Picked Up",
      location: "Colombo 03",
      description: "Package collected from sender",
      isCompleted: true
    },
    {
      id: "3",
      timestamp: "2024-01-14 15:45",
      status: "In Transit",
      location: "Colombo Distribution Center",
      description: "Package is being sorted for delivery",
      isCompleted: true
    },
    {
      id: "4",
      timestamp: "2024-01-15 08:00",
      status: "Out for Delivery",
      location: "Mount Lavinia Hub",
      description: "Package is out for final delivery",
      isCompleted: false
    },
    {
      id: "5",
      timestamp: "2024-01-15 14:30",
      status: "Delivered",
      location: "Mount Lavinia",
      description: "Package delivered to recipient",
      isCompleted: false
    }
  ]
}

export default function Tracking() {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Order Created": return "bg-muted text-muted-foreground"
      case "Picked Up": return "bg-warning text-warning-foreground"
      case "In Transit": return "bg-primary text-primary-foreground"
      case "Out for Delivery": return "bg-secondary text-secondary-foreground"
      case "Delivered": return "bg-success text-success-foreground"
      default: return "bg-muted text-muted-foreground"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-destructive text-destructive-foreground"
      case "express": return "bg-warning text-warning-foreground"
      case "standard": return "bg-muted text-muted-foreground"
      default: return "bg-muted text-muted-foreground"
    }
  }

  const handleTrack = async () => {
    if (!trackingNumber.trim()) {
      setError('Please enter a tracking number')
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (trackingNumber === mockTrackingData.orderId) {
        setTrackingData(mockTrackingData)
      } else {
        setError('Tracking number not found. Please check and try again.')
        setTrackingData(null)
      }
    } catch (err) {
      setError('Failed to fetch tracking information. Please try again.')
      setTrackingData(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-2">Track Your Order</h1>
            <p className="text-muted-foreground">
              Enter your tracking number to get real-time updates on your shipment
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Tracking Input */}
        <Card className="max-w-2xl mx-auto mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Enter Tracking Number
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="Enter tracking number (e.g., ORD-1735529825123)"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
                className="flex-1"
              />
              <Button 
                onClick={handleTrack}
                disabled={isLoading}
                className="gradient-primary"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Tracking...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Track
                  </>
                )}
              </Button>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Tracking Results */}
        {trackingData && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Order Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Order {trackingData.orderId}
                  </div>
                  <Badge className={getStatusColor(trackingData.status)}>
                    {trackingData.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Estimated Delivery
                    </div>
                    <p className="font-medium">{trackingData.estimatedDelivery}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      Current Location
                    </div>
                    <p className="font-medium">{trackingData.currentLocation}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Truck className="w-4 h-4" />
                      Priority
                    </div>
                    <Badge variant="outline" className={getPriorityColor(trackingData.priority)}>
                      {trackingData.priority}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="w-4 h-4" />
                      Items
                    </div>
                    <p className="font-medium">{trackingData.items.length} item(s)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Delivery Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="w-5 h-5" />
                    Delivery Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">Customer</h4>
                    <p className="font-medium">{trackingData.customerName}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {trackingData.customerPhone}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {trackingData.customerEmail}
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">From</h4>
                    <p className="text-sm">{trackingData.pickupAddress}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">To</h4>
                    <p className="text-sm">{trackingData.deliveryAddress}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Package Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Package Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {trackingData.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border border-border rounded-lg">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity} • Weight: {item.weight}kg
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tracking Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Tracking Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {trackingData.events.map((event, index) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                          event.isCompleted 
                            ? 'bg-success border-success text-success-foreground' 
                            : 'bg-muted border-border text-muted-foreground'
                        }`}>
                          {event.isCompleted ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-current" />
                          )}
                        </div>
                        {index < trackingData.events.length - 1 && (
                          <div className={`w-0.5 h-12 ${
                            event.isCompleted ? 'bg-success' : 'bg-border'
                          }`} />
                        )}
                      </div>
                      
                      <div className="flex-1 pb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <h4 className="font-semibold">{event.status}</h4>
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {event.timestamp}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}