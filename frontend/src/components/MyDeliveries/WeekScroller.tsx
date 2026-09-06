import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface WeekScrollerProps {
  dates: Date[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export const WeekScroller: React.FC<WeekScrollerProps> = ({ dates, selectedDate, onSelectDate }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected date on mount or change
  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.querySelector('.ws-day-pill.active') as HTMLElement;
      if (activeEl) {
        scrollRef.current.scrollTo({
          left: activeEl.offsetLeft - scrollRef.current.clientWidth / 2 + activeEl.clientWidth / 2,
          behavior: 'smooth'
        });
      }
    }
  }, [selectedDate]);

  return (
    <div className="week-scroller-container">
      <div className="week-scroller" ref={scrollRef}>
        {dates.map((date) => {
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = date.getDate();

          return (
            <div
              key={date.toISOString()}
              className={`ws-day-pill ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectDate(date)}
            >
              {isSelected && (
                <motion.div
                  layoutId="active-date-indicator"
                  className="ws-active-indicator"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className="ws-content">
                <span className="ws-day-name">{dayName}</span>
                <span className="ws-day-num">{dayNum}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
