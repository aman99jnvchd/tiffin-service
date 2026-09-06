import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import "../styles/ProfileCircle.css";
import { User, LogOut, LogIn, Truck, RefreshCw, Wallet, History } from 'lucide-react';

export const ProfileCircle: React.FC = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { token, role, logout } = useAuthStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = () => {
    if (!token || !role) return "GU";
    return role.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className="profile-section"
      ref={profileRef}
      onClick={() => setShowProfileMenu(!showProfileMenu)}
    >
      <div className="initials-avatar">
        {getInitials()}
      </div>

      {showProfileMenu && (
        <div className="glass-dropdown-menu island-dropdown profile-dropdown-menu">
          {token ? (
            <>
              <div className="glass-option" onClick={() => navigate("/profile")}>
                <User size={16} /> Profile
              </div>
              <div className="glass-option" onClick={() => navigate("/my-deliveries")}>
                <Truck size={16} /> Deliveries
              </div>
              <div className="glass-option" onClick={() => navigate("/subscriptions")}>
                <RefreshCw size={16} /> Subscriptions
              </div>
              <div className="glass-option" onClick={() => navigate("/wallet")}>
                <Wallet size={16} /> Tiffini Wallet
              </div>
              <div className="glass-option" onClick={() => navigate("/history")}>
                <History size={16} /> Delivery History
              </div>
              <div className="glass-option logout" onClick={() => { logout(); navigate("/"); }}>
                <LogOut size={16} /> Logout
              </div>
            </>
          ) : (
            <div className="glass-option" onClick={() => navigate("/login", { state: { from: location.pathname } })}>
              <LogIn size={16} /> Login
            </div>
          )}
        </div>
      )}
    </div>
  );
};

