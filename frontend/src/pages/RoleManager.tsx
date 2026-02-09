import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassInput } from '../components/GlassInput';
import { getRoles, createRole, updateRole, getPermissions } from '../api/axios';
import { useToastStore } from '../store/useToastStore';
import '../styles/CityManager.css'; // Reusing layout styles
import '../styles/RoleManager.css'; // New checkbox styles

export const RoleManager = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    slug: '', 
    is_active: true, 
    permission_ids: [] as number[] 
  });

  const showToast = useToastStore((state) => state.showToast);

  // Initial Fetch
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([getRoles(), getPermissions()]);
      setRoles(rolesRes.data.data);
      setPermissions(permsRes.data.data);
    } catch (err) {
      showToast("Failed to load data", "error");
    }
  };

  // Open Modal (Add Mode)
  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', slug: '', is_active: true, permission_ids: [] });
    setIsModalOpen(true);
  };

  // Open Modal (Edit Mode)
  const openEditModal = (role: any) => {
    setEditingId(role.id);
    // Map existing permission objects to just their IDs for the form
    const currentPermIds = role.permissions.map((p: any) => p.id);
    setFormData({ 
      name: role.name, 
      slug: role.slug, 
      is_active: role.is_active,
      permission_ids: currentPermIds
    });
    setIsModalOpen(true);
  };

  // Toggle a single permission in the form
  const togglePermission = (permId: number) => {
    setFormData(prev => {
      const exists = prev.permission_ids.includes(permId);
      if (exists) {
        return { ...prev, permission_ids: prev.permission_ids.filter(id => id !== permId) };
      } else {
        return { ...prev, permission_ids: [...prev.permission_ids, permId] };
      }
    });
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      return showToast("Name and Slug are required", "error");
    }

    setLoading(true);
    try {
      if (editingId) {
        await updateRole(editingId, formData);
        showToast("Role updated successfully", "success");
      } else {
        await createRole(formData);
        showToast("New role created", "success");
      }
      setIsModalOpen(false);
      fetchData(); // Refresh list
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Action failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="city-manager-container">
      {/* Header */}
      <div className="page-header">
        <div className="info">
          <h2 className="page-title-large">Role Management</h2>
          <p className="page-subtitle">Define roles and access permissions</p>
        </div>
        <button className="glass-button primary-btn compact-btn" onClick={openAddModal}>
          + Add Role
        </button>
      </div>

      {/* Glass Table */}
      <div className="glass-card table-card">
        <div className="table-responsive">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Role Name</th>
                <th>Slug</th>
                <th>Permissions</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role: any) => (
                <tr key={role.id}>
                  <td className="name-col">{role.name}</td>
                  <td><span className="slug-badge">{role.slug}</span></td>
                  <td>
                    {role.permissions.length === 0 ? (
                      <span className="text-muted">No permissions</span>
                    ) : (
                      <span className="perm-count-badge">
                        {role.permissions.length} Access Points
                      </span>
                    )}
                  </td>
                  <td className="actions-col">
                    <button className="action-btn edit" onClick={() => openEditModal(role)}>
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
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
              style={{ maxWidth: '500px' }} // Slightly wider for permissions
            >
              <h3>{editingId ? 'Edit Role' : 'Create Role'}</h3>
              <form onSubmit={handleSave}>
                <GlassInput 
                  label="Role Name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
                <GlassInput 
                  label="Slug (Code Identifier)" 
                  value={formData.slug} 
                  onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s/g, '_')})} 
                  disabled={editingId && ['admin', 'customer', 'vendor'].includes(formData.slug)} // Lock system roles
                />

                {/* Permissions Grid */}
                <div className="permissions-section">
                  <label className="permissions-label">Access Permissions</label>
                  <div className="permissions-grid">
                    {permissions.map((perm: any) => (
                      <div 
                        key={perm.id} 
                        className={`perm-checkbox ${formData.permission_ids.includes(perm.id) ? 'selected' : ''}`}
                        onClick={() => togglePermission(perm.id)}
                      >
                        <div className="checkmark"></div>
                        <span className="perm-name">{perm.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="glass-button secondary" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="glass-button primary" disabled={loading}>
                    {loading ? <span className="spinner small"></span> : 'Save Changes'}
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