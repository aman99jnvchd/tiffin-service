import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Building2, Users, UserCog, LogOut } from "lucide-react";
import { useAuthStore } from '../store/useAuthStore';
import '../styles/FloatingMenu.css';

export const FloatingMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const token = useAuthStore((state) => state.token);
  const permissions = useAuthStore((state) => state.permissions);
  const logout = useAuthStore((state) => state.logout);
  const role = useAuthStore((state) => state.role);

  // Only show for admin and vendor roles
  if (role !== 'admin' && role !== 'vendor') return null;

  const hasPermission = (slug: string) => {
    if (!token) return false;
    if (permissions.length === 0) return false;
    return permissions.includes(slug);
  };

  const canViewCities = hasPermission('city:view');
  const canViewRoles = hasPermission('role:view');
  const canViewUsers = hasPermission('user:view');

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/login');
  };

  return (
    <>
      {/* Floating Button */}
      <button
        ref={buttonRef}
        className={`floating-menu-button ${isOpen ? 'open' : ''}`}
        onClick={toggleMenu}
      >
        <div className={`hamburger ${isOpen ? 'active' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {/* Expanded Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            className="floating-menu-panel"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="floating-menu-header">
              <span className="floating-menu-logo">CTS Admin</span>
            </div>

            <nav className="floating-menu-nav">
              <NavLink
                to="/"
                className={({ isActive }) => `floating-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </NavLink>

              {canViewCities && (
                <NavLink
                  to="/admin/cities"
                  className={({ isActive }) => `floating-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Building2 size={20} />
                  <span>City Manager</span>
                </NavLink>
              )}

              {canViewRoles && (
                <NavLink
                  to="/admin/roles"
                  className={({ isActive }) => `floating-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Users size={20} />
                  <span>Roles & Access</span>
                </NavLink>
              )}

              {canViewUsers && (
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) => `floating-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <UserCog size={20} />
                  <span>User Management</span>
                </NavLink>
              )}

              {token && (
                <button
                  className="floating-nav-item logout-item"
                  onClick={handleLogout}
                >
                  <LogOut size={20} />
                  <span>Logout</span>
                </button>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
