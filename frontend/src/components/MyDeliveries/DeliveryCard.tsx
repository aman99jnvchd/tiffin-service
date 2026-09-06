import React, { useState } from 'react';
import { Clock, Utensils, AlertTriangle, Lock } from 'lucide-react';
import { cancelCustomerOrder } from '../../api/axios';
import { useToastStore } from '../../store/useToastStore';

interface DeliveryCardProps {
  order: any;
  selectedDate: Date;
  specificSlot?: string;
  serviceTypeProp?: string;
  onRefresh: () => void;
}

export const DeliveryCard: React.FC<DeliveryCardProps> = ({ order, selectedDate, specificSlot, serviceTypeProp, onRefresh }) => {
  const showToast = useToastStore((s) => s.showToast);
  const [cancelling, setCancelling] = useState(false);
  const [isConfirmingSkip, setIsConfirmingSkip] = useState(false);

  // We assume order.items[0] contains the primary meal info since "ONE_TIME" per meal is standard
  const primaryItem = order.items?.[0];
  const meal = primaryItem?.meal;

  if (!meal) return null;

  // Render slot
  const displaySlot = specificSlot || order.delivery_time || 'Time TBD';

  // Get most updated kitchen name
  const vendorProfile = meal.vendor?.vendor_profile;
  const kitchenName = meal.kitchen_name || 'Vendor Kitchen';

  // Determine service type for badge
  let serviceType = serviceTypeProp || '';

  // Try to match the slot string against the delivery windows keys (Fallback for older orders)
  if (!serviceType && vendorProfile?.delivery_windows) {
    try {
      const windows = JSON.parse(vendorProfile.delivery_windows);
      for (const [key, slotsArr] of Object.entries(windows)) {
        if (Array.isArray(slotsArr)) {
          const matching = slotsArr.some((w: any) => {
            const str = typeof w === 'object' ? `${w.start_time} - ${w.end_time}` : w;
            return str === displaySlot;
          });
          if (matching) {
            serviceType = key;
            break;
          }
        }
      }
    } catch (e) { }
  }

  // Fallbacks
  if (!serviceType) {
    const slotLower = displaySlot.toLowerCase();
    if (slotLower.includes('breakfast')) serviceType = 'Breakfast';
    else if (slotLower.includes('lunch')) serviceType = 'Lunch';
    else if (slotLower.includes('dinner')) serviceType = 'Dinner';
    else if (meal.service_types && !meal.service_types.includes(',')) {
      serviceType = meal.service_types.trim();
    }
  }

  const serviceTypeLower = serviceType.toLowerCase();

  const isScheduled = order.status === 'placed' || order.status === 'accepted';
  const isDelivered = order.status === 'completed';
  const isSkipped = order.status === 'skipped';
  const isCancelled = order.status === 'cancelled';
  const isDelivering = order.status === 'delivering';

  // Parse start time from displaySlot (e.g. "12:00 PM - 12:30 PM" -> 12:00 PM)
  const parseSlotTime = (slotStr: string, baseDate: Date): Date => {
    const defaultTime = new Date(baseDate);
    defaultTime.setHours(23, 59, 59, 999);
    if (!slotStr) return defaultTime;
    
    const match = slotStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return defaultTime;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    const d = new Date(baseDate);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const slotStartTime = parseSlotTime(displaySlot, selectedDate);
  
  // order_cutoff_hours represents hours BEFORE the delivery slot (default 12)
  const cutoffHoursBefore = meal.vendor?.vendor_profile?.order_cutoff_hours ?? meal.order_cutoff_hours ?? 12;
  
  const cutoffTime = new Date(slotStartTime.getTime() - (cutoffHoursBefore * 60 * 60 * 1000));
  
  const now = new Date();
  const isToday = selectedDate.toDateString() === now.toDateString();
  const isTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toDateString() === selectedDate.toDateString();

  const cutoffPassed = now > cutoffTime;

  const canSkip = isScheduled;

  const formatCutoffTime = (d: Date) => {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  };
  
  const cutoffText = formatCutoffTime(cutoffTime);
  const cutoffDateStr = cutoffTime.toDateString();
  const nowStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  let warningText = '';
  if (cutoffDateStr === nowStr) {
    warningText = `Cancellations are accepted until ${cutoffText} today.`;
  } else if (cutoffDateStr === yesterday.toDateString()) {
    warningText = `Cancellations were accepted until ${cutoffText} yesterday.`;
  } else {
    warningText = `Cancellations accepted until ${cutoffText} on ${cutoffTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`;
  }

  const handleSkip = async () => {
    setCancelling(true);
    try {
      await cancelCustomerOrder(order.id);
      showToast('Delivery cancelled successfully.', 'success');
      setIsConfirmingSkip(false);
      onRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to cancel delivery', 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="dc-card">
      <div className="dc-main">
        <div className="dc-thumbnail-wrapper">
          {meal.image_url ? (
            <img src={`http://localhost:1415${meal.image_url}`} alt={meal.name} className="dc-thumbnail" />
          ) : (
            <div className="dc-thumbnail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Utensils size={24} color="rgba(255,255,255,0.4)" />
            </div>
          )}
        </div>

        <div className="dc-info">
          <h4 className="dc-name" style={{ display: 'flex', alignItems: 'center' }}>
            {meal.name}
          </h4>
          <p className="dc-vendor">By {kitchenName}</p>
          <div className="dc-badges-row">
            {serviceType && (
              <span className={`dc-service-pill ${serviceTypeLower}`}>
                {serviceType}
              </span>
            )}
            <span className="dc-time-pill">
              <Clock size={12} /> {displaySlot}
            </span>
          </div>
        </div>
      </div>

      <div className="dc-footer">
        <div className="dc-status-col">
          {isScheduled && <span className="dc-status-badge dc-status-scheduled">Weekly</span>}
          {isDelivering && <span className="dc-status-badge dc-status-delivering">Out for Delivery</span>}
          {isDelivered && <span className="dc-status-badge dc-status-completed">Delivered</span>}
          {isSkipped && <span className="dc-status-badge dc-status-skipped">Skipped</span>}
          {isCancelled && <span className="dc-status-badge dc-status-cancelled">Cancelled</span>}
        </div>

        {isScheduled && (
          <>
            {!cutoffPassed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <span className="dc-warning">
                  <AlertTriangle size={12} /> {warningText}
                </span>
                {isConfirmingSkip ? (
                  <div className="dc-confirm-actions">
                    <button
                      className="dc-skip-btn dc-confirm-btn dc-btn-safe"
                      onClick={() => setIsConfirmingSkip(false)}
                      disabled={cancelling}
                    >
                      No
                    </button>
                    <button
                      className="dc-skip-btn dc-confirm-btn dc-btn-danger"
                      onClick={handleSkip}
                      disabled={cancelling}
                    >
                      {cancelling ? '...' : 'Yes'}
                    </button>
                  </div>
                ) : (
                  <button
                    className="dc-skip-btn"
                    onClick={() => setIsConfirmingSkip(true)}
                    disabled={cancelling}
                  >
                    Skip Delivery
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <span className="dc-warning" style={{ color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.1)', background: 'transparent' }}>
                  <Lock size={12} /> Cancellation window closed
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
