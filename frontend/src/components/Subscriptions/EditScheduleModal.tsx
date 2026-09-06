import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';
import { updateCustomerSubscription } from '../../api/axios';
import { useToastStore } from '../../store/useToastStore';
import { Link } from 'react-router-dom';

interface EditScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: any;
  onRefresh: () => void;
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const EditScheduleModal: React.FC<EditScheduleModalProps> = ({ isOpen, onClose, subscription, onRefresh }) => {
  const showToast = useToastStore(s => s.showToast);
  
  // Parse existing selected days, defaulting to empty array if none
  const [selectedDays, setSelectedDays] = useState<number[]>(() => {
    try {
      return JSON.parse(subscription?.selected_days || '[]');
    } catch {
      return [];
    }
  });
  const [saving, setSaving] = useState(false);

  const parsedAvailableDays = useMemo(() => {
    if (!subscription?.meal?.available_days) return null; // null means all days available
    try {
      if (subscription.meal.available_days.startsWith('[')) {
        return JSON.parse(subscription.meal.available_days).map((d: string) => d.substring(0, 3));
      }
      return subscription.meal.available_days.split(',').map((d: string) => d.trim().substring(0, 3));
    } catch {
      return null;
    }
  }, [subscription]);

  // Backend uses ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const DAY_MAPPING = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const isDayAvailable = (idx: number) => {
    if (!parsedAvailableDays) return true;
    return parsedAvailableDays.includes(DAY_MAPPING[idx]);
  };

  const toggleDay = (index: number) => {
    setSelectedDays(prev => 
      prev.includes(index) 
        ? prev.filter(d => d !== index)
        : [...prev, index].sort()
    );
  };

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      try {
        setSelectedDays(JSON.parse(subscription?.selected_days || '[]'));
      } catch {
        setSelectedDays([]);
      }
    }
  }, [isOpen, subscription]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Ensure the loader is visible for at least 500ms even if the API is extremely fast
      await Promise.all([
        updateCustomerSubscription(subscription.id, { selected_days: selectedDays }),
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
      
      // Stop the loader so "SAVE" text comes back
      setSaving(false);
      
      showToast('Schedule updated successfully', 'success');
      onRefresh();
      onClose();
    } catch (err: any) {
      setSaving(false);
      showToast(err.response?.data?.detail || 'Failed to update schedule', 'error');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && subscription && (
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
                <h3>Edit Schedule</h3>
              </div>
              
              <p className="ds-meal-name">
                {subscription.meal?.name || 'Meal Plan'}
              </p>
              
              <div className="sm-days-grid">
                {DAYS.map((day, idx) => {
                  const available = isDayAvailable(idx);
                  return (
                    <motion.div 
                      key={idx}
                      className={`sm-day-toggle ${selectedDays.includes(idx) ? 'selected' : ''}`}
                      onClick={() => available && toggleDay(idx)}
                      whileTap={available ? { scale: 0.9 } : {}}
                      style={{ 
                        opacity: available ? 1 : 0.3, 
                        cursor: available ? 'pointer' : 'not-allowed',
                        pointerEvents: available ? 'auto' : 'none'
                      }}
                    >
                      {day}
                    </motion.div>
                  );
                })}
              </div>

              <div className="sm-warning">
                <Info size={16} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span>• <strong>Unselecting a day</strong> cancels all upcoming deliveries for that day of the week. To skip a single date, use the <Link to="/my-deliveries" className="sm-link"><strong>My Deliveries</strong></Link> page instead.</span>
                  <span>• Changes made today will apply to deliveries starting after tomorrow due to kitchen prep times.</span>
                </div>
              </div>
            </div>

            <div className="ds-modal-footer sm-dual-footer">
              <button 
                className="sm-btn-cancel"
                onClick={onClose}
              >
                CANCEL
              </button>
              <button 
                className="sm-btn-save"
                onClick={handleSave}
                disabled={saving}
                style={{ 
                  opacity: saving ? 0.7 : 1, 
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {saving ? <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span> : 'SAVE'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
