import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Navigation, RefreshCw, X } from "lucide-react";

interface RouteData {
  success: boolean;
  address: string;
  route: string;
  estimatedTime: string;
  distance: string;
  instructions: string[];
  timestamp: string;
}

interface RouteDisplayProps {
  routeData?: RouteData | null;
  loading?: boolean;
  error?: string | null;
  address?: string;
  onRefresh?: () => void;
  onClose?: () => void;
  title?: string;
}

export default function RouteDisplay({
  routeData,
  loading = false,
  error = null,
  address,
  onRefresh,
  onClose,
  title = "Route Information"
}: RouteDisplayProps) {
  if (loading) {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              {title}
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-blue-700">Loading route information...</p>
            {address && (
              <p className="text-sm text-blue-600 mt-1">For: {address}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              {title}
            </div>
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button variant="ghost" size="sm" onClick={onRefresh}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-red-700">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Route Error</p>
            <p className="text-sm mt-1">{error}</p>
            {address && (
              <p className="text-xs text-red-600 mt-2">Address: {address}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!routeData) {
    return (
      <Card className="border-gray-200 bg-gray-50/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              {title}
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No route data available</p>
            {address && (
              <p className="text-sm mt-1">Address: {address}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-green-600" />
            <span className="text-green-800">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Route Summary */}
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center gap-2 p-2 bg-green-100 rounded-lg">
            <MapPin className="w-4 h-4 text-green-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-green-800">Destination</div>
              <div className="text-xs text-green-700">{routeData.address}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 bg-blue-100 rounded-lg">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-xs font-medium text-blue-800">Time</div>
                <div className="text-xs text-blue-700">{routeData.estimatedTime}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-purple-100 rounded-lg">
              <Navigation className="w-4 h-4 text-purple-600" />
              <div>
                <div className="text-xs font-medium text-purple-800">Distance</div>
                <div className="text-xs text-purple-700">{routeData.distance}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Route Text */}
        <div>
          <div className="text-sm font-medium mb-2 text-green-800">🗺️ Route Directions</div>
          <div className="bg-white border border-green-200 rounded-lg p-3">
            <p className="text-sm text-gray-700 leading-relaxed">
              {routeData.route}
            </p>
          </div>
        </div>

        {/* Instructions */}
        {routeData.instructions && routeData.instructions.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2 text-green-800">📋 Navigation Steps</div>
            <div className="space-y-2">
              {routeData.instructions.map((instruction, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs min-w-[1.5rem] h-6 flex items-center justify-center bg-green-100 border-green-300 text-green-800"
                  >
                    {index + 1}
                  </Badge>
                  <span className="text-sm text-gray-700 flex-1">{instruction}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-green-600 text-center bg-green-100 p-2 rounded">
          Route generated: {new Date(routeData.timestamp).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}