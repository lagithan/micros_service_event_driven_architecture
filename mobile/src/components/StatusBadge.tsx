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
      variant: "warning" as const,
      icon: Clock,
    },
    picking_up: {
      label: "Picking Up",
      variant: "default" as const,
      icon: Clock,
    },
    picked_up: {
      label: "Picked Up",
      variant: "secondary" as const,
      icon: CheckCircle,
    },
    delivering: {
      label: "Delivering",
      variant: "default" as const,
      icon: Clock,
    },
    delivered: {
      label: "Delivered",
      variant: "success" as const,
      icon: CheckCircle,
    },
  };

  const config = statusConfig[status];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`flex items-center gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export default StatusBadge;