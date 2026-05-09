import { ShoppingBag, Utensils, Users, TrendingUp, BarChart3 } from 'lucide-react';
import '../styles/HomePage.css';

export const VendorDashboard = () => {
  const stats = [
    { label: "Today's Orders", value: '12', icon: <ShoppingBag size={22} />, color: '#a78bfa' },
    { label: 'Active Meals', value: '8', icon: <Utensils size={22} />, color: '#4ade80' },
    { label: 'Total Customers', value: '47', icon: <Users size={22} />, color: '#60a5fa' },
    { label: "Today's Revenue", value: '₹1,440', icon: <TrendingUp size={22} />, color: '#fb923c' },
  ];

  const recentOrders = [
    { id: '#1021', customer: 'Rahul S.', items: 'Dal + Roti × 2', status: 'placed', time: '10 min ago' },
    { id: '#1020', customer: 'Priya M.', items: 'Paneer Curry × 1', status: 'preparing', time: '25 min ago' },
    { id: '#1019', customer: 'Amit K.', items: 'Rajma Chawal × 3', status: 'delivered', time: '1 hr ago' },
    { id: '#1018', customer: 'Neha R.', items: 'Chole + Roti × 2', status: 'delivered', time: '2 hr ago' },
  ];

  const statusColor: Record<string, string> = {
    placed: '#60a5fa',
    preparing: '#fb923c',
    delivered: '#4ade80',
  };

  return (
    <div className="vendor-dashboard">
      <h1 className="vd-title">Kitchen Dashboard</h1>

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

      <div className="glass-card vd-orders-card">
        <h2 className="vd-card-title"><BarChart3 size={20} />Recent Orders</h2>
        <div className="vd-orders-list">
          {recentOrders.map((o) => (
            <div key={o.id} className="vd-order-row">
              <div className="vd-order-left">
                <span className="vd-order-id">{o.id}</span>
                <span className="vd-order-customer">{o.customer}</span>
              </div>
              <span className="vd-order-items">{o.items}</span>
              <div className="vd-order-right">
                <span className="vd-order-status" style={{ color: statusColor[o.status] }}>{o.status}</span>
                <span className="vd-order-time">{o.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
