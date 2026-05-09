import { Search, MapPin, Star, Clock, ChefHat, Utensils, Flame, Leaf } from 'lucide-react';
import '../styles/HomePage.css';

export const CustomerDashboard = () => {
  const categories = [
    { icon: '🍱', label: 'Tiffin' },
    { icon: '🍛', label: 'Curry' },
    { icon: '🥗', label: 'Salads' },
    { icon: '🍚', label: 'Rice' },
    { icon: '🫓', label: 'Roti' },
    { icon: '🍮', label: 'Desserts' },
  ];

  const vendors = [
    { name: "Sharma's Kitchen", rating: 4.8, time: '25–35 min', tag: 'Pure Veg', meals: 12, open: true },
    { name: "Punjabi Rasoi", rating: 4.6, time: '30–40 min', tag: 'Non-Veg', meals: 18, open: true },
    { name: "Ghar Ka Khana", rating: 4.9, time: '20–30 min', tag: 'Pure Veg', meals: 8, open: false },
    { name: "Desi Tadka", rating: 4.5, time: '35–45 min', tag: 'Veg & Non-Veg', meals: 22, open: true },
  ];

  const featured = [
    { name: 'Dal Makhani + Roti', vendor: "Sharma's Kitchen", price: 120, tag: 'bestseller' },
    { name: 'Rajma Chawal', vendor: 'Ghar Ka Khana', price: 100, tag: 'daily special' },
    { name: 'Paneer Butter Masala', vendor: 'Punjabi Rasoi', price: 150, tag: 'popular' },
    { name: 'Chole Bhature', vendor: 'Desi Tadka', price: 90, tag: 'trending' },
  ];

  return (
    <div className="customer-dashboard">
      <div className="cd-hero">
        <h1 className="cd-hero-title">What's for lunch today?</h1>
        <p className="cd-hero-sub">Fresh home-cooked tiffins delivered to your door</p>
        <div className="cd-search-bar">
          <Search size={18} className="cd-search-icon" />
          <input className="cd-search-input" placeholder="Search meals, vendors..." readOnly />
          <div className="cd-location-pill"><MapPin size={14} />Chandigarh</div>
        </div>
      </div>

      <section className="cd-section">
        <h2 className="cd-section-title">Browse by Category</h2>
        <div className="cd-categories">
          {categories.map((c) => (
            <div key={c.label} className="cd-category-chip">
              <span className="cd-category-icon">{c.icon}</span>
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="cd-section">
        <h2 className="cd-section-title"><Flame size={18} />Today's Specials</h2>
        <div className="cd-meals-grid">
          {featured.map((m) => (
            <div key={m.name} className="cd-meal-card">
              <div className="cd-meal-img-placeholder"><Utensils size={28} /></div>
              <div className="cd-meal-info">
                <span className={`cd-meal-tag ${m.tag.replace(' ', '-')}`}>{m.tag}</span>
                <h4 className="cd-meal-name">{m.name}</h4>
                <p className="cd-meal-vendor">{m.vendor}</p>
                <div className="cd-meal-footer">
                  <span className="cd-meal-price">₹{m.price}</span>
                  <button className="cd-add-btn">Add</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="cd-section">
        <h2 className="cd-section-title"><ChefHat size={18} />Kitchens Near You</h2>
        <div className="cd-vendors-grid">
          {vendors.map((v) => (
            <div key={v.name} className={`cd-vendor-card ${!v.open ? 'cd-vendor-closed' : ''}`}>
              <div className="cd-vendor-img-placeholder"><ChefHat size={32} /></div>
              <div className="cd-vendor-info">
                <div className="cd-vendor-top">
                  <h4 className="cd-vendor-name">{v.name}</h4>
                  <span className={`cd-open-badge ${v.open ? 'open' : 'closed'}`}>{v.open ? 'Open' : 'Closed'}</span>
                </div>
                <div className="cd-vendor-meta">
                  <span><Star size={12} />{v.rating}</span>
                  <span><Clock size={12} />{v.time}</span>
                  <span><Leaf size={12} />{v.tag}</span>
                </div>
                <p className="cd-vendor-meals">{v.meals} meals available</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
