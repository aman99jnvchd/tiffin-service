import { useAuthStore } from '../store/useAuthStore';

/**
 * Custom hook for permission checking
 * Returns helper functions to check user permissions
 */
export const usePermissions = () => {
  const permissions = useAuthStore((state) => state.permissions);
  const token = useAuthStore((state) => state.token);

  /**
   * Check if user has a specific permission
   * @param slug - Permission slug (e.g., 'city:view', 'city:create')
   * @returns boolean - true if user has permission or not logged in
   */
  const hasPermission = (slug: string): boolean => {
    // If not logged in, no permissions
    if (!token) return false;
    
    // If logged in but no permissions loaded, deny access (secure by default)
    if (permissions.length === 0) return false;
    
    return permissions.includes(slug);
  };

  /**
   * Check if user has any of the provided permissions
   * @param slugs - Array of permission slugs
   * @returns boolean - true if user has at least one permission
   */
  const hasAnyPermission = (slugs: string[]): boolean => {
    if (!token) return false;
    if (permissions.length === 0) return false;
    return slugs.some(slug => permissions.includes(slug));
  };

  /**
   * Check if user has all of the provided permissions
   * @param slugs - Array of permission slugs
   * @returns boolean - true if user has all permissions
   */
  const hasAllPermissions = (slugs: string[]): boolean => {
    if (!token) return false;
    if (permissions.length === 0) return false;
    return slugs.every(slug => permissions.includes(slug));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoggedIn: !!token,
    permissions,
  };
};
