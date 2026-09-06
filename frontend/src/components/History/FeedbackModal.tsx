import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';
import { submitOrderFeedback } from '../../api/axios';
import { useToastStore } from '../../store/useToastStore';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onRefresh: () => void;
}

const TAGS = ["Too Spicy", "Arrived Cold", "Portion too small", "Not Fresh", "Late Delivery"];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, order, onRefresh }) => {
  const showToast = useToastStore(s => s.showToast);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !order) return null;

  const meal = order.items?.[0]?.meal;
  if (!meal) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      return showToast("Please select a rating", "error");
    }
    
    setSubmitting(true);
    try {
      await submitOrderFeedback(order.id, {
        rating,
        feedback_tags: selectedTags.join(', '),
        feedback_comment: comment
      });
      showToast("Thank you for your feedback!", "success");
      onRefresh();
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to submit feedback", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fm-overlay" onClick={onClose}>
        <motion.div 
          className="fm-modal"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="fm-header">
            <h3>Rate Your Meal</h3>
            <p>How was the {meal.name} from {meal.kitchen_name}?</p>
          </div>
          
          <div className="fm-body">
            <div className="fm-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.div
                  key={star}
                  whileTap={{ scale: 0.8 }}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star 
                    size={40}
                    className={`fm-star ${rating >= star ? 'active' : ''} ${hoveredRating >= star ? 'hovered' : ''}`}
                    fill={(rating >= star || hoveredRating >= star) ? 'currentColor' : 'none'}
                  />
                </motion.div>
              ))}
            </div>

            {rating > 0 && rating <= 3 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="fm-tags"
              >
                {TAGS.map(tag => (
                  <div 
                    key={tag}
                    className={`fm-tag ${selectedTags.includes(tag) ? 'selected' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </div>
                ))}
              </motion.div>
            )}

            <textarea 
              className="fm-comment"
              placeholder="Any other comments? (Optional)"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>

          <div className="fm-footer">
            <motion.button 
              className="fm-btn fm-btn-secondary" 
              onClick={onClose}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            <motion.button 
              className="fm-btn fm-btn-primary" 
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              whileTap={{ scale: 0.95 }}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
