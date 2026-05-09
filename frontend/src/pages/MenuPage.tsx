import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, ImagePlus, ChevronDown, UtensilsCrossed, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMeals, createMeal, updateMeal, uploadMealImage, getUserById } from '../api/axios';
import { GlassInput } from '../components/GlassInput';
import { CardView } from '../components/CardView';
import { useToastStore } from '../store/useToastStore';
import { usePermissions } from '../hooks/usePermissions';
import '../styles/CityManager.css';
import '../styles/CardView.css';
import '../styles/MenuPage.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EMPTY_FORM = {
  name: '',
  base_price: '',
  description: '',
  image_url: '',
  schedule_days: null as string | null, // null = daily
  is_always_available: true,
  is_active: true,
};

// Format schedule_days string into display badges
const formatSchedule = (isAlways: boolean, scheduleDays: string | null) => {
  if (isAlways || !scheduleDays) return <span className="meal-badge daily">Daily</span>;

  const days = scheduleDays.split(',').map(d => d.trim());
  const order = DAYS;
  const sorted = days.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  // Group consecutive days
  const groups: string[][] = [];
  let current: string[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (order.indexOf(sorted[i]) === order.indexOf(sorted[i - 1]) + 1) {
      current.push(sorted[i]);
    } else {
      groups.push(current);
      current = [sorted[i]];
    }
  }
  groups.push(current);

  return (
    <span className="meal-schedule-badges">
      {groups.map((g, i) =>
        g.length >= 3
          ? <span key={i} className="meal-badge day">{g[0]} – {g[g.length - 1]}</span>
          : g.map(d => <span key={d} className="meal-badge day">{d}</span>)
      )}
    </span>
  );
};

