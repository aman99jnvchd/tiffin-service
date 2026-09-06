import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { getUsers, toggleUserStatus } from '../api/axios';
import { useToastStore } from '../store/useToastStore';
import { usePermissions } from '../hooks/usePermissions';
import { CardView } from '../components/CardView';
import '../styles/CityManager.css';
import '../styles/UserManager.css';
import '../styles/CardView.css';

export const UserManager = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const showToast = useToastStore((state) => state.showToast);
  const { hasPermission } = usePermissions();

  // Permission checks
  const canView = hasPermission('user:view');
  const canToggleStatus = hasPermission('user:toggle_status');

  // Mock data - will be replaced with API call
  useEffect(() => {
    if (canView) {
      fetchUsers();
    }
  }, [canView]);

  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data.data);
    } catch (err) {
      showToast("Failed to load users", "error");
    }
  };

  // Handle Status Toggle
  const handleToggle = async (userId: number) => {
    if (!canToggleStatus) {
      showToast("You don't have permission to block/unblock users", "error");
      return;
    }

    if (togglingId === userId) return;

    setTogglingId(userId);
    try {
      await toggleUserStatus(userId);
      await fetchUsers();
      showToast("User status updated successfully", "success");
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Failed to update user status";
      showToast(errorMsg, "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleViewUser = (userId: number) => {
    navigate(`/admin/users/${userId}`);
  };

  return (
    <div className="city-manager-container">
      {/* Glass Table (Desktop) */}
      <div className="glass-card table-card">
        <div className="table-responsive">
          <table className="glass-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone Number</th>
                <th>Role</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any, index) => (
                <tr key={user.id}>
                  <td className="serial-col">{index + 1}</td>
                  <td className="name-col">{user.name}</td>
                  <td>{user.phone}</td>
                  
                  {/* Role */}
                  <td>
                    <span className={`type-badge ${user.role.slug}`}>
                      {user.role.name}
                    </span>
                  </td>

                  {/* Status Column with Interactive Pill */}
                  <td>
                    {canToggleStatus ? (
                      <button 
                        className={`status-pill clickable ${user.is_blocked ? 'blocked' : 'active'}`}
                        onClick={() => handleToggle(user.id)}
                        disabled={togglingId === user.id}
                        title="Click to toggle user status"
                      >
                        {togglingId === user.id ? (
                          <span className="spinner-pill"></span>
                        ) : (
                          user.is_blocked ? 'Blocked' : 'Active'
                        )}
                      </button>
                    ) : (
                      <span className={`status-pill ${user.is_blocked ? 'blocked' : 'active'}`}>
                        {user.is_blocked ? 'Blocked' : 'Active'}
                      </span>
                    )}
                  </td>

                  <td className="actions-col">
                    <button 
                      className="action-btn view"
                      onClick={() => handleViewUser(user.id)}
                    >
                      <span className="btn-decor"></span>
                      <span className="btn-text">View</span>
                      <span className="btn-icon">
                        <Eye size={16} strokeWidth={2} />
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card View (Mobile) */}
      <CardView
        data={users}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'phone', label: 'Phone Number' },
          { 
            key: 'role', 
            label: 'Role',
            render: (val: any) => (
              <span className={`type-badge ${val.slug}`}>
                {val.name}
              </span>
            )
          },
          { 
            key: 'is_blocked', 
            label: 'Status',
            render: (_val, user: any) => (
              canToggleStatus ? (
                <button 
                  className={`status-pill clickable ${user.is_blocked ? 'blocked' : 'active'}`}
                  onClick={() => handleToggle(user.id)}
                  disabled={togglingId === user.id}
                  title="Click to toggle user status"
                >
                  {togglingId === user.id ? (
                    <span className="spinner-pill"></span>
                  ) : (
                    user.is_blocked ? 'Blocked' : 'Active'
                  )}
                </button>
              ) : (
                <span className={`status-pill ${user.is_blocked ? 'blocked' : 'active'}`}>
                  {user.is_blocked ? 'Blocked' : 'Active'}
                </span>
              )
            )
          }
        ]}
        expandedColumns={[]}
        onEdit={(user) => handleViewUser(user.id as number)}
        editButtonText="View"
        emptyMessage="No users found."
      />
    </div>
  );
};
