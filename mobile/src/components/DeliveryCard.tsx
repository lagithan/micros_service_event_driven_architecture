import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Clock, Package } from "lucide-react";
import StatusBadge from "./StatusBadge";

interface DeliveryItem {
  name: string;
  quantity: number;
}

interface DeliveryCardProps {
  orderId: string;
  customerName: string;
  address: string;
  phone: string;
  estimatedTime?: string;
  status: "delivered" | "pending" | "picked" | "ongoing";
  items?: DeliveryItem[];
  notes?: string;
  onMarkDelivered?: () => void;
  onPickUp?: () => void;
  showNavigation?: boolean;
  isActive?: boolean;
}

const DeliveryCard = ({
  orderId,
  customerName,
  address,
  phone,
  estimatedTime,
  status,
  items = [],
  notes,
  onMarkDelivered,
  onPickUp,
  showNavigation = false,
  isActive = false,
}: DeliveryCardProps) => {
  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${isActive ? "ring-2 ring-primary" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-muted-foreground">#{orderId}</span>
              <StatusBadge status={status} />
            </div>
            <h3 className="font-semibold text-lg">{customerName}</h3>
          </div>
          {estimatedTime && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {estimatedTime}
            </div>
          )}
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="text-sm text-muted-foreground">{address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{phone}</span>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{items.length} items</span>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Items to Deliver:</h4>
            <div className="space-y-1">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="text-muted-foreground">×{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {notes && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Notes:</span> {notes}
            </p>
          </div>
        )}

        {showNavigation && status === "ongoing" && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 text-primary font-medium text-sm mb-2">
              <MapPin className="h-4 w-4" />
              Navigate to Customer
            </div>
            <p className="text-sm text-muted-foreground">
              Follow GPS directions to deliver to: {address}
            </p>
          </div>
        )}

        {status === "pending" && onPickUp && (
          <div className="flex gap-2 pt-2">
            <Button onClick={onPickUp} size="sm" className="flex-1">
              Pick Up Order
            </Button>
          </div>
        )}

        {status === "ongoing" && onMarkDelivered && (
          <div className="flex gap-2 pt-2">
            <Button onClick={onMarkDelivered} size="sm" className="flex-1">
              Mark as Delivered
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryCard;