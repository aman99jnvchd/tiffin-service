import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Calendar, Clock, CreditCard, Trash2, Plus, Info, Wallet, ShieldCheck, Tag, ShieldAlert, ShoppingBag, Lock, Banknote } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { ProfileCircle } from '../components/ProfileCircle';
import { getMyAddresses, placeOrder, getCustomerWallet, getMyProfile } from '../api/axios';
import { AnimatePresence } from 'framer-motion';
import { SkeletonLoader } from '../components/SkeletonLoader';
import '../styles/HomePage.css'; // Reuse some layout styles if needed
import '../styles/CheckoutPage.css';
import '../styles/MealDetailsModal.css'; // Will create this

export const CheckoutPage = () => {
  const { items, getTotal, removeItem, clearCart, vendorId, vendorName } = useCartStore();
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);


  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(!!token);

  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'WALLET' | 'COD'>('WALLET');
  const [walletBalance, setWalletBalance] = useState(0);
  const [codEligible, setCodEligible] = useState(true);

  const isContinuous = items.some(item => item.is_continuous);
  const firstDeliveryCost = items.reduce((acc, item) => acc + item.price, 0);

  useEffect(() => {
    if (token) {
      fetchAddresses();
      fetchPaymentInfo();
    }
  }, [token]);

  const fetchPaymentInfo = async () => {
    try {
      const [walletRes, profileRes] = await Promise.all([
        getCustomerWallet(),
        getMyProfile()
      ]);
      setWalletBalance(walletRes.data.data.balance || 0);
      setCodEligible(profileRes.data.data.cod_eligible ?? true);
    } catch (e) {
      console.error("Failed to fetch payment info", e);
    }
  };


  const fetchAddresses = async () => {
    try {
      const res = await getMyAddresses();
      setAddresses(res.data.data || []);
      if (res.data.data?.length > 0) {
        // default to first address
        setSelectedAddressId(res.data.data[0].id);
      }
    } catch {
      showToast("Failed to load addresses", "error");
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) return showToast("Cart is empty", "error");
    if (!selectedAddressId) return showToast("Please select a delivery address", "error");

    // Compute earliest date to satisfy backend 'delivery_date' requirement
    let allDates: string[] = [];
    items.forEach(i => allDates.push(...i.dates.map(d => d.date)));
    allDates.sort();

    if (allDates.length === 0) return showToast("Please select dates for your items", "error");
    const earliestDate = allDates[0];
    const latestDate = allDates[allDates.length - 1];

    setLoading(true);
    try {
      const payload = {
        vendor_id: vendorId,
        address_id: selectedAddressId,
        delivery_date: earliestDate,
        subscription_start_date: earliestDate,
        subscription_end_date: isContinuous ? null : latestDate,
        is_continuous: isContinuous,
        items: items.map(i => ({
          meal_id: i.meal_id,
          quantity: i.dates.length,
          delivery_dates: i.dates
        }))
      };

      await placeOrder(payload);
      showToast("Order placed successfully!", "success");
      clearCart();
      navigate('/orders');
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to place order", "error");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="checkout-container empty-cart">
        <div style={{ marginTop: '20px' }}>
          <ShoppingBag size={48} className="empty-cart-icon" />
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added any meals yet.</p>
          <button className="glass-button primary" onClick={() => navigate('/')}>
            Browse Meals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <div className="checkout-topbar">
        <button className="checkout-back-btn" onClick={() => navigate(vendorId ? `/kitchen/${vendorId}` : '/')}>
          <ChevronLeft size={20} />
        </button>
        <h2 className="checkout-page-title">Checkout</h2>
        <ProfileCircle />
      </div>

      <div className="checkout-grid">
        {/* Left Column: Details */}
        <div className="checkout-left">

          {/* Items Section */}
          <section className="glass-card">
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingBag size={20} /> Order Summary</h3>
            <div className="cart-items-list">
              {items.map(item => (
                <div key={item.meal_id} className="co-cart-card">
                  <div className="co-cart-card-header">
                    <div className="co-cart-info">
                      <h4>{item.name}</h4>
                    </div>
                    <div className="co-cart-actions">
                      {!item.is_continuous ? (
                        <span className="co-cart-math">
                          <span style={{ color: 'rgba(255,255,255,0.8)' }}>{item.dates.length} {item.dates.length === 1 ? 'Day' : 'Days'}</span>
                          <span style={{ margin: '0 4px', color: 'rgba(255,255,255,0.4)' }}>×</span>
                          ₹{item.price} <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>/ meal</span>
                          <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.4)' }}>=</span>
                          <strong>₹{item.dates.length * item.price}</strong>
                        </span>
                      ) : (
                        <span className="co-cart-math">
                          <strong>₹{item.price}</strong> <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>/ meal</span>
                        </span>
                      )}
                      <button className="co-cart-remove" onClick={() => removeItem(item.meal_id)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="co-cart-dates-section">
                    <span className="co-cart-dates-title">
                      {item.is_continuous ? 'Continuous Subscription' : 'Fixed Duration Subscription'}
                    </span>
                    <div className="co-cart-dates-scroll">
                      {item.is_continuous ? (
                        <span className="co-date-chip">
                          Everyday • {item.dates[0]?.slot || ''}
                        </span>
                      ) : (
                        <>
                          {item.dates.slice(0, 4).map(d => (
                            <span key={d.date} className="co-date-chip">
                              {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {d.slot}
                            </span>
                          ))}
                          {item.dates.length > 4 && (
                            <span className="co-date-chip more-chip">
                              +{item.dates.length - 4} more
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Address Section */}
          {token && (
            <section className="glass-card">
              <div className="section-header">
                <h3 className="section-title"><MapPin size={18} /> Delivery Address</h3>
                <button className="add-address-btn" onClick={() => navigate('/profile')}>
                  <Plus size={16} /> <span className="add-address-text">Add New</span>
                </button>
              </div>

              {loadingAddresses ? (
                <div className="address-grid">
                  <SkeletonLoader type="list" count={2} className="address-card" style={{ height: 100 }} />
                </div>
              ) : addresses.length === 0 ? (
                <div className="no-address">
                  <p style={{ fontSize: '0.85rem' }}>No addresses found. Please add an address to continue.</p>
                </div>
              ) : (
                <div className="address-grid">
                  {addresses.map(addr => (
                    <div
                      key={addr.id}
                      className={`address-card ${selectedAddressId === addr.id ? 'selected' : ''}`}
                      onClick={() => setSelectedAddressId(addr.id)}
                    >
                      <div className="address-label-wrap">
                        <span className="address-label">{addr.label}</span>
                      </div>
                      <p className="address-text">
                        {addr.house_no && <span style={{ fontWeight: 600 }}>#{addr.house_no}</span>}
                        {addr.house_no ? ', ' : ''}
                        {addr.address_text}
                      </p>
                      {addr.pincode && <p className="address-pin">{addr.pincode}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right Column: Trust & Confirmation */}
        <div className="checkout-right">
          <div className="glass-card payment-summary-card">
            <h3 className="section-title"><ShieldCheck size={18} /> Confirm Subscriptions</h3>

            <div className="trust-rows">
              <div className="trust-row">
                <div className="trust-icon" style={{ color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)' }}>
                  <Wallet size={18} />
                </div>
                <div className="trust-text">
                  <h4>Pay via Wallet or COD</h4>
                  <p>Pay daily upon delivery, or use your Tiffini Wallet for a seamless, cashless experience.</p>
                </div>
              </div>

              <div className="trust-row">
                <div className="trust-icon" style={{ color: '#c084fc', background: 'rgba(192, 132, 252, 0.1)' }}>
                  <Tag size={18} />
                </div>
                <div className="trust-text">
                  <h4>Inclusive, Flat Pricing</h4>
                  <p>The price you see includes delivery and all applicable taxes. No surprises at checkout.</p>
                </div>
              </div>

              <div className="trust-row">
                <div className="trust-icon" style={{ color: '#fb923c', background: 'rgba(251, 146, 60, 0.1)' }}>
                  <ShieldAlert size={18} />
                </div>
                <div className="trust-text">
                  <h4>Fair Cancellation Policy</h4>
                  <p>To prevent food waste, Skip for free before the cut-off time. Unclaimed deliveries or late cancellations are charged to your account, and cash privileges will be paused.</p>
                </div>
              </div>
            </div>

            <hr className="bill-divider" style={{ margin: '20px 0' }} />

            {token ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="place-order-btn confirm-btn"
                onClick={() => setIsPaymentDrawerOpen(true)}
                disabled={loading || !selectedAddressId || items.length === 0}
              >
                {loading ? <div className="spinner small"></div> : 'Select Payment Method'}
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="place-order-btn confirm-btn"
                onClick={() => navigate('/login', { state: { from: '/checkout' } })}
              >
                Log in to Continue
              </motion.button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isPaymentDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="global-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setIsPaymentDrawerOpen(false)}
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
                  setIsPaymentDrawerOpen(false);
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

              {/* Scroll Content */}
              <div className="mdm-scroll-content">
                <div className="mdm-body">
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 24px 0', color: 'white' }}>How would you like to pay?</h3>

                  {/* Wallet Card */}
                  <motion.div 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (walletBalance >= firstDeliveryCost) {
                        setSelectedPaymentMethod('WALLET');
                      }
                    }}
                    style={{
                      background: selectedPaymentMethod === 'WALLET' ? 'rgba(124, 77, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: selectedPaymentMethod === 'WALLET' ? '1px solid #7c4dff' : '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                      cursor: walletBalance >= firstDeliveryCost ? 'pointer' : 'default',
                      boxShadow: selectedPaymentMethod === 'WALLET' ? '0 4px 20px rgba(124, 77, 255, 0.25)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: selectedPaymentMethod === 'WALLET' ? 'rgba(124,77,255,0.2)' : 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px', color: selectedPaymentMethod === 'WALLET' ? '#7c4dff' : '#aaa', transition: 'all 0.2s ease' }}>
                        <Wallet size={24} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'white' }}>Tiffini Wallet</h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
                          Available Balance: ₹{walletBalance}
                        </p>
                      </div>
                    </div>
                    {walletBalance < firstDeliveryCost && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate('/wallet'); }}
                        style={{ background: 'rgba(124,77,255,0.2)', color: '#7c4dff', border: '1px solid rgba(124,77,255,0.4)', padding: '8px 12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}
                      >
                        Recharge +₹500
                      </button>
                    )}
                  </motion.div>

                  {/* COD Card */}
                  <motion.div 
                    whileTap={codEligible ? { scale: 0.98 } : {}}
                    onClick={() => {
                      if (codEligible) {
                        setSelectedPaymentMethod('COD');
                      }
                    }}
                    style={{
                      background: selectedPaymentMethod === 'COD' ? 'rgba(124, 77, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: selectedPaymentMethod === 'COD' ? '1px solid #7c4dff' : '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      opacity: codEligible ? 1 : 0.5,
                      cursor: codEligible ? 'pointer' : 'not-allowed',
                      boxShadow: selectedPaymentMethod === 'COD' ? '0 4px 20px rgba(124, 77, 255, 0.25)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: selectedPaymentMethod === 'COD' ? 'rgba(124,77,255,0.2)' : 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px', color: selectedPaymentMethod === 'COD' ? '#7c4dff' : '#aaa', transition: 'all 0.2s ease' }}>
                        <Banknote size={24} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'white' }}>Pay on Delivery</h4>
                        {!codEligible && (
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#ef4444' }}>
                            Unavailable due to pending dues.
                          </p>
                        )}
                      </div>
                    </div>
                    {!codEligible && (
                      <Lock size={20} color="#666" />
                    )}
                  </motion.div>

                  {/* Confirm Button */}
                  <div style={{ marginTop: '24px' }}>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="place-order-btn confirm-btn"
                      onClick={() => { setIsPaymentDrawerOpen(false); handlePlaceOrder(); }}
                      disabled={loading || (selectedPaymentMethod === 'WALLET' && walletBalance < firstDeliveryCost) || (selectedPaymentMethod === 'COD' && !codEligible)}
                      style={{ padding: '16px' }}
                    >
                      {loading ? <div className="spinner small"></div> : `Confirm with ${selectedPaymentMethod === 'WALLET' ? 'Wallet' : 'Cash'}`}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

const ShoppingBagIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="empty-cart-icon">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
