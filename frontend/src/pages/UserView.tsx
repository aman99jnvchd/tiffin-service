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

  const [kitchenForm, setKitchenForm] = useState({
    kitchen_name: '',
    is_open: true,
    open_time: '',
    close_time: '',
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
      const res = await getRoles();
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
        setKitchenForm({
          kitchen_name: vp.kitchen_name || '',
          is_open: !!vp.is_open,
          open_time: vp.open_time ? vp.open_time.slice(0, 5) : '',
          close_time: vp.close_time ? vp.close_time.slice(0, 5) : '',
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
    setKitchenLoading(true);
    try {
      const body: {
        kitchen_name: string;
        is_open: boolean;
        open_time?: string;
        close_time?: string;
      } = {
        kitchen_name: kitchenForm.kitchen_name.trim(),
        is_open: kitchenForm.is_open,
      };
      if (kitchenForm.open_time) body.open_time = `${kitchenForm.open_time}:00`;
      if (kitchenForm.close_time) body.close_time = `${kitchenForm.close_time}:00`;
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
            House Image
          </span>
        )}
      </div>

      <div className="addr-form-row">
        <GlassSelect label="City" options={cities} value={addrForm.city_id} onChange={handleCityChange} />
        <GlassInput label="House No." value={addrForm.house_no} onChange={(e) => setAddrForm({ ...addrForm, house_no: e.target.value })} />
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

      <div className="addr-label-selector">
        {ADDR_LABELS.map((lbl) => (
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

      <div className="addr-form-actions">
        <button type="button" className="glass-button secondary addr-btn" onClick={closeForm}>
          <X size={14} /> Cancel
        </button>
        <button type="button" className="glass-button primary addr-btn" disabled={addrLoading} onClick={handleSubmitAddress}>
          {addrLoading ? (
            <span className="spinner small"></span>
          ) : activeForm === 'add' ? (
            <>
              <Plus size={14} /> Add Address
            </>
          ) : (
            <>
              <Pencil size={14} /> Update
            </>
          )}
        </button>
      </div>
    </div>
  );

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
                <div className="card-info-row">
                  <Clock size={16} className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Operating Hours</span>
                    <span className="info-value">
                      {user.vendor_profile.open_time} - {user.vendor_profile.close_time}
                    </span>
                  </div>
                </div>
                <div className="card-badge-row">
                  <span className={`status-badge ${user.vendor_profile.is_open ? 'active' : 'inactive'}`}>
                    {user.vendor_profile.is_open ? 'Open' : 'Closed'}
                  </span>
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
                    <div key={addr.id} className="addr-box addr-box--filled" onClick={() => activeForm === null && openEditForm(addr)}>
                      <button type="button" className="addr-delete-btn" onClick={(e) => handleDeleteAddress(e, addr.id)} title="Delete">
                        <Trash2 size={13} />
                      </button>
                      <span className="addr-box-label">{addr.label}</span>
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
                    label="Opens at"
                    type="time"
                    value={kitchenForm.open_time}
                    onChange={(e) => setKitchenForm({ ...kitchenForm, open_time: e.target.value })}
                    disabled={!canEdit}
                  />
                  <GlassInput
                    label="Closes at"
                    type="time"
                    value={kitchenForm.close_time}
                    onChange={(e) => setKitchenForm({ ...kitchenForm, close_time: e.target.value })}
                    disabled={!canEdit}
                  />
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