export const MenuPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  const { hasPermission } = usePermissions();
  const imageInputRef = useRef<HTMLInputElement>(null);

  // vendorProfileId is the VendorProfile.id (not user id) — fetched from user
  const [vendorProfileId, setVendorProfileId] = useState<number | null>(null);
  const [vendorName, setVendorName] = useState<string>('');
  const [meals, setMeals] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const canCreate = hasPermission('meal:create');
  const canUpdate = hasPermission('meal:update');

  useEffect(() => { fetchVendorAndMeals(); }, [userId]);

  const fetchVendorAndMeals = async () => {
    try {
      if (userId) {
        const res = await getUserById(parseInt(userId));
        const u = res.data.data;
        setVendorName(u.vendor_profile?.kitchen_name || u.name);
        setVendorProfileId(u.vendor_profile?.id || null);
        await fetchMeals(u.vendor_profile?.id);
      } else {
        await fetchMeals();
      }
    } catch { showToast("Failed to load vendor", "error"); }
  };

  const fetchMeals = async (vpId?: number) => {
    try {
      const res = await getMeals(vpId);
      setMeals(res.data.data);
    } catch { showToast("Failed to load meals", "error"); }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
    setSelectedDays([]);
    setImagePreview(null);
    setImageFile(null);
    setShowDayPicker(false);
    setIsModalOpen(true);
  };

  const openEditModal = (meal: any) => {
    setEditingId(meal.id);
    const days = meal.schedule_days ? meal.schedule_days.split(',').map((d: string) => d.trim()) : [];
    setSelectedDays(days);
    setFormData({
      name: meal.name,
      base_price: String(meal.base_price),
      description: meal.description || '',
      image_url: meal.image_url || '',
      schedule_days: meal.schedule_days || null,
      is_always_available: meal.is_always_available,
      is_active: meal.is_active,
    });
    setImagePreview(meal.image_url ? `http://localhost:1415${meal.image_url}` : null);
    setImageFile(null);
    setShowDayPicker(false);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleScheduleMode = (daily: boolean) => {
    setFormData(f => ({ ...f, is_always_available: daily }));
    if (daily) {
      setSelectedDays([]);
      setShowDayPicker(false);
    } else {
      // toggle the popover when clicking Schedule again
      setShowDayPicker(prev => !prev);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return showToast("Meal Name is required", "error");
    if (!formData.base_price || isNaN(Number(formData.base_price)) || Number(formData.base_price) <= 0)
      return showToast("Valid Price is required", "error");
    if (!formData.is_always_available && selectedDays.length === 0)
      return showToast("Select at least one day for scheduled meals", "error");

    setLoading(true);
    try {
      let imageUrl = formData.image_url;
      if (imageFile) {
        const res = await uploadMealImage(imageFile);
        imageUrl = res.data.data.url;
      }

      const payload = {
        name: formData.name,
        base_price: Number(formData.base_price),
        description: formData.description || null,
        image_url: imageUrl || null,
        schedule_days: formData.is_always_available ? null : selectedDays.join(','),
        is_always_available: formData.is_always_available,
        is_active: formData.is_active,
      };

      if (editingId) {
        await updateMeal(editingId, payload);
        showToast("Meal updated", "success");
      } else {
        if (!vendorProfileId) return showToast("Vendor profile not found", "error");
        await createMeal(vendorProfileId, payload);
        showToast("Meal created", "success");
      }
      setIsModalOpen(false);
      fetchMeals(vendorProfileId ?? undefined);
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to save meal", "error");
    } finally { setLoading(false); }
  };

  return (
    <div className="city-manager-container">
      <div className="add-button-container">
        {userId && (
          <button className="back-button" style={{ marginRight: 'auto' }} onClick={() => navigate(`/admin/users/${userId}`)}>
            <ArrowLeft size={20} /><span>Back</span>
          </button>
        )}
        {canCreate && (
          <button className="add-btn" onClick={openAddModal}>
            <span className="btn-decor"></span>
            <span className="btn-text">Add Meal</span>
            <span className="btn-icon"><Plus size={18} strokeWidth={2} /></span>
          </button>
        )}
      </div>

      {/* Desktop Table */}
      <div className="glass-card table-card">
        <div className="table-responsive">
          <table className="glass-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Price</th>
                <th>Description</th>
                <th>Schedule</th>
                <th>Status</th>
                {canUpdate && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {meals.map((meal, index) => (
                <tr key={meal.id}>
                  <td className="serial-col">{index + 1}</td>
                  <td>
                    <div className="meal-name-cell">
                      {meal.image_url
                        ? <img src={`http://localhost:1415${meal.image_url}`} alt={meal.name} className="meal-thumb" />
                        : <div className="meal-thumb-placeholder" />
                      }
                      <span>{meal.name}</span>
                    </div>
                  </td>
                  <td>₹{Number(meal.base_price).toFixed(2)}</td>
                  <td className="meal-desc-cell">{meal.description || <span className="text-muted">—</span>}</td>
                  <td>{formatSchedule(meal.is_always_available, meal.schedule_days)}</td>
                  <td>
                    <span className={`status-pill ${meal.is_active ? 'active' : 'inactive'}`}>
                      {meal.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canUpdate && (
                    <td className="actions-col">
                      <button className="action-btn edit" onClick={() => openEditModal(meal)}>
                        <span className="btn-text">Manage</span>
                        <span className="btn-icon"><Edit size={16} strokeWidth={2} /></span>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {meals.length === 0 && (
                <tr>
                  <td colSpan={canUpdate ? 7 : 6} className="empty-state">No meals added yet. {canCreate ? 'Add one to get started.' : ''}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <CardView
        data={meals}
        columns={[
          {
            key: 'name', label: 'Name',
            render: (val, item) => (
              <div className="meal-name-cell">
                {item.image_url
                  ? <img src={`http://localhost:1415${item.image_url}`} alt={val} className="meal-thumb" />
                  : <div className="meal-thumb-placeholder" />
                }
                <span>{val}</span>
              </div>
            )
          },
          { key: 'base_price', label: 'Price', render: (val) => `₹${Number(val).toFixed(2)}` },
          {
            key: 'is_always_available', label: 'Schedule',
            render: (val, item) => formatSchedule(val, item.schedule_days)
          },
          {
            key: 'is_active', label: 'Status',
            render: (val) => <span className={`status-pill ${val ? 'active' : 'inactive'}`}>{val ? 'Active' : 'Inactive'}</span>
          },
        ]}
        expandedColumns={[
          { key: 'description', label: 'Description', render: (val) => val || '—' },
        ]}
        onEdit={canUpdate ? openEditModal : undefined}
        emptyMessage={`No meals added yet. ${canCreate ? 'Add one to get started.' : ''}`}
      />

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="modal-backdrop" onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-modal meal-modal"
            >
              <h3><UtensilsCrossed size={22} />{editingId ? 'Edit Meal' : 'Add Meal'}</h3>

              <form onSubmit={handleSave}>
                {/* Image uploader */}
                <div className="meal-image-uploader" onClick={() => imageInputRef.current?.click()}>
                  <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" className="meal-image-preview" />
                    : <div className="meal-image-placeholder"><ImagePlus size={28} /><span>Meal Image</span></div>
                  }
                </div>

                <GlassInput label="Meal Name" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} />

                <GlassInput label="Price (₹)" value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: e.target.value.replace(/[^0-9.]/g, '') })} />

                <GlassInput label="Description (optional)" value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} />

                {/* Schedule toggle */}
                <div className="meal-section-label">Schedule</div>
                <div className="meal-schedule-row">
                  <div className="meal-toggle-group">
                    <button type="button"
                      className={`toggle-option ${formData.is_always_available ? 'green-active' : 'grey'}`}
                      onClick={() => handleScheduleMode(true)}>
                      Daily Meal
                    </button>
                    <button
                      type="button"
                      className={`toggle-option schedule-btn ${!formData.is_always_available ? 'green-active' : 'grey'}`}
                      onClick={() => handleScheduleMode(false)}>
                      Schedule
                      {!formData.is_always_available && (
                        <ChevronDown
                          size={14}
                          style={{ transform: showDayPicker ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
                        />
                      )}
                    </button>
                  </div>

                  {/* Selected days — only shown when popup is closed */}
                  {!formData.is_always_available && !showDayPicker && selectedDays.length > 0 && (
                    <div className="meal-selected-days">
                      {selectedDays.map(d => <span key={d} className="meal-badge day">{d}</span>)}
                    </div>
                  )}

                  {/* Transparent overlay — clicking outside closes the popover */}
                  {showDayPicker && (
                    <div className="day-picker-overlay" onClick={() => setShowDayPicker(false)} />
                  )}

                  {/* Day picker popover */}
                  {showDayPicker && (
                    <div className="day-picker-popover">
                      {DAYS.map(day => (
                        <button key={day} type="button"
                          className={`day-pill ${selectedDays.includes(day) ? 'selected' : ''}`}
                          onClick={() => toggleDay(day)}>
                          {day}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status toggle */}
                <div className="meal-section-label">Status</div>
                <div className="status-toggle-container">
                  <button type="button"
                    className={`toggle-option ${formData.is_active ? 'green-active' : 'grey'}`}
                    onClick={() => setFormData({ ...formData, is_active: true })}>
                    Active
                  </button>
                  <button type="button"
                    className={`toggle-option ${!formData.is_active ? 'red-active' : 'grey'}`}
                    onClick={() => setFormData({ ...formData, is_active: false })}>
                    Inactive
                  </button>
                </div>

                <div className="modal-actions">
                  <button type="button" className="glass-button secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="glass-button primary" disabled={loading}>
                    {loading ? <span className="spinner small"></span> : (editingId ? 'Update' : 'Save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
