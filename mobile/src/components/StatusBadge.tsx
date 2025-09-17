import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface StatusBadgeProps {
  status: "pending" | "selected_for_pickup" | "pickedup_from_client" | "inwarehouse" | "pickedup_from_warehouse" | "delivered";
  className?: string;
}

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const statusConfig = {
    pending: {
      label: "Pending",
      variant: "default" as const,
      icon: Clock,
      customClass: "bg-gray-100 text-gray-800 border-gray-200"
    },
    selected_for_pickup: {
      label: "Selected for Pickup",
      variant: "default" as const,
      icon: Clock,
      customClass: "bg-blue-100 text-blue-800 border-blue-200"
    },
    pickedup_from_client: {
      label: "Picked up from Client",
      variant: "default" as const,
      icon: CheckCircle,
      customClass: "bg-blue-200 text-blue-900 border-blue-300"
    },
    inwarehouse: {
      label: "In Warehouse",
      variant: "secondary" as const,
      icon: CheckCircle,
      customClass: "bg-blue-300 text-blue-900 border-blue-400"
    },
    pickedup_from_warehouse: {
      label: "Picked up from Warehouse",
      variant: "default" as const,
      icon: Clock,
      customClass: "bg-blue-400 text-white border-blue-500"
    },
    delivered: {
      label: "Delivered",
      variant: "success" as const,
      icon: CheckCircle,
      customClass: "bg-blue-600 text-white border-blue-700"
    },
  };

  const config = statusConfig[status];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center gap-1 ${config.customClass} ${className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export default StatusBadge;