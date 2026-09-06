import React, { useState, useEffect } from 'react';
import { RefreshCw, PackageX, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionCard } from '../components/Subscriptions/SubscriptionCard';
import { getCustomerSubscriptions } from '../api/axios';
import { useToastStore } from '../store/useToastStore';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { ProfileCircle } from '../components/ProfileCircle';
import '../styles/SubscriptionHub.css';
import '../styles/CheckoutPage.css';

export const SubscriptionHub: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const showToast = useToastStore(s => s.showToast);

  const fetchSubscriptions = async () => {
    try {
      const res = await getCustomerSubscriptions();
      setSubscriptions(res.data.data || []);
    } catch {
      showToast("Failed to load subscriptions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  return (
    <div className="sh-container">
      <div className="checkout-topbar">
        <button className="checkout-back-btn" onClick={() => navigate('/')}>
          <ChevronLeft size={20} />
        </button>
        <h2 className="checkout-page-title">Subscriptions</h2>
        <ProfileCircle />
      </div>

      <div className="sh-list">
        {loading ? (
          <SkeletonLoader type="card" count={3} />
        ) : subscriptions.length === 0 ? (
          <div className="empty-subscriptions">
            <PackageX size={48} />
            <h3>No Active Subscriptions</h3>
            <p>You don't have any recurring meal plans yet.</p>
          </div>
        ) : (
          subscriptions.map(sub => (
            <SubscriptionCard 
              key={sub.id} 
              subscription={sub} 
              onRefresh={fetchSubscriptions} 
            />
          ))
        )}
      </div>
    </div>
  );
};
