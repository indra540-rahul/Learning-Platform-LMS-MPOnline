import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const ProtectedRoute = ({ children, role }) => {
  const { user, authLoading } = useAuth();

  if (authLoading) return <div>Loading session...</div>;

  if (!user) return <Navigate to="/auth" />;

  if (role && user.role !== role) {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;
