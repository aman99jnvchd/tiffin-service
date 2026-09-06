import React, { useState, useEffect, useRef } from 'react';
import {
  User, Phone, MapPin, Calendar, Utensils, Clock,
  UserCog, Plus, Trash2, ImagePlus, X, Pencil, KeyRound, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getMyProfile, updateMyProfile, changeMyPassword,
  updateMyVendorProfile, getCities,
  addUserAddress, updateUserAddress, deleteUserAddress, uploadHousePhoto
} from '../api/axios';
import { GlassInput } from '../components/GlassInput';
import { GlassSelect } from '../components/GlassSelect';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { ProfileCircle } from '../components/ProfileCircle';
import '../styles/UserView.css';
import '../styles/CheckoutPage.css';

const ADDR_LABELS = ['home', 'office', 'other'];
const EMPTY_ADDR = { city_id: '', house_no: '', pincode: '', address_text: '', google_maps_url: '', label: 'home' };

export const ProfilePage = () => {
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  const role = useAuthStore((s) => s.role);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<any>(null);
  const [cities, setCities] = useState<any[]>([]);

  // User details form
  const [userForm, setUserForm] = useState({ name: '', phone: '', city_id: '', dietary_preference: 'Any', include_eggs: false });
  const [userLoading, setUserLoading] = useState(false);

  // Password form
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwLoading, setPwLoading] = useState(false);

  // Vendor kitchen form
  const [kitchenForm, setKitchenForm] = useState({
    kitchen_name: '',
    is_open: true,
    fssai_number: '',
    dietary_type: '',
    service_types: [] as string[],
    delivery_windows: {} as Record<string, any[]>,
    order_cutoff_hours: 0,
    max_capacity_per_slot: 0,
  });
  const [kitchenLoading, setKitchenLoading] = useState(false);

  // Address form
  const [activeAddrForm, setActiveAddrForm] = useState<'add' | number | null>(null);
  const [addrForm, setAddrForm] = useState({ ...EMPTY_ADDR });
  const [addrLoading, setAddrLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [confirmDeleteAddrId, setConfirmDeleteAddrId] = useState<number | null>(null);
  const [activeServiceTab, setActiveServiceTab] = useState<string | null>(null);

  const isVendor = role === 'vendor';
  const isCustomer = role === 'customer';
  const showUserForm = isVendor || isCustomer;

  useEffect(() => {
    fetchProfile();
    fetchCities();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await getMyProfile();
      const p = res.data.data;
      setProfile(p);
      setUserForm({ 
        name: p.name, 
        phone: p.phone, 
        city_id: p.city?.id?.toString() || '',
        dietary_preference: p.dietary_preference || 'Any',
        include_eggs: p.include_eggs || false
      });
      if (p.vendor_profile) {
        let parsedWindows = {};
        try { parsedWindows = JSON.parse(p.vendor_profile.delivery_windows || '{}'); } catch (e) { }
        const sTypes = p.vendor_profile.service_types ? p.vendor_profile.service_types.split(',') : [];
        setKitchenForm({
          kitchen_name: p.vendor_profile.kitchen_name || '',
          is_open: p.vendor_profile.is_open ?? true,
          fssai_number: p.vendor_profile.fssai_number || '',
          dietary_type: p.vendor_profile.dietary_type || '',
          service_types: sTypes,
          delivery_windows: parsedWindows,
          order_cutoff_hours: p.vendor_profile.order_cutoff_hours || 0,
          max_capacity_per_slot: p.vendor_profile.max_capacity_per_slot || 0,
        });
      }
    } catch { showToast("Failed to load profile", "error"); }
  };

  const fetchCities = async () => {
    try {
      const res = await getCities();
      setCities(res.data.data.filter((c: any) => c.is_active));
    } catch { showToast("Failed to load cities", "error"); }
  };

  // ── User Details ──
  const handleUserSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim() || userForm.name.trim().length < 2) return showToast("Name must be at least 2 characters", "error");
    if (!userForm.phone.trim() || userForm.phone.length !== 10) return showToast("Phone must be 10 digits", "error");
    setUserLoading(true);
    try {
      await updateMyProfile({ 
        name: userForm.name, 
        phone: userForm.phone, 
        city_id: parseInt(userForm.city_id),
        dietary_preference: userForm.dietary_preference,
        include_eggs: userForm.include_eggs
      });
      showToast("Profile updated", "success");
      await fetchProfile();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to update profile", "error");
    } finally { setUserLoading(false); }
  };

  // ── Password ──
  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwForm.current_password) return showToast("Current password is required", "error");
    if (pwForm.new_password.length < 6) return showToast("New password must be at least 6 characters", "error");
    if (pwForm.new_password !== pwForm.confirm_password) return showToast("Passwords do not match", "error");
    setPwLoading(true);
    try {
      await changeMyPassword(pwForm);
      showToast("Password changed", "success");
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to change password", "error");
    } finally { setPwLoading(false); }
  };

  // ── Kitchen ──
  const handleKitchenSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitchenForm.kitchen_name.trim()) return showToast("Kitchen name is required", "error");
    if (kitchenForm.fssai_number && !/^[1-3](0[1-9]|[12]\d|3[0-6])(0[6-9]|1\d|2[0-6])\d{9}$/.test(kitchenForm.fssai_number)) {
      return showToast("Invalid FSSAI Registration Number.", "error");
    }
    
    setKitchenLoading(true);
    try {
      await updateMyVendorProfile({
        kitchen_name: kitchenForm.kitchen_name.trim(),
        is_open: kitchenForm.is_open,
        fssai_number: kitchenForm.fssai_number,
        dietary_type: kitchenForm.dietary_type,
        service_types: kitchenForm.service_types.join(','),
        delivery_windows: JSON.stringify(kitchenForm.delivery_windows),
        order_cutoff_hours: kitchenForm.order_cutoff_hours,
        max_capacity_per_slot: kitchenForm.max_capacity_per_slot,
      });
      showToast("Kitchen details updated", "success");
      await fetchProfile();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to update kitchen", "error");
    } finally { setKitchenLoading(false); }
  };

  // ── Address helpers ──
  const openAddAddr = () => {
    setAddrForm({ ...EMPTY_ADDR, city_id: userForm.city_id });
    setPhotoPreview(null); setPhotoFile(null);
    setActiveAddrForm('add');
  };

  const openEditAddr = (addr: any) => {
    setAddrForm({
      city_id: userForm.city_id,
      house_no: addr.house_no || '',
      pincode: addr.pincode || '',
      address_text: addr.address_text || '',
      google_maps_url: addr.google_maps_url || '',
      label: addr.label || 'home',
    });
    setPhotoPreview(addr.house_photo_url ? `http://localhost:1415${addr.house_photo_url}` : null);
    setPhotoFile(null);
    setActiveAddrForm(addr.id);
  };

  const closeAddrForm = () => {
    setActiveAddrForm(null);
    setAddrForm({ ...EMPTY_ADDR, city_id: userForm.city_id });
    setPhotoPreview(null); setPhotoFile(null);
  };

  const handleAddrCityChange = (cityId: number) => {
    setAddrForm({ ...EMPTY_ADDR, city_id: cityId.toString() });
    setPhotoPreview(null); setPhotoFile(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleAddrSubmit = async () => {
    if (!addrForm.city_id) return showToast("City is required", "error");
    if (!addrForm.house_no.trim()) return showToast("House No. is required", "error");
    if (!addrForm.pincode.trim()) return showToast("Pincode is required", "error");
    if (!/^\d{6}$/.test(addrForm.pincode.trim())) return showToast("Pincode must be 6 digits", "error");
    if (!addrForm.address_text.trim()) return showToast("Address is required", "error");
    setAddrLoading(true);
    try {
      let photoUrl = '';
      if (photoFile) {
        const res = await uploadHousePhoto(photoFile);
        photoUrl = res.data.data.url;
      }
      const payload = {
        label: addrForm.label,
        address_text: addrForm.address_text,
        house_no: addrForm.house_no,
        pincode: addrForm.pincode,
        google_maps_url: addrForm.google_maps_url || undefined,
        house_photo_url: photoUrl || undefined,
      };
      if (activeAddrForm === 'add') {
        await addUserAddress(profile.id, payload);
        showToast("Address added", "success");
      } else {
        await updateUserAddress(activeAddrForm as number, payload);
        showToast("Address updated", "success");
      }
      closeAddrForm();
      await fetchProfile();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to save address", "error");
    } finally { setAddrLoading(false); }
  };

  const handleDeleteAddr = async (e: React.MouseEvent, addrId: number) => {
    e.stopPropagation();
    try {
      await deleteUserAddress(addrId);
      showToast("Address deleted", "success");
      if (activeAddrForm === addrId) closeAddrForm();
      await fetchProfile();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to delete address", "error");
    }
  };

  if (!profile) {
    return (
      <div className="user-view-container">
        {isCustomer && (
          <div className="checkout-topbar">
            <button className="checkout-back-btn" onClick={() => navigate('/')}>
              <ChevronLeft size={20} />
            </button>
            <h2 className="checkout-page-title">Profile</h2>
            <ProfileCircle />
          </div>
        )}
        <div className="user-view-layout">
          <div className="user-cards-section">
            <div className="glass-card skeleton-card" style={{ height: '280px' }}></div>
            {isVendor && <div className="glass-card skeleton-card" style={{ height: '200px' }}></div>}
          </div>
          <div className="user-form-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-card skeleton-card" style={{ height: '350px' }}></div>
            <div className="glass-card skeleton-card" style={{ height: '250px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const addresses: any[] = profile.addresses || [];

  // Shared address form JSX
  const AddrForm = (
    <div className="addr-box addr-box--expanded">
      <div className="addr-photo-uploader" onClick={() => photoInputRef.current?.click()}>
        <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
        {photoPreview
          ? <img src={photoPreview} alt="preview" className="addr-photo-preview" />
          : <span className="addr-photo-placeholder"><ImagePlus size={18} />{isVendor ? 'Shop Image' : 'House Image'}</span>
        }
      </div>
      <div className="addr-form-row">
        <GlassSelect label="City" options={cities} value={addrForm.city_id} onChange={handleAddrCityChange} />
        <GlassInput label={isVendor ? 'Shop No.' : 'House No.'} value={addrForm.house_no} onChange={(e) => setAddrForm({ ...addrForm, house_no: e.target.value })} />
      </div>
      <div className="addr-textarea-wrap">
        <textarea className="addr-textarea" placeholder=" " rows={2}
          value={addrForm.address_text} onChange={(e) => setAddrForm({ ...addrForm, address_text: e.target.value })} />
        <label className="addr-textarea-label">Address</label>
      </div>
      <div className="addr-form-row">
        <GlassInput label="Pincode" value={addrForm.pincode} onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
        <GlassInput label="Exact Location" value={addrForm.google_maps_url} onChange={(e) => setAddrForm({ ...addrForm, google_maps_url: e.target.value })} />
      </div>
      {!isVendor && (
        <div className="addr-label-selector">
          {ADDR_LABELS.map((lbl) => (
            <button key={lbl} type="button"
              className={`addr-label-opt ${addrForm.label === lbl ? 'active' : ''}`}
              onClick={() => setAddrForm({ ...addrForm, label: lbl })}>
              {lbl.charAt(0).toUpperCase() + lbl.slice(1)}
            </button>
          ))}
        </div>
      )}
      <div className="addr-form-actions">
        <button type="button" className="glass-button secondary addr-btn" onClick={closeAddrForm}>Cancel</button>
        <button type="button" className="glass-button primary addr-btn" disabled={addrLoading} onClick={handleAddrSubmit}>
          {addrLoading ? <span className="spinner small"></span> : activeAddrForm === 'add' ? 'Add Address' : 'Update'}
        </button>
      </div>
    </div>
  );

  const serviceTypes = profile?.vendor_profile?.service_types ? profile.vendor_profile.service_types.split(',') : [];

  const handleAddTimeSlot = (service: string) => {
    const currentSlots = Array.isArray(kitchenForm.delivery_windows[service]) ? kitchenForm.delivery_windows[service] : [];
    setKitchenForm({
      ...kitchenForm,
      delivery_windows: {
        ...kitchenForm.delivery_windows,
        [service]: [...currentSlots, { start_time: "12:00 PM", end_time: "12:30 PM" }]
      }
    });
  };

  const handleRemoveTimeSlot = (service: string, index: number) => {
    const currentSlots = Array.isArray(kitchenForm.delivery_windows[service]) ? kitchenForm.delivery_windows[service] : [];
    if (currentSlots.length <= 1) return; // Prevent removing if only 1 left
    const newSlots = [...currentSlots];
    newSlots.splice(index, 1);
    setKitchenForm({
      ...kitchenForm,
      delivery_windows: {
        ...kitchenForm.delivery_windows,
        [service]: newSlots
      }
    });
  };

  const handleTimeSlotChange = (service: string, index: number, field: 'start_time' | 'end_time', rawValue: string) => {
    const currentSlots = Array.isArray(kitchenForm.delivery_windows[service]) ? kitchenForm.delivery_windows[service] : [];
    const newSlots = [...currentSlots];
    
    // Format "14:30" back to "02:30 PM"
    const formatTime = (timeValue: string) => {
      if (!timeValue) return '';
      const [hourStr, minStr] = timeValue.split(':');
      let h = parseInt(hourStr);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h.toString().padStart(2, '0')}:${minStr} ${ampm}`;
    };

    let updatedSlot = typeof newSlots[index] === 'string' 
      ? { start_time: newSlots[index], end_time: newSlots[index] } 
      : { ...newSlots[index] };

    updatedSlot[field] = formatTime(rawValue);

    // Auto calculate end_time if start_time changes
    if (field === 'start_time' && rawValue) {
      const [h, m] = rawValue.split(':').map(Number);
      const date = new Date();
      date.setHours(h, m + 30, 0, 0);
      const endH = date.getHours().toString().padStart(2, '0');
      const endM = date.getMinutes().toString().padStart(2, '0');
      updatedSlot.end_time = formatTime(`${endH}:${endM}`);
    }

    newSlots[index] = updatedSlot;

    setKitchenForm({
      ...kitchenForm,
      delivery_windows: {
        ...kitchenForm.delivery_windows,
        [service]: newSlots
      }
    });
  };

  return (
    <div className="user-view-container">
      {isCustomer && (
        <div className="checkout-topbar">
          <button className="checkout-back-btn" onClick={() => navigate('/')}>
            <ChevronLeft size={20} />
          </button>
          <h2 className="checkout-page-title">Profile</h2>
          <ProfileCircle />
        </div>
      )}
      <div className="user-view-layout">

        {/* Left — Profile Summary Card */}
        <div className="user-cards-section">
          <div className="profile-card">
            <div className="card-header">
              <div className="card-icon"><User size={24} /></div>
              <h3>Profile</h3>
            </div>
            <div className="card-body">
              <div className="card-info-row">
                <User size={16} className="info-icon" />
                <div className="info-content"><span className="info-label">Name</span><span className="info-value">{profile.name}</span></div>
              </div>
              <div className="card-info-row">
                <Phone size={16} className="info-icon" />
                <div className="info-content"><span className="info-label">Phone</span><span className="info-value">{profile.phone}</span></div>
              </div>
              {profile.city && (
                <div className="card-info-row">
                  <MapPin size={16} className="info-icon" />
                  <div className="info-content"><span className="info-label">City</span><span className="info-value">{profile.city.name}</span></div>
                </div>
              )}
              <div className="card-info-row">
                <Calendar size={16} className="info-icon" />
                <div className="info-content">
                  <span className="info-label">Joined</span>
                  <span className="info-value">{new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              <div className="card-badge-row">
                <span className={`type-badge ${profile.role?.slug}`}>{profile.role?.name}</span>
              </div>
            </div>
          </div>

          {isVendor && profile.vendor_profile && (
            <div className="profile-card kitchen-card">
              <div className="card-header">
                <div className="card-icon kitchen"><Utensils size={24} /></div>
                <h3>Kitchen</h3>
              </div>
              <div className="card-body">
                <div className="card-info-row">
                  <Utensils size={16} className="info-icon" />
                  <div className="info-content"><span className="info-label">Kitchen Name</span><span className="info-value">{profile.vendor_profile.kitchen_name}</span></div>
                </div>
                {(() => {
                  let parsedWindows: any = {};
                  try { parsedWindows = JSON.parse(profile.vendor_profile.delivery_windows || '{}'); } catch (e) { }
                  const services = profile.vendor_profile.service_types ? profile.vendor_profile.service_types.split(',') : [];
                  return services.map((type: string) => (
                    <div className="card-info-row" key={type}>
                      <Clock size={16} className="info-icon" />
                      <div className="info-content">
                        <span className="info-label">{type} Windows</span>
                        <span className="info-value">
                          {parsedWindows[type] && Array.isArray(parsedWindows[type]) && parsedWindows[type].length > 0
                            ? parsedWindows[type].map((w: any) => `${w.start_time} - ${w.end_time}`).join(', ')
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  ));
                })()}
                <div className="card-info-row">
                  <Utensils size={16} className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Dietary Type</span>
                    <span className="info-value">
                      {profile.vendor_profile.dietary_type === 'Both'
                        ? 'Both (Veg & Non-Veg)'
                        : profile.vendor_profile.dietary_type || 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="card-info-row">
                  <Clock size={16} className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Order Cutoff</span>
                    <span className="info-value">{profile.vendor_profile.order_cutoff_hours || 0} hrs before</span>
                  </div>
                </div>
                <div className="card-info-row">
                  <User size={16} className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Capacity / Slot</span>
                    <span className="info-value">{profile.vendor_profile.max_capacity_per_slot || 0} meals</span>
                  </div>
                </div>
                <div className="card-info-row">
                  <User size={16} className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">FSSAI Number</span>
                    <span className="info-value">{profile.vendor_profile.fssai_number || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right — Forms */}
        <div className="user-form-section">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* User Details Form — customer & vendor only */}
            {showUserForm && (
              <div className="glass-card">
                <h2 className="form-title"><UserCog size={25} />User Details</h2>
                <form onSubmit={handleUserSave}>
                  <div className="form-row">
                    <GlassInput label="Full Name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
                    <GlassInput label="Phone Number" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                  </div>
                  
                  {isCustomer && (
                    <div className="form-row" style={{ marginTop: '15px' }}>
                      <GlassSelect
                        label="Dietary Preference"
                        options={[
                          { id: 'Any', name: 'Any' },
                          { id: 'Pure Veg Only', name: 'Pure Veg Only' },
                          { id: 'Non-Veg Only', name: 'Non-Veg Only' },
                        ]}
                        value={userForm.dietary_preference}
                        onChange={(val: string) => setUserForm({ ...userForm, dietary_preference: val })}
                      />
                      {userForm.dietary_preference === 'Pure Veg Only' && (
                        <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 10px', gap: '8px', color: 'var(--text-secondary)' }}>
                          <input 
                            type="checkbox" 
                            id="includeEggsSettings"
                            checked={userForm.include_eggs} 
                            onChange={(e) => setUserForm({ ...userForm, include_eggs: e.target.checked })} 
                            style={{ cursor: 'pointer' }}
                          />
                          <label htmlFor="includeEggsSettings" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>Include Eggs</label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Address Boxes */}
                  <div className="addr-boxes-row">
                    {addresses.map((addr: any) => (
                      activeAddrForm === addr.id ? (
                        <React.Fragment key={addr.id}>{AddrForm}</React.Fragment>
                      ) : (
                        <div key={addr.id} className="addr-box addr-box--filled"
                          onClick={() => activeAddrForm === null && openEditAddr(addr)}
                          onMouseLeave={() => setConfirmDeleteAddrId(null)}>
                          <div className="addr-delete-btn-wrapper">
                            {confirmDeleteAddrId === addr.id ? (
                              <>
                                <button type="button" className="addr-delete-btn addr-delete-remove-btn" onClick={(e) => handleDeleteAddr(e, addr.id)}>Remove</button>
                                <button type="button" className="addr-delete-btn addr-delete-cross-btn" onClick={(e) => { e.stopPropagation(); setConfirmDeleteAddrId(null); }}><X size={13} /></button>
                              </>
                            ) : (
                              (!isVendor || addresses.length > 1) && (
                                <button type="button" className="addr-delete-btn" onClick={(e) => { e.stopPropagation(); setConfirmDeleteAddrId(addr.id); }} title="Delete"><Trash2 size={13} /></button>
                              )
                            )}
                          </div>
                          {!isVendor && <span className="addr-box-label">{addr.label}</span>}
                          {addr.house_photo_url && <img src={`http://localhost:1415${addr.house_photo_url}`} alt="house" className="addr-box-photo" />}
                          <p className="addr-box-text">{addr.address_text}</p>
                          {addr.house_no && <span className="addr-box-meta">#{addr.house_no}</span>}
                        </div>
                      )
                    ))}
                    {activeAddrForm === 'add' ? AddrForm : (
                      <div className="addr-box addr-box--empty" onClick={openAddAddr}>
                        <button type="button" className="addr-add-btn"><Plus size={18} /></button>
                        <span className="addr-add-text">Add Address</span>
                      </div>
                    )}
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="glass-button primary" disabled={userLoading}>
                      {userLoading ? <span className="spinner small"></span> : 'Update'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Kitchen Details Form — vendor only */}
            {isVendor && (
              <div className="glass-card">
                <h2 className="form-title"><Utensils size={25} />Kitchen Details</h2>
                <form onSubmit={handleKitchenSave}>
                  <div className="form-row">
                    <GlassInput label="Kitchen Name" value={kitchenForm.kitchen_name} onChange={(e) => setKitchenForm({ ...kitchenForm, kitchen_name: e.target.value })} />
                    <GlassSelect
                      label="Status"
                      options={[{ id: 'true', name: 'Open' }, { id: 'false', name: 'Closed' }]}
                      value={String(kitchenForm.is_open)}
                      onChange={(val: string) => setKitchenForm({ ...kitchenForm, is_open: val === 'true' })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <GlassInput 
                      label="Order Cutoff (Hours)" 
                      type="number" 
                      min="1"
                      value={String(kitchenForm.order_cutoff_hours)} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setKitchenForm({ ...kitchenForm, order_cutoff_hours: isNaN(val) ? 1 : Math.max(1, val) });
                      }} 
                    />
                    <GlassInput 
                      label="Capacity per Slot" 
                      type="number" 
                      min="1"
                      value={String(kitchenForm.max_capacity_per_slot)} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setKitchenForm({ ...kitchenForm, max_capacity_per_slot: isNaN(val) ? 1 : Math.max(1, val) });
                      }} 
                    />
                  </div>

                  {/* Time Slots Section */}
                  <div className="kitchen-slots-section" style={{ marginTop: '20px', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: '#fff' }}>Service Types</h3>
                    {serviceTypes.length === 0 && (
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>No service types selected yet.</p>
                    )}
                    {serviceTypes.length > 0 && (
                      <>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
                          {serviceTypes.map((service: string) => (
                            <button
                              key={service}
                              type="button"
                              onClick={() => setActiveServiceTab(service)}
                              style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: activeServiceTab === service || (activeServiceTab === null && serviceTypes[0] === service) ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.2)',
                                background: activeServiceTab === service || (activeServiceTab === null && serviceTypes[0] === service) ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                                color: activeServiceTab === service || (activeServiceTab === null && serviceTypes[0] === service) ? '#4ade80' : '#fff',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {service}
                            </button>
                          ))}
                        </div>

                        {(() => {
                          const currentService = activeServiceTab && serviceTypes.includes(activeServiceTab) ? activeServiceTab : serviceTypes[0];
                          if (!currentService) return null;

                          const currentSlots = Array.isArray(kitchenForm.delivery_windows[currentService]) ? kitchenForm.delivery_windows[currentService] : [];
                          if (currentSlots.length === 0) {
                            setTimeout(() => handleAddTimeSlot(currentService), 0);
                          }

                          return (
                            <div className="premium-slot-card" style={{ animation: 'fadeInDown 0.3s ease-out' }}>
                              <div className="premium-slot-header">
                                <div>
                                  <div className="premium-slot-title">Delivery Windows</div>
                                  <div className="premium-slot-subtitle">Define the operating hours for {currentService}.</div>
                                </div>
                                <button type="button" className="premium-add-btn" onClick={() => handleAddTimeSlot(currentService)}>
                                  <Plus size={14} /> Add Window
                                </button>
                              </div>
                              <div className="premium-slot-divider"></div>

                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {currentSlots.map((slot: any, idx: number) => {
                                  let rawStart = slot.start_time || slot;
                                  let rawEnd = slot.end_time || '';
                                  if (typeof slot === 'string' && slot.includes(' - ')) {
                                    [rawStart, rawEnd] = slot.split(' - ');
                                  }
                                  
                                  const formatTimeTo24Hr = (timeStr: string) => {
                                    if (!timeStr) return '';
                                    if (/^\d{2}:\d{2}$/.test(timeStr.trim())) return timeStr.trim();
                                    const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                                    if (match) {
                                      let [_, h, m, ampm] = match;
                                      let hours = parseInt(h, 10);
                                      if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
                                      if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
                                      return `${hours.toString().padStart(2, '0')}:${m}`;
                                    }
                                    return timeStr.trim();
                                  };

                                  let start = formatTimeTo24Hr(rawStart);
                                  let end = rawEnd ? formatTimeTo24Hr(rawEnd) : '';

                                  return (
                                    <div key={idx} className="premium-slot-row">
                                      <div className="premium-slot-label">
                                        Window {idx + 1}
                                      </div>
                                      <div className="premium-slot-controls">
                                        <input
                                          className="premium-time-input"
                                          type="time"
                                          value={start}
                                          onChange={(e) => handleTimeSlotChange(currentService, idx, 'start_time', e.target.value)}
                                        />
                                        <span className="premium-time-separator">to</span>
                                        <input
                                          className="premium-time-input"
                                          type="time"
                                          value={end}
                                          onChange={(e) => handleTimeSlotChange(currentService, idx, 'end_time', e.target.value)}
                                        />
                                        {currentSlots.length > 1 && (
                                          <button
                                            type="button"
                                            className="premium-delete-icon"
                                            onClick={() => handleRemoveTimeSlot(currentService, idx)}
                                            title="Delete Window"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="glass-button primary" disabled={kitchenLoading}>
                      {kitchenLoading ? <span className="spinner small"></span> : 'Update'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Change Password */}
            <div className="glass-card">
              <h2 className="form-title"><KeyRound size={25} />Change Password</h2>
              <form onSubmit={handlePasswordSave}>
                <GlassInput label="Current Password" type="password" value={pwForm.current_password} onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} />
                <div className="form-row">
                  <GlassInput label="New Password" type="password" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} />
                  <GlassInput label="Confirm Password" type="password" value={pwForm.confirm_password} onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })} />
                </div>
                <div className="form-actions">
                  <button type="submit" className="glass-button primary" disabled={pwLoading}>
                    {pwLoading ? <span className="spinner small"></span> : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
