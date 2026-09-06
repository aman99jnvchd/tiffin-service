import { useState } from 'react';
import { ChefHat, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import '../styles/HomePage.css'; // Relies on styles currently in HomePage.css

export const FloatingCartWidget = () => {
  const { items: cartItems, clearCart, vendorName } = useCartStore();
  const navigate = useNavigate();
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  if (cartItems.length === 0) return null;

  const totalItems = cartItems.length;

  return (
    <div className={`cd-floating-cart-wrapper ${isConfirmingClear ? 'confirm-clear' : ''}`}>
      <div className="cd-floating-cart-inner">

        {/* Left Section */}
        <div className="cd-fc-left" onClick={() => {
          if (cartItems.length > 0) {
            navigate(`/kitchen/${cartItems[0].vendor_id}`);
          }
        }}>
          <div className="cd-fc-vendor-avatar">
            <ChefHat size={16} />
          </div>
          <div className="cd-fc-vendor-info">
            <span className="cd-fc-vendor-name">{vendorName}</span>
            <span className="cd-fc-view-menu">View Menu <ChevronRight size={12} style={{ marginTop: '1px' }} /></span>
          </div>
        </div>

        {/* Right Section */}
        <div className="cd-fc-right">
          <button
            className={`cd-fc-view-btn ${isConfirmingClear ? 'confirm' : ''}`}
            onClick={(e) => {
              if (isConfirmingClear) {
                e.stopPropagation();
                clearCart();
                setIsConfirmingClear(false);
              } else {
                navigate('/checkout');
              }
            }}
          >
            {isConfirmingClear ? (
              <span className="cd-fc-view-text">Remove</span>
            ) : (
              <>
                <span className="cd-fc-view-text">View Cart</span>
                <span className="cd-fc-items-text">{totalItems} item(s)</span>
              </>
            )}
          </button>
          <button
            className={`cd-fc-close-btn ${isConfirmingClear ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsConfirmingClear(!isConfirmingClear);
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
