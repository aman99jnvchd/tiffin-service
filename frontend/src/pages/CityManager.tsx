import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassInput } from '../components/GlassInput';
import { Building2, Plus, Edit } from "lucide-react";
import { getCities, addCity, updateCity, toggleCityStatus } from '../api/axios';
import { useToastStore } from '../store/useToastStore';
import { usePermissions } from '../hooks/usePermissions';
import { CardView } from '../components/CardView';
import '../styles/CityManager.css';
import '../styles/CardView.css';

export const CityManager = () => {
  const [cities, setCities] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Track which specific row is toggling status (for the loader)
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', is_active: true });

  const showToast = useToastStore((state) => state.showToast);
  const { hasPermission } = usePermissions();

  // Permission checks
  const canView = hasPermission('city:view');
  const canCreate = hasPermission('city:create');
  const canUpdate = hasPermission('city:update');
  const canToggleStatus = hasPermission('city:toggle_status');

  // Initial Fetch
  useEffect(() => {
    if (canView) {
      fetchCities();
    }
  }, [canView]);

  const fetchCities = async () => {
    if (!canView) return;
    try {
      const res = await getCities();
      setCities(res.data.data);
    } catch (err) {
      showToast("Failed to load cities", "error");
    }
  };

  // Open Modal (Add Mode)
  const openAddModal = () => {
    if (!canCreate) {
      showToast("You don't have permission to add cities", "error");
      return;
    }
    setEditingId(null);
    setFormData({ name: '', slug: '', is_active: true });
    setIsModalOpen(true);
  };

  // Open Modal (Edit Mode)
  const openEditModal = (city: any) => {
    if (!canUpdate) {
      showToast("You don't have permission to update cities", "error");
      return;
    }
    setEditingId(city.id);
    setFormData({ 
      name: city.name, 
      slug: city.alias || '', 
      is_active: city.is_active 
    });
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Min Length 2
    if (formData.name.trim().length < 2) {
      return showToast("City Name must be at least 2 characters", "error");
    }
    if (formData.slug.trim().length < 2) {
      return showToast("Slug must be at least 2 characters", "error");
    }

    setLoading(true);
    try {
      const payload = { name: formData.name, alias: formData.slug, is_active: formData.is_active };
      
      if (editingId) {
        await updateCity(editingId, payload);
        showToast("City updated successfully", "success");
      } else {
        await addCity(payload);
        showToast("New city added", "success");
      }
      setIsModalOpen(false);
      fetchCities();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Action failed", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Status Toggle (Directly from Table)
  const handleToggle = async (cityId: number) => {
    if (!canToggleStatus) {
      showToast("You don't have permission to change city status", "error");
      return;
    }
    
    if (togglingId === cityId) return;

    setTogglingId(cityId);
    try {
      await toggleCityStatus(cityId);
      await fetchCities(); 
      showToast("Status updated successfully", "success");
    } catch (err) {
      showToast("Failed to toggle status", "error");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="city-manager-container">
      {/* Add Button Container - Only show if user can create */}
      {canCreate && (
        <div className="add-button-container">
          <button 
            className="add-btn"
            onClick={openAddModal}
          >
            <span className="btn-decor"></span>
            <span className="btn-text">Add City</span>
            <span className="btn-icon">
              <Plus size={18} strokeWidth={2} />
            </span>
          </button>
        </div>
      )}

      {/* Glass Table (Desktop) */}
      <div className="glass-card table-card">
        <div className="table-responsive">
          <table className="glass-table">
            <thead>
              <tr>
                <th>#</th>
                <th>City Name</th>
                <th>Slug</th>
                <th>Status</th>
                {canUpdate && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {cities.map((city: any, index) => (
                <tr key={city.id}>
                  <td className="serial-col">{index + 1}</td>
                  <td className="name-col">{city.name}</td>
                  <td>{city.alias || <span className="text-muted">-</span>}</td>
                  
                  {/* Status Column with Interactive Pill */}
                  <td>
                    {canToggleStatus ? (
                      <button 
                        className={`status-pill clickable ${city.is_active ? 'active' : 'inactive'}`}
                        onClick={() => handleToggle(city.id)}
                        disabled={togglingId === city.id}
                        title="Tap to toggle availability"
                      >
                        {togglingId === city.id ? (
                          <span className="spinner-pill"></span>
                        ) : (
                          city.is_active ? 'Available' : 'Unavailable'
                        )}
                      </button>
                    ) : (
                      <span className={`status-pill ${city.is_active ? 'active' : 'inactive'}`}>
                        {city.is_active ? 'Available' : 'Unavailable'}
                      </span>
                    )}
                  </td>

                  {canUpdate && (
                    <td className="actions-col">
                      <button 
                        className="action-btn edit"
                        onClick={() => openEditModal(city)}
                      >
                        <span className="btn-text">Update</span>
                        <span className="btn-icon">
                          <Edit size={16} strokeWidth={2} />
                        </span>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {cities.length === 0 && (
                <tr>
                  <td colSpan={canUpdate ? 5 : 4} className="empty-state">No cities found. {canCreate ? 'Add one to get started.' : ''}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card View (Mobile) */}
      <CardView
        data={cities}
        columns={[
          { key: 'name', label: 'City Name' },
          { key: 'alias', label: 'Slug', render: (val) => val || <span className="text-muted">-</span> },
          { 
            key: 'is_active', 
            label: 'Status',
            render: (val, city: any) => (
              canToggleStatus ? (
                <button 
                  className={`status-pill clickable ${city.is_active ? 'active' : 'inactive'}`}
                  onClick={() => handleToggle(city.id)}
                  disabled={togglingId === city.id}
                  title="Tap to toggle availability"
                >
                  {togglingId === city.id ? (
                    <span className="spinner-pill"></span>
                  ) : (
                    city.is_active ? 'Available' : 'Unavailable'
                  )}
                </button>
              ) : (
                <span className={`status-pill ${city.is_active ? 'active' : 'inactive'}`}>
                  {city.is_active ? 'Available' : 'Unavailable'}
                </span>
              )
            )
          }
        ]}
        expandedColumns={[]}
        onEdit={canUpdate ? openEditModal : undefined}
        emptyMessage={`No cities found. ${canCreate ? 'Add one to get started.' : ''}`}
      />

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="modal-backdrop"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-modal"
            >
              <h3>
                <Building2 size={22} />
                {editingId ? 'Update City' : 'Add City'}
              </h3>
              <form onSubmit={handleSave}>
                <GlassInput 
                  label="City Name" 
                  value={formData.name} 
                  onChange={(e) => {
                    const val = e.target.value;
                    // Regex: Only Letters and Spaces, Max 50
                    if (/^[a-zA-Z\s]*$/.test(val) && val.length <= 50) {
                      setFormData({...formData, name: val});
                    }
                  }}
                />
                <GlassInput 
                  label="Slug" 
                  value={formData.slug} 
                  onChange={(e) => {
                    const val = e.target.value;
                    // Regex: Only Letters and Spaces, Max 50
                    if (/^[a-zA-Z\s]*$/.test(val) && val.length <= 50) {
                      setFormData({...formData, slug: val.toUpperCase()});
                    }
                  }}
                />
                
                {/* Custom Status Toggle Switch - Only show if user has toggle permission */}
                {canToggleStatus && (
                  <div className="status-toggle-container">
                    <button
                      type="button"
                      className={`toggle-option ${formData.is_active ? 'green-active' : 'grey'}`}
                      onClick={() => setFormData({...formData, is_active: true})}
                    >
                      Available
                    </button>
                    <button
                      type="button"
                      className={`toggle-option ${!formData.is_active ? 'red-active' : 'grey'}`}
                      onClick={() => setFormData({...formData, is_active: false})}
                    >
                      Unavailable
                    </button>
                  </div>
                )}

                <div className="modal-actions">
                  <button type="button" className="glass-button secondary" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
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