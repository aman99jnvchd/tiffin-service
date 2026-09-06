import React, { useState } from 'react';
import { Utensils, Trash2, Edit3, CalendarDays, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { EditScheduleModal } from './EditScheduleModal';
import { updateCustomerSubscription } from '../../api/axios';
import { useToastStore } from '../../store/useToastStore';

interface SubscriptionCardProps {
  subscription: any;
  onRefresh: () => void;
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ subscription, onRefresh }) => {
  const showToast = useToastStore(s => s.showToast);
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const meal = subscription.meal;
  
  const selectedDays = React.useMemo(() => {
    try {
      return JSON.parse(subscription.selected_days || '[]');
    } catch {
      return [];
    }
  }, [subscription.selected_days]);

  const handleCancelPlan = async () => {
    try {
      await updateCustomerSubscription(subscription.id, { status: 'cancelled' });
      showToast('Subscription cancelled successfully', 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to cancel subscription', 'error');
    }
  };

  if (!meal) return null;

  const startDate = subscription.subscription_start_date ? new Date(subscription.subscription_start_date) : null;
  const endDate = subscription.subscription_end_date ? new Date(subscription.subscription_end_date) : null;
  const startDateStr = startDate ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown';
  const endDateStr = endDate ? endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing';

  // Compute upcoming dates for the next 30 days based on selectedDays
  const upcomingDates = React.useMemo(() => {
    if (!startDate || selectedDays.length === 0) return [];
    const dates = [];
    let curr = new Date();
    // Start from today or start date, whichever is later
    if (curr < startDate) curr = new Date(startDate);
    
    // Check next 60 days to find upcoming deliveries
    for (let i = 0; i < 60; i++) {
      const testDate = new Date(curr);
      testDate.setDate(curr.getDate() + i);
      
      if (endDate && testDate > endDate) break;
      
      // JS getDay(): 0 = Sun, 1 = Mon ... 6 = Sat
      // Our idx: 0 = Mon, 1 = Tue ... 6 = Sun
      const dayIdx = testDate.getDay() === 0 ? 6 : testDate.getDay() - 1;
      
      if (selectedDays.includes(dayIdx)) {
        dates.push(new Date(testDate));
      }
      if (dates.length >= 20) break; // cap at 20 for preview
    }
    return dates;
  }, [startDate, endDate, selectedDays]);

  return (
    <>
      <div className="sc-card">
        <div className="sc-header">
          <div className="sc-info-wrapper">
            {meal.image_url ? (
              <img src={`http://localhost:1415${meal.image_url}`} alt={meal.name} className="sc-thumbnail" />
            ) : (
              <div className="sc-thumbnail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Utensils size={24} color="rgba(255,255,255,0.4)" />
              </div>
            )}
            
            <div className="sc-info">
              <h4 className="sc-name">{meal.name}</h4>
              <p className="sc-vendor">By {meal.kitchen_name || 'Vendor Kitchen'}</p>
              <span className="sc-price">₹{Number(meal.base_price).toFixed(0)} / meal</span>
            </div>
          </div>
          
          <span className={`sc-status-badge sc-status-${subscription.status}`}>
            {subscription.status === 'placed' ? 'subscribed' : subscription.status}
          </span>
        </div>

        <div className="sc-dates-badge" onClick={() => setShowDatesModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
          background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)',
          cursor: 'pointer', marginTop: '-8px', border: '1px solid rgba(255,255,255,0.1)', width: 'max-content'
        }}>
          <CalendarDays size={14} color="#7c4dff" />
          <span>{startDateStr} - {endDateStr}</span>
        </div>

        <div className="sc-week-view">
          {DAYS.map((day, idx) => (
            <div key={idx} className={`sc-day-pill ${selectedDays.includes(idx) ? 'active' : ''}`}>
              {day}
            </div>
          ))}
        </div>

        {subscription.status !== 'cancelled' && (
          <div className="sc-actions">
            <button className="sc-edit-btn" onClick={() => setIsModalOpen(true)}>
              <Edit3 size={16} /> <span className="sc-hide-on-mobile">Edit Schedule</span>
            </button>
            
            {!isConfirmingCancel ? (
              <button className="sc-cancel-btn" onClick={() => setIsConfirmingCancel(true)} title="Cancel Plan">
                <Trash2 size={18} />
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flex: 1 }}>
                <button className="sc-edit-btn" style={{ width: 'max-content', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'transparent' }} onClick={handleCancelPlan}>
                  <Check size={16} /> Confirm
                </button>
                <button className="sc-cancel-btn" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }} onClick={() => setIsConfirmingCancel(false)} title="Abort Cancellation">
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <EditScheduleModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        subscription={subscription}
        onRefresh={onRefresh}
      />

      <AnimatePresence>
        {showDatesModal && (
          <div className="sm-overlay" onClick={() => setShowDatesModal(false)}>
            <motion.div 
              className="sm-modal"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
            >
              <div className="sm-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Scheduled Deliveries</h3>
                <button onClick={() => setShowDatesModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ padding: '0 20px 20px', overflowY: 'auto' }}>
                {upcomingDates.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>No upcoming deliveries found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {upcomingDates.map((d, i) => {
                      const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                      const isoDate = d.toISOString().split('T')[0];
                      return (
                        <div 
                          key={i} 
                          onClick={() => {
                            // In real app, we might navigate with a query param like /deliveries?date=2026-08-25
                            // If MyDeliveries doesn't read query params yet, we can add it or just navigate.
                            // Currently, MyDeliveries expects a selectedDate in local state. We can pass state!
                            navigate('/deliveries', { state: { targetDate: isoDate } });
                          }}
                          style={{
                            display: 'flex', justifyContent: 'space-between', padding: '12px 16px',
                            background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer',
                            border: '1px solid rgba(255,255,255,0.05)'
                          }}
                        >
                          <span>{dateStr}</span>
                          <span style={{ color: '#7c4dff', fontSize: '0.85rem' }}>View &rarr;</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
