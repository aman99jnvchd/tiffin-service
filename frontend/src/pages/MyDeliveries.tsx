import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, PackageX, ChevronLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WeekScroller } from '../components/MyDeliveries/WeekScroller';
import { DeliveryCard } from '../components/MyDeliveries/DeliveryCard';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { ProfileCircle } from '../components/ProfileCircle';
import { getCustomerActiveOrders, getCustomerOrderHistory } from '../api/axios';
import { useToastStore } from '../store/useToastStore';
import '../styles/MyDeliveries.css';
import '../styles/CheckoutPage.css';

export const MyDeliveries: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const location = useLocation();
  // Default to today or the date passed via navigation state
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (location.state?.targetDate) {
      return new Date(location.state.targetDate);
    }
    return new Date();
  });
  const showToast = useToastStore(s => s.showToast);

  const fetchDeliveries = async () => {
    try {
      const [activeRes, historyRes] = await Promise.all([
        getCustomerActiveOrders(),
        getCustomerOrderHistory()
      ]);
      const allOrders = [
        ...(activeRes.data.data || []),
        ...(historyRes.data.data || [])
      ];
      setOrders(allOrders);
    } catch {
      showToast("Failed to load deliveries", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  // Generate dates starting from today, covering at least 15 days or up to selectedDate + 7 days
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    const diffTime = Math.max(0, selected.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Generate from today up to at least 14 days ahead, or selected + 7 days
    const totalDays = Math.max(14, diffDays + 7);
    
    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [selectedDate]);

  // Filter and flatten orders by selected date
  const deliveriesForSelectedDate = useMemo(() => {
    const targetDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    
    const flattenedDeliveries: any[] = [];

    orders.forEach(order => {
      let foundSlotForOrder = false;

      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.delivery_dates) {
            try {
              const parsed = typeof item.delivery_dates === 'string' ? JSON.parse(item.delivery_dates) : item.delivery_dates;
              if (Array.isArray(parsed)) {
                const matchingSlots = parsed.filter((d: any) => d.date === targetDateStr);
                if (matchingSlots.length > 0) {
                  foundSlotForOrder = true;
                  matchingSlots.forEach(slotData => {
                    flattenedDeliveries.push({
                      order,
                      specificSlot: slotData.slot,
                      serviceTypeProp: slotData.service_type
                    });
                  });
                }
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      }

      if (!foundSlotForOrder) {
        const orderDate = new Date(order.delivery_date);
        if (orderDate.toDateString() === selectedDate.toDateString()) {
          flattenedDeliveries.push({
            order,
            specificSlot: order.delivery_time || 'Time TBD',
            serviceTypeProp: ''
          });
        }
      }
    });

    return flattenedDeliveries;
  }, [orders, selectedDate]);

  return (
    <div className="md-container">
      <div className="checkout-topbar">
        <button className="checkout-back-btn" onClick={() => navigate('/')}>
          <ChevronLeft size={20} />
        </button>
        <h2 className="checkout-page-title">Deliveries</h2>
        <ProfileCircle />
      </div>

      <WeekScroller 
        dates={weekDates} 
        selectedDate={selectedDate} 
        onSelectDate={setSelectedDate} 
      />

      <div className="deliveries-list">
        {loading ? (
          <SkeletonLoader type="card" count={2} />
        ) : deliveriesForSelectedDate.length === 0 ? (
          <div className="empty-deliveries">
            <PackageX size={48} />
            <h3>No deliveries scheduled</h3>
            <p>You have no meals arriving on this day.</p>
          </div>
        ) : (
          deliveriesForSelectedDate.map((delivery, index) => (
            <DeliveryCard 
              key={`${delivery.order.id}-${index}`} 
              order={delivery.order}
              specificSlot={delivery.specificSlot}
              serviceTypeProp={delivery.serviceTypeProp}
              selectedDate={selectedDate}
              onRefresh={fetchDeliveries} 
            />
          ))
        )}
      </div>
    </div>
  );
};
