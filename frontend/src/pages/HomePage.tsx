import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { useState } from 'react';

export const HomePage = () => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const { token, role, logout } = useAuthStore();
  const showToast = useToastStore((state) => state.showToast);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    // 1. Brief delay to show the loader (feels more "Liquid")
    await new Promise(resolve => setTimeout(resolve, 600));

    // 2. NAVIGATE FIRST: Move the user away while they still have a "token" 
    // This prevents the HomePage from re-rendering in "Guest Mode"
    navigate('/login', { replace: true });

    // 3. CLEAR STORE AFTER: Use a tiny delay to ensure navigation started
    setTimeout(() => {
      logout();
      showToast('Logged out successfully', 'success');
      setIsLoggingOut(false);
    }, 100);
  };

  return (
    <div className="glass-card" style={{ textAlign: 'center', maxWidth: '500px' }}>
      <h1>Welcome to Chandigarh Tiffin Service</h1>
      
      <div style={{ margin: '2rem 0' }}>
        <p style={{ color: 'var(--text-muted)' }}>
          Status: <span style={{ color: token ? '#4ade80' : '#ffb74d' }}>
            {token ? 'Logged In' : 'Guest Mode'}
          </span>
        </p>
        {token && role && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Account Type: <span style={{ textTransform: 'capitalize', color: '#fff' }}>{role}</span>
          </p>
        )}
      </div>

      <div className="home-actions" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {token ? (
          <>
            <button 
              disabled={isLoggingOut}
              onClick={() => navigate(role === 'vendor' ? '/vendor/dashboard' : '/menu')} 
              className="glass-button"
            >
              {role === 'vendor' ? 'Go to Kitchen Dashboard' : 'Browse Daily Menu'}
            </button>
            
            <button 
              onClick={handleLogout} 
              className={`glass-button logout-btn ${isLoggingOut ? 'loading-state' : ''}`}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? <span className="spinner"></span> : "Logout"}
            </button>
          </>
        ) : (
          <button onClick={() => navigate('/login')} className="glass-button">
            Login to Place Order
          </button>
        )}
      </div>
    </div>
  );
};