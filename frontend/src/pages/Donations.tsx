import { useState, useEffect } from 'react';
import { getDonations, createDonation, updateDonationStatus } from '../lib/api';
import { getCurrentUser } from '../lib/auth';
import { canCreateDonation, canEditDonationStatus } from '../lib/permissions';

interface DonationItem {
  donationId: string;
  donorName: string;
  type: string;
  amount?: number;
  description: string;
  status: string;
  receivedAt: string;
}

const STATUS_OPTIONS = ['All', 'Received', 'Allocated', 'Used'];
const STATUS_VALUES = ['Received', 'Allocated', 'Used'];

export default function Donations() {
  const user = getCurrentUser();
  const role = user?.role || 'Auditor';
  const allowCreate = canCreateDonation(role);
  const allowEditStatus = canEditDonationStatus(role);

  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const [donorName, setDonorName] = useState('');
  const [type, setType] = useState<'Financial' | 'In-Kind'>('Financial');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadDonations() {
    try {
      setLoading(true);
      setError('');
      const data = await getDonations();
      setDonations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load donations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDonations();
  }, []);

  const filtered = donations.filter((d) => {
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    const matchesSearch =
      search.trim() === '' ||
      d.donorName.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  function clearFilters() {
    setStatusFilter('All');
    setSearch('');
  }

  function closeForm() {
    setShowForm(false);
    setDonorName('');
    setType('Financial');
    setAmount('');
    setDescription('');
    setError('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!allowCreate) return;

    setSubmitting(true);
    setError('');

    try {
      const payload: any = { donorName, type, description };
      if (type === 'Financial') {
        payload.amount = parseFloat(amount);
      }

      const newDonation = await createDonation(payload);
      setDonations((prev) => [newDonation, ...prev]);
      closeForm();
    } catch (err: any) {
      setError(err.message || 'Failed to create donation');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(donationId: string, newStatus: string) {
    if (!allowEditStatus) return;

    try {
      await updateDonationStatus(donationId, newStatus);
      setDonations((prev) =>
        prev.map((d) =>
          d.donationId === donationId ? { ...d, status: newStatus } : d
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'Received':
        return 'text-blue-700 bg-blue-50';
      case 'Allocated':
        return 'text-amber-700 bg-amber-50';
      case 'Used':
        return 'text-green-700 bg-green-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-primary">Donations</h2>
        {allowCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-white text-sm font-medium px-4 py-2 rounded hover:bg-secondary"
          >
            New Donation
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by donor or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-border rounded px-3 py-1.5 text-sm w-full sm:w-64"
        />

        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm rounded border ${
                statusFilter === status
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-text-muted border-border hover:border-primary'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {(statusFilter !== 'All' || search) && (
          <button onClick={clearFilters} className="text-sm text-text-muted underline">
            Clear filters
          </button>
        )}
      </div>

      {error && !showForm && (
        <div className="mb-4 text-sm text-danger border border-red-200 bg-red-50 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="border border-border bg-surface rounded overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-text-muted text-sm">Loading donations...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            No donations match the current filters.
          </div>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Donor</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Amount / Description</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Received</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.donationId} className="border-b border-border last:border-0 hover:bg-background">
                  <td className="px-4 py-3 font-medium">{d.donorName}</td>
                  <td className="px-4 py-3">{d.type}</td>
                  <td className="px-4 py-3">
                    {d.type === 'Financial' && d.amount
                      ? `$${d.amount.toLocaleString()}`
                      : d.description}
                  </td>
                  <td className="px-4 py-3">
                    {allowEditStatus ? (
                      <select
                        value={d.status}
                        onChange={(e) => handleStatusChange(d.donationId, e.target.value)}
                        className={`text-xs font-medium rounded px-2 py-1 border-0 cursor-pointer ${getStatusColor(d.status)}`}
                      >
                        {STATUS_VALUES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(d.status)}`}>
                        {d.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {new Date(d.receivedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showForm && allowCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm}></div>
          <div className="relative w-full max-w-lg border border-border bg-surface rounded p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-primary">Record Donation</h3>
              <button onClick={closeForm} className="text-sm text-text-muted hover:text-primary">
                Close
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Donor Name *</label>
                <input
                  required
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'Financial' | 'In-Kind')}
                    className="w-full border border-border rounded px-3 py-2 text-sm"
                  >
                    <option value="Financial">Financial</option>
                    <option value="In-Kind">In-Kind</option>
                  </select>
                </div>

                {type === 'Financial' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full border border-border rounded px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-border rounded px-3 py-2 text-sm"
                />
              </div>

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
                  {submitting ? 'Saving...' : 'Save Donation'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="border border-border text-sm px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
