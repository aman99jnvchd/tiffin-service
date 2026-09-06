import React, { useState, useEffect } from 'react';
import { History, PackageX, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PastDeliveryCard } from '../components/History/PastDeliveryCard';
import { getCustomerOrderHistory } from '../api/axios';
import { useToastStore } from '../store/useToastStore';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { ProfileCircle } from '../components/ProfileCircle';
import '../styles/DeliveryHistory.css';
import '../styles/CheckoutPage.css';

const FILTERS = ['All', 'Delivered', 'Skipped', 'Cancelled'];

export const DeliveryHistoryList: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');
  const showToast = useToastStore(s => s.showToast);

  const fetchHistory = async () => {
    try {
      const res = await getCustomerOrderHistory();
      // Filter out active orders (placed, preparing, out_for_delivery)
      // Only keep past states: delivered, cancelled (missed/skipped)
      const pastOrders = (res.data.data || []).filter((o: any) => 
        ['delivered', 'cancelled', 'skipped', 'missed'].includes(o.status)
      );
      
      // Sort by date descending
      pastOrders.sort((a: any, b: any) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
      
      setOrders(pastOrders);
    } catch {
      showToast("Failed to load delivery history", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredOrders = orders.filter(order => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Cancelled' && order.status === 'cancelled') return true;
    return order.status.toLowerCase() === activeFilter.toLowerCase();
  });

  // Group by month
  const groupedOrders: { [key: string]: any[] } = {};
  filteredOrders.forEach(order => {
    const date = new Date(order.delivery_date);
    const monthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    if (!groupedOrders[monthYear]) {
      groupedOrders[monthYear] = [];
    }
    groupedOrders[monthYear].push(order);
  });

  return (
    <div className="dh-container">
      <div className="checkout-topbar">
        <button className="checkout-back-btn" onClick={() => navigate('/')}>
          <ChevronLeft size={20} />
        </button>
        <h2 className="checkout-page-title">Delivery History</h2>
        <ProfileCircle />
      </div>

      <div className="dh-filters">
        {FILTERS.map(filter => (
          <div 
            key={filter} 
            className={`dh-filter-chip ${activeFilter === filter ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </div>
        ))}
      </div>

      <div className="dh-list">
        {loading ? (
          <SkeletonLoader type="card" count={3} />
        ) : filteredOrders.length === 0 ? (
          <div className="dh-empty">
            <PackageX size={48} />
            <h3>No Past Deliveries</h3>
            <p>You haven't received any meals yet that match this filter.</p>
          </div>
        ) : (
          Object.keys(groupedOrders).map(monthYear => (
            <div key={monthYear} className="dh-month-group">
              <div className="dh-month-header">{monthYear}</div>
              <div className="dh-month-cards-grid">
                {groupedOrders[monthYear].map(order => (
                  <PastDeliveryCard key={order.id} order={order} onRefresh={fetchHistory} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
