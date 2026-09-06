import React, { useState } from 'react';
import { Utensils, Star, Calendar } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';

interface PastDeliveryCardProps {
  order: any;
  onRefresh: () => void;
}

export const PastDeliveryCard: React.FC<PastDeliveryCardProps> = ({ order, onRefresh }) => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const item = order.items?.[0];
  if (!item || !item.meal) return null;
  const meal = item.meal;

  let serviceType = '';
  let timeSlot = '';
  if (item.delivery_dates) {
    try {
      const dates = JSON.parse(item.delivery_dates);
      const match = dates.find((d: any) => d.date === order.delivery_date);
      if (match) {
        serviceType = match.service_type || '';
        timeSlot = match.slot || '';
      } else if (dates.length > 0) {
        serviceType = dates[0].service_type || '';
        timeSlot = dates[0].slot || '';
      }
    } catch (e) {}
  }

  let displayServiceInfo = '';
  if (serviceType && timeSlot && serviceType !== timeSlot) {
    displayServiceInfo = `${serviceType} (${timeSlot})`;
  } else if (serviceType) {
    displayServiceInfo = serviceType;
  } else if (timeSlot) {
    displayServiceInfo = timeSlot;
  }

  // Render static stars if already rated
  const renderStars = (rating: number) => {
    return (
      <div className="pdc-rating-display">
        {[1, 2, 3, 4, 5].map(star => (
          <Star 
            key={star} 
            size={16} 
            fill={rating >= star ? 'currentColor' : 'none'} 
            className={rating >= star ? '' : 'text-gray-600'}
            style={{ opacity: rating >= star ? 1 : 0.3 }}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="pdc-card">
        <div className="pdc-main">
          <div className="pdc-info-wrapper">
            {meal.image_url ? (
              <img src={`http://localhost:1415${meal.image_url}`} alt={meal.name} className="pdc-thumbnail" />
            ) : (
              <div className="pdc-thumbnail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Utensils size={24} color="rgba(255,255,255,0.4)" />
              </div>
            )}
            
            <div className="pdc-info">
              <h4 className="pdc-title">{meal.name}</h4>
              <p className="pdc-vendor">By {meal.kitchen_name || 'Vendor Kitchen'}</p>
              <div className="pdc-date" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} />
                  {new Date(order.delivery_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                {displayServiceInfo && (
                  <>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>&bull;</span>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      padding: '2px 8px', 
                      background: 'rgba(255,255,255,0.1)', 
                      borderRadius: '12px',
                      textTransform: 'capitalize' 
                    }}>
                      {displayServiceInfo}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <span className={`pdc-status ${order.status}`}>
            {order.status}
          </span>
        </div>

        <div className="pdc-footer">
          <span className="pdc-price">₹{Number(meal.base_price).toFixed(0)}</span>
          
          {order.status === 'delivered' && (
            order.rating ? (
              renderStars(order.rating)
            ) : (
              <button className="pdc-rate-btn" onClick={() => setIsFeedbackOpen(true)}>
                <Star size={16} /> Rate Meal
              </button>
            )
          )}
        </div>
      </div>

      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
        order={order}
        onRefresh={onRefresh}
      />
    </>
  );
};
