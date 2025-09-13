import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import CreateOrderModal from '@/components/orders/CreateOrderModal'
import OrdersTable from '@/components/orders/OrdersTable'
import { 
  Truck, 
  Package, 
  Bell, 
  Plus,
  User,
  LogOut
} from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const [selectedTab, setSelectedTab] = useState("orders")
  const [createOrderOpen, setCreateOrderOpen] = useState(false)
  const [orders, setOrders] = useState([
    {
      id: "ORD-2024-001",
      customerName: "TechStore Ltd",
      status: "In Transit",
      destination: "Colombo",
      estimatedValue: 1250,
      createdAt: "2024-01-15T10:30:00Z",
      priority: "express",
      items: [{ name: "Electronics", quantity: 2 }]
    },
    {
      id: "ORD-2024-002", 
      customerName: "Fashion Hub",
      status: "Processing",
      destination: "Kandy",
      estimatedValue: 890,
      createdAt: "2024-01-15T14:20:00Z",
      priority: "standard",
      items: [{ name: "Clothing", quantity: 5 }]
    },
    {
      id: "ORD-2024-003",
      customerName: "Digital World",
      status: "Delivered",
      destination: "Galle",
      estimatedValue: 2100,
      createdAt: "2024-01-14T09:15:00Z",
      priority: "urgent",
      items: [{ name: "Gadgets", quantity: 3 }]
    }
  ])

  const handleCreateOrder = (newOrder: any) => {
    setOrders(prev => [newOrder, ...prev])
  }

  const handleOrderView = (order: any) => {
    console.log('View order:', order)
    // TODO: Implement order detail modal
  }

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const notifications = [
    { id: 1, message: "Order ORD-2024-004 has been shipped.", date: "2024-01-16" },
    { id: 2, message: "Invoice INV-2024-001 is ready for download.", date: "2024-01-15" },
    { id: 3, message: "Order ORD-2024-003 delivered successfully.", date: "2024-01-14" }
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
              <h1 className="text-3xl font-bold text-foreground">Order Management</h1>
              <Button 
                variant="gradient"
                onClick={() => setCreateOrderOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </Button>
            </div>

            <OrdersTable 
              orders={orders}
              onOrderView={handleOrderView}
            />
          </div>
        </main>
      </div>

      <CreateOrderModal
        open={createOrderOpen}
        onOpenChange={setCreateOrderOpen}
        onOrderCreate={handleCreateOrder}
      />
    </div>
  )
}