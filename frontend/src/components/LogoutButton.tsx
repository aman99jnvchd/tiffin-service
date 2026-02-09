import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

export const LogoutButton = () => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <button onClick={handleLogout} className="glass-button" style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.2)' }}>
      Logout
    </button>
  );
};
