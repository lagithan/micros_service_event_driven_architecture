import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface StatusBadgeProps {
  status: "select" | "picking_up" | "picked_up" | "delivering" | "delivered";
  className?: string;
}

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const statusConfig = {
    select: {
      label: "Ready for Pickup",
      variant: "default" as const,
      icon: Clock,
      customClass: "bg-blue-100 text-blue-800 border-blue-200"
    },
    picking_up: {
      label: "Picking Up",
      variant: "default" as const,
      icon: Clock,
      customClass: "bg-blue-200 text-blue-900 border-blue-300"
    },
    picked_up: {
      label: "Picked Up",
      variant: "secondary" as const,
      icon: CheckCircle,
      customClass: "bg-blue-300 text-blue-900 border-blue-400"
    },
    delivering: {
      label: "Delivering",
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