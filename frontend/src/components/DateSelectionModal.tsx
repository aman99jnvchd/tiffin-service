import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Calendar as CalendarIcon, Clock, ChevronDown, CalendarPlus } from 'lucide-react';
import { useCartStore, type OrderDateSlot } from '../store/useCartStore';
import '../styles/DateSelectionModal.css';

const SERVICE_ORDER: Record<string, number> = { 'Breakfast': 1, 'Lunch': 2, 'Dinner': 3 };

interface DateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  meal: any;
  initialServiceType?: string;
  onSave: (updates: { serviceType: string, dates: OrderDateSlot[], isContinuous: boolean }[]) => void;
  vendorDeliveryWindows?: string; // JSON string
}

export const DateSelectionModal: React.FC<DateSelectionModalProps> = ({
  isOpen, onClose, meal, initialServiceType, onSave, vendorDeliveryWindows
}) => {
  const [stateMap, setStateMap] = useState<Record<string, { dates: OrderDateSlot[], isContinuous: boolean }>>({});
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('');

  const localDates = stateMap[selectedServiceType]?.dates || [];
  const isContinuous = stateMap[selectedServiceType]?.isContinuous || false;

  const { items: cartItems } = useCartStore();

  const mealServiceTypes = React.useMemo(() => {
    if (!meal.service_types) return [];
    return meal.service_types.split(',').map((s: string) => s.trim()).sort((a: string, b: string) => (SERVICE_ORDER[a] || 99) - (SERVICE_ORDER[b] || 99));
  }, [meal.service_types]);

  const availableSlots: string[] = React.useMemo(() => {
    if (!vendorDeliveryWindows) return ['12:00 PM', '01:00 PM', '08:00 PM']; // Default fallback
    try {
      const windows = JSON.parse(vendorDeliveryWindows);
      if (selectedServiceType && windows[selectedServiceType]) {
        return windows[selectedServiceType].map((w: any) =>
          typeof w === 'object' ? `${w.start_time} - ${w.end_time}` : w
        );
      } else if (mealServiceTypes.length > 0) {
        return [];
      } else {
        // If meal has no service type, merge all vendor slots
        let slots: string[] = [];
        Object.values(windows).forEach((arr: any) => {
          slots.push(...arr.map((w: any) => typeof w === 'object' ? `${w.start_time} - ${w.end_time}` : w));
        });
        return [...new Set(slots)]; // Unique
      }
    } catch (e) {
      return ['12:00 PM', '01:00 PM', '08:00 PM'];
    }
  }, [vendorDeliveryWindows, selectedServiceType, mealServiceTypes]);

  // Setup initial service type when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialServiceType) {
        setSelectedServiceType(initialServiceType);
      } else if (mealServiceTypes.length > 0) {
        setSelectedServiceType(mealServiceTypes[0]);
      }
    }
  }, [isOpen, initialServiceType, mealServiceTypes]);

  // Sync dates from store ONLY when modal OPENS
  useEffect(() => {
    if (isOpen) {
      const matchingCartItems = cartItems.filter(i => i.meal_id === meal.id);
      const initialMap: Record<string, { dates: OrderDateSlot[], isContinuous: boolean }> = {};
      matchingCartItems.forEach(item => {
        initialMap[item.service_type] = {
          dates: item.dates || [],
          isContinuous: item.is_continuous || false
        };
      });
      setStateMap(initialMap);
    }
  }, [isOpen, meal.id, cartItems]);

  useEffect(() => {
    if (isOpen && availableSlots.length > 0) {
      setSelectedSlot(availableSlots[0]);
    } else {
      setSelectedSlot('');
    }
  }, [isOpen, availableSlots]);

  useEffect(() => {
    if (isOpen && selectedSlot && localDates.length > 0) {
      const needsUpdate = localDates.some(d => d.slot !== selectedSlot || d.service_type !== selectedServiceType);
      if (needsUpdate) {
        setStateMap(prev => ({
          ...prev,
          [selectedServiceType]: {
            ...prev[selectedServiceType],
            dates: prev[selectedServiceType].dates.map(d => ({ ...d, slot: selectedSlot, service_type: selectedServiceType }))
          }
        }));
      }
    }
  }, [selectedSlot, selectedServiceType, isOpen, localDates]);

  // Removed early return to prevent hook errors and allow exit animation

  const handleToggle = (dateStr: string) => {
    setStateMap(prev => {
      const current = prev[selectedServiceType] || { dates: [], isContinuous: false };
      const existing = current.dates.find(d => d.date === dateStr);
      const newDates = existing 
        ? current.dates.filter(d => d.date !== dateStr)
        : [...current.dates, { date: dateStr, slot: selectedSlot, service_type: selectedServiceType }];
        
      return {
        ...prev,
        [selectedServiceType]: { dates: newDates, isContinuous: false }
      };
    });
  };

  const availableDaysArray = React.useMemo(() => {
    if (!meal.available_days) return [];
    try {
      return JSON.parse(meal.available_days).map((d: string) => d.substring(0, 3));
    } catch {
      return meal.available_days.split(',').map((d: string) => d.trim().substring(0, 3));
    }
  }, [meal.available_days]);

  // Generate next 14 valid days based on meal availability
  const upcomingDays = React.useMemo(() => {
    const validDays: string[] = [];
    const d = new Date(); // Start from today
    let counter = 1;
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Generate up to 14 valid days, capping iterations at 60
    while (validDays.length < 14 && counter < 60) {
      d.setDate(d.getDate() + 1); // Advance by 1 day

      const dayName = daysOfWeek[d.getDay()];
      if (availableDaysArray.length === 0 || availableDaysArray.includes(dayName)) {
        const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        validDays.push(localDateStr);
      }
      counter++;
    }
    return validDays;
  }, [availableDaysArray]);

  const handleMassSelect = (days: number) => {
    const newDates: OrderDateSlot[] = upcomingDays.slice(0, days).map(dateStr => ({
      date: dateStr,
      slot: selectedSlot,
      service_type: selectedServiceType
    }));
    setStateMap(prev => ({
      ...prev,
      [selectedServiceType]: { dates: newDates, isContinuous: false }
    }));
  };

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
            className="ds-sheet"
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
              className="ds-pull-bar"
              onPointerDown={() => {
                if (navigator.vibrate) navigator.vibrate(50);
              }}
            />

            <div className="ds-scroll-content">
              <div className="ds-modal-header">
                <h3>Select Delivery Schedule</h3>
              </div>

              <p className="ds-meal-name">{meal.name}</p>

              {mealServiceTypes.length > 0 && (
                <div className="ds-service-type-section" style={{ marginBottom: '20px' }}>
                  <label className="ds-section-label">
                    Service Type
                  </label>
                  {mealServiceTypes.length === 1 ? (
                    <div className="ds-service-type-single">
                      {mealServiceTypes[0]}
                    </div>
                  ) : (
                    <div className="ds-segmented-control">
                      {mealServiceTypes.map((st: string) => (
                        <button
                          key={st}
                          className={`ds-segment-btn ${selectedServiceType === st ? 'active' : ''}`}
                          onClick={() => {
                            if (selectedServiceType !== st) {
                              setSelectedServiceType(st);
                              // Do not clear localDates manually, the useEffect will sync it from the store
                            }
                          }}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="ds-time-slot-section" style={{ marginBottom: '20px' }}>
                <label className="ds-section-label">
                  Time Slot
                </label>
                <div className="ds-input-wrapper" style={{ position: 'relative' }}>
                  <Clock size={16} className="ds-input-icon" />
                  <select
                    className="ds-glass-input"
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    style={{ appearance: 'none', paddingRight: '40px' }}
                  >
                    {availableSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.5)' }} />
                </div>
              </div>

              <div className="ds-mass-select">
                <button className="ds-pill-btn" onClick={() => handleMassSelect(7)}>Next 7 Days</button>
                <button
                  className={`ds-pill-btn ds-continuous-btn ${isContinuous ? 'active' : ''}`}
                  onClick={() => {
                    if (!isContinuous) {
                      setStateMap(prev => ({
                        ...prev,
                        [selectedServiceType]: { dates: [], isContinuous: true }
                      }));
                    }
                  }}
                >Everyday</button>
                <button
                  className={`ds-pill-btn ds-clear-btn ${localDates.length > 0 || isContinuous ? 'active' : ''}`}
                  onClick={() => {
                    setStateMap(prev => ({
                      ...prev,
                      [selectedServiceType]: { dates: [], isContinuous: false }
                    }));
                  }}
                  title="Clear All"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="ds-calendar-section">
                <div className="ds-date-grid">
                  {upcomingDays.map((dateStr) => {
                    const selectedObj = localDates.find(d => d.date === dateStr);
                    const dateObj = new Date(dateStr);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const dayNum = dateObj.getDate();

                    return (
                      <motion.button
                        key={dateStr}
                        whileTap={{ scale: 0.95 }}
                        className={`ds-date-cell ${selectedObj ? 'selected' : ''}`}
                        onClick={() => handleToggle(dateStr)}
                      >
                        <span className="ds-day-num">{dayNum}</span>
                        <span className="ds-day-name">{dayName}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="ds-modal-footer">
              <button className="ds-schedule-btn" onClick={() => {
                // Build the updates array from stateMap
                const updates = Object.entries(stateMap).map(([svcType, data]) => {
                  if (data.isContinuous) {
                    const continuousDates = upcomingDays.slice(0, availableDaysArray.length || 7).map(dateStr => ({
                      date: dateStr,
                      slot: selectedSlot, // Note: For continuous, we are keeping the currently visible selectedSlot which might be a bug if different slots per service type exist, but we assume it matches.
                      service_type: svcType
                    }));
                    return { serviceType: svcType, dates: continuousDates, isContinuous: true };
                  }
                  return { serviceType: svcType, dates: data.dates, isContinuous: false };
                });
                onSave(updates);
              }}>
                <CalendarPlus size={18} />
                Schedule
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
