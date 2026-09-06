import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getCustomerActiveOrders, getCustomerOrderHistory } from '../api/axios';
import { useToastStore } from '../store/useToastStore';
import { SkeletonLoader } from '../components/SkeletonLoader';
import '../styles/OrderHistoryPage.css';

export const OrderHistoryPage = () => {
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<number[]>([]);
  
  const navigate = useNavigate();
  const showToast = useToastStore(s => s.showToast);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const [activeRes, historyRes] = await Promise.all([
        getCustomerActiveOrders(),
        getCustomerOrderHistory()
      ]);
      setActiveOrders(activeRes.data.data || []);
      setHistoryOrders(historyRes.data.data || []);
    } catch {
      showToast("Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (orderId: number) => {
    setExpandedOrders(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const renderOrderCard = (order: any, isActive: boolean) => {
    const isExpanded = expandedOrders.includes(order.id);
    const total = order.items.reduce((acc: number, item: any) => acc + (item.quantity * Number(item.meal?.base_price || 0)), 0);
    
    let statusColor = '#9ca3af';
    let StatusIcon = Clock;
    
    if (order.status === 'completed') {
      statusColor = '#4ade80';
      StatusIcon = CheckCircle;
    } else if (order.status === 'cancelled') {
      statusColor = '#f87171';
      StatusIcon = XCircle;
    } else if (order.status === 'accepted' || order.status === 'delivering') {
      statusColor = '#60a5fa';
    } else if (order.status === 'placed') {
      statusColor = '#fbbf24';
    }

    return (
      <div key={order.id} className="order-card glass-card">
        <div className="order-card-header" onClick={() => toggleExpand(order.id)}>
          <div className="order-card-left">
            <span className="order-id">#{order.id}</span>
            <span className="order-date">
              Delivery: {new Date(order.delivery_date).toLocaleDateString()} {order.delivery_time && `at ${order.delivery_time}`}
            </span>
          </div>
          <div className="order-card-right">
            <span className="order-status" style={{ color: statusColor, borderColor: statusColor, background: `${statusColor}20` }}>
              <StatusIcon size={14} /> {order.status}
            </span>
            <span className="order-total">₹{total.toFixed(0)}</span>
            <button className="expand-btn">
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="order-card-details">
            <div className="order-items-list">
              {order.items.map((item: any) => (
                <div key={item.meal_id} className="order-item-row">
                  <div className="order-item-info">
                    <span className="order-item-qty">{item.quantity}x</span>
                    <span className="order-item-name">{item.meal?.name || 'Unknown Meal'}</span>
                  </div>
                  <span className="order-item-price">₹{(item.quantity * Number(item.meal?.base_price || 0)).toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="orders-container">
      {loading ? (
        <div className="orders-loading" style={{ padding: '20px' }}>
          <SkeletonLoader type="card" count={3} />
        </div>
      ) : (
        <div className="orders-content">
          <section className="orders-section">
            <h3 className="section-title">Active Orders</h3>
            {activeOrders.length === 0 ? (
              <p className="no-orders">No active orders right now.</p>
            ) : (
              <div className="orders-list">
                {activeOrders.map(o => renderOrderCard(o, true))}
              </div>
            )}
          </section>

          <section className="orders-section">
            <h3 className="section-title">Order History</h3>
            {historyOrders.length === 0 ? (
              <p className="no-orders">No past orders found.</p>
            ) : (
              <div className="orders-list">
                {historyOrders.map(o => renderOrderCard(o, false))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
