import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassInput } from '../components/GlassInput';
import { getRoles, createRole, updateRole, getPermissions } from '../api/axios';
import { useToastStore } from '../store/useToastStore';
import { usePermissions } from '../hooks/usePermissions';
import { Plus, Edit } from 'lucide-react';
import { CardView } from '../components/CardView';
import { Users } from 'lucide-react';
import '../styles/CityManager.css'; // Reusing layout styles
import '../styles/RoleManager.css'; // New checkbox styles
import '../styles/CardView.css';


export const RoleManager = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [permissionsRoleId, setPermissionsRoleId] = useState<number | null>(null);
  const [permissionsRoleName, setPermissionsRoleName] = useState<string>('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const isAdminRole = permissionsRoleId === 1;

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    slug: '', 
    is_active: true, 
    permission_ids: [] as number[] 
  });
  const [isSlugDirty, setIsSlugDirty] = useState(false);

  const showToast = useToastStore((state) => state.showToast);
  const { hasPermission } = usePermissions();

  // Permission checks
  const canView = hasPermission('role:view');
  const canCreate = hasPermission('role:create');
  const canUpdate = hasPermission('role:update');
  const canManagePermissions = hasPermission('role:manage_permissions');

  // Initial Fetch
  useEffect(() => {
    if (canView) {
      fetchData();
    }
  }, [canView]);

  const fetchData = async () => {
    if (!canView) return;
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
    if (!canCreate) {
      showToast("You don't have permission to create roles", "error");
      return;
    }
    setEditingId(null);
    setFormData({ name: '', slug: '', is_active: true, permission_ids: [] });
    setIsSlugDirty(false);
    setIsModalOpen(true);
  };

  // Open Modal (Edit Mode)
  const openEditModal = (role: any) => {
    if (!canUpdate) {
      showToast("You don't have permission to update roles", "error");
      return;
    }
    setEditingId(role.id);
    // Map existing permission objects to just their IDs for the form
    const currentPermIds = role.permissions.map((p: any) => p.id);
    setFormData({ 
      name: role.name, 
      slug: role.slug, 
      is_active: role.is_active,
      permission_ids: currentPermIds
    });
    setIsSlugDirty(false);
    setIsModalOpen(true);
  };

  // Open Permissions-only Modal
  const openPermissionsModal = (role: any) => {
    if (!canManagePermissions) {
      showToast("You don't have permission to manage role permissions", "error");
      return;
    }
    setPermissionsRoleId(role.id);
    setPermissionsRoleName(role.name);
    const currentPermIds = (role.permissions || []).map((p: any) => p.id);
    setSelectedPermissionIds(currentPermIds);
    setIsPermissionsModalOpen(true);
  };

  // Helper to generate code/slug from name
  const generateCodeFromName = (name: string) => {
    const cleaned = name
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .slice(0, 50);

    return cleaned
      .toLowerCase()
      .replace(/\s+/g, '_');
  };

  // Handle Role Name change with validation + auto-code (for add form)
  const handleNameChange = (rawValue: string) => {
    const cleaned = rawValue.replace(/[^a-zA-Z0-9 ]/g, '');
    if (cleaned.length > 50) return;

    setFormData(prev => {
      const updated = { ...prev, name: cleaned };

      // Auto-generate code only when adding and user hasn't manually changed code
      if (!editingId && !isSlugDirty) {
        updated.slug = generateCodeFromName(cleaned);
      }
      return updated;
    });
  };

  // Handle Code (slug) change – allowed only on add
  const handleCodeChange = (rawValue: string) => {
    const cleaned = rawValue.replace(/[^a-zA-Z0-9_ ]/g, '').slice(0, 50);
    const formatted = cleaned
      .toLowerCase()
      .replace(/\s+/g, '_');

    setIsSlugDirty(true);
    setFormData(prev => ({ ...prev, slug: formatted }));
  };

  // System roles (id 1,2,3) — no status toggle allowed
  const isSystemRole = (id: number | null) => id !== null && id <= 3;

  const handleToggleRoleStatus = async (role: any) => {
    try {
      await updateRole(role.id, { is_active: !role.is_active });
      showToast(`Role ${role.is_active ? 'disabled' : 'activated'}`, 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update status', 'error');
    }
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      return showToast("Name and Code are required", "error");
    }

    setLoading(true);
    try {
      if (editingId) {
        // On update, only send fields that are allowed to change from UI
        await updateRole(editingId, {
          name: formData.name,
          is_active: formData.is_active,
          permission_ids: formData.permission_ids,
        });
        showToast("Role updated successfully", "success");
      } else {
        // On create, send full payload including generated code
        await createRole({
          name: formData.name,
          slug: formData.slug,
          is_active: formData.is_active,
          permission_ids: formData.permission_ids,
        });
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

  // --- Permissions Modal Helpers ---
  const togglePermissionForRole = (permId: number) => {
    setSelectedPermissionIds(prev => 
      prev.includes(permId)
        ? prev.filter(id => id !== permId)
        : [...prev, permId]
    );
  };

  const handleSavePermissions = async () => {
    if (!permissionsRoleId) return;
    setLoading(true);
    try {
      await updateRole(permissionsRoleId, {
        permission_ids: selectedPermissionIds,
      });
      showToast('Permissions updated successfully', 'success');
      setIsPermissionsModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update permissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getGroupLabel = (prefix: string) => {
    switch (prefix) {
      case 'city':
        return 'City Management';
      case 'role':
        return 'Role Management';
      case 'auth':
        return 'Authentication';
      default:
        return prefix
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  const permissionGroups = useMemo(() => {
    const groups: Record<string, { label: string; items: any[] }> = {};
    (permissions as any[]).forEach((perm) => {
      const [prefix] = perm.slug.split(':');
      const key = prefix || 'general';
      if (!groups[key]) {
        groups[key] = { label: getGroupLabel(key), items: [] };
      }
      groups[key].items.push(perm);
    });
    return Object.values(groups);
  }, [permissions]);

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
            <span className="btn-text">Add Role</span>
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
                <th>Role Name</th>
                <th>Code</th>
                <th>Permissions</th>
                <th>Status</th>
                {canUpdate && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {roles.map((role: any, index) => (
                <tr key={role.id}>
                  <td className="serial-col">{index + 1}</td>
                  <td className="name-col">{role.name}</td>
                  <td><span className="slug-badge">{role.slug}</span></td>
                  <td>
                    {(() => {
                      const count = role.permissions.length;
                      const label = count === 0
                        ? 'No permissions'
                        : `${count} Permission(s)`;
                      return canManagePermissions ? (
                        <button
                          type="button"
                          className={`permissions-link ${count === 0 ? 'empty' : ''}`}
                          onClick={() => openPermissionsModal(role)}
                        >
                          {label}
                        </button>
                      ) : (
                        <span className="permissions-text">{label}</span>
                      );
                    })()}
                  </td>
                  <td>
                    {isSystemRole(role.id) ? (
                      <span className="status-pill active">Active</span>
                    ) : (
                      <button
                        type="button"
                        className={`status-pill clickable ${role.is_active ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleRoleStatus(role)}
                      >
                        {role.is_active ? 'Active' : 'Disabled'}
                      </button>
                    )}
                  </td>
                  {canUpdate && (
                    <td className="actions-col">
                      <button 
                        className="action-btn edit"
                        onClick={() => openEditModal(role)}
                      >
                        <span className="btn-decor"></span>
                        <span className="btn-text">Manage</span>
                        <span className="btn-icon">
                          <Edit size={16} strokeWidth={2} />
                        </span>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {roles.length === 0 && (
                <tr>
                  <td colSpan={canUpdate ? 6 : 5} className="empty-state">No roles found. {canCreate ? 'Add one to get started.' : ''}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card View (Mobile) */}
      <CardView
        data={roles}
        columns={[
          { key: 'name', label: 'Role Name' },
          { 
            key: 'slug', 
            label: 'Code', 
            render: (val) => <span className="slug-badge">{val}</span>
          },
          {
            key: 'permissions',
            label: 'Permissions',
            render: (val: any, item: any) => {
              const perms = item.permissions || val || [];
              const count = perms.length;
              const label = count === 0
                ? 'No permissions'
                : `${count} Permission(s)`;

              return canManagePermissions ? (
                <button
                  type="button"
                  className={`permissions-link ${count === 0 ? 'empty' : ''}`}
                  onClick={() => openPermissionsModal(item)}
                >
                  {label}
                </button>
              ) : (
                <span className="permissions-text">{label}</span>
              );
            }
          },
          {
            key: 'is_active',
            label: 'Status',
            render: (val: boolean, item: any) =>
              isSystemRole(item.id) ? (
                <span className="status-pill active">Active</span>
              ) : (
                <button
                  type="button"
                  className={`status-pill clickable ${val ? 'active' : 'inactive'}`}
                  onClick={() => handleToggleRoleStatus(item)}
                >
                  {val ? 'Active' : 'Disabled'}
                </button>
              )
          }
        ]}
        expandedColumns={[]}
        onEdit={canUpdate ? openEditModal : undefined}
        emptyMessage={`No roles found. ${canCreate ? 'Add one to get started.' : ''}`}
      />

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
              <h3>
                <Users size={22} />
                {editingId ? 'Edit Role' : 'Create Role'}
              </h3>
              <form onSubmit={handleSave}>
                <GlassInput 
                  label="Role Name" 
                  value={formData.name} 
                  onChange={(e) => handleNameChange(e.target.value)} 
                />
                <GlassInput 
                  label="Code" 
                  value={formData.slug} 
                  onChange={(e) => {
                    if (editingId) return;
                    handleCodeChange(e.target.value);
                  }} 
                />

                {/* Status toggle — hidden for system roles (id 1,2,3) */}
                {!isSystemRole(editingId) && (
                  <div className="status-toggle-container">
                    <button
                      type="button"
                      className={`toggle-option ${formData.is_active ? 'green-active' : 'grey'}`}
                      onClick={() => setFormData({ ...formData, is_active: true })}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      className={`toggle-option ${!formData.is_active ? 'red-active' : 'grey'}`}
                      onClick={() => setFormData({ ...formData, is_active: false })}
                    >
                      Disabled
                    </button>
                  </div>
                )}

                <div className="modal-actions">
                  <button type="button" className="glass-button secondary" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="glass-button primary" disabled={loading}>
                    {loading ? <span className="spinner small"></span> : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Permissions Management Modal */}
      <AnimatePresence>
        {isPermissionsModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="modal-backdrop"
              onClick={() => setIsPermissionsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-modal"
              style={{ maxWidth: '640px' }}
            >
              <h3>
                <Users size={22} />
                Manage Permissions
              </h3>
              <p className="permissions-subtitle">
                Role: <strong>{permissionsRoleName}</strong>
                {isAdminRole && <span className="admin-role-note"> — view only</span>}
              </p>

              <div className="permissions-groups">
                {permissionGroups.map((group) => (
                  <div key={group.label} className="permissions-group">
                    <h4 className="permissions-group-title">{group.label}</h4>
                    <div className="permissions-grid">
                      {group.items.map((perm: any) => (
                        isAdminRole ? (
                          // Admin role — read-only pill, no checkbox
                          <div key={perm.id} className="perm-checkbox selected perm-readonly">
                            <span className="perm-name">{perm.name}</span>
                          </div>
                        ) : (
                          <div
                            key={perm.id}
                            className={`perm-checkbox ${selectedPermissionIds.includes(perm.id) ? 'selected' : ''}`}
                            onClick={() => togglePermissionForRole(perm.id)}
                          >
                            <div className="checkmark"></div>
                            <span className="perm-name">{perm.name}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="glass-button secondary"
                  onClick={() => setIsPermissionsModalOpen(false)}
                >
                  Close
                </button>
                {!isAdminRole && (
                  <button
                    type="button"
                    className="glass-button primary"
                    onClick={handleSavePermissions}
                    disabled={loading}
                  >
                    {loading ? <span className="spinner small"></span> : 'Save'}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};