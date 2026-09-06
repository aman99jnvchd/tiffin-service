import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { ChevronLeft, User, LogOut, LogIn, Truck, RefreshCw, Wallet, History } from 'lucide-react';
import { GlassSelect } from './GlassSelect';
import { getCities } from '../api/axios';
import { useNavigate, useLocation } from 'react-router-dom';
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

    const handleLogout = () => {
        logout();
        setShowProfileMenu(false);
        navigate('/');
    };

    const location = useLocation();
    const showBack = location.pathname !== '/';

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      className="topbar"
    >
      {/* Topbar Left: Page Title & Back Button */}
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {showBack && (
          <button 
            onClick={() => navigate('/')} 
            style={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              border: 'none', 
              color: 'white', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              transition: 'background 0.2s'
            }}
          >
            <ChevronLeft size={20} />
          </button>
        )}
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
                      <User size={16} /> Profile
                    </div>
                    <div className="glass-option" onClick={() => navigate('/my-deliveries')}>
                      <Truck size={16} /> Deliveries
                    </div>
                    <div className="glass-option" onClick={() => navigate('/subscriptions')}>
                      <RefreshCw size={16} /> Subscriptions
                    </div>
                    <div className="glass-option" onClick={() => navigate('/wallet')}>
                      <Wallet size={16} /> Tiffini Wallet
                    </div>
                    <div className="glass-option" onClick={() => navigate('/history')}>
                      <History size={16} /> Delivery History
                    </div>
                    <div className="glass-option logout" onClick={handleLogout}>
                      <LogOut size={16} /> Logout
                    </div>
                  </>
                ) : (
                  <div className="glass-option" onClick={() => navigate('/login')}>
                    <LogIn size={16} /> Login
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
