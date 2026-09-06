import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, CalendarDays, Utensils } from 'lucide-react';
import '../styles/MealDetailsModal.css';

interface MealDetailsModalProps {
  meal: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSchedule: () => void;
  hideVendorName?: boolean;
}

const DAY_ORDER: Record<string, number> = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7 };
const SERVICE_ORDER: Record<string, number> = { 'Breakfast': 1, 'Lunch': 2, 'Dinner': 3 };

/** Small Indian-standard dietary icon — square with dot */
const DietaryIcon: React.FC<{ type: string }> = ({ type }) => {
  const isVeg = type === 'veg';
  const isEgg = type === 'egg';
  const color = isVeg ? '#22c55e' : isEgg ? '#eab308' : '#ef4444';

  return (
    <div
      className="mdm-dietary-icon"
      style={{ borderColor: color }}
      title={isVeg ? 'Vegetarian' : isEgg ? 'Egg' : 'Non-Vegetarian'}
    >
      <div className="mdm-dietary-dot" style={{ background: color }} />
    </div>
  );
};

export const MealDetailsModal: React.FC<MealDetailsModalProps> = ({
  meal,
  isOpen,
  onClose,
  onSchedule,
  hideVendorName = false,
}) => {
  if (!meal) return null;

  const hasImage = !!meal.image_url;
  const vendorDeliveryWindows = meal?.vendor?.vendor_profile?.delivery_windows || "{}";

  const sortedDays = React.useMemo(() => {
    if (!meal?.available_days) return [];
    return meal.available_days.split(',').map((d: string) => d.trim()).sort((a: string, b: string) => (DAY_ORDER[a.substring(0,3)] || 99) - (DAY_ORDER[b.substring(0,3)] || 99));
  }, [meal?.available_days]);

  const sortedServices = React.useMemo(() => {
    if (!meal?.service_types) return [];
    return meal.service_types.split(',').map((s: string) => s.trim()).sort((a: string, b: string) => (SERVICE_ORDER[a] || 99) - (SERVICE_ORDER[b] || 99));
  }, [meal?.service_types]);

  const handleSchedule = () => {
    onClose();
    setTimeout(onSchedule, 120);
  };

  const dietaryType = meal.dietary_type || 'veg';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="global-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            className="mdm-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
          >
            {/* Pull Indicator */}
            <div 
              className="mdm-pull-bar" 
              onPointerDown={() => {
                if (navigator.vibrate) navigator.vibrate(50);
              }}
            />

            {/* ── SCROLLABLE CONTENT ── */}
            <div className="mdm-scroll-content">
              
              <div className="mdm-body">
                {/* ── CARD 1: MEAL INFORMATION ── */}
                <div className="mdm-nested-card">
                  {/* Hero Image — edge-to-edge at the top of the card */}
                  <div className="mdm-hero-image-wrap">
                    {hasImage ? (
                      <img
                        src={`http://localhost:1415${meal.image_url}`}
                        alt={meal.name}
                        className="mdm-hero-image"
                      />
                    ) : (
                      <div className="mdm-hero-placeholder">
                        <Utensils size={40} strokeWidth={1.2} />
                        <span>No photo</span>
                      </div>
                    )}
                  </div>

                  {/* Content Padding */}
                  <div className="mdm-nested-card-content mdm-meal-info">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <h2 className="mdm-meal-name" style={{ margin: 0, textAlign: 'left', flex: 1, paddingRight: '12px' }}>{meal.name}</h2>
                      <DietaryIcon type={dietaryType} />
                    </div>
                    {meal.description && (
                      <p className="mdm-description" style={{ margin: 0, textAlign: 'left', width: '100%' }}>{meal.description}</p>
                    )}
                  </div>
                </div>

                {/* ── CARD 2: VENDOR & AVAILABILITY ── */}
                <div className="mdm-nested-card mdm-vendor-details">
                  
                  {/* Vendor Info */}
                  {!hideVendorName && (
                    <div className="mdm-vendor-row">
                      <div className="mdm-vendor-avatar">
                        <ChefHat size={16} />
                      </div>
                      <span className="mdm-vendor-name">{meal.kitchen_name}</span>
                    </div>
                  )}

                  {/* Schedule Info */}
                  <div className="mdm-schedule-row" style={{ alignItems: 'flex-start' }}>
                    <CalendarDays size={16} className="mdm-schedule-icon" style={{ marginTop: '2px' }} />
                    <div className="mdm-service-types" style={{ marginTop: 0 }}>
                      {meal.is_always_available ? (
                        <span className="mdm-service-chip">Daily</span>
                      ) : sortedDays.length > 0 ? (
                        sortedDays.map((day: string, idx: number) => (
                          <span key={idx} className="mdm-service-chip">{day}</span>
                        ))
                      ) : (
                        <span className="mdm-service-chip">Scheduled Item</span>
                      )}
                    </div>
                  </div>

                  {/* Service Types */}
                  {sortedServices.length > 0 && (
                    <div className="mdm-service-types">
                      {sortedServices.map((s: string) => {
                        const lowerS = s.toLowerCase();
                        let bg = 'rgba(255,255,255,0.08)';
                        let color = 'white';
                        if (lowerS.includes('breakfast')) { bg = 'rgba(251, 146, 60, 0.15)'; color = '#fb923c'; }
                        else if (lowerS.includes('lunch')) { bg = 'rgba(250, 204, 21, 0.15)'; color = '#facc15'; }
                        else if (lowerS.includes('dinner')) { bg = 'rgba(96, 165, 250, 0.15)'; color = '#60a5fa'; }
                        return <span key={s} className="mdm-service-chip" style={{ background: bg, color, border: 'none' }}>{s}</span>
                      })}
                    </div>
                  )}

                </div>
              </div>

            </div>

            {/* ── STICKY ACTION BAR ── */}
            <div className="mdm-action-bar">
              <div className="mdm-price-col">
                <span className="mdm-price-label">Price</span>
                <span className="mdm-price-value">
                  <span className="mdm-price-currency">₹</span>{Number(meal.base_price).toFixed(0)}
                </span>
              </div>
              <motion.button
                className="mdm-schedule-btn"
                whileTap={{ scale: 0.96 }}
                onClick={handleSchedule}
              >
                <CalendarDays size={16} />
                Schedule
              </motion.button>
            </div>
            
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
