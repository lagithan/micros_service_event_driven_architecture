import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import CreateOrderModal from '@/components/orders/CreateOrderModal'
import OrderDetailModal from '@/components/orders/OrderDetailModal'
import OrdersTable from '@/components/orders/OrdersTable'
import { 
  Truck, 
  Package, 
  Bell, 
  Plus,
  User,
  LogOut,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { OrderService, TokenManager } from '@/lib/api'

interface OrderData {
  id: string;
  customerName: string;
  receiverName?: string;
  receiverPhone?: string;
  status: string;
  destination: string;
  estimatedValue: number;
  createdAt: string;
  trackingNumber?: string;
  priority?: string;
  items?: Array<{ id?: string; name: string; quantity: number }>;
  paymentStatus?: "Paid" | "Pending";
  pickupAddress?: string;
  destinationAddress?: string;
  packageDetails?: string;
  specialInstructions?: string;
  orderStatus?: string;
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [selectedTab, setSelectedTab] = useState("orders")
  const [createOrderOpen, setCreateOrderOpen] = useState(false)
  const [orderDetailOpen, setOrderDetailOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null)
  const [orders, setOrders] = useState([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(true)
  const [orderError, setOrderError] = useState<string | null>(null)

  // Load orders from API on component mount
  // Load orders from API on component mount
  const loadOrders = useCallback(async () => {
    try {
      setIsLoadingOrders(true)
      setOrderError(null)
      
      const client = TokenManager.getClient()
      if (!client?.id) {
        console.warn('No client ID found, using mock data')
        // Fall back to mock data if no client ID
        setOrders([
          {
            id: "ORD-MOCK-001",
            customerName: "Sample Customer",
            status: "Processing",
            destination: "Sample City",
            estimatedValue: 200,
            createdAt: new Date().toISOString(),
            priority: "standard",
            items: [{ name: "Sample Item", quantity: 1 }],
            paymentStatus: "Pending"
          }
        ])
        setIsLoadingOrders(false)
        return
      }

      console.log('Loading orders for client:', client.id)
      console.log('Client data:', client)
      const response = await OrderService.getClientOrders(Number(client.id))
      console.log('Raw API response:', response)
      
      if (response.success && response.data?.orders) {
        console.log('Orders from API:', response.data.orders)
        // Transform API orders to match frontend format
        const transformedOrders = response.data.orders.map(order => ({
          id: order.orderId || order.id,
          customerName: order.senderName,
          receiverName: order.receiverName,
          receiverPhone: order.receiverPhone,
          status: order.orderStatus, // Use original status from database
          destination: extractDestination(order.destinationAddress),
          estimatedValue: calculateEstimatedValue(order.packageDetails || ''),
          createdAt: order.createdAt,
          trackingNumber: order.trackingNumber,
          priority: extractPriority(order.packageDetails || ''),
          items: parseItems(order.packageDetails || ''),
          paymentStatus: order.paymentStatus || 'Pending', // Use paymentStatus from API
          pickupAddress: order.pickupAddress,
          destinationAddress: order.destinationAddress,
          packageDetails: order.packageDetails,
          specialInstructions: order.specialInstructions,
          orderStatus: order.orderStatus
        }))
        
        console.log('Transformed orders:', transformedOrders)
        setOrders(transformedOrders)
      } else {
        console.warn('No orders found or invalid response:', response)
        setOrders([])
      }
    } catch (error) {
      console.error('Failed to load orders:', error)
      setOrderError(error instanceof Error ? error.message : 'Failed to load orders')
      
      // Fall back to mock data on error
      setOrders([
        {
          id: "ORD-ERROR-001",
          customerName: "Unable to load orders",
          status: "Processing",
          destination: "Check connection",
          estimatedValue: 0,
          createdAt: new Date().toISOString(),
          priority: "standard",
          items: [],
          paymentStatus: "Pending"
        }
      ])
    } finally {
      setIsLoadingOrders(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Helper functions to transform API data
  const mapOrderStatus = (apiStatus: string) => {
    switch (apiStatus) {
      case 'Pending': return 'Processing'
      case 'PickedUp': return 'In Transit'
      case 'OnWarehouse': return 'In Transit'
      case 'Delivered': return 'Delivered'
      case 'Cancelled': return 'Cancelled'
      default: return 'Processing'
    }
  }

  const extractDestination = (fullAddress: string) => {
    // Extract first part of address as destination
    return fullAddress.split(',')[0].trim() || fullAddress
  }

  const calculateEstimatedValue = (packageDetails: string) => {
    // Try to extract value from package details or calculate based on items
    const basePrice = 150
    const weightMatch = packageDetails.match(/(\d+\.?\d*)kg total/)
    const itemMatch = packageDetails.match(/(\d+) items/)
    const priorityMatch = packageDetails.match(/Priority: (\w+)/)
    
    const weight = weightMatch ? parseFloat(weightMatch[1]) : 1
    const items = itemMatch ? parseInt(itemMatch[1]) : 1
    const priority = priorityMatch ? priorityMatch[1] : 'standard'
    
    const priorityMultiplier = priority === 'urgent' ? 1.15 : priority === 'express' ? 1.05 : 1
    const weightCharge = weight * 8
    const itemHandlingCharge = items * 3
    
    return (basePrice * priorityMultiplier) + weightCharge + itemHandlingCharge
  }

  const extractPriority = (packageDetails: string) => {
    const priorityMatch = packageDetails.match(/Priority: (\w+)/)
    return priorityMatch ? priorityMatch[1] : 'standard'
  }

  const parseItems = (packageDetails: string) => {
    // Parse items from package details
    const itemMatch = packageDetails.match(/Categories: (.+?)\. Priority/)
    if (itemMatch) {
      const categories = itemMatch[1].split(', ')
      return categories.map((cat, index) => ({
        id: `item-${index}`,
        name: cat.split(' ')[1] || cat, // Extract category name
        quantity: parseInt(cat.split('x')[0]) || 1
      }))
    }
    return []
  }

  const handleCreateOrder = async (newOrder: OrderData) => {
    // Add the new order to the beginning of the list for immediate feedback
    setOrders(prev => [newOrder, ...prev])
    
    // Refresh the entire list from backend to ensure consistency
    try {
      await loadOrders()
    } catch (error) {
      console.warn('Failed to refresh orders after creation:', error)
    }
  }

  const handleOrderView = (order: OrderData) => {
    console.log('View order:', order)
    setSelectedOrder(order)
    setOrderDetailOpen(true)
  }

  const handleRefreshOrders = () => {
    loadOrders()
  }

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const notifications = [
    { id: 1, message: "New order created successfully.", date: new Date().toLocaleDateString() },
    { id: 2, message: "Order status updated to Processing.", date: new Date().toLocaleDateString() },
    { id: 3, message: "Welcome to SwiftTrack dashboard!", date: new Date().toLocaleDateString() }
  ]

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false)
      }
    }
    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [notificationsOpen])

  const handleProfileClick = () => {
    navigate('/profile')
  }

  const handleLogout = () => {
    TokenManager.removeToken()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-foreground">SwiftTrack</span>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4 relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshOrders}
              disabled={isLoadingOrders}
              title="Refresh orders"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingOrders ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <div ref={notificationsRef} className="relative">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </Button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
                  <div className="p-4">
                    <h2 className="text-base font-bold mb-2">Recent Notifications</h2>
                    <ul className="space-y-3 mb-2 max-h-60 overflow-y-auto">
                      {notifications.map(n => (
                        <li key={n.id} className="border-b border-border pb-2 last:border-b-0 last:pb-0">
                          <div className="text-foreground">{n.message}</div>
                          <div className="text-xs text-muted-foreground">{n.date}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleProfileClick}
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1">
        {/* Main Content */}
        <main className="p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Order Management</h1>
                {orderError && (
                  <div className="flex items-center gap-2 text-destructive text-sm mt-1">
                    <AlertCircle className="w-4 h-4" />
                    {orderError}
                  </div>
                )}
              </div>
              <Button 
                variant="gradient"
                onClick={() => setCreateOrderOpen(true)}
                disabled={isLoadingOrders}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </Button>
            </div>

            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Loading your orders...</p>
                </div>
              </div>
            ) : (
              <OrdersTable 
                orders={orders}
                onOrderView={handleOrderView}
              />
            )}
          </div>
        </main>
      </div>

      <CreateOrderModal
        open={createOrderOpen}
        onOpenChange={setCreateOrderOpen}
        onOrderCreate={handleCreateOrder}
      />

      <OrderDetailModal
        open={orderDetailOpen}
        onOpenChange={setOrderDetailOpen}
        order={selectedOrder}
      />
    </div>
  )
}