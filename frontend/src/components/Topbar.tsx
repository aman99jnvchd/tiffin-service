import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { GlassSelect } from './GlassSelect';
import { getCities } from '../api/axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Topbar.css';

export const Topbar = ({ title }: { title: string }) => {
    const navigate = useNavigate();
    const { token, role, logout } = useAuthStore();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [selectedCity, setSelectedCity] = useState("");
    const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
    const profileRef = useRef<HTMLDivElement>(null);

    // Fetch cities
    useEffect(() => {
        const fetchCities = async () => {
            try {
                const res = await getCities();
                const citiesList = res.data.data;
                setCities(citiesList);

                const chd = citiesList.find((c: any) => 
                    c.name.toLowerCase() === 'chandigarh' || c.alias?.toLowerCase() === 'chandigarh'
                );
                if (chd) setSelectedCity(String(chd.id));
            } catch (err) {
                console.error("Failed to load cities in Topbar");
            }
        };
        fetchCities();
    }, []);

    // Event listener for clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [profileRef]);

    // First two letters of name
    const getInitials = () => {
        if (!token || !role) return "GU";
        return role.slice(0, 2).toUpperCase();
    };

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      className="topbar"
    >
      {/* Topbar Left: Page Title */}
      <div className="topbar-left">
        <h1 className="page-title">{title}</h1>
      </div>

      {/* Topbar Right */}
      <div className="topbar-right">
        {/* City Select */}
        <div className="topbar-city-select">
          <GlassSelect 
            options={cities} 
            value={selectedCity} 
            onChange={(val: string) => setSelectedCity(val)} 
          />
        </div>

        {/* Profile Section */}
        <div 
          className="profile-section" 
          ref={profileRef}
          onClick={() => setShowProfileMenu(!showProfileMenu)}
        >
          <div className="initials-avatar">
            {getInitials()}
          </div>
          
          <AnimatePresence>
            {showProfileMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="glass-dropdown-menu island-dropdown"
              >
                {token ? (
                  <>
                    <div className="glass-option" onClick={() => navigate('/profile')}>
                      Profile
                    </div>
                    <div className="glass-option logout" onClick={logout}>
                      Logout
                    </div>
                  </>
                ) : (
                  <div className="glass-option" onClick={() => navigate('/login')}>
                    Login
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
};
