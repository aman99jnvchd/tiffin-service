import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Clock, ChefHat, Utensils, CalendarPlus, Sunrise, Sun, Moon } from 'lucide-react';
import { MealServiceIcons } from '../components/MealServiceIcons';
import { getVendors, getPublicMenu } from '../api/axios';
import { useToastStore } from '../store/useToastStore';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { FloatingCartWidget } from '../components/FloatingCartWidget';
import { DateSelectionModal } from '../components/DateSelectionModal';
import { MealDetailsModal } from '../components/MealDetailsModal';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { formatServiceHours } from '../utils/timeFormat';
import '../styles/VendorKitchenPage.css';
import '../styles/HomePage.css'; // Reusing meal card styles

// Debounce helper
const useDebounce = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

export const VendorKitchenPage = () => {
  const { id } = useParams<{ id: string }>();
  const vendorId = Number(id);
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  const { items: cartItems, removeItem } = useCartStore();
  const { dietaryPreference: initialDietaryPref, includeEggs: initialEggs, setAuth, token, role, isOnboardingComplete } = useAuthStore();

  const [activeMealId, setActiveMealId] = useState<number | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<any | null>(null);
  const [showMealDetails, setShowMealDetails] = useState(false);

  const [vendor, setVendor] = useState<any>(null);
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dietaryPref, setDietaryPref] = useState(initialDietaryPref || 'Any');
  const [includeEggs, setIncludeEggs] = useState(initialEggs || false);
  const [showEggPopup, setShowEggPopup] = useState(false);

  // Search logic
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    fetchVendorAndMeals();
  }, [vendorId, dietaryPref, includeEggs]);

  const fetchVendorAndMeals = async () => {
    setLoading(true);
    try {
      // Fetch all vendors and find the one with matching ID
      const vendorsRes = await getVendors();
      const allVendors = vendorsRes.data.data || [];
      const foundVendor = allVendors.find((v: any) => v.id === vendorId);

      if (!foundVendor) {
        showToast("Kitchen not found", "error");
        navigate('/');
        return;
      }
      setVendor(foundVendor);

      // Fetch meals for this specific vendor, applying local dietary preference filters
      const prefStr = dietaryPref === 'Any' ? null : dietaryPref;
      const menuRes = await getPublicMenu(vendorId, prefStr, includeEggs);
      setMeals(menuRes.data.data || []);
    } catch (err: any) {
      console.error("fetchVendorAndMeals error:", err);
      showToast(err.response?.data?.detail || err.message || "Failed to load kitchen details", "error");
    } finally {
      setLoading(false);
    }
  };

  // Filter meals based on local search query
  const filteredMeals = meals.filter(m =>
    m.name.toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  return (
    <div className={`vkp-container ${cartItems.length > 0 ? 'has-cart' : ''}`}>
      {/* Header */}
      <div className="vkp-header">
        <button className="vkp-back-btn" onClick={() => navigate('/')}>
          <ChevronLeft size={20} />
        </button>
        <div className="vkp-search-wrapper">
          <div className={`cd-search-bar ${focused ? 'cd-search-bar--focused' : ''}`}>
            <Search size={18} color="rgba(255,255,255,0.4)" />
            <input
              type="text"
              placeholder={`Search in ${vendor?.kitchen_name || 'Menu'}...`}
              className="cd-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="vkp-menu-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SkeletonLoader type="text" style={{ height: 40, width: '30%' }} />
          <div className="vkp-meals-grid">
            <SkeletonLoader type="card" count={4} />
          </div>
        </div>
      ) : (
        <>
          {/* Hero Section */}
          {vendor && (
            <div className="vkp-hero">
              <div className="vkp-hero-title-row">
                <h1 className="vkp-kitchen-name">{vendor.kitchen_name}</h1>
              </div>
              <div className="vkp-hero-meta">
                {vendor.delivery_windows ? (
                  formatServiceHours(vendor.delivery_windows).map(sw => {
                    let Icon = Clock;
                    let iconColor = 'rgba(255, 255, 255, 0.5)';
                    let iconBg = 'transparent';

                    if (sw.service === 'Breakfast') {
                      Icon = Sunrise;
                      iconColor = '#F97316';
                      iconBg = 'rgba(249, 115, 22, 0.15)';
                    }
                    else if (sw.service === 'Lunch') {
                      Icon = Sun;
                      iconColor = '#EAB308';
                      iconBg = 'rgba(234, 179, 8, 0.15)';
                    }
                    else if (sw.service === 'Dinner') {
                      Icon = Moon;
                      iconColor = '#3B82F6';
                      iconBg = 'rgba(59, 130, 246, 0.15)';
                    }

                    return (
                      <div key={sw.service} className="cd-vendor-service-pill">
                        <div className="cd-vendor-service-icon" style={{ background: iconBg, color: iconColor }}>
                          <Icon size={14} strokeWidth={2.5} />
                        </div>
                        <span className="cd-vendor-service-name">{sw.service}</span>
                        <span className="cd-vendor-service-dot">&bull;</span>
                        <span className="cd-vendor-service-time">{sw.hours}</span>
                      </div>
                    );
                  })
                ) : vendor.open_time && vendor.close_time ? (
                  <div className="cd-vendor-service-pill">
                    <div className="cd-vendor-service-icon" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255, 255, 255, 0.5)' }}>
                      <Clock size={14} strokeWidth={2.5} />
                    </div>
                    <span className="cd-vendor-service-name">Open</span>
                    <span className="cd-vendor-service-dot">&bull;</span>
                    <span className="cd-vendor-service-time">{vendor.open_time} – {vendor.close_time}</span>
                  </div>
                ) : null}

                <div className="cd-vendor-service-pill">
                  <div className="cd-vendor-service-icon" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255, 255, 255, 0.5)' }}>
                    <ChefHat size={14} strokeWidth={2.5} />
                  </div>
                  <span className="cd-vendor-service-time">{meals.length} items</span>
                </div>
              </div>
            </div>
          )}

          {/* Dietary Filters */}
          <div className="vkp-dietary-filters">
            <button
              className={`pill-btn any ${dietaryPref === 'Any' ? 'active' : ''}`}
              onClick={() => setDietaryPref('Any')}
            >
              Both
            </button>
            <button
              className={`pill-btn veg ${dietaryPref === 'Pure Veg Only' ? 'active' : ''}`}
              onClick={() => {
                if (dietaryPref !== 'Pure Veg Only') {
                  setShowEggPopup(true);
                }
              }}
            >
              {dietaryPref === 'Pure Veg Only' && includeEggs ? 'Veg + Egg' : 'Veg'}
            </button>
            <button
              className={`pill-btn nonveg ${dietaryPref === 'Non-Veg Only' ? 'active' : ''}`}
              onClick={() => setDietaryPref('Non-Veg Only')}
            >
              Non-Veg
            </button>
          </div>

          {/* Menu Section */}
          <section className="vkp-menu-section">
            <h2 className="vkp-section-title"><Utensils size={18} /> Full Menu</h2>

            {filteredMeals.length === 0 ? (
              <div className="vkp-empty">
                {debouncedQuery ? `No items found matching "${debouncedQuery}"` : 'No meals available right now'}
              </div>
            ) : (
              <div className="vkp-meals-grid">
                {filteredMeals.map((m) => (
                  <div
                    key={m.id}
                    className={`cd-meal-card ${!m.is_active ? 'inactive' : ''}`}
                    onClick={() => { 
                      if (m.is_active) {
                        setSelectedMeal(m); 
                        setShowMealDetails(true); 
                      }
                    }}
                  >
                    <div className="cd-meal-img-placeholder">
                      {m.image_url
                        ? <img src={`http://localhost:1415${m.image_url}`} alt={m.name} className="cd-meal-img" />
                        : <Utensils size={32} />
                      }
                      <div className="cd-meal-tags-wrapper">
                        <span className="cd-meal-tag">{m.is_always_available ? 'daily' : 'weekly'}</span>
                        {!m.is_active && <span className="cd-meal-tag unavailable">Unavailable</span>}
                      </div>
                      <MealServiceIcons serviceTypes={m.service_types} />
                    </div>
                    <div className="cd-meal-info">
                      <div className="cd-meal-top">
                        <h4 className="cd-meal-name">{m.name}</h4>
                      </div>
                      <div className="cd-meal-footer">
                        <span className="cd-meal-price">
                          <span className="cd-meal-currency">₹</span>
                          {Number(m.base_price).toFixed(0)}
                        </span>

                        {cartItems.find(i => i.meal_id === m.id) ? (
                          <div className="cd-quantity-controls" onClick={e => e.stopPropagation()}>
                            <span style={{ fontSize: '0.85rem' }}>
                              {(() => {
                                const cartItem = cartItems.find(i => i.meal_id === m.id);
                                if (cartItem?.is_continuous) return 'Daily';
                                const days = cartItem?.dates?.length || 0;
                                return `${days} Day(s)`;
                              })()}
                            </span>
                            <button 
                              className="cd-add-btn edit" 
                              disabled={!m.is_active}
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (m.is_active) {
                                  setSelectedMeal(m); 
                                  setActiveMealId(m.id); 
                                }
                              }}>
                              <CalendarPlus size={14} /> <span className="cd-hide-on-mobile">Edit</span>
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="cd-add-btn" 
                            disabled={!m.is_active}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (m.is_active) {
                                setSelectedMeal(m); 
                                setActiveMealId(m.id); 
                              }
                            }} 
                          >
                            <CalendarPlus size={16} /> <span className="cd-hide-on-mobile">{m.is_active ? 'Select' : 'N/A'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* MealDetailsModal — single instance, outside the loop */}
          <MealDetailsModal
            meal={selectedMeal}
            isOpen={showMealDetails}
            onClose={() => setShowMealDetails(false)}
            onSchedule={() => {
              if (selectedMeal) setActiveMealId(selectedMeal.id);
              setShowMealDetails(false);
            }}
            hideVendorName={true}
          />
          {selectedMeal && (
            <DateSelectionModal
              isOpen={activeMealId === selectedMeal.id}
              onClose={() => setActiveMealId(null)}
              meal={selectedMeal}
              initialDates={cartItems.find(i => i.meal_id === selectedMeal.id)?.dates || []}
              initialIsContinuous={cartItems.find(i => i.meal_id === selectedMeal.id)?.is_continuous || false}
              vendorDeliveryWindows={vendor?.delivery_windows || null}
              onSave={(dates, isContinuous) => {
                useCartStore.getState().setMealDates(
                  {
                    meal_id: selectedMeal.id,
                    name: selectedMeal.name,
                    price: Number(selectedMeal.base_price),
                    image_url: selectedMeal.image_url,
                    vendor_id: selectedMeal.vendor_id,
                    kitchen_name: selectedMeal.kitchen_name
                  },
                  dates,
                  isContinuous
                );
                setActiveMealId(null);
              }}
            />
          )}
        </>
      )}

      {/* Floating Cart Button */}
      {cartItems.length > 0 && <FloatingCartWidget />}
      {showEggPopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }} onClick={() => setShowEggPopup(false)}>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '24px', maxWidth: '320px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '8px', fontSize: '1.25rem', fontWeight: 700 }}>Include Eggs?</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
              Would you like to include egg-based dishes in your vegetarian menu?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', color: '#4ade80', padding: '14px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                onClick={() => {
                  setDietaryPref('Pure Veg Only');
                  setIncludeEggs(true);
                  setShowEggPopup(false);
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(74, 222, 128, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(74, 222, 128, 0.1)'}
              >
                Yes, include eggs
              </button>
              <button 
                style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '14px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                onClick={() => {
                  setDietaryPref('Pure Veg Only');
                  setIncludeEggs(false);
                  setShowEggPopup(false);
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
              >
                No, pure veg only
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
