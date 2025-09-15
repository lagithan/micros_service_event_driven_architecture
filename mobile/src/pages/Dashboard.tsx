import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package, CheckCircle, User, Truck, RefreshCw, Loader2 } from "lucide-react";
import DeliveryCard from "@/components/DeliveryCard";
import StatusBadge from "@/components/StatusBadge";
import ProofOfDeliveryModal from "@/components/ProofOfDeliveryModal";
import { useToast } from "@/hooks/use-toast";
import { DeliveryService, TokenManager, DeliveryOrder } from "@/lib/api";

interface Delivery {
  id: string;
  orderId: string;
  customerName?: string;
  address?: string;
  phone?: string;
  status: "select" | "picking_up" | "picked_up" | "delivering" | "delivered";
  estimatedTime?: string;
  items?: { name: string; quantity: number }[];
  notes?: string;
  deliveryPersonId?: string;
  deliveryPersonName?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Helper function to map backend status to frontend status
const mapDeliveryStatus = (backendStatus: string): "select" | "picking_up" | "picked_up" | "delivering" | "delivered" => {
  switch (backendStatus) {
    case 'Picking':
      return 'picking_up';
    case 'PickedUp':
      return 'picked_up';
    case 'Delivering':
      return 'delivering';
    case 'Delivered':
      return 'delivered';
    default:
      return 'select';
  }
};

// Helper function to map frontend status to backend status
const mapToBackendStatus = (frontendStatus: string): 'Picking' | 'PickedUp' | 'Delivering' | 'Delivered' => {
  switch (frontendStatus) {
    case 'picking_up':
      return 'Picking';
    case 'picked_up':
      return 'PickedUp';
    case 'delivering':
      return 'Delivering';
    case 'delivered':
      return 'Delivered';
    default:
      return 'Picking';
  }
};

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const driver = TokenManager.getDriver();
  const driverName = driver?.fullName || "Driver";
  
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [proofModalOpen, setProofModalOpen] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!TokenManager.isAuthenticated()) {
      navigate('/signin');
      return;
    }
  }, [navigate]);

  // Debug logging
  useEffect(() => {
    console.log('Dashboard mounted');
    console.log('Is authenticated:', TokenManager.isAuthenticated());
    console.log('Driver data:', TokenManager.getDriver());
    console.log('Deliveries:', deliveries);
    console.log('Is loading:', isLoading);
  }, [deliveries, isLoading]);

  // Temporary logout function for testing
  const handleLogout = () => {
    TokenManager.clearToken();
    navigate('/signin');
  };

  // Fetch deliveries from API
  const fetchDeliveries = useCallback(async () => {
    try {
      const response = await DeliveryService.getMyDeliveries();
      
      if (response.success && Array.isArray(response.data)) {
        // Transform backend delivery data to frontend format
        const transformedDeliveries: Delivery[] = (response.data as DeliveryOrder[]).map(delivery => ({
          id: delivery.orderId,
          orderId: delivery.orderId,
          customerName: delivery.customerName || "Customer",
          address: delivery.deliveryAddress || "Address not provided",
          phone: delivery.customerPhone || "",
          status: mapDeliveryStatus(delivery.deliveryStatus),
          estimatedTime: delivery.estimatedDeliveryTime,
          items: delivery.items || [],
          notes: delivery.notes,
          deliveryPersonId: delivery.deliveryPersonId,
          deliveryPersonName: delivery.deliveryPersonName,
          pickupAddress: delivery.pickupAddress,
          deliveryAddress: delivery.deliveryAddress,
          createdAt: delivery.createdAt,
          updatedAt: delivery.updatedAt
        }));
        
        setDeliveries(transformedDeliveries);
      } else if (response.success && !Array.isArray(response.data)) {
        // Handle single delivery response
        const singleDelivery = response.data as DeliveryOrder;
        const transformedDelivery: Delivery = {
          id: singleDelivery.orderId,
          orderId: singleDelivery.orderId,
          customerName: singleDelivery.customerName || "Customer",
          address: singleDelivery.deliveryAddress || "Address not provided",
          phone: singleDelivery.customerPhone || "",
          status: mapDeliveryStatus(singleDelivery.deliveryStatus),
          estimatedTime: singleDelivery.estimatedDeliveryTime,
          items: singleDelivery.items || [],
          notes: singleDelivery.notes,
          deliveryPersonId: singleDelivery.deliveryPersonId,
          deliveryPersonName: singleDelivery.deliveryPersonName,
          pickupAddress: singleDelivery.pickupAddress,
          deliveryAddress: singleDelivery.deliveryAddress,
          createdAt: singleDelivery.createdAt,
          updatedAt: singleDelivery.updatedAt
        };
        
        setDeliveries([transformedDelivery]);
      } else {
        // No deliveries or error
        setDeliveries([]);
        if (!response.success) {
          toast({
            title: "Error",
            description: response.message || "Failed to load deliveries",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      toast({
        title: "Connection Error",
        description: "Unable to load deliveries. Please try again.",
        variant: "destructive"
      });
      // Set some mock data if API fails for development
      setDeliveries([
        {
          id: "MOCK001",
          orderId: "MOCK001",
          customerName: "Sample Customer",
          address: "123 Sample Street, City",
          phone: "+1234567890",
          status: "select",
          estimatedTime: "30 mins",
          items: [{ name: "Sample Item", quantity: 1 }],
          notes: "This is mock data - API connection failed"
        }
      ]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  // Fetch deliveries on mount
  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const refreshDeliveries = async () => {
    setIsRefreshing(true);
    await fetchDeliveries();
  };

  const selectDeliveries = deliveries.filter(d => d.status === "select");
  const pickingUpDeliveries = deliveries.filter(d => d.status === "picking_up");
  const pickedUpDeliveries = deliveries.filter(d => d.status === "picked_up");
  const deliveringDeliveries = deliveries.filter(d => d.status === "delivering");
  const completedToday = deliveries.filter(d => d.status === "delivered").length;

  const updateDeliveryStatus = async (deliveryId: string, status: Delivery["status"]) => {
    try {
      const backendStatus = mapToBackendStatus(status);
      const response = await DeliveryService.updateStatus(deliveryId, backendStatus);
      
      if (response.success) {
        // Update local state
        setDeliveries(prev =>
          prev.map(d =>
            d.id === deliveryId ? { ...d, status } : d
          )
        );
        
        // Success message based on status
        const statusMessages = {
          picking_up: "Ready for pickup! Go to restaurant to pick up the order.",
          picked_up: "Order picked up! Now go for delivery.",
          delivering: "Delivering! En route to customer.",
          delivered: "Order delivered successfully!"
        };
        
        toast({ 
          title: "Status Updated!", 
          description: statusMessages[status] || "Status updated successfully"
        });
      } else {
        toast({
          title: "Update Failed",
          description: response.message || "Failed to update delivery status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Connection Error",
        description: "Unable to update status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSelectForPickup = (deliveryId: string) => {
    updateDeliveryStatus(deliveryId, "picking_up");
  };

  const handlePickedUp = (deliveryId: string) => {
    updateDeliveryStatus(deliveryId, "picked_up");
  };

  const handleGoForDelivery = (deliveryId: string) => {
    updateDeliveryStatus(deliveryId, "delivering");
  };

  const handleMarkDelivered = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setProofModalOpen(true);
  };

  const confirmDelivery = () => {
    if (selectedDelivery) {
      updateDeliveryStatus(selectedDelivery.id, "delivered");
      setProofModalOpen(false);
      setSelectedDelivery(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your deliveries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">SwiftTrack</h1>
                <p className="text-sm text-muted-foreground">Welcome, {driverName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshDeliveries}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Link to="/profile">
                <Button variant="outline" size="icon">
                  <User className="h-4 w-4" />
                </Button>
              </Link>
              {/* <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button> */}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ready for Pickup</p>
                  <p className="text-3xl font-bold">{selectDeliveries.length}</p>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold">{completedToday}</p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Select for Pickup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Select for Pickup
              <span className="text-sm font-normal text-muted-foreground">
                {selectDeliveries.length} items
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectDeliveries.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No orders to select</p>
              </div>
            ) : (
              selectDeliveries.map((delivery) => (
                <div key={delivery.id} className="border rounded-lg p-4 flex flex-col gap-2">
                  <div className="font-medium">Order #{delivery.id} - {delivery.customerName}</div>
                  <div className="text-sm text-muted-foreground">{delivery.address}</div>
                  <Button onClick={() => handleSelectForPickup(delivery.id)} variant="success">Select for Pickup</Button>
                  <div className="text-xs text-muted-foreground">Route: From restaurant to {delivery.address}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Picking Up */}
        {pickingUpDeliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Picking Up
                <span className="text-sm font-normal text-muted-foreground">
                  {pickingUpDeliveries.length} items
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pickingUpDeliveries.map((delivery) => (
                <div key={delivery.id} className="border rounded-lg p-4 flex flex-col gap-2">
                  <div className="font-medium">Order #{delivery.id} - {delivery.customerName}</div>
                  <div className="text-sm text-muted-foreground">{delivery.address}</div>
                  <Button onClick={() => handlePickedUp(delivery.id)} variant="success">Picked Up</Button>
                  <div className="text-xs text-muted-foreground">Route: From restaurant to {delivery.address}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Picked Up */}
        {pickedUpDeliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Picked Up
                <span className="text-sm font-normal text-muted-foreground">
                  {pickedUpDeliveries.length} items
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pickedUpDeliveries.map((delivery) => (
                <div key={delivery.id} className="border rounded-lg p-4 flex flex-col gap-2">
                  <div className="font-medium">Order #{delivery.id} - {delivery.customerName}</div>
                  <div className="text-sm text-muted-foreground">{delivery.address}</div>
                  <Button onClick={() => handleGoForDelivery(delivery.id)} variant="success">Go for Delivery</Button>
                  <div className="text-xs text-muted-foreground">Route: From restaurant to {delivery.address}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Delivering */}
        {deliveringDeliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Delivering
                <span className="text-sm font-normal text-muted-foreground">
                  {deliveringDeliveries.length} items
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {deliveringDeliveries.map((delivery) => (
                <div key={delivery.id} className="border rounded-lg p-4 flex flex-col gap-2">
                  <div className="font-medium">Order #{delivery.id} - {delivery.customerName}</div>
                  <div className="text-sm text-muted-foreground">{delivery.address}</div>
                  <Button onClick={() => handleMarkDelivered(delivery)} variant="success">Mark Delivered</Button>
                  <div className="text-xs text-muted-foreground">Route: From restaurant to {delivery.address}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}


        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deliveries.filter(d => d.status !== "pending").map((delivery) => (
              <div key={delivery.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">#{delivery.id}</span>
                    <StatusBadge status={delivery.status} />
                  </div>
                  <p className="font-medium">{delivery.customerName}</p>
                  <p className="text-sm text-muted-foreground">{delivery.address}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {delivery.items.length} items
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>

      {/* Proof of Delivery Modal */}
      <ProofOfDeliveryModal
        open={proofModalOpen}
        onOpenChange={setProofModalOpen}
        customerName={selectedDelivery?.customerName || ""}
        orderId={selectedDelivery?.id || ""}
        onConfirm={confirmDelivery}
      />
    </div>
  );
};

export default Dashboard;