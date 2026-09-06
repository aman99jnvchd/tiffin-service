import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, MapPin, Calendar, Utensils, Clock, UserCog, Plus, Trash2, ImagePlus, X, Pencil, Lock } from 'lucide-react';
import {
  getUserById,
  updateUser,
  getCities,
  getRoles,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  uploadHousePhoto,
  updateUserVendorProfile,
  updateUserPassword,
} from '../api/axios';
import { GlassInput } from '../components/GlassInput';
import { GlassSelect } from '../components/GlassSelect';
import { useToastStore } from '../store/useToastStore';
import { usePermissions } from '../hooks/usePermissions';
import '../styles/UserView.css';

const API_ORIGIN = 'http://localhost:1415';
const ADDR_LABELS = ['home', 'office', 'other'];
const EMPTY_FORM = { city_id: '', house_no: '', pincode: '', address_text: '', google_maps_url: '', label: 'home' };

const STATUS_OPTIONS = [
  { id: 'active', name: 'Active' },
  { id: 'blocked', name: 'Blocked' },
];

const STORE_STATUS_OPTIONS = [
  { id: 'open', name: 'Open' },
  { id: 'closed', name: 'Closed' },
];

export const UserView = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  const { hasPermission } = usePermissions();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [roleOptions, setRoleOptions] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city_id: '',
    role_id: '',
    status: 'active' as 'active' | 'blocked',
  });

  const [activeForm, setActiveForm] = useState<'add' | number | null>(null);
  const [addrForm, setAddrForm] = useState({ ...EMPTY_FORM });
  const [addrLoading, setAddrLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [confirmDeleteAddrId, setConfirmDeleteAddrId] = useState<number | null>(null);
  const [activeServiceTab, setActiveServiceTab] = useState<string | null>(null);

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

  const [pwdForm, setPwdForm] = useState({ next: '', confirm: '' });
  const [pwdLoading, setPwdLoading] = useState(false);

  const canEdit = hasPermission('user:update');

  useEffect(() => {
    fetchUserDetails();
    fetchCities();
    fetchRoles();
  }, [userId]);

  const fetchRoles = async () => {
    try {
      const res = await getRoles(true); // dropdown should list only active roles
      const list = res.data.data || [];
      setRoleOptions(list.filter((r: any) => r.id !== 1));
    } catch {
      showToast('Failed to load roles', 'error');
    }
  };

  const fetchCities = async () => {
    try {
      const res = await getCities();
      setCities(res.data.data.filter((c: any) => c.is_active));
    } catch {
      showToast('Failed to load cities', 'error');
    }
  };

  const fetchUserDetails = async () => {
    try {
      const res = await getUserById(parseInt(userId || '0'));
      const u = res.data.data;
      setUser(u);
      setFormData({
        name: u.name,
        phone: u.phone,
        city_id: u.city?.id?.toString() || '',
        role_id: u.role?.id?.toString() || '',
        status: u.is_blocked ? 'blocked' : 'active',
      });
      if (u.role?.slug === 'vendor' && u.vendor_profile) {
        const vp = u.vendor_profile;
        let parsedWindows = {};
        try { parsedWindows = JSON.parse(vp.delivery_windows || '{}'); } catch (e) { }
        const sTypes = vp.service_types ? vp.service_types.split(',') : [];
        setKitchenForm({
          kitchen_name: vp.kitchen_name || '',
          is_open: !!vp.is_open,
          fssai_number: vp.fssai_number || '',
          dietary_type: vp.dietary_type || '',
          service_types: sTypes,
          delivery_windows: parsedWindows,
          order_cutoff_hours: vp.order_cutoff_hours || 0,
          max_capacity_per_slot: vp.max_capacity_per_slot || 0,
        });
      }
    } catch {
      showToast('Failed to load user details', 'error');
      navigate('/admin/users');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return showToast('No permission to edit users', 'error');
    if (!formData.name.trim() || formData.name.trim().length < 2) return showToast('Name must be at least 2 characters', 'error');
    if (!formData.phone.trim()) return showToast('Phone number is required', 'error');
    if (formData.phone.length !== 10) return showToast('Phone must be 10 digits', 'error');
    if (!formData.city_id) return showToast('City is missing for this user', 'error');
    if (!formData.role_id) return showToast('Please select a role', 'error');
    setLoading(true);
    try {
      await updateUser(parseInt(userId || '0'), {
        name: formData.name,
        phone: formData.phone,
        city_id: parseInt(formData.city_id, 10),
        role_id: parseInt(formData.role_id, 10),
        is_blocked: formData.status === 'blocked',
      });
      showToast('User updated successfully', 'success');
      await fetchUserDetails();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleKitchenSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return showToast('No permission to edit users', 'error');
    if (!kitchenForm.kitchen_name.trim()) return showToast('Kitchen name is required', 'error');
    if (kitchenForm.fssai_number && !/^[1-3](0[1-9]|[12]\d|3[0-6])(0[6-9]|1\d|2[0-6])\d{9}$/.test(kitchenForm.fssai_number)) {
      return showToast("Invalid FSSAI Registration Number.", "error");
    }

    setKitchenLoading(true);
    try {
      const body = {
        kitchen_name: kitchenForm.kitchen_name.trim(),
        is_open: kitchenForm.is_open,
        fssai_number: kitchenForm.fssai_number,
        dietary_type: kitchenForm.dietary_type,
        service_types: kitchenForm.service_types.join(','),
        delivery_windows: JSON.stringify(kitchenForm.delivery_windows),
        order_cutoff_hours: kitchenForm.order_cutoff_hours,
        max_capacity_per_slot: kitchenForm.max_capacity_per_slot,
      };
      await updateUserVendorProfile(parseInt(userId || '0'), body);
      showToast('Kitchen details updated', 'success');
      await fetchUserDetails();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update kitchen', 'error');
    } finally {
      setKitchenLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return showToast('No permission to edit users', 'error');
    if (pwdForm.next.length < 6) return showToast('New password must be at least 6 characters', 'error');
    if (pwdForm.next !== pwdForm.confirm) return showToast('Passwords do not match', 'error');
    setPwdLoading(true);
    try {
      await updateUserPassword(parseInt(userId || '0'), pwdForm.next);
      showToast('Password updated successfully', 'success');
      setPwdForm({ next: '', confirm: '' });
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update password', 'error');
    } finally {
      setPwdLoading(false);
    }
  };

  const openAddForm = () => {
    setAddrForm({ ...EMPTY_FORM, city_id: formData.city_id });
    setPhotoPreview(null);
    setPhotoFile(null);
    setActiveForm('add');
  };

  const openEditForm = (addr: any) => {
    setAddrForm({
      city_id: formData.city_id,
      house_no: addr.house_no || '',
      pincode: addr.pincode || '',
      address_text: addr.address_text || '',
      google_maps_url: addr.google_maps_url || '',
      label: addr.label || 'home',
    });
    setPhotoPreview(addr.house_photo_url ? `${API_ORIGIN}${addr.house_photo_url}` : null);
    setPhotoFile(null);
    setActiveForm(addr.id);
  };

  const closeForm = () => {
    setActiveForm(null);
    setAddrForm({ ...EMPTY_FORM, city_id: formData.city_id });
    setPhotoPreview(null);
    setPhotoFile(null);
  };

  const handleCityChange = (cityId: number) => {
    setAddrForm({ ...EMPTY_FORM, city_id: cityId.toString() });
    setPhotoPreview(null);
    setPhotoFile(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmitAddress = async () => {
    if (!addrForm.city_id) return showToast('City is required', 'error');
    if (!addrForm.house_no.trim()) return showToast('House No. is required', 'error');
    if (!addrForm.pincode.trim()) return showToast('Pincode is required', 'error');
    if (!/^\d{6}$/.test(addrForm.pincode.trim())) return showToast('Pincode must be 6 digits', 'error');
    if (!addrForm.address_text.trim()) return showToast('Address is required', 'error');
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

      if (activeForm === 'add') {
        await addUserAddress(parseInt(userId || '0'), payload);
        showToast('Address added', 'success');
      } else {
        await updateUserAddress(activeForm as number, payload);
        showToast('Address updated', 'success');
      }
      closeForm();
      await fetchUserDetails();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to save address', 'error');
    } finally {
      setAddrLoading(false);
    }
  };

  const handleDeleteAddress = async (e: React.MouseEvent, addressId: number) => {
    e.stopPropagation();
    try {
      await deleteUserAddress(addressId);
      showToast('Address deleted', 'success');
      if (activeForm === addressId) closeForm();
      await fetchUserDetails();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to delete address', 'error');
    }
  };

  if (!user) {
    return (
      <div className="user-view-container">
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <span className="spinner"></span>
        </div>
      </div>
    );
  }

  const isVendor = user.role?.slug === 'vendor';
  const addresses: any[] = user.addresses || [];

  const AddrForm = (
    <div className="addr-box addr-box--expanded">
      <div className="addr-photo-uploader" onClick={() => photoInputRef.current?.click()}>
        <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
        {photoPreview ? (
          <img src={photoPreview} alt="preview" className="addr-photo-preview" />
        ) : (
          <span className="addr-photo-placeholder">
            <ImagePlus size={18} />
            {isVendor ? 'Shop Image' : 'House Image'}
          </span>
        )}
      </div>

      <div className="addr-form-row">
        <GlassSelect label="City" options={cities} value={addrForm.city_id} onChange={handleCityChange} />
        <GlassInput label={isVendor ? 'Shop No.' : 'House No.'} value={addrForm.house_no} onChange={(e) => setAddrForm({ ...addrForm, house_no: e.target.value })} />
      </div>

      <div className="addr-textarea-wrap">
        <textarea
          className="addr-textarea"
          placeholder=" "
          rows={2}
          value={addrForm.address_text}
          onChange={(e) => setAddrForm({ ...addrForm, address_text: e.target.value })}
        />
        <label className="addr-textarea-label">Address</label>
      </div>

      <div className="addr-form-row">
        <GlassInput
          label="Pincode"
          value={addrForm.pincode}
          onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
        />
        <GlassInput
          label="Exact Location"
          value={addrForm.google_maps_url}
          onChange={(e) => setAddrForm({ ...addrForm, google_maps_url: e.target.value })}
        />
      </div>

      {!isVendor && (
        <div className="addr-label-selector">
          {['home', 'office', 'other'].map((lbl) => (
            <button
              key={lbl}
              type="button"
              className={`addr-label-opt ${addrForm.label === lbl ? 'active' : ''}`}
              onClick={() => setAddrForm({ ...addrForm, label: lbl })}
            >
              {lbl.charAt(0).toUpperCase() + lbl.slice(1)}
            </button>
          ))}
        </div>
      )}

      <div className="addr-form-actions">
        <button type="button" className="glass-button secondary addr-btn" onClick={closeForm}>
          Cancel
        </button>
        <button type="button" className="glass-button primary addr-btn" disabled={addrLoading} onClick={handleSubmitAddress}>
          {addrLoading ? (
            <span className="spinner small"></span>
          ) : activeForm === 'add' ? (
            'Add Address'
          ) : (
            'Update'
          )}
        </button>
      </div>
    </div>
  );

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
    if (currentSlots.length <= 1) return;
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
      <div className="user-view-top-bar">
        <button className="back-button" onClick={() => navigate('/admin/users')}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        {isVendor && (
          <button className="back-button" style={{ marginLeft: 'auto' }} onClick={() => navigate(`/admin/users/${userId}/meals`)}>
            <Utensils size={20} />
            <span>Manage Meals</span>
          </button>
        )}
      </div>
      <div className="user-view-layout">
        <div className="user-cards-section">
          <div className="profile-card">
            <div className="card-header">
              <div className="card-icon">
                <User size={24} />
              </div>
              <h3>Profile</h3>
            </div>
            <div className="card-body">
              <div className="card-info-row">
                <User size={16} className="info-icon" />
                <div className="info-content">
                  <span className="info-label">Name</span>
                  <span className="info-value">{user.name}</span>
                </div>
              </div>
              <div className="card-info-row">
                <Phone size={16} className="info-icon" />
                <div className="info-content">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{user.phone}</span>
                </div>
              </div>
              <div className="card-info-row">
                <MapPin size={16} className="info-icon" />
                <div className="info-content">
                  <span className="info-label">City</span>
                  <span className="info-value">{user.city?.name}</span>
                </div>
              </div>
              <div className="card-info-row">
                <Calendar size={16} className="info-icon" />
                <div className="info-content">
                  <span className="info-label">Joined</span>
                  <span className="info-value">
                    {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <div className="card-badge-row">
                <span className={`type-badge ${user.role?.slug}`}>{user.role?.name}</span>
                <span className={`status-badge ${user.is_blocked ? 'blocked' : 'active'}`}>{user.is_blocked ? 'Blocked' : 'Active'}</span>
              </div>
            </div>
          </div>

          {isVendor && user.vendor_profile && (
            <div className="profile-card kitchen-card">
              <div className="card-header">
                <div className="card-icon kitchen">
                  <Utensils size={24} />
                </div>
                <h3>Kitchen</h3>
              </div>
              <div className="card-body">
                <div className="card-info-row">
                  <Utensils size={16} className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Kitchen Name</span>
                    <span className="info-value">{user.vendor_profile.kitchen_name}</span>
                  </div>
                </div>
                {(() => {
                  let parsedWindows: any = {};
                  try { parsedWindows = JSON.parse(user.vendor_profile.delivery_windows || '{}'); } catch (e) { }
                  const services = user.vendor_profile.service_types ? user.vendor_profile.service_types.split(',') : [];
                  return services.map((type: string) => (
                    <div className="card-info-row" key={type}>
                      <Clock size={16} className="info-icon" />
                      <div className="info-content">
                        <span className="info-label">{type} Windows</span>
                        <span className="info-value">
                          {(parsedWindows[type] || [])
                            .map((w: any) => typeof w === 'string' ? w : `${w.start_time} - ${w.end_time}`)
                            .join(', ') || 'N/A'}
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
                      {user.vendor_profile.dietary_type === 'Both'
                        ? 'Both (Veg & Non-Veg)'
                        : user.vendor_profile.dietary_type || 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="card-info-row">
                  <Clock size={16} className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Order Cutoff</span>
                    <span className="info-value">{user.vendor_profile.order_cutoff_hours || 0} hrs before</span>
                  </div>
                </div>
                <div className="card-info-row">
                  <User size={16} className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Capacity / Slot</span>
                    <span className="info-value">{user.vendor_profile.max_capacity_per_slot || 0} meals</span>
                  </div>
                </div>
                <div className="card-info-row">
                  <User size={16} className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">FSSAI Number</span>
                    <span className="info-value">{user.vendor_profile.fssai_number || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="user-form-section user-view-form-stack">
          <div className="glass-card">
            <h2 className="form-title">
              <UserCog size={25} />
              User Details
            </h2>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <GlassInput
                  label="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!canEdit}
                />
                <GlassInput
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  disabled={!canEdit}
                />
              </div>

              <div className="form-row">
                <GlassSelect
                  label="Role"
                  options={roleOptions}
                  value={formData.role_id}
                  onChange={(id: number) => setFormData({ ...formData, role_id: String(id) })}
                />
                <GlassSelect
                  label="Status"
                  options={STATUS_OPTIONS}
                  value={formData.status}
                  onChange={(id: string) => setFormData({ ...formData, status: id as 'active' | 'blocked' })}
                />
              </div>

              <div className="addr-boxes-row">
                {addresses.map((addr: any) =>
                  activeForm === addr.id ? (
                    <React.Fragment key={addr.id}>{AddrForm}</React.Fragment>
                  ) : (
                    <div key={addr.id} className="addr-box addr-box--filled" 
                      onClick={() => activeForm === null && openEditForm(addr)}
                      onMouseLeave={() => setConfirmDeleteAddrId(null)}>
                      <div className="addr-delete-btn-wrapper">
                        {confirmDeleteAddrId === addr.id ? (
                          <>
                            <button type="button" className="addr-delete-btn addr-delete-remove-btn" onClick={(e) => handleDeleteAddress(e, addr.id)}>Remove</button>
                            <button type="button" className="addr-delete-btn addr-delete-cross-btn" onClick={(e) => { e.stopPropagation(); setConfirmDeleteAddrId(null); }}><X size={13} /></button>
                          </>
                        ) : (
                          (!isVendor || addresses.length > 1) && (
                            <button type="button" className="addr-delete-btn" onClick={(e) => { e.stopPropagation(); setConfirmDeleteAddrId(addr.id); }} title="Delete"><Trash2 size={13} /></button>
                          )
                        )}
                      </div>
                      {!isVendor && <span className="addr-box-label">{addr.label}</span>}
                      {addr.house_photo_url && (
                        <img src={`${API_ORIGIN}${addr.house_photo_url}`} alt="house" className="addr-box-photo" />
                      )}
                      <p className="addr-box-text">{addr.address_text}</p>
                      {addr.house_no && <span className="addr-box-meta">#{addr.house_no}</span>}
                    </div>
                  )
                )}

                {activeForm === 'add' ? (
                  AddrForm
                ) : (
                  <div className="addr-box addr-box--empty" onClick={openAddForm}>
                    <button type="button" className="addr-add-btn">
                      <Plus size={18} />
                    </button>
                    <span className="addr-add-text">Add Address</span>
                  </div>
                )}
              </div>

              {canEdit ? (
                <div className="form-actions">
                  <button type="submit" className="glass-button primary" disabled={loading}>
                    {loading ? <span className="spinner small"></span> : 'Update'}
                  </button>
                </div>
              ) : (
                <div className="no-permission-message">You don't have permission to edit user details</div>
              )}
            </form>
          </div>

          {isVendor && user.vendor_profile && (
            <div className="glass-card">
              <h2 className="form-title">
                <Utensils size={25} />
                Kitchen
              </h2>
              <form onSubmit={handleKitchenSave}>
                <div className="form-row">
                  <GlassInput
                    label="Kitchen name"
                    value={kitchenForm.kitchen_name}
                    onChange={(e) => setKitchenForm({ ...kitchenForm, kitchen_name: e.target.value })}
                    disabled={!canEdit}
                  />
                  <GlassSelect
                    label="Status"
                    options={STORE_STATUS_OPTIONS}
                    value={kitchenForm.is_open ? 'open' : 'closed'}
                    onChange={(id: string) => setKitchenForm({ ...kitchenForm, is_open: id === 'open' })}
                    disabled={!canEdit}
                  />
                </div>
                <div className="form-row">
                  <GlassInput
                    label="FSSAI Number"
                    value={kitchenForm.fssai_number}
                    onChange={(e) => setKitchenForm({ ...kitchenForm, fssai_number: e.target.value })}
                    disabled={!canEdit}
                  />
                  <GlassSelect
                    label="Dietary Type"
                    options={[
                      { id: 'Veg', name: 'Veg' },
                      { id: 'Non-Veg', name: 'Non-Veg' },
                      { id: 'Both', name: 'Both (Veg & Non-Veg)' },
                    ]}
                    value={kitchenForm.dietary_type}
                    onChange={(val: string) => setKitchenForm({ ...kitchenForm, dietary_type: val })}
                    disabled={!canEdit}
                  />
                </div>

                <div style={{ margin: '15px 0' }}>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '8px', display: 'block', fontWeight: 500 }}>
                    Service Types
                  </label>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    {['Breakfast', 'Lunch', 'Dinner'].map(meal => (
                      <label key={meal} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.9rem', cursor: canEdit ? 'pointer' : 'default', position: 'relative' }}>
                        <input
                          type="checkbox"
                          checked={kitchenForm.service_types.includes(meal)}
                          onChange={(e) => {
                            if (!canEdit) return;
                            const newTypes = e.target.checked
                              ? [...kitchenForm.service_types, meal]
                              : kitchenForm.service_types.filter(t => t !== meal);
                            setKitchenForm({ ...kitchenForm, service_types: newTypes });
                          }}
                          disabled={!canEdit}
                          style={{
                            appearance: 'none',
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: kitchenForm.service_types.includes(meal) ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: canEdit ? 'pointer' : 'default'
                          }}
                        />
                        {kitchenForm.service_types.includes(meal) && (
                          <div style={{
                            position: 'absolute',
                            left: '6px',
                            top: '4px',
                            width: '4px',
                            height: '8px',
                            border: 'solid #4ade80',
                            borderWidth: '0 2px 2px 0',
                            transform: 'rotate(45deg)',
                            pointerEvents: 'none'
                          }} />
                        )}
                        {meal}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <GlassInput 
                    label="Order Cutoff (Hours)" 
                    type="number" 
                    min="1"
                    value={String(kitchenForm.order_cutoff_hours)} 
                    onChange={(e) => {
                      if (!canEdit) return;
                      const val = parseInt(e.target.value);
                      setKitchenForm({ ...kitchenForm, order_cutoff_hours: isNaN(val) ? 1 : Math.max(1, val) });
                    }} 
                    disabled={!canEdit}
                  />
                  <GlassInput 
                    label="Capacity per Slot" 
                    type="number" 
                    min="1"
                    value={String(kitchenForm.max_capacity_per_slot)} 
                    onChange={(e) => {
                      if (!canEdit) return;
                      const val = parseInt(e.target.value);
                      setKitchenForm({ ...kitchenForm, max_capacity_per_slot: isNaN(val) ? 1 : Math.max(1, val) });
                    }} 
                    disabled={!canEdit}
                  />
                </div>

                <div className="kitchen-slots-section" style={{ marginTop: '20px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: '#fff' }}>Service Types</h3>
                  {kitchenForm.service_types.length === 0 && (
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>No service types selected yet.</p>
                  )}
                  {kitchenForm.service_types.length > 0 && (
                    <>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
                        {kitchenForm.service_types.map((service: string) => (
                          <button
                            key={service}
                            type="button"
                            onClick={() => setActiveServiceTab(service)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              border: activeServiceTab === service || (activeServiceTab === null && kitchenForm.service_types[0] === service) ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.2)',
                              background: activeServiceTab === service || (activeServiceTab === null && kitchenForm.service_types[0] === service) ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                              color: activeServiceTab === service || (activeServiceTab === null && kitchenForm.service_types[0] === service) ? '#4ade80' : '#fff',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {service}
                          </button>
                        ))}
                      </div>

                      {(() => {
                        const currentService = activeServiceTab && kitchenForm.service_types.includes(activeServiceTab) ? activeServiceTab : kitchenForm.service_types[0];
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
                              {canEdit && (
                                <button type="button" className="premium-add-btn" onClick={() => handleAddTimeSlot(currentService)}>
                                  <Plus size={14} /> Add Window
                                </button>
                              )}
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
                                        disabled={!canEdit}
                                      />
                                      <span className="premium-time-separator">to</span>
                                      <input
                                        className="premium-time-input"
                                        type="time"
                                        value={end}
                                        onChange={(e) => handleTimeSlotChange(currentService, idx, 'end_time', e.target.value)}
                                        disabled={!canEdit}
                                      />
                                      {currentSlots.length > 1 && canEdit && (
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
                {canEdit ? (
                  <div className="form-actions">
                    <button type="submit" className="glass-button primary" disabled={kitchenLoading}>
                      {kitchenLoading ? <span className="spinner small"></span> : 'Save'}
                    </button>
                  </div>
                ) : (
                  <div className="no-permission-message">You don't have permission to edit kitchen details</div>
                )}
              </form>
            </div>
          )}

          <div className="glass-card">
            <h2 className="form-title">
              <Lock size={25} />
              Set password
            </h2>
            <form onSubmit={handlePasswordSubmit}>
              {canEdit ? (
                <div className="form-row form-row--password-inline">
                  <GlassInput
                    label="New password"
                    type="password"
                    value={pwdForm.next}
                    onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })}
                  />
                  <GlassInput
                    label="Confirm password"
                    type="password"
                    value={pwdForm.confirm}
                    onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                  />
                  <button type="submit" className="glass-button primary form-row--password-inline__btn" disabled={pwdLoading}>
                    {pwdLoading ? <span className="spinner small"></span> : 'Update'}
                  </button>
                </div>
              ) : (
                <div className="no-permission-message">You don't have permission to change this user's password</div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
