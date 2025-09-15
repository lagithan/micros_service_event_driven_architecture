import { Navigate } from "react-router-dom";
import { TokenManager } from "@/lib/api";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = TokenManager.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;