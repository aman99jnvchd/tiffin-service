import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Clock, ChefHat, Utensils, Flame, MapPin, X } from 'lucide-react';
import { getVendors, getPublicMenu, searchPublic } from '../api/axios';
import { useToastStore } from '../store/useToastStore';
import '../styles/HomePage.css';

const CATEGORIES = [
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
  const inputRef = useRef<HTMLInputElement>(null);

  const [vendors, setVendors] = useState<any[]>([]);
  const [featuredMeals, setFeaturedMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<{ meals: any[]; vendors: any[] } | null>(null);
  const [searching, setSearching] = useState(false);

  const debouncedQuery = useDebounce(query, 350);
  const isSearching = focused || query.length > 0;
  const heroTitle = `What's for ${getMealTime()} today?`;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [vendorsRes, menuRes] = await Promise.all([getVendors(), getPublicMenu()]);
      setVendors(vendorsRes.data.data || []);
      setFeaturedMeals((menuRes.data.data || []).slice(0, 4));
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
    setSearching(true);
    try {
      const res = await searchPublic(q);
      setSearchResults(res.data.data);
    } catch {
      setSearchResults(null);
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
    : "Today's Specials";
  const vendorsTitle = searchResults
    ? `Kitchens for "${debouncedQuery}"`
    : 'Kitchens Near You';

  return (
    <div className="customer-dashboard">
      {/* Hero */}
      <div className={`cd-hero ${isSearching ? 'cd-hero--searching' : ''}`}>
        <div className="cd-hero-text">
          <h1 className="cd-hero-title">{heroTitle}</h1>
          <p className="cd-hero-sub">Fresh home-cooked meals delivered to your door</p>
        </div>
        <div className={`cd-search-bar ${focused ? 'cd-search-bar--focused' : ''}`}>
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
      </div>

      {/* Categories — always visible */}
      <div className="cd-categories">
        {loading
          ? [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="cd-skeleton cd-category-skeleton" />
            ))
          : CATEGORIES.map((c) => (
              <div key={c.label} className="cd-category-circle">
                <div className="cd-category-icon-wrap">{c.icon}</div>
                <span className="cd-category-label">{c.label}</span>
              </div>
            ))
        }
      </div>

      {/* Meals */}
      <section className="cd-section">
        <h2 className="cd-section-title"><Flame size={18} />{mealsTitle}</h2>
        {loading || searching ? (
          <div className="cd-loading-row">
            {[1, 2, 3, 4].map((i) => <div key={i} className="cd-meal-card cd-skeleton" />)}
          </div>
        ) : displayMeals.length === 0 ? (
          <p className="cd-empty">No meals found{searchResults ? ` for "${debouncedQuery}"` : ' right now'}.</p>
        ) : (
          <div className="cd-meals-grid">
            {displayMeals.map((m) => (
              <div key={m.id} className="cd-meal-card">
                <div className="cd-meal-img-placeholder">
                  {m.image_url
                    ? <img src={`http://localhost:1415${m.image_url}`} alt={m.name} className="cd-meal-img" />
                    : <Utensils size={28} />
                  }
                </div>
                <div className="cd-meal-info">
                  <span className="cd-meal-tag">{m.is_always_available ? 'daily' : 'scheduled'}</span>
                  <h4 className="cd-meal-name">{m.name}</h4>
                  <p className="cd-meal-vendor">{m.kitchen_name}</p>
                  {m.description && <p className="cd-meal-desc">{m.description}</p>}
                  <div className="cd-meal-footer">
                    <span className="cd-meal-price">₹{Number(m.base_price).toFixed(0)}</span>
                    <button className="cd-add-btn">Add</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Vendors */}
      <section className="cd-section">
        <h2 className="cd-section-title"><ChefHat size={18} />{vendorsTitle}</h2>
        {loading || searching ? (
          <div className="cd-vendors-grid">
            {[1, 2].map((i) => <div key={i} className="cd-vendor-card cd-skeleton" style={{ minHeight: 100 }} />)}
          </div>
        ) : displayVendors.length === 0 ? (
          <p className="cd-empty">No kitchens found{searchResults ? ` for "${debouncedQuery}"` : ' in your area yet'}.</p>
        ) : (
          <div className="cd-vendors-grid">
            {displayVendors.map((v) => (
              <div key={v.id} className={`cd-vendor-card ${!v.is_open ? 'cd-vendor-closed' : ''}`}>
                <div className="cd-vendor-img-placeholder"><ChefHat size={32} /></div>
                <div className="cd-vendor-info">
                  <div className="cd-vendor-top">
                    <h4 className="cd-vendor-name">{v.kitchen_name}</h4>
                    <span className={`cd-open-badge ${v.is_open ? 'open' : 'closed'}`}>
                      {v.is_open ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <div className="cd-vendor-meta">
                    {v.open_time && v.close_time && (
                      <span><Clock size={12} />{v.open_time} – {v.close_time}</span>
                    )}
                    {v.city && <span><MapPin size={12} />{v.city.name}</span>}
                  </div>
                  <p className="cd-vendor-meals">{v.meal_count} meals available</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
