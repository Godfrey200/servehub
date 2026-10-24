import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../lib/api';
import { getCurrentUser } from '../lib/auth';
import { canManageUsers } from '../lib/permissions';

interface UserItem {
  userId: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

const ROLES = ['SystemAdmin', 'CaseWorker', 'VolunteerCoordinator', 'Auditor'];
const ROLE_FILTERS = ['All', ...ROLES];

export default function Users() {
  const currentUser = getCurrentUser();
  const role = currentUser?.role || 'Auditor';
  const allowManage = canManageUsers(role);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [userRole, setUserRole] = useState('CaseWorker');
  const [submitting, setSubmitting] = useState(false);

  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadUsers() {
    try {
      setLoading(true);
      setError('');
      const data = await getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (allowManage) {
      loadUsers();
    } else {
      setLoading(false);
      setError('You do not have permission to manage users');
    }
  }, [allowManage]);

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === '' ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  function clearFilters() {
    setSearch('');
    setRoleFilter('All');
  }

  function openCreateModal() {
    setMode('create');
    setEditingUser(null);
    setName('');
    setEmail('');
    setUserRole('CaseWorker');
    setError('');
    setShowModal(true);
  }

  function openEditModal(user: UserItem) {
    setMode('edit');
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setUserRole(user.role);
    setError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingUser(null);
    setName('');
    setEmail('');
    setUserRole('CaseWorker');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allowManage) return;

    setSubmitting(true);
    setError('');

    if (mode === 'create') {
      const tempId = `temp-${Date.now()}`;
      const optimisticUser: UserItem = {
        userId: tempId,
        name,
        email,
        role: userRole,
        createdAt: new Date().toISOString(),
      };

      setUsers((prev) => [optimisticUser, ...prev]);
      closeModal();

      try {
        const realUser = await createUser({ name, email, role: userRole });
        setUsers((prev) => prev.map((u) => (u.userId === tempId ? realUser : u)));
      } catch (err: any) {
        setUsers((prev) => prev.filter((u) => u.userId !== tempId));
        setError(err.message || 'Failed to create user');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'edit' && editingUser) {
      const previous = { ...editingUser };
      const userId = editingUser.userId;

      setUsers((prev) =>
        prev.map((u) =>
          u.userId === userId ? { ...u, name, role: userRole } : u
        )
      );
      closeModal();

      try {
        await updateUser(userId, {
          email: editingUser.email,
          name,
          role: userRole,
        });
      } catch (err: any) {
        setUsers((prev) =>
          prev.map((u) => (u.userId === userId ? previous : u))
        );
        setError(err.message || 'Failed to update user');
      } finally {
        setSubmitting(false);
      }
    }
  }

  function requestDelete(user: UserItem) {
    if (!allowManage) return;
    if (user.email === currentUser?.email) {
      setError('You cannot delete your own account');
      return;
    }
    setError('');
    setUserToDelete(user);
  }

  function cancelDelete() {
    setUserToDelete(null);
  }

  async function confirmDelete() {
    if (!userToDelete) return;

    setDeleting(true);
    const previous = [...users];
    const target = userToDelete;

    setUsers((prev) => prev.filter((u) => u.userId !== target.userId));
    setUserToDelete(null);

    try {
      await deleteUser(target.userId, target.email);
    } catch (err: any) {
      setUsers(previous);
      setError(err.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  }

  if (!allowManage) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-xl font-semibold text-primary mb-4">Users</h2>
        <div className="border border-border bg-surface rounded p-6 text-sm text-text-muted">
          You do not have permission to manage users.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-primary">Users</h2>
        <button
          onClick={openCreateModal}
          className="bg-primary text-white text-sm font-medium px-4 py-2 rounded hover:bg-secondary"
        >
          Add User
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-border rounded px-3 py-1.5 text-sm w-full sm:w-72"
        />

        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-sm rounded border ${
                roleFilter === r
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-text-muted border-border hover:border-primary'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {(search || roleFilter !== 'All') && (
          <button onClick={clearFilters} className="text-sm text-text-muted underline">
            Clear filters
          </button>
        )}
      </div>

      {error && !showModal && (
        <div className="mb-4 text-sm text-danger border border-red-200 bg-red-50 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="border border-border bg-surface rounded overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-text-muted text-sm">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            No users match the current filters.
          </div>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.userId} className="border-b border-border last:border-0 hover:bg-background">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEditModal(u)}
                        className="text-sm text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => requestDelete(u)}
                        className="text-sm text-danger hover:underline disabled:opacity-40"
                        disabled={u.email === currentUser?.email}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal}></div>
          <div className="relative w-full max-w-lg border border-border bg-surface rounded p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-primary">
                {mode === 'create' ? 'Add New User' : 'Edit User'}
              </h3>
              <button onClick={closeModal} className="text-sm text-text-muted hover:text-primary">
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm"
                  disabled={mode === 'edit'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Role *</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {mode === 'edit' && (
                <p className="text-xs text-text-muted">
                  Email cannot be changed. Name and role update Cognito and the directory.
                </p>
              )}

              {error && (
                <div className="text-sm text-danger border border-red-200 bg-red-50 rounded px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary text-white text-sm font-medium px-4 py-2 rounded"
                >
                  {submitting ? 'Saving...' : mode === 'create' ? 'Add User' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="border border-border text-sm px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={cancelDelete}></div>
          <div className="relative w-full max-w-md border border-border bg-surface rounded p-6 shadow-lg">
            <h3 className="text-lg font-medium text-primary mb-2">Delete user</h3>
            <p className="text-sm text-text mb-1">
              Delete user <span className="font-medium">{userToDelete.name}</span>
              {' '}({userToDelete.email})?
            </p>
            <p className="text-sm text-text-muted mb-6">
              This removes their login and directory record. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={cancelDelete}
                disabled={deleting}
                className="border border-border text-sm px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-red-700 text-white text-sm font-medium px-4 py-2 rounded hover:bg-red-800 disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete user'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
