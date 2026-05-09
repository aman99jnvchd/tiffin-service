import React, { useState, useEffect, useRef } from 'react';
import {
  User, Phone, MapPin, Calendar, Utensils, Clock,
  UserCog, Plus, Trash2, ImagePlus, X, Pencil, KeyRound
} from 'lucide-react';
import {
  getMyProfile, updateMyProfile, changeMyPassword,
  updateMyVendorProfile, getCities,
  addUserAddress, updateUserAddress, deleteUserAddress, uploadHousePhoto
} from '../api/axios';
import { GlassInput } from '../components/GlassInput';
import { GlassSelect } from '../components/GlassSelect';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import '../styles/UserView.css';

const ADDR_LABELS = ['home', 'office', 'other'];
const EMPTY_ADDR = { city_id: '', house_no: '', pincode: '', address_text: '', google_maps_url: '', label: 'home' };

export const ProfilePage = () => {
  const showToast = useToastStore((s) => s.showToast);
  const role = useAuthStore((s) => s.role);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<any>(null);
  const [cities, setCities] = useState<any[]>([]);

  // User details form
  const [userForm, setUserForm] = useState({ name: '', phone: '', city_id: '' });
  const [userLoading, setUserLoading] = useState(false);

  // Password form
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwLoading, setPwLoading] = useState(false);

  // Vendor kitchen form
  const [kitchenForm, setKitchenForm] = useState({ kitchen_name: '', is_open: true, open_time: '', close_time: '' });
  const [kitchenLoading, setKitchenLoading] = useState(false);

  // Address form
  const [activeAddrForm, setActiveAddrForm] = useState<'add' | number | null>(null);
  const [addrForm, setAddrForm] = useState({ ...EMPTY_ADDR });
  const [addrLoading, setAddrLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

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
      setUserForm({ name: p.name, phone: p.phone, city_id: p.city?.id?.toString() || '' });
      if (p.vendor_profile) {
        setKitchenForm({
          kitchen_name: p.vendor_profile.kitchen_name || '',
          is_open: p.vendor_profile.is_open ?? true,
          open_time: p.vendor_profile.open_time || '',
          close_time: p.vendor_profile.close_time || '',
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
      await updateMyProfile({ name: userForm.name, phone: userForm.phone, city_id: parseInt(userForm.city_id) });
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
    setKitchenLoading(true);
    try {
      await updateMyVendorProfile({
        kitchen_name: kitchenForm.kitchen_name,
        is_open: kitchenForm.is_open,
        open_time: kitchenForm.open_time || undefined,
        close_time: kitchenForm.close_time || undefined,
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
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <span className="spinner"></span>
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
          : <span className="addr-photo-placeholder"><ImagePlus size={18} />House Photo</span>
        }
      </div>
      <div className="addr-form-row">
        <GlassSelect label="City" options={cities} value={addrForm.city_id} onChange={handleAddrCityChange} />
        <GlassInput label="House No." value={addrForm.house_no} onChange={(e) => setAddrForm({ ...addrForm, house_no: e.target.value })} />
      </div>
      <div className="addr-form-row">
        <GlassInput label="Pincode" value={addrForm.pincode} onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
        <GlassInput label="Exact Location" value={addrForm.google_maps_url} onChange={(e) => setAddrForm({ ...addrForm, google_maps_url: e.target.value })} />
      </div>
      <div className="addr-textarea-wrap">
        <textarea className="addr-textarea" placeholder=" " rows={2}
          value={addrForm.address_text} onChange={(e) => setAddrForm({ ...addrForm, address_text: e.target.value })} />
        <label className="addr-textarea-label">Address</label>
      </div>
      <div className="addr-label-selector">
        {ADDR_LABELS.map((lbl) => (
          <button key={lbl} type="button"
            className={`addr-label-opt ${addrForm.label === lbl ? 'active' : ''}`}
            onClick={() => setAddrForm({ ...addrForm, label: lbl })}>
            {lbl.charAt(0).toUpperCase() + lbl.slice(1)}
          </button>
        ))}
      </div>
      <div className="addr-form-actions">
        <button type="button" className="glass-button secondary addr-btn" onClick={closeAddrForm}><X size={14} /> Cancel</button>
        <button type="button" className="glass-button primary addr-btn" disabled={addrLoading} onClick={handleAddrSubmit}>
          {addrLoading ? <span className="spinner small"></span> : activeAddrForm === 'add' ? <><Plus size={14} /> Add Address</> : <><Pencil size={14} /> Update</>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="user-view-container">
      <div className="user-view-layout">

        {/* Left — Profile Summary Card */}
        <div className="user-cards-section">
          <div className="profile-card">
            <div className="card-header">
              <div className="card-icon"><User size={24} /></div>
              <h3>My Profile</h3>
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
                <div className="card-info-row">
                  <Clock size={16} className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Hours</span>
                    <span className="info-value">{profile.vendor_profile.open_time || '—'} – {profile.vendor_profile.close_time || '—'}</span>
                  </div>
                </div>
                <div className="card-badge-row">
                  <span className={`status-badge ${profile.vendor_profile.is_open ? 'active' : 'inactive'}`}>
                    {profile.vendor_profile.is_open ? 'Open' : 'Closed'}
                  </span>
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

                  {/* Address Boxes */}
                  <div className="addr-boxes-row">
                    {addresses.map((addr: any) => (
                      activeAddrForm === addr.id ? (
                        <React.Fragment key={addr.id}>{AddrForm}</React.Fragment>
                      ) : (
                        <div key={addr.id} className="addr-box addr-box--filled"
                          onClick={() => activeAddrForm === null && openEditAddr(addr)}>
                          <button type="button" className="addr-delete-btn" onClick={(e) => handleDeleteAddr(e, addr.id)} title="Delete"><Trash2 size={13} /></button>
                          <span className="addr-box-label">{addr.label}</span>
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
                  <div className="form-row">
                    <GlassInput label="Open Time (HH:MM)" value={kitchenForm.open_time} onChange={(e) => setKitchenForm({ ...kitchenForm, open_time: e.target.value })} />
                    <GlassInput label="Close Time (HH:MM)" value={kitchenForm.close_time} onChange={(e) => setKitchenForm({ ...kitchenForm, close_time: e.target.value })} />
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
