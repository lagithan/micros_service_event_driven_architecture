import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package, CheckCircle, User, Truck } from "lucide-react";
import DeliveryCard from "@/components/DeliveryCard";
import StatusBadge from "@/components/StatusBadge";
import ProofOfDeliveryModal from "@/components/ProofOfDeliveryModal";
import { useToast } from "@/hooks/use-toast";

interface Delivery {
  id: string;
  customerName: string;
  address: string;
  phone: string;
  status: "select" | "picking_up" | "picked_up" | "delivering" | "delivered";
  estimatedTime?: string;
  items: { name: string; quantity: number }[];
  notes?: string;
}

const Dashboard = () => {
  const { toast } = useToast();
  const driverName = localStorage.getItem("driverName") || "John Driver";
  
  const [deliveries, setDeliveries] = useState<Delivery[]>([
    {
      id: "ORD001",
      customerName: "Alice Johnson",
      address: "123 Main St, Apt 4B, New York, NY 10001",
      phone: "+1234567890",
      status: "select",
      estimatedTime: "30 mins",
      items: [
        { name: "Pizza Margherita", quantity: 1 },
        { name: "Coca Cola", quantity: 2 }
      ],
      notes: "Ring doorbell twice"
    },
    {
      id: "ORD002", 
      customerName: "Bob Smith",
      address: "456 Oak Ave, Brooklyn, NY 11201",
      phone: "+1987654321",
      status: "select",
      estimatedTime: "25 mins",
      items: [
        { name: "Burger Combo", quantity: 1 }
      ]
    },
    {
      id: "ORD003",
      customerName: "Carol Davis",
      address: "789 Pine Rd, Queens, NY 11355",
      phone: "+1122334455",
      status: "delivered",
      items: [
        { name: "Sushi Set", quantity: 1 },
        { name: "Green Tea", quantity: 1 }
      ]
    }
  ]);

  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  const selectDeliveries = deliveries.filter(d => d.status === "select");
  const pickingUpDeliveries = deliveries.filter(d => d.status === "picking_up");
  const pickedUpDeliveries = deliveries.filter(d => d.status === "picked_up");
  const deliveringDeliveries = deliveries.filter(d => d.status === "delivering");
  const completedToday = deliveries.filter(d => d.status === "delivered").length;

  const updateDeliveryStatus = (deliveryId: string, status: Delivery["status"]) => {
    setDeliveries(prev =>
      prev.map(d =>
        d.id === deliveryId ? { ...d, status } : d
      )
    );
  };

  const handleSelectForPickup = (deliveryId: string) => {
    updateDeliveryStatus(deliveryId, "picking_up");
    toast({ title: "Ready for pickup!", description: "Go to restaurant to pick up the order." });
  };

  const handlePickedUp = (deliveryId: string) => {
    updateDeliveryStatus(deliveryId, "picked_up");
    toast({ title: "Order picked up!", description: "Now go for delivery." });
  };

  const handleGoForDelivery = (deliveryId: string) => {
    updateDeliveryStatus(deliveryId, "delivering");
    toast({ title: "Delivering!", description: "En route to customer." });
  };

  const handleMarkDelivered = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setProofModalOpen(true);
  };

  const confirmDelivery = () => {
    if (selectedDelivery) {
      updateDeliveryStatus(selectedDelivery.id, "delivered");
      toast({ title: "Delivery confirmed!", description: `Successfully delivered order ${selectedDelivery.id}` });
    }
    setSelectedDelivery(null);
  };

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
            <Link to="/profile">
              <Button variant="outline" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </Link>
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