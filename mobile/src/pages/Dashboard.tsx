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
  receiverName?: string;
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
  packageDetails?: string;
  specialInstructions?: string;
  estimatedDeliveryDate?: string;
  createdAt?: string;
  updatedAt?: string;
  cashPaid?: boolean;
}

// Interface for backend delivery data from getMyDeliveries API
interface BackendDeliveryData {
  order_id: string;
  sender_name: string;
  receiver_name?: string;
  receiver_phone?: string;
  pickup_address?: string;
  destination_address?: string;
  package_details?: string;
  special_instructions?: string;
  estimated_delivery_date?: string;
  actual_pickup_date?: string;
  actual_delivery_date?: string;
  order_status: string;
  driver_id?: number;
  delivery_person_id: number;
  delivery_person_name: string;
  delivery_status: string;
  pickedup_date?: string;
  delivered_date?: string;
  cash_paid?: boolean;
}

// Interface for backend order data from available orders API
interface BackendOrderData {
  id: string;
  orderId: string;
  customerName?: string;
  sender_name?: string;
  receiverName?: string;
  receiver_name?: string;
  receiverPhone?: string;
  receiver_phone?: string;
  pickupAddress?: string;
  pickup_address?: string;
  deliveryAddress?: string;
  destination_address?: string;
  packageDetails?: string;
  package_details?: string;
  specialInstructions?: string;
  special_instructions?: string;
  estimatedDeliveryDate?: string;
  estimated_delivery_date?: string;
  createdAt?: string;
  created_at?: string;
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
  const [availableOrders, setAvailableOrders] = useState<Delivery[]>([]);
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
    TokenManager.removeToken();
    navigate('/signin');
  };

  // Fetch assigned deliveries from API
  const fetchDeliveries = useCallback(async () => {
    try {
      const response = await DeliveryService.getMyDeliveries();
      
      if (response.success && Array.isArray(response.data)) {
        // Transform backend delivery data from our new API structure
        const transformedDeliveries: Delivery[] = (response.data as unknown as BackendDeliveryData[]).map((delivery: BackendDeliveryData) => ({
          id: delivery.order_id,
          orderId: delivery.order_id,
          customerName: delivery.sender_name || "Customer",
          receiverName: delivery.receiver_name,
          phone: delivery.receiver_phone,
          address: delivery.destination_address,
          pickupAddress: delivery.pickup_address,
          deliveryAddress: delivery.destination_address,
          packageDetails: delivery.package_details,
          specialInstructions: delivery.special_instructions,
          estimatedDeliveryDate: delivery.estimated_delivery_date,
          status: mapDeliveryStatus(delivery.delivery_status), // Use delivery_status from order_delivery_table
          deliveryPersonId: delivery.delivery_person_id?.toString(),
          deliveryPersonName: delivery.delivery_person_name,
          createdAt: delivery.actual_pickup_date,
          updatedAt: delivery.actual_delivery_date,
          cashPaid: delivery.cash_paid || false,
          items: [] // Will need to populate this if needed
        }));
        
        console.log('✅ Transformed deliveries:', transformedDeliveries);
        setDeliveries(transformedDeliveries);
      } else if (response.success && !Array.isArray(response.data)) {
        console.log('📋 Single delivery response:', response.data);
        setDeliveries([]);
      } else {
        // No deliveries or error
        console.log('❌ No deliveries found or error:', response.message);
        setDeliveries([]);
        if (!response.success && response.message !== 'No deliveries found') {
          toast({
            title: "Error",
            description: response.message || "Failed to load deliveries",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      setDeliveries([]);
    }
  }, [toast]);

  // Fetch available orders for pickup
  const fetchAvailableOrders = useCallback(async () => {
    try {
      const response = await DeliveryService.getAvailableOrders();
      
      if (response.success && Array.isArray(response.data)) {
        // Transform the backend data to match our frontend interface
        const transformedOrders: Delivery[] = response.data.map((order: BackendOrderData) => ({
          id: order.id || order.orderId,
          orderId: order.orderId || order.id,
          customerName: order.customerName || order.sender_name || 'Unknown Sender',
          receiverName: order.receiverName || order.receiver_name,
          phone: order.receiverPhone || order.receiver_phone,
          address: order.deliveryAddress || order.destination_address,
          pickupAddress: order.pickupAddress || order.pickup_address,
          deliveryAddress: order.deliveryAddress || order.destination_address,
          packageDetails: order.packageDetails || order.package_details,
          specialInstructions: order.specialInstructions || order.special_instructions,
          estimatedDeliveryDate: order.estimatedDeliveryDate || order.estimated_delivery_date,
          status: "select" as const,
          createdAt: order.createdAt || order.created_at
        }));
        
        setAvailableOrders(transformedOrders);
      } else if (response.success && !Array.isArray(response.data)) {
        console.log('Available orders API returned non-array data:', response.data);
        setAvailableOrders([]);
      } else {
        console.error('Available orders API request failed:', response.message);
        setAvailableOrders([]);
        // Don't show error toast if no orders available
        if (!response.message.includes('No available orders')) {
          toast({
            title: "Error",
            description: response.message || "Failed to load available orders",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error fetching available orders:', error);
      toast({
        title: "Connection Error",
        description: "Unable to load available orders. Please try again.",
        variant: "destructive"
      });
      setAvailableOrders([]);
    }
  }, [toast]);

  // Combined fetch function
  const fetchAllData = useCallback(async () => {
    try {
      await Promise.all([
        fetchDeliveries(),
        fetchAvailableOrders()
      ]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchDeliveries, fetchAvailableOrders]);

  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const refreshDeliveries = async () => {
    setIsRefreshing(true);
    await fetchAllData();
  };

  const selectDeliveries = availableOrders; // Use available orders for selection
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

  const handleSelectForPickup = async (orderId: string) => {
    try {
      const response = await DeliveryService.assignOrder(orderId);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Order assigned successfully",
        });
        // Refresh data to update the UI
        await fetchAllData();
      } else {
        toast({
          title: "Assignment Failed",
          description: response.message || "Failed to assign order",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error assigning order:', error);
      toast({
        title: "Connection Error",
        description: "Unable to assign order. Please try again.",
        variant: "destructive"
      });
    }
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

  const handleMarkAsPaid = async (delivery: Delivery) => {
    try {
      const response = await DeliveryService.updateCashPaymentStatus(delivery.orderId, true);
      if (response.success) {
        toast({
          title: "Payment Confirmed",
          description: `Order ${delivery.orderId} marked as paid successfully.`,
        });
        // Refresh deliveries to show updated payment status
        fetchDeliveries();
      } else {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status.",
        variant: "destructive",
      });
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 border-b shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-800 rounded-full flex items-center justify-center">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">SwiftTrack</h1>
                <p className="text-sm text-blue-100">Welcome, {driverName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* <Button
                variant="outline"
                size="sm"
                onClick={refreshDeliveries}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button> */}
              <Link to="/profile">
                <Button variant="outline" size="icon" className="border-white/30 bg-white/10 hover:bg-white/20 text-white">
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
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Ready for Pickup</p>
                  <p className="text-3xl font-bold text-blue-800">{selectDeliveries.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Completed Today</p>
                  <p className="text-3xl font-bold text-blue-800">{completedToday}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
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
                <Card key={delivery.id} className="border-2 border-dashed border-blue-300 bg-blue-50/50">
                  <CardContent className="p-4 space-y-3">
                    {/* Header with Order ID */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-blue-800">
                        Order #{delivery.orderId}
                      </h3>
                      <StatusBadge status="select" />
                    </div>

                    {/* Sender & Receiver Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">📤 Sender</h4>
                        <p className="font-medium">{delivery.customerName}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">📥 Receiver</h4>
                        <div>
                          <p className="font-medium">{delivery.receiverName || 'Not specified'}</p>
                          {delivery.phone && (
                            <p className="text-sm text-gray-600">📞 {delivery.phone}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Route Information */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">🚛 Route Information</h4>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">PICKUP FROM</p>
                            <p className="font-medium text-sm">{delivery.pickupAddress || 'Pickup location not specified'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 mt-2"></div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">DELIVER TO</p>
                            <p className="font-medium text-sm">{delivery.deliveryAddress || delivery.address || 'Delivery address not specified'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Package Details */}
                    {delivery.packageDetails && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">📦 Package Details</h4>
                          <p className="text-sm bg-gray-50 p-3 rounded-md border">{delivery.packageDetails}</p>
                        </div>
                      </>
                    )}

                    {/* Special Instructions */}
                    {delivery.specialInstructions && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">⚠️ Special Instructions</h4>
                          <p className="text-sm bg-yellow-50 p-3 rounded-md border border-yellow-200 text-yellow-800">
                            {delivery.specialInstructions}
                          </p>
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* Action Button */}
                    <div className="pt-2">
                      <Button 
                        onClick={() => handleSelectForPickup(delivery.id)} 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        size="lg"
                      >
                        ✅ Select for Pickup
                      </Button>
                    </div>

                    {/* Estimated Delivery Time */}
                    {delivery.estimatedDeliveryDate && (
                      <div className="text-xs text-gray-500 text-center">
                        Estimated delivery: {new Date(delivery.estimatedDeliveryDate).toLocaleString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
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
                <Card key={delivery.id} className="border-2 border-dashed border-blue-300 bg-blue-50/50">
                  <CardContent className="p-4 space-y-3">
                    {/* Header with Order ID */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-blue-800">
                        Order #{delivery.orderId}
                      </h3>
                      <StatusBadge status="picking_up" />
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">📤 From: {delivery.customerName}</span>
                        <span className="text-sm font-medium text-gray-700">📥 To: {delivery.receiverName}</span>
                      </div>
                      {delivery.phone && (
                        <p className="text-sm text-gray-600">📞 {delivery.phone}</p>
                      )}
                    </div>

                    <Separator />

                    {/* Addresses */}
                    <div className="space-y-2">
                      <div className="text-sm">
                        <p className="font-medium text-green-700">📍 Pickup: {delivery.pickupAddress}</p>
                        <p className="font-medium text-red-700">🏁 Deliver: {delivery.deliveryAddress}</p>
                      </div>
                    </div>

                    {/* Package Details */}
                    {delivery.packageDetails && (
                      <div className="text-sm bg-gray-50 p-2 rounded border">
                        📦 {delivery.packageDetails}
                      </div>
                    )}

                    {/* Action Button */}
                    <Button 
                      onClick={() => handlePickedUp(delivery.id)} 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      ✅ Mark as Picked Up
                    </Button>
                  </CardContent>
                </Card>
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
                <Card key={delivery.id} className="border-2 border-dashed border-blue-200 bg-blue-50/50">
                  <CardContent className="p-4 space-y-3">
                    {/* Header with Order ID */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-blue-800">
                        Order #{delivery.orderId} - Ready for Delivery
                      </h3>
                      <StatusBadge status="picked_up" />
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">📤 From: {delivery.customerName}</span>
                        <span className="text-sm font-medium text-gray-700">📥 To: {delivery.receiverName}</span>
                      </div>
                      {delivery.phone && (
                        <p className="text-sm text-gray-600">📞 {delivery.phone}</p>
                      )}
                    </div>

                    <Separator />

                    {/* Delivery Address */}
                    <div className="space-y-2">
                      <p className="font-medium text-red-700">🏁 Deliver to: {delivery.deliveryAddress}</p>
                    </div>

                    {/* Package Details */}
                    {delivery.packageDetails && (
                      <div className="text-sm bg-gray-50 p-2 rounded border">
                        📦 {delivery.packageDetails}
                      </div>
                    )}

                    {/* Special Instructions */}
                    {delivery.specialInstructions && (
                      <div className="text-sm bg-yellow-50 p-2 rounded border border-yellow-200">
                        ⚠️ {delivery.specialInstructions}
                      </div>
                    )}

                    {/* Action Button */}
                    <Button 
                      onClick={() => handleGoForDelivery(delivery.id)} 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      🚚 Start Delivery
                    </Button>
                  </CardContent>
                </Card>
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
                <Card key={delivery.id} className="border-2 border-solid border-blue-400 bg-blue-50/50">
                  <CardContent className="p-4 space-y-3">
                    {/* Header with Order ID */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-blue-800">
                        Order #{delivery.orderId} - En Route
                      </h3>
                      <StatusBadge status="delivering" />
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">📥 Delivering to: {delivery.receiverName}</span>
                      </div>
                      {delivery.phone && (
                        <p className="text-sm text-gray-600">📞 {delivery.phone}</p>
                      )}
                    </div>

                    <Separator />

                    {/* Delivery Address */}
                    <div className="space-y-2">
                      <p className="font-medium text-blue-700">🏁 Address: {delivery.deliveryAddress}</p>
                    </div>

                    {/* Package Details */}
                    {delivery.packageDetails && (
                      <div className="text-sm bg-gray-50 p-2 rounded border">
                        📦 {delivery.packageDetails}
                      </div>
                    )}

                    {/* Special Instructions */}
                    {delivery.specialInstructions && (
                      <div className="text-sm bg-yellow-50 p-2 rounded border border-yellow-200">
                        ⚠️ {delivery.specialInstructions}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button 
                        onClick={() => handleMarkDelivered(delivery)} 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        ✅ Mark as Delivered
                      </Button>
                      <Button 
                        onClick={() => handleMarkAsPaid(delivery)}
                        className="w-full bg-blue-500 hover:bg-blue-600"
                        variant="outline"
                      >
                        💵 Mark as Paid
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
            {deliveries.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              deliveries.map((delivery) => (
                <Card key={`activity-${delivery.id}-${delivery.orderId}`} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        {/* Order Header */}
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-base">Order #{delivery.orderId}</h4>
                          <StatusBadge status={delivery.status} />
                          {delivery.status === "delivered" && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              delivery.cashPaid 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {delivery.cashPaid ? '💵 Paid' : '💰 Unpaid'}
                            </span>
                          )}
                        </div>
                        
                        {/* Customer Info */}
                        <div className="text-sm text-gray-600">
                          <p>📤 From: {delivery.customerName}</p>
                          <p>📥 To: {delivery.receiverName}</p>
                          {delivery.phone && <p>📞 {delivery.phone}</p>}
                        </div>

                        {/* Address */}
                        <div className="text-sm">
                          <p className="text-gray-700">🏁 {delivery.deliveryAddress}</p>
                        </div>

                        {/* Package Details */}
                        {delivery.packageDetails && (
                          <div className="text-sm bg-gray-50 px-2 py-1 rounded">
                            📦 {delivery.packageDetails}
                          </div>
                        )}

                        {/* Timestamps */}
                        <div className="text-xs text-gray-500">
                          {delivery.createdAt && (
                            <p>Assigned: {new Date(delivery.createdAt).toLocaleString()}</p>
                          )}
                          {delivery.updatedAt && (
                            <p>Last updated: {new Date(delivery.updatedAt).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
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