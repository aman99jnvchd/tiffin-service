import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Star, Clock, ChefHat, Utensils, Flame, MapPin, X, ShoppingBag, ChevronRight, CalendarPlus, Sunrise, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getVendors, getPublicMenu, searchPublic } from '../api/axios';
import { useToastStore } from '../store/useToastStore';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { FloatingCartWidget } from './FloatingCartWidget';
import { ProfileCircle } from './ProfileCircle';
import { DateSelectionModal } from './DateSelectionModal';
import { MealDetailsModal } from './MealDetailsModal';
import { SkeletonLoader } from './SkeletonLoader';
import { MealServiceIcons } from './MealServiceIcons';
import { DebtWarningBanner } from './DebtWarningBanner';
import { formatDeliveryWindows, formatServiceHours } from '../utils/timeFormat';
import '../styles/HomePage.css';

const CATEGORIES = [
  { icon: '✨', label: 'All' },
  { icon: '🍱', label: 'Tiffin' },
  { icon: '🍛', label: 'Curry' },
  { icon: '🥗', label: 'Salads' },
  { icon: '🍚', label: 'Rice' },
  { icon: '🫓', label: 'Roti' },
  { icon: '🍮', label: 'Desserts' },
];

const getMealTime = (): string => {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  return 'dinner';
};

// Debounce helper
const useDebounce = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

