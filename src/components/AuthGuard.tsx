/**
 * Authentication Guard Component
 * Protects routes and redirects unauthenticated users
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from './Loading';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'owner' | 'admin' | 'member' | 'viewer';
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requiredRole }) => {
  // ALL HOOKS MUST BE CALLED FIRST - before any early returns
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // Now we can safely do conditional rendering after all hooks are called
  
  // Show loading spinner while authentication is being verified
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Navigate 
        to="/auth/login" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Check role-based access if required
  if (requiredRole && user.role !== requiredRole) {
    const roleHierarchy = ['viewer', 'member', 'admin', 'owner'];
    const userRoleIndex = roleHierarchy.indexOf(user.role);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

    if (userRoleIndex < requiredRoleIndex) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600">
              You don't have permission to access this resource.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Required role: {requiredRole}, Your role: {user.role}
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};