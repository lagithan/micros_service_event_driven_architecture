import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Navigation } from "lucide-react";

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
  address?: string;
}

export default function RouteDisplay({ routeData, address }: RouteDisplayProps) {
  if (!routeData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Route Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="w-5 h-5" />
          Route Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Route Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Destination</div>
              <div className="text-xs text-muted-foreground">{routeData.address}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Estimated Time</div>
              <div className="text-xs text-muted-foreground">{routeData.estimatedTime}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Distance</div>
              <div className="text-xs text-muted-foreground">{routeData.distance}</div>
            </div>
          </div>
        </div>

        {/* Route Text */}
        <div>
          <div className="text-sm font-medium mb-2">Route Directions</div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-sm text-foreground leading-relaxed">
              {routeData.route}
            </p>
          </div>
        </div>

        {/* Instructions */}
        {routeData.instructions && routeData.instructions.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Navigation Instructions</div>
            <div className="space-y-2">
              {routeData.instructions.map((instruction, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs min-w-[1.5rem] h-6 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{instruction}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground text-right">
          Route generated: {new Date(routeData.timestamp).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}