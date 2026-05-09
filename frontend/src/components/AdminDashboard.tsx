import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Users, Building2, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import '../styles/HomePage.css';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const stats = [
    { label: 'Total Users', value: '128', icon: <Users size={22} />, color: '#a78bfa' },
    { label: 'Active Cities', value: '4', icon: <Building2 size={22} />, color: '#60a5fa' },
    { label: 'Roles Defined', value: '5', icon: <ShieldCheck size={22} />, color: '#4ade80' },
    { label: 'Total Meals', value: '64', icon: <UtensilsCrossed size={22} />, color: '#fb923c' },
  ];

  return (
    <div className="admin-dashboard">
      <h1 className="vd-title">Admin Dashboard</h1>

      <div className="vd-stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="vd-stat-card">
            <div className="vd-stat-icon" style={{ color: s.color }}>{s.icon}</div>
            <div>
              <div className="vd-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="vd-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {!token && (
        <div className="ad-login-prompt">
          <p>Login to access the full admin panel</p>
          <button onClick={() => navigate('/login')} className="glass-button" style={{ width: 'auto', padding: '12px 32px' }}>
            Login
          </button>
        </div>
      )}
    </div>
  );
};
