import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Building2, Users } from "lucide-react";
import '../styles/Sidebar.css';

export const Sidebar = () => {
  return (
    <motion.aside 
      initial={{ x: -100 }}
      animate={{ x: 0 }}
      className="sidebar"
    >
      <div className="sidebar-logo">
        <div className="logo-icon" />
        <span>CTS Admin</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/admin/cities" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Building2 size={20} />
          <span>City Manager</span>
        </NavLink>

        <NavLink to="/admin/roles" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          <span>Roles & Access</span>
        </NavLink>
      </nav>
    </motion.aside>
  );
};
