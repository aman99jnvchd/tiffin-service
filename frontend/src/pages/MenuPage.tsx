import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, ImagePlus, ChevronDown, UtensilsCrossed, ArrowLeft, Trash2, Check, X } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMeals, createMeal, updateMeal, uploadMealImage, getUserById, getCategories, createCategory, updateCategory, deleteCategory } from '../api/axios';
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
  category_id: null as number | null,
  service_types: [] as string[],
  dietary_type: 'veg' as 'veg' | 'egg' | 'non-veg',
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
  const [categories, setCategories] = useState<any[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

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
        await Promise.all([
          fetchMeals(u.vendor_profile?.id),
          fetchCategories(u.vendor_profile?.id)
        ]);
      } else {
        await Promise.all([fetchMeals(), fetchCategories()]);
      }
    } catch { showToast("Failed to load data", "error"); }
  };

  const fetchCategories = async (vpId?: number) => {
    try {
      const res = await getCategories(vpId);
      setCategories(res.data.data);
    } catch { showToast("Failed to load categories", "error"); }
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
    setShowCategoryDropdown(false);
    setCategorySearch('');
    setIsModalOpen(true);
  };

  const openEditModal = (meal: any) => {
    setEditingId(meal.id);
    const days = meal.available_days ? meal.available_days.split(',').map((d: string) => d.trim()) : [];
    setSelectedDays(days);
    setFormData({
      name: meal.name,
      base_price: String(meal.base_price),
      description: meal.description || '',
      image_url: meal.image_url || '',
      schedule_days: meal.available_days || null,
      is_always_available: meal.is_always_available,
      is_active: meal.is_active,
      category_id: meal.category_id || null,
      service_types: meal.service_types ? meal.service_types.split(',').map((s: string) => s.trim()) : [],
      dietary_type: (meal.dietary_type as 'veg' | 'egg' | 'non-veg') || 'veg',
    });
    setImagePreview(meal.image_url ? `http://localhost:1415${meal.image_url}` : null);
    setImageFile(null);
    setShowDayPicker(false);
    setShowCategoryDropdown(false);
    setCategorySearch('');
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

  const handleCreateCategory = async () => {
    if (!categorySearch.trim()) return;
    try {
      if (!vendorProfileId) return showToast("Vendor profile not found", "error");
      const res = await createCategory(vendorProfileId, { name: categorySearch.trim() });
      const newCategory = res.data.data;
      setCategories(prev => [...prev, newCategory]);
      setFormData(prev => ({ ...prev, category_id: newCategory.id }));
      closeCategoryDropdown();
      showToast("Category created", "success");
    } catch (err: any) {
      if (err.response?.status === 409) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to create category", "error");
      }
    }
  };

  const closeCategoryDropdown = () => {
    setShowCategoryDropdown(false);
    setCategorySearch('');
    setEditingCategoryId(null);
  };

  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));

  const handleUpdateCategory = async (id: number) => {
    if (!editingCategoryName.trim()) return;
    try {
      await updateCategory(id, { name: editingCategoryName.trim() });
      setCategories(prev => prev.map(c => c.id === id ? { ...c, name: editingCategoryName.trim() } : c));
      setEditingCategoryId(null);
      showToast("Category updated", "success");
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to update category", "error");
    }
  };

  const handleDeleteCategory = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      if (formData.category_id === id) {
        setFormData(prev => ({ ...prev, category_id: null }));
      }
      showToast("Category deleted", "success");
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to delete category", "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id) return showToast("Category is required", "error");
    if (!formData.name.trim()) return showToast("Meal Name is required", "error");
    if (!formData.base_price || isNaN(Number(formData.base_price)) || Number(formData.base_price) <= 0)
      return showToast("Valid Price is required", "error");
    if (!formData.is_always_available && selectedDays.length === 0)
      return showToast("Select at least one day for scheduled meals", "error");
    if (formData.service_types.length === 0)
      return showToast("Select at least one Service Type", "error");

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
        is_always_available: formData.is_always_available,
        available_days: formData.is_always_available ? null : (selectedDays.length ? selectedDays.join(',') : null),
        is_active: formData.is_active,
        category_id: formData.category_id,
        service_types: formData.service_types.length ? formData.service_types.join(',') : null,
        dietary_type: formData.dietary_type,
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
                  <td>{formatSchedule(meal.is_always_available, meal.available_days)}</td>
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
            render: (val, item) => formatSchedule(val, item.available_days)
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
              className="global-backdrop" onClick={() => setIsModalOpen(false)}
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

                <div className="input-container">
                  <div 
                    className="glass-input category-dropdown-trigger" 
                    onClick={() => setShowCategoryDropdown(true)}
                    style={{ borderColor: showCategoryDropdown ? 'var(--primary-glow)' : undefined }}
                  >
                    <span>
                      {formData.category_id
                        ? categories.find(c => c.id === formData.category_id)?.name
                        : ''}
                    </span>
                    <ChevronDown size={18} style={{ transform: showCategoryDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', opacity: 0.6 }} />
                  </div>
                  <label className={`floating-label ${formData.category_id || showCategoryDropdown ? 'active' : ''}`}>Category</label>

                  {showCategoryDropdown && (
                    <>
                      <div className="day-picker-overlay" onClick={closeCategoryDropdown} />
                      <div className="category-dropdown-menu">
                        <div className="category-search-row">
                          <input
                            type="text"
                            placeholder="Search or add new category"
                            value={categorySearch}
                            onChange={e => {
                              const val = e.target.value;
                              setCategorySearch(val.charAt(0).toUpperCase() + val.slice(1));
                            }}
                            autoFocus
                          />
                          <button type="button" onClick={handleCreateCategory}>Add</button>
                        </div>
                        <div className="category-list">
                          {filteredCategories.length === 0 ? (
                            <div className="category-not-found"><i>not found</i></div>
                          ) : (
                            filteredCategories.map(cat => (
                              <div
                                key={cat.id}
                                className={`category-item ${formData.category_id === cat.id ? 'selected' : ''}`}
                                onClick={() => {
                                  if (editingCategoryId === cat.id) return;
                                  setFormData(prev => ({ ...prev, category_id: cat.id }));
                                  closeCategoryDropdown();
                                }}
                              >
                                {editingCategoryId === cat.id ? (
                                  <div className="category-edit-row" onClick={e => e.stopPropagation()}>
                                    <input 
                                      type="text" 
                                      value={editingCategoryName} 
                                      onChange={e => {
                                        const val = e.target.value;
                                        setEditingCategoryName(val.charAt(0).toUpperCase() + val.slice(1));
                                      }} 
                                      autoFocus 
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleUpdateCategory(cat.id);
                                        if (e.key === 'Escape') setEditingCategoryId(null);
                                      }}
                                    />
                                    <div className="category-actions">
                                      <button type="button" className="cat-action-btn check" onClick={() => handleUpdateCategory(cat.id)}><Check size={14} /></button>
                                      <button type="button" className="cat-action-btn cancel" onClick={() => setEditingCategoryId(null)}><X size={14} /></button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <span className="cat-name">{cat.name}</span>
                                    <div className="category-actions">
                                      <button 
                                        type="button" 
                                        className="cat-action-btn edit" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingCategoryId(cat.id);
                                          setEditingCategoryName(cat.name);
                                        }}
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button 
                                        type="button" 
                                        className="cat-action-btn delete" 
                                        onClick={(e) => handleDeleteCategory(cat.id, e)}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <GlassInput label="Meal Name" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} />

                <GlassInput label="Price (₹)" value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: e.target.value.replace(/[^0-9.]/g, '') })} />

                <GlassInput label="Description (optional)" value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} />

                {/* Service Types */}
                <div className="meal-section-label" style={{ marginTop: '16px' }}>Service Types</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {['Breakfast', 'Lunch', 'Dinner'].map(st => {
                    const isSelected = formData.service_types.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        className={`toggle-option ${isSelected ? 'green-active' : 'grey'}`}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            service_types: isSelected 
                              ? prev.service_types.filter(s => s !== st)
                              : [...prev.service_types, st]
                          }));
                        }}
                      >
                        {st}
                      </button>
                    )
                  })}
                </div>

                {/* Dietary Type Segmented Control */}
                <div className="meal-section-label" style={{ marginTop: '4px' }}>Dietary Type</div>
                <div className="dietary-segment-control">
                  {[
                    { value: 'veg', label: '🟢 Veg', activeColor: 'rgba(34, 197, 94, 0.2)', activeBorder: 'rgba(34, 197, 94, 0.5)', activeText: '#4ade80' },
                    { value: 'egg', label: '🟡 Egg', activeColor: 'rgba(234, 179, 8, 0.2)', activeBorder: 'rgba(234, 179, 8, 0.5)', activeText: '#fbbf24' },
                    { value: 'non-veg', label: '🔴 Non-Veg', activeColor: 'rgba(239, 68, 68, 0.2)', activeBorder: 'rgba(239, 68, 68, 0.5)', activeText: '#f87171' },
                  ].map(opt => {
                    const isActive = formData.dietary_type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className="dietary-segment-btn"
                        style={isActive ? {
                          background: opt.activeColor,
                          borderColor: opt.activeBorder,
                          color: opt.activeText,
                          fontWeight: 600,
                        } : {}}
                        onClick={() => setFormData(prev => ({ ...prev, dietary_type: opt.value as 'veg' | 'egg' | 'non-veg' }))}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

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
