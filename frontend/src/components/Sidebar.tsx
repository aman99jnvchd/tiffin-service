import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Building2, Users, UtensilsCrossed } from "lucide-react";
import { useAuthStore } from '../store/useAuthStore';
import '../styles/Sidebar.css';

export const Sidebar = () => {
  const token = useAuthStore((state) => state.token);
  const permissions = useAuthStore((state) => state.permissions);

  const hasPermission = (slug: string) => {
    if (!token) return false;
    if (permissions.length === 0) return false;
    return permissions.includes(slug);
  };

  const canViewCities = hasPermission('city:view');
  const canViewRoles = hasPermission('role:view');
  const canViewMeals = hasPermission('meal:view');

  return (
    <motion.aside 
      initial={{ x: -100 }}
      animate={{ x: 0 }}
      className="sidebar"
    >
      <div className="sidebar-logo">
        <span>CTS Admin</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        {canViewCities && (
          <NavLink to="/admin/cities" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Building2 size={20} />
            <span>City Manager</span>
          </NavLink>
        )}

        {canViewRoles && (
          <NavLink to="/admin/roles" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users size={20} />
            <span>Roles & Access</span>
          </NavLink>
        )}

        {canViewMeals && (
          <NavLink to="/admin/menu" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <UtensilsCrossed size={20} />
            <span>Menu</span>
          </NavLink>
        )}
      </nav>
    </motion.aside>
  );
};
