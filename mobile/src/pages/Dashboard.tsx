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
  status: "pending" | "selected_for_pickup" | "pickedup_from_client" | "inwarehouse" | "pickedup_from_warehouse" | "delivered";
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
const mapDeliveryStatus = (backendStatus: string): "pending" | "selected_for_pickup" | "pickedup_from_client" | "inwarehouse" | "pickedup_from_warehouse" | "delivered" => {
  switch (backendStatus) {
    case 'Pending':
      return 'pending';
    case 'Selected_for_pickup':
      return 'selected_for_pickup';
    case 'Pickedup_from_client':
      return 'pickedup_from_client';
    case 'Inwarehouse':
      return 'inwarehouse';
    case 'Pickedup_from_warehouse':
      return 'pickedup_from_warehouse';
    case 'Delivered':
      return 'delivered';
    default:
      return 'pending';
  }
};

// Helper function to map frontend status to backend status
const mapToBackendStatus = (frontendStatus: string): 'Pending' | 'Selected_for_pickup' | 'Pickedup_from_client' | 'Inwarehouse' | 'Pickedup_from_warehouse' | 'Delivered' => {
  switch (frontendStatus) {
    case 'pending':
      return 'Pending';
    case 'selected_for_pickup':
      return 'Selected_for_pickup';
    case 'pickedup_from_client':
      return 'Pickedup_from_client';
    case 'inwarehouse':
      return 'Inwarehouse';
    case 'pickedup_from_warehouse':
      return 'Pickedup_from_warehouse';
    case 'delivered':
      return 'Delivered';
    default:
      return 'Pending';
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
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

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
      console.log('🔄 Fetching my deliveries...');
      const response = await DeliveryService.getMyDeliveries();
      console.log('📥 Raw deliveries response:', response);
      
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
      console.log('🔄 Fetching available orders...');
      const response = await DeliveryService.getAvailableOrders();
      console.log('📥 Raw available orders response:', response);
      
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
          status: "pending" as const,
          createdAt: order.createdAt || order.created_at
        }));
        
        console.log('✅ Transformed available orders:', transformedOrders);
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
  const selectedForPickupDeliveries = deliveries.filter(d => d.status === "selected_for_pickup");
  const pickedUpFromClientDeliveries = deliveries.filter(d => d.status === "pickedup_from_client");
  const inWarehouseDeliveries = deliveries.filter(d => d.status === "inwarehouse");
  const pickedUpFromWarehouseDeliveries = deliveries.filter(d => d.status === "pickedup_from_warehouse");
  const completedToday = deliveries.filter(d => d.status === "delivered").length;

  // Debug logging
  useEffect(() => {
    console.log('🔍 Data Analysis:');
    console.log('Available Orders:', selectDeliveries.length, selectDeliveries);
    console.log('Selected for Pickup:', selectedForPickupDeliveries.length, selectedForPickupDeliveries);
    console.log('Picked up from Client:', pickedUpFromClientDeliveries.length, pickedUpFromClientDeliveries);
    console.log('In Warehouse:', inWarehouseDeliveries.length, inWarehouseDeliveries);
    console.log('Out for Delivery:', pickedUpFromWarehouseDeliveries.length, pickedUpFromWarehouseDeliveries);
    console.log('Completed Today:', completedToday);
    console.log('All Deliveries:', deliveries.map(d => ({ id: d.id, orderId: d.orderId, status: d.status })));
  }, [selectDeliveries, selectedForPickupDeliveries, pickedUpFromClientDeliveries, inWarehouseDeliveries, pickedUpFromWarehouseDeliveries, completedToday, deliveries]);

  const updateDeliveryStatus = async (deliveryId: string, status: Delivery["status"]) => {
    setUpdatingStatus(deliveryId);
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
        
        // Refresh data to ensure UI is in sync
        await fetchAllData();
        
        // Success message based on status
        const statusMessages = {
          pending: "Order is pending assignment.",
          selected_for_pickup: "Selected for pickup! Go to client location.",
          pickedup_from_client: "Order picked up from client! Take to warehouse.",
          inwarehouse: "Order is now in warehouse storage.",
          pickedup_from_warehouse: "Order picked up from warehouse! Deliver to customer.",
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
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleSelectForPickup = async (orderId: string) => {
    try {
      console.log('🔄 Attempting to assign order:', orderId);
      console.log('🔄 Driver data:', TokenManager.getDriver());
      
      const response = await DeliveryService.assignOrder(orderId);
      
      console.log('✅ Assignment response:', response);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Order assigned successfully",
        });
        // Refresh data to update the UI
        await fetchAllData();
      } else {
        console.error('❌ Assignment failed:', response.message);
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

  const handlePickedUpFromClient = (deliveryId: string) => {
    updateDeliveryStatus(deliveryId, "pickedup_from_client");
  };

  const handleMoveToWarehouse = (deliveryId: string) => {
    updateDeliveryStatus(deliveryId, "inwarehouse");
  };

  const handlePickupFromWarehouse = (deliveryId: string) => {
    updateDeliveryStatus(deliveryId, "pickedup_from_warehouse");
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

        {/* Available Orders (Pending Status) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Available Orders
              <span className="text-sm font-normal text-muted-foreground">
                {selectDeliveries.length} items
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectDeliveries.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No orders available</p>
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
                      <StatusBadge status="pending" />
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

        {/* Selected for Pickup */}
        {selectedForPickupDeliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Selected for Pickup
                <span className="text-sm font-normal text-muted-foreground">
                  {selectedForPickupDeliveries.length} items
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedForPickupDeliveries.map((delivery) => (
                <Card key={delivery.id} className="border-2 border-dashed border-blue-300 bg-blue-50/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-blue-800">
                        Order #{delivery.orderId}
                      </h3>
                      <StatusBadge status="selected_for_pickup" />
                    </div>

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

                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium text-green-700">📍 Pickup Address:</span>
                        <p className="text-gray-600">{delivery.pickupAddress}</p>
                      </div>
                    </div>

                    {delivery.packageDetails && (
                      <div className="text-sm bg-gray-50 p-2 rounded border">
                        📦 {delivery.packageDetails}
                      </div>
                    )}

                    <Button 
                      onClick={() => handlePickedUpFromClient(delivery.id)} 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={updatingStatus === delivery.id}
                    >
                      {updatingStatus === delivery.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Updating...
                        </>
                      ) : (
                        "✅ Mark as Picked up from Client"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Picked up from Client */}
        {pickedUpFromClientDeliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Picked up from Client
                <span className="text-sm font-normal text-muted-foreground">
                  {pickedUpFromClientDeliveries.length} items
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pickedUpFromClientDeliveries.map((delivery) => (
                <Card key={delivery.id} className="border-2 border-dashed border-blue-200 bg-blue-50/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-blue-800">
                        Order #{delivery.orderId} - Transport to Warehouse
                      </h3>
                      <StatusBadge status="pickedup_from_client" />
                    </div>

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

                    <div className="space-y-2">
                      <p className="font-medium text-blue-700">🏢 Take to Warehouse</p>
                    </div>

                    {delivery.packageDetails && (
                      <div className="text-sm bg-gray-50 p-2 rounded border">
                        📦 {delivery.packageDetails}
                      </div>
                    )}

                    <Button 
                      onClick={() => handleMoveToWarehouse(delivery.id)} 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={updatingStatus === delivery.id}
                    >
                      {updatingStatus === delivery.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Moving...
                        </>
                      ) : (
                        "🏢 Move to Warehouse"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* In Warehouse */}
        {inWarehouseDeliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                In Warehouse
                <span className="text-sm font-normal text-muted-foreground">
                  {inWarehouseDeliveries.length} items
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {inWarehouseDeliveries.map((delivery) => (
                <Card key={delivery.id} className="border-2 border-solid border-blue-300 bg-blue-50/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-blue-800">
                        Order #{delivery.orderId} - Ready for Final Delivery
                      </h3>
                      <StatusBadge status="inwarehouse" />
                    </div>

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

                    <div className="space-y-2">
                      <p className="font-medium text-blue-700">🏁 Final Delivery to: {delivery.deliveryAddress}</p>
                    </div>

                    {delivery.packageDetails && (
                      <div className="text-sm bg-gray-50 p-2 rounded border">
                        📦 {delivery.packageDetails}
                      </div>
                    )}

                    {delivery.specialInstructions && (
                      <div className="text-sm bg-yellow-50 p-2 rounded border border-yellow-200">
                        ⚠️ {delivery.specialInstructions}
                      </div>
                    )}

                    <Button 
                      onClick={() => handlePickupFromWarehouse(delivery.id)} 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      � Pickup from Warehouse
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Picked up from Warehouse - Final Delivery */}
        {pickedUpFromWarehouseDeliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Out for Delivery
                <span className="text-sm font-normal text-muted-foreground">
                  {pickedUpFromWarehouseDeliveries.length} items
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pickedUpFromWarehouseDeliveries.map((delivery) => (
                <Card key={delivery.id} className="border-2 border-solid border-blue-400 bg-blue-50/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-blue-800">
                        Order #{delivery.orderId} - En Route to Customer
                      </h3>
                      <StatusBadge status="pickedup_from_warehouse" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">📥 Delivering to: {delivery.receiverName}</span>
                      </div>
                      {delivery.phone && (
                        <p className="text-sm text-gray-600">📞 {delivery.phone}</p>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <p className="font-medium text-blue-700">🏁 Address: {delivery.deliveryAddress}</p>
                    </div>

                    {delivery.packageDetails && (
                      <div className="text-sm bg-gray-50 p-2 rounded border">
                        📦 {delivery.packageDetails}
                      </div>
                    )}

                    {delivery.specialInstructions && (
                      <div className="text-sm bg-yellow-50 p-2 rounded border border-yellow-200">
                        ⚠️ {delivery.specialInstructions}
                      </div>
                    )}

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