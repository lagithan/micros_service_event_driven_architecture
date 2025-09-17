import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Package,
  ChevronLeft,
  ChevronRight,
  Eye,
  Copy,
  Plus,
} from "lucide-react";

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
  items?: any[];
  paymentStatus?: "paid" | "unpaid" | "pending";
  pickupAddress?: string;
  destinationAddress?: string;
  packageDetails?: string;
  specialInstructions?: string;
  orderStatus?: string;
}

interface OrdersTableProps {
  orders: Order[];
  onOrderView?: (order: Order) => void;
}

export default function OrdersTable({ orders, onOrderView }: OrdersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      case "paid":
        return "bg-success text-success-foreground";
      case "unpaid":
        return "bg-destructive text-destructive-foreground";
      case "pending":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // You could add a toast notification here
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
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.receiverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Reset to first page when filters change
  useState(() => {
    setCurrentPage(1);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Order Management ({orders.length} total)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search orders, customers, destinations, or tracking numbers..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="In Transit">In Transit</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
              <SelectItem value="Delayed">Delayed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Order Details</TableHead>
                <TableHead>Customer & Receiver</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{order.id}</div>
                      {order.trackingNumber && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {order.trackingNumber}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() =>
                              copyToClipboard(
                                order.trackingNumber!,
                                "Tracking number"
                              )
                            }
                            title="Copy tracking number"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      {order.items && order.items.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {order.items.length} item
                          {order.items.length !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">
                        {order.customerName}
                      </div>
                      {order.receiverName &&
                        order.receiverName !== order.customerName && (
                          <div className="text-xs text-muted-foreground">
                            To: {order.receiverName}
                          </div>
                        )}
                      {order.receiverPhone && (
                        <div className="text-xs text-muted-foreground">
                          📞 {order.receiverPhone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <div>{order.destination}</div>
                        {order.destinationAddress &&
                          order.destinationAddress !== order.destination && (
                            <div
                              className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate"
                              title={order.destinationAddress}
                            >
                              {order.destinationAddress}
                            </div>
                          )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.priority && (
                      <Badge
                        variant="outline"
                        className={getPriorityColor(order.priority)}
                      >
                        {order.priority}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    ${order.estimatedValue?.toFixed(2) || "0.00"}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {formatDate(order.createdAt)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(order.createdAt)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={getPaymentStatusColor(
                        order.paymentStatus || "unpaid"
                      )}
                    >
                      {order.paymentStatus === "paid"
                        ? "Paid"
                        : order.paymentStatus === "pending"
                        ? "Pending"
                        : "COD"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOrderView?.(order)}
                      title="View order details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to{" "}
              {Math.min(startIndex + itemsPerPage, filteredOrders.length)} of{" "}
              {filteredOrders.length} orders
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {orders.length === 0 ? "No orders yet" : "No orders found"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {orders.length === 0
                ? "Create your first order to get started with deliveries"
                : searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "No orders match your current filters"}
            </p>
            {orders.length === 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  // This would typically trigger the create order modal
                  console.log("Create first order clicked");
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Order
              </Button>
            )}
          </div>
        )}

        {/* Summary Stats */}
        {orders.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {orders.filter((o) => o.status === "Processing").length}
              </div>
              <div className="text-xs text-muted-foreground">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {orders.filter((o) => o.status === "In Transit").length}
              </div>
              <div className="text-xs text-muted-foreground">In Transit</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {orders.filter((o) => o.status === "Delivered").length}
              </div>
              <div className="text-xs text-muted-foreground">Delivered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                $
                {orders
                  .reduce((sum, order) => sum + (order.estimatedValue || 0), 0)
                  .toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Value</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
