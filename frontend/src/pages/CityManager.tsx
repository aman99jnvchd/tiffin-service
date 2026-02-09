import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassInput } from '../components/GlassInput';
import { getCities, addCity, updateCity, toggleCityStatus } from '../api/axios';
import { useToastStore } from '../store/useToastStore';
import '../styles/CityManager.css';

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

  // Initial Fetch
  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      const res = await getCities();
      setCities(res.data.data);
    } catch (err) {
      showToast("Failed to load cities", "error");
    }
  };

  // Open Modal (Add Mode)
  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', slug: '', is_active: true });
    setIsModalOpen(true);
  };

  // Open Modal (Edit Mode)
  const openEditModal = (city: any) => {
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
      {/* Header Section */}
      <div className="page-header">
        <div className="info">
          <h2 className="page-title-large">City Management</h2>
          <p className="page-subtitle">Manage delivery locations and their availability</p>
        </div>
        <button className="glass-button primary-btn compact-btn" onClick={openAddModal}>
          Add City
        </button>
      </div>

      {/* Glass Table */}
      <div className="glass-card table-card">
        <div className="table-responsive">
          <table className="glass-table">
            <thead>
              <tr>
                <th>#</th>
                <th>City Name</th>
                <th>Slug</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
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
                  </td>

                  <td className="actions-col">
                    <button 
                      className="action-btn edit"
                      onClick={() => openEditModal(city)}
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
              {cities.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">No cities found. Add one to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              <h3>{editingId ? 'Update City' : 'Add City'}</h3>
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
                
                {/* Custom Status Toggle Switch */}
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