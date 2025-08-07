import { ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAzureADAuth } from '@/contexts/AzureADAuthContext';
import { UserRole } from '@/lib/types';
import { PermissionService } from '@/services/PermissionService';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
  allowedRegion?: string;
  allowedDistrict?: string;
  requiredFeature?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole, allowedRegion, allowedDistrict, requiredFeature }) => {
  const { isAuthenticated, user, loading } = useAzureADAuth();
  const location = useLocation();
  const permissionService = PermissionService.getInstance();
  const [isInitialized, setIsInitialized] = useState(true); // PermissionService is already initialized as singleton
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  console.log('ProtectedRoute - isAuthenticated:', isAuthenticated, 'user:', user, 'loading:', loading);
  console.log('ProtectedRoute - User role:', user?.role, 'User status:', user?.status);
  console.log('ProtectedRoute - User ID:', user?.id, 'User email:', user?.email);

  // Set timeout for loading state
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 30000); // 30 second timeout
      
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  // Show loading while authentication is being determined
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            {loadingTimeout ? 'Loading is taking longer than expected...' : 'Loading authentication...'}
          </h2>
          <p className="text-gray-500 text-sm">
            {loadingTimeout 
              ? 'Please check your internet connection or try refreshing the page.'
              : 'Please wait while we verify your credentials.'
            }
          </p>
          {loadingTimeout && (
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          )}
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user is approved (not pending or pre_registered)
  if (user?.role === 'pending' || user?.status === 'pre_registered') {
    console.log('User not approved, redirecting to pending page');
    return <Navigate to="/pending-approval" replace />;
  }

  // Wait for permissions to be initialized
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading permissions...</h2>
        </div>
      </div>
    );
  }

  // Check feature-based access
  if (requiredFeature && user?.role) {
    const hasAccess = permissionService.canAccessFeature(user.role, requiredFeature);
    if (!hasAccess) {
      console.log(`Access denied: User ${user.role} does not have access to feature ${requiredFeature}`);
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check role-based access
  if (requiredRole && user?.role) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.some(role => permissionService.hasRequiredRole(user.role, role))) {
      // Allow technicians to access asset management pages
      if (location.pathname.startsWith('/asset-management') && user.role === 'technician') {
        return <>{children}</>;
      }
      console.log(`Access denied: User ${user.role} does not have required role`);
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check region-based access
  if (allowedRegion && user?.role !== 'global_engineer' && user?.role !== 'system_admin') {
    if (user?.region !== allowedRegion) {
      console.log(`Access denied: User's region ${user?.region} does not match required region ${allowedRegion}`);
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check district-based access
  if (allowedDistrict && user?.role === 'district_engineer') {
    if (user?.district !== allowedDistrict) {
      console.log(`Access denied: User's district ${user?.district} does not match required district ${allowedDistrict}`);
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute; 