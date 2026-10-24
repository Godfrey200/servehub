import { useState, useEffect } from 'react';
import { getCases, createCase, updateCaseStatus } from '../lib/api';
import { getCurrentUser } from '../lib/auth';
import { canCreateCase, canEditCaseStatus } from '../lib/permissions';

interface CaseItem {
  caseId: string;
  beneficiaryName: string;
  status: string;
  priority: string;
  summary: string;
  createdAt: string;
}

const STATUS_OPTIONS = ['All', 'New', 'Active', 'Under Review', 'Closed'];
const STATUS_VALUES = ['New', 'Active', 'Under Review', 'Closed'];

export default function Cases() {
  const user = getCurrentUser();
  const role = user?.role || 'Auditor';
  const allowCreate = canCreateCase(role);
  const allowEditStatus = canEditCaseStatus(role);

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [summary, setSummary] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadCases() {
    try {
      setLoading(true);
      setError('');
      const data = await getCases();
      setCases(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCases();
  }, []);

  const filteredCases = cases.filter((c) => {
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    const matchesSearch =
      search.trim() === '' ||
      c.beneficiaryName.toLowerCase().includes(search.toLowerCase()) ||
      c.summary.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  function clearFilters() {
    setStatusFilter('All');
    setSearch('');
  }

  function closeForm() {
    setShowForm(false);
    setBeneficiaryName('');
    setSummary('');
    setPriority('Medium');
    setContactPhone('');
    setNotes('');
    setError('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!allowCreate) return;

    setSubmitting(true);
    setError('');

    try {
      const newCase = await createCase({
        beneficiaryName,
        summary,
        priority,
        contactPhone: contactPhone || undefined,
        notes: notes || undefined,
      });

      setCases((prev) => [newCase, ...prev]);
      closeForm();
    } catch (err: any) {
      setError(err.message || 'Failed to create case');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(caseId: string, newStatus: string) {
    if (!allowEditStatus) return;

    try {
      await updateCaseStatus(caseId, newStatus);
      setCases((prev) =>
        prev.map((c) =>
          c.caseId === caseId ? { ...c, status: newStatus } : c
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'New':
        return 'text-blue-700 bg-blue-50';
      case 'Active':
        return 'text-green-700 bg-green-50';
      case 'Under Review':
        return 'text-amber-700 bg-amber-50';
      case 'Closed':
        return 'text-slate-600 bg-slate-100';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-primary">Cases</h2>
        {allowCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-white text-sm font-medium px-4 py-2 rounded hover:bg-secondary"
          >
            New Case
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name or summary..."
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
          <div className="p-8 text-center text-text-muted text-sm">Loading cases...</div>
        ) : filteredCases.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            No cases match the current filters.
          </div>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Beneficiary</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Priority</th>
                <th className="text-left px-4 py-3 font-medium">Summary</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((c) => (
                <tr key={c.caseId} className="border-b border-border last:border-0 hover:bg-background">
                  <td className="px-4 py-3 font-medium">{c.beneficiaryName}</td>
                  <td className="px-4 py-3">
                    {allowEditStatus ? (
                      <select
                        value={c.status}
                        onChange={(e) => handleStatusChange(c.caseId, e.target.value)}
                        className={`text-xs font-medium rounded px-2 py-1 border-0 cursor-pointer ${getStatusColor(c.status)}`}
                      >
                        {STATUS_VALUES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(c.status)}`}>
                        {c.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{c.priority}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{c.summary}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {new Date(c.createdAt).toLocaleDateString()}
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
              <h3 className="text-lg font-medium text-primary">Create New Case</h3>
              <button onClick={closeForm} className="text-sm text-text-muted hover:text-primary">
                Close
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Beneficiary Name *</label>
                <input
                  required
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Summary *</label>
                <textarea
                  required
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  className="w-full border border-border rounded px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full border border-border rounded px-3 py-2 text-sm"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Phone</label>
                  <input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full border border-border rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
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
                  {submitting ? 'Saving...' : 'Create Case'}
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