export const CustomerDashboard = () => {
  const showToast = useToastStore((s) => s.showToast);
  const { items: cartItems, getTotal, vendorName } = useCartStore();
  const { token, role, logout, dietaryPreference, includeEggs, setAuth, isOnboardingComplete } = useAuthStore();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [activeMealId, setActiveMealId] = useState<number | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<any | null>(null);
  const [showMealDetails, setShowMealDetails] = useState(false);


  const [vendors, setVendors] = useState<any[]>([]);
  const [featuredMeals, setFeaturedMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showVegModeModal, setShowVegModeModal] = useState(false);
  const [tempVegMode, setTempVegMode] = useState<'pure' | 'meals'>('meals');
  const [vegModeOption, setVegModeOption] = useState<'pure' | 'meals' | 'off'>(() => {
    const stored = localStorage.getItem('vegModeOption');
    if (stored === 'pure' || stored === 'meals' || stored === 'off') return stored;
    return dietaryPreference === 'Pure Veg Only' ? 'pure' :
      dietaryPreference === 'Veg Meals Only' ? 'meals' : 'off';
  });

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<{ meals: any[]; vendors: any[] } | null>(null);
  const [searching, setSearching] = useState(false);

  const debouncedQuery = useDebounce(query, 350);
  const isSearching = focused || query.length > 0;
  const heroTitle = `What's for ${getMealTime()} today?`;

  useEffect(() => {
    localStorage.setItem('vegModeOption', vegModeOption);
    fetchData();
  }, [vegModeOption]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const pref = vegModeOption === 'pure' ? 'Pure Veg Only' : vegModeOption === 'meals' ? 'Veg Meals Only' : null;
      const [vendorsRes, menuRes] = await Promise.all([
        getVendors(pref, includeEggs),
        getPublicMenu(undefined, pref, includeEggs)
      ]);
      let fetchedVendors = vendorsRes.data.data || [];
      let fetchedMeals = menuRes.data.data || [];

      if (vegModeOption === 'pure') {
        const pureVegVendorIds = new Set(fetchedVendors.map((v: any) => v.id));
        fetchedMeals = fetchedMeals.filter((m: any) => pureVegVendorIds.has(m.vendor_id));
      }

      setVendors(fetchedVendors);
      setFeaturedMeals(fetchedMeals.slice(0, 4));
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fire search when debounced query has ≥ 2 chars
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      doSearch(debouncedQuery);
    } else {
      setSearchResults(null);
    }
  }, [debouncedQuery]);

  const doSearch = async (q: string) => {
    try {
      setSearching(true);
      const pref = vegModeOption === 'pure' ? 'Pure Veg Only' : vegModeOption === 'meals' ? 'Veg Meals Only' : null;
      const res = await searchPublic(q, pref, includeEggs);
      let searchVendors = res.data.data?.vendors || [];
      let searchMeals = res.data.data?.meals || [];

      if (vegModeOption === 'pure') {
        const pureVegVendorIds = new Set(vendors.map((v: any) => v.id));
        searchMeals = searchMeals.filter((m: any) => pureVegVendorIds.has(m.vendor_id));
      }

      setSearchResults({
        vendors: searchVendors,
        meals: searchMeals
      });
    } catch {
      showToast("Search failed", "error");
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSearchResults(null);
    setFocused(false);
    inputRef.current?.blur();
  };

  const handleBlur = () => {
    // Small delay so click on results still registers
    setTimeout(() => {
      if (!query) setFocused(false);
    }, 150);
  };

  // Decide what meals/vendors to show
  const displayMeals = searchResults ? searchResults.meals : featuredMeals;
  const displayVendors = searchResults ? searchResults.vendors : vendors;
  const mealsTitle = searchResults
    ? `Meals for "${debouncedQuery}"`
    : "Today's Cravings";
  const vendorsTitle = searchResults
    ? `Kitchens for "${debouncedQuery}"`
    : 'Kitchens Around Town';

  return (
    <div className={`customer-dashboard ${cartItems.length > 0 ? 'has-cart' : ''}`}>
      {/* Sticky Header Group */}
      <div className="cd-sticky-header">
        {/* Top Row: Search & Profile */}
        <div className="top">
          <div className={`cd-search-bar ${focused ? 'cd-search-bar--focused' : ''}`} style={{ flex: 1 }}>
            <Search size={18} className="cd-search-icon" />
            <input
              ref={inputRef}
              className="cd-search-input"
              placeholder="Search meals or kitchens..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={handleBlur}
            />
            {query.length > 0 && (
              <button className="cd-search-clear" onClick={clearSearch} type="button">
                <X size={15} />
              </button>
            )}
          </div>

          {/* Compact Veg Toggle */}
          <div className="veg-mode-toggle-container">
            <div className={`veg-mode-text ${vegModeOption !== 'off' ? 'active' : ''}`}>
              <span className="pure-text">VEG</span>
              <span className="veg-text">MODE</span>
            </div>
            <label className="toggle-switch veg compact-toggle">
              <input
                type="checkbox"
                checked={vegModeOption !== 'off'}
                onChange={(e) => {
                  if (e.target.checked) {
                    setTempVegMode(vegModeOption === 'off' ? 'meals' : (vegModeOption as 'pure' | 'meals'));
                    setShowVegModeModal(true);
                  } else {
                    setVegModeOption('off');
                    if (token && role) {
                      setAuth(token, role, isOnboardingComplete, 'Any', includeEggs);
                    }
                  }
                }}
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* Profile Circle */}
          <ProfileCircle />
        </div>

        {token && role === 'customer' && <DebtWarningBanner />}

        {/* Categories — always visible */}
        <div className="cd-categories" style={{ marginTop: '16px' }}>
          {loading
            ? <SkeletonLoader type="circular" count={6} />
            : CATEGORIES.map((c) => (
              <div
                key={c.label}
                className="cd-category-circle no-select"
                onClick={() => setSelectedCategory(c.label)}
              >
                <div className="cd-category-icon-wrap" style={
                  selectedCategory === c.label
                    ? { borderColor: 'rgba(124, 77, 255, 0.8)', background: 'rgba(124, 77, 255, 0.2)' }
                    : {}
                }>{c.icon}</div>
                <span className="cd-category-label" style={
                  selectedCategory === c.label ? { color: 'white', fontWeight: 600 } : {}
                }>{c.label}</span>
              </div>
            ))
          }
        </div>
      </div>


      {/* Meals Slider */}
      <section className="cd-section">
        <h2 className="cd-section-title"><Flame size={18} />{mealsTitle}</h2>
        {loading || searching ? (
          <div className="cd-meals-slider">
            <SkeletonLoader type="card" layout="vertical" count={4} className="cd-meal-card" />
          </div>
        ) : displayMeals.length === 0 ? (
          <p className="cd-empty">No meals found{searchResults ? ` for "${debouncedQuery}"` : ' right now'}.</p>
        ) : (
          <div className="cd-meals-slider">
            {displayMeals.map((m) => (
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
                  <p className="cd-meal-vendor">{m.kitchen_name}</p>
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
      />
      {selectedMeal && (
        <DateSelectionModal
          isOpen={activeMealId === selectedMeal.id}
          onClose={() => setActiveMealId(null)}
          meal={selectedMeal}
          initialDates={cartItems.find(i => i.meal_id === selectedMeal.id)?.dates || []}
          initialIsContinuous={cartItems.find(i => i.meal_id === selectedMeal.id)?.is_continuous || false}
          vendorDeliveryWindows={vendors.find(v => v.id === selectedMeal.vendor_id)?.delivery_windows || null}
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


      {/* Vendors */}
      <section className="cd-section">
        <h2 className="cd-section-title"><ChefHat size={18} />{vendorsTitle}</h2>
        {loading || searching ? (
          <div className="cd-vendors-grid">
            <SkeletonLoader type="card" layout="vertical" count={4} className="cd-vendor-card" />
          </div>
        ) : displayVendors.length === 0 ? (
          <p className="cd-empty">No kitchens found{searchResults ? ` for "${debouncedQuery}"` : ' in your area yet'}.</p>
        ) : (
          <div className="cd-vendors-grid">
            {displayVendors.map((v) => (
              <div
                key={v.id}
                className="cd-vendor-card"
                onClick={() => navigate(`/kitchen/${v.id}`)}
              >
                <div className="cd-vendor-img-container">
                  {v.image_url ? (
                    <img src={`http://localhost:1415${v.image_url}`} alt={v.kitchen_name} className="cd-vendor-img" />
                  ) : (
                    <div className="cd-vendor-img-placeholder">
                      <ChefHat size={40} className="cd-vendor-placeholder-icon" />
                    </div>
                  )}

                  <div className="cd-vendor-meals-badge">
                    <div className="cd-vendor-meals-icon-wrap">
                      <Utensils size={12} strokeWidth={2.5} />
                    </div>
                    <span>{v.meal_count || 0} Meals</span>
                  </div>
                </div>

                <div className="cd-vendor-content">
                  <div className="cd-vendor-header">
                    <h4 className="cd-vendor-name">{v.kitchen_name}</h4>
                    <div className="cd-vendor-rating">
                      <Star size={14} fill="#fbbf24" color="#fbbf24" />
                      <span>{v.rating || 4.9}</span>
                    </div>
                  </div>

                  <div className="cd-vendor-services-row">
                    {v.delivery_windows ? (
                      formatServiceHours(v.delivery_windows).map(sw => {
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
                              <Icon size={12} strokeWidth={2.5} />
                            </div>
                            <span className="cd-vendor-service-name">{sw.service}</span>
                            <span className="cd-vendor-service-dot">&bull;</span>
                            <span className="cd-vendor-service-time">{sw.hours}</span>
                          </div>
                        );
                      })
                    ) : v.open_time && v.close_time ? (
                      <div className="cd-vendor-service-pill">
                        <div className="cd-vendor-service-icon" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255, 255, 255, 0.5)' }}>
                          <Clock size={12} strokeWidth={2.5} />
                        </div>
                        <span className="cd-vendor-service-name">Open</span>
                        <span className="cd-vendor-service-dot">&bull;</span>
                        <span className="cd-vendor-service-time">{v.open_time} – {v.close_time}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Veg Mode Modal */}
        {showVegModeModal && (
          <div className="global-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowVegModeModal(false)}>
            <div onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%', padding: '24px', background: '#121212', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 48px rgba(0,0,0,0.8)' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#fff' }}>Veg Mode Preferences</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem', lineHeight: 1.4 }}>How would you like to apply Veg Mode?</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  style={{
                    padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                    background: tempVegMode === 'pure' ? 'rgba(74, 222, 128, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                    border: tempVegMode === 'pure' ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                  onClick={() => {
                    setTempVegMode('pure');
                    setTimeout(() => {
                      setVegModeOption('pure');
                      setShowVegModeModal(false);
                      if (token && role) setAuth(token, role, isOnboardingComplete, 'Pure Veg Only', includeEggs);
                    }, 250);
                  }}
                >
                  <strong style={{ fontSize: '1rem', color: tempVegMode === 'pure' ? '#4ade80' : '#fff' }}>Only Pure Veg Providers</strong>
                  <span style={{ fontSize: '0.85rem', color: tempVegMode === 'pure' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.6)', textAlign: 'left', marginTop: '6px' }}>Show only kitchens that serve 100% vegetarian food.</span>
                </button>

                <button
                  style={{
                    padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                    background: tempVegMode === 'meals' ? 'rgba(74, 222, 128, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                    border: tempVegMode === 'meals' ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                  onClick={() => {
                    setTempVegMode('meals');
                    setTimeout(() => {
                      setVegModeOption('meals');
                      setShowVegModeModal(false);
                      if (token && role) setAuth(token, role, isOnboardingComplete, 'Veg Meals Only', includeEggs);
                    }, 250);
                  }}
                >
                  <strong style={{ fontSize: '1rem', color: tempVegMode === 'meals' ? '#4ade80' : '#fff' }}>Only Veg Meals</strong>
                  <span style={{ fontSize: '0.85rem', color: tempVegMode === 'meals' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.6)', textAlign: 'left', marginTop: '6px' }}>Show vegetarian meals from all providers, including non-veg kitchens.</span>
                </button>
              </div>

              <button
                onClick={() => setShowVegModeModal(false)}
                style={{
                  marginTop: '20px',
                  width: '100%',
                  padding: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Floating Cart Button */}
      {cartItems.length > 0 && (
        <FloatingCartWidget />
      )}
    </div>
  );
};


