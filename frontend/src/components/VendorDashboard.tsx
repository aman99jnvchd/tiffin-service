import { useState, useEffect } from 'react';
import { ShoppingBag, Utensils, Users, TrendingUp, BarChart3, ChevronDown } from 'lucide-react';
import { getVendorOrders, updateOrderStatus, getMyProfile } from '../api/axios';
import { useToastStore } from '../store/useToastStore';
import '../styles/HomePage.css';

export const VendorDashboard = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToastStore(s => s.showToast);

  // We will need to compute stats from the orders later, for now we will just show the live orders
  
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await getVendorOrders();
      setOrders(res.data.data || []);
    } catch {
      showToast("Failed to load live orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      showToast(`Order #${orderId} marked as ${newStatus}`, "success");
      fetchOrders();
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const stats = [
    { label: "Active Orders", value: orders.length.toString(), icon: <ShoppingBag size={22} />, color: '#a78bfa' },
    { label: 'Completed Today', value: '-', icon: <Utensils size={22} />, color: '#4ade80' },
    { label: 'Total Customers', value: '-', icon: <Users size={22} />, color: '#60a5fa' },
    { label: "Today's Revenue", value: '-', icon: <TrendingUp size={22} />, color: '#fb923c' },
  ];

  const statusColor: Record<string, string> = {
    placed: '#fbbf24',
    accepted: '#60a5fa',
    delivering: '#c084fc',
    completed: '#4ade80',
    cancelled: '#f87171'
  };

  return (
    <div className="vendor-dashboard">
      <h1 className="vd-title">Kitchen Dashboard</h1>

      <div className="vd-stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="vd-stat-card">
            <div className="vd-stat-icon" style={{ color: s.color, background: `${s.color}20` }}>{s.icon}</div>
            <div>
              <div className="vd-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="vd-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card vd-orders-card">
        <h2 className="vd-card-title"><BarChart3 size={20} />Live Orders</h2>
        
        {loading ? (
          <div className="spinner small" style={{ margin: '20px auto' }}></div>
        ) : orders.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>No active orders right now.</p>
        ) : (
          <div className="vd-orders-list">
            {orders.map((o) => {
               const itemSummary = o.items.map((i: any) => `${i.meal?.name || 'Item'} × ${i.quantity}`).join(', ');
               
               return (
                <div key={o.id} className="vd-order-row">
                  <div className="vd-order-left">
                    <span className="vd-order-id">#{o.id}</span>
                    <span className="vd-order-customer">Customer #{o.customer_id}</span>
                  </div>
                  <span className="vd-order-items">{itemSummary}</span>
                  <div className="vd-order-right" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                       <span className="vd-order-status" style={{ color: statusColor[o.status] }}>{o.status}</span>
                       <span className="vd-order-time">{new Date(o.created_at).toLocaleTimeString()}</span>
                    </div>
                    
                    <select 
                      className="glass-input-field" 
                      style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
                      value={o.status}
                      onChange={(e) => handleStatusUpdate(o.id, e.target.value)}
                    >
                       <option value="placed">Placed</option>
                       <option value="accepted">Accept</option>
                       <option value="delivering">Out for Delivery</option>
                       <option value="completed">Complete</option>
                       <option value="cancelled">Cancel</option>
                    </select>
                  </div>
                </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
