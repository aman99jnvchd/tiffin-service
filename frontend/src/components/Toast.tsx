import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '../store/useToastStore';

export const Toast = () => {
  const { message, type, show, hideToast } = useToastStore();

  return (
    // mode="wait" ensures the old toast exits BEFORE the new one enters
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          // Add a unique key so Framer treats this as a new element when message changes
          key={message + type} 
                    
          initial={{ y: -100, opacity: 0, x: '-50%' }}
          animate={{ y: 20, opacity: 1, x: '-50%' }}
          exit={{ y: -100, opacity: 0, x: '-50%' }}
          transition={{ duration: 0.3 }}
          
          // Drag Logic
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }} 
          dragElastic={0.2}
          
          onDragEnd={(_, info) => {
            if (info.offset.y < -15) hideToast();
          }}
          
          className={`glass-toast-mobile ${type}`}
          style={{
            position: 'fixed',
            top: '40px',
            left: '50%',
            zIndex: 9999
          }}
        >
          <div className="toast-content">
            <div className={`status-dot ${type}`} />
            <span className="toast-text">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
