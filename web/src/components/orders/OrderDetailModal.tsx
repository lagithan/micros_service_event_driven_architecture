import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import RouteDisplay from "./RouteDisplay";
import {
  Package,
  MapPin,
  Phone,
  Calendar,
  DollarSign,
  User,
  Copy,
  Navigation,
  RefreshCw,
} from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
}

interface Order {
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
  items?: OrderItem[];
  paymentStatus?: "Paid" | "Pending";
  pickupAddress?: string;
  destinationAddress?: string;
  packageDetails?: string;
  specialInstructions?: string;
  orderStatus?: string;
}

interface RouteData {
  success: boolean;
  address: string;
  route: string;
  estimatedTime: string;
  distance: string;
  instructions: string[];
  timestamp: string;
}

interface OrderDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

export default function OrderDetailModal({
  open,
  onOpenChange,
  order,
}: OrderDetailModalProps) {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Processing":
        return "bg-warning text-warning-foreground";
      case "In Transit":
        return "bg-primary text-primary-foreground";
      case "Delivered":
        return "bg-success text-success-foreground";
      case "Delayed":
        return "bg-destructive text-destructive-foreground";
      case "Cancelled":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive text-destructive-foreground";
      case "express":
        return "bg-warning text-warning-foreground";
      case "standard":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case "Paid":
        return "bg-success text-success-foreground";
      case "Pending":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        console.log(`${type} copied to clipboard:`, text);
      })
      .catch((err) => {
        console.error("Failed to copy to clipboard:", err);
      });
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const fetchRoute = async (address: string) => {
    setLoadingRoute(true);
    setRouteError(null);
    try {
      // Call the ROS adapter service via the API gateway
      const response = await fetch("http://localhost:5000/api/ros/route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setRouteData(data);
      } else {
        setRouteError(data.message || "Failed to get route");
      }
    } catch (error) {
      console.error("Error fetching route:", error);
      setRouteError(error instanceof Error ? error.message : "Failed to fetch route");
    } finally {
      setLoadingRoute(false);
    }
  };

  // Fetch route when order changes and has a destination
  useEffect(() => {
    if (order && open) {
      const address = order.destinationAddress || order.destination;
      if (address) {
        fetchRoute(address);
      }
    } else {
      setRouteData(null);
      setRouteError(null);
    }
  }, [order, open]);

  if (!order) return null;

  const handleRefreshRoute = () => {
    const address = order.destinationAddress || order.destination;
    if (address) {
      fetchRoute(address);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Order Details - {order.id}
          </DialogTitle>
          <DialogDescription>
            Complete information for order {order.id}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Order Information */}
          <div className="space-y-4">
            {/* Basic Order Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Order ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{order.id}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(order.id, "Order ID")}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {order.trackingNumber && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Tracking:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{order.trackingNumber}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() =>
                          copyToClipboard(order.trackingNumber!, "Tracking number")
                        }
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>

                {order.priority && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Priority:</span>
                    <Badge
                      variant="outline"
                      className={getPriorityColor(order.priority)}
                    >
                      {order.priority}
                    </Badge>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-sm font-medium">Payment:</span>
                  <Badge
                    className={getPaymentStatusColor(
                      order.paymentStatus || "Pending"
                    )}
                  >
                    {order.paymentStatus || "Pending"}
                  </Badge>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm font-medium">Value:</span>
                  <span className="text-sm font-medium">
                    ${order.estimatedValue?.toFixed(2) || "0.00"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm font-medium">Created:</span>
                  <span className="text-sm">{formatDate(order.createdAt)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Sender:</span>
                  <span className="text-sm">{order.customerName}</span>
                </div>

                {order.receiverName && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Receiver:</span>
                    <span className="text-sm">{order.receiverName}</span>
                  </div>
                )}

                {order.receiverPhone && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Phone:</span>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      <span className="text-sm">{order.receiverPhone}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Addresses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Addresses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.pickupAddress && (
                  <div>
                    <span className="text-sm font-medium">Pickup Address:</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {order.pickupAddress}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-sm font-medium">Destination:</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {order.destinationAddress || order.destination}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Package Details */}
            {(order.packageDetails || order.specialInstructions || order.items) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Package Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.packageDetails && (
                    <div>
                      <span className="text-sm font-medium">Details:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.packageDetails}
                      </p>
                    </div>
                  )}

                  {order.specialInstructions && (
                    <div>
                      <span className="text-sm font-medium">
                        Special Instructions:
                      </span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.specialInstructions}
                      </p>
                    </div>
                  )}

                  {order.items && order.items.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">Items:</span>
                      <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                        {order.items.map((item) => (
                          <li key={item.id}>
                            {item.quantity}x {item.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Route Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Route Information</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshRoute}
                disabled={loadingRoute}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingRoute ? 'animate-spin' : ''}`} />
                Refresh Route
              </Button>
            </div>

            {loadingRoute && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-6">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading route information...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {routeError && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-6 text-destructive">
                    <Navigation className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Error loading route: {routeError}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!loadingRoute && !routeError && (
              <RouteDisplay
                routeData={routeData}
                address={order.destinationAddress || order.destination}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}