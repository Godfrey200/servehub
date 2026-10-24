import { useState, useEffect } from 'react';
import { getAuditLogs } from '../lib/api';

interface AuditItem {
  auditId: string;
  action: string;
  entity: string;
  entityId?: string;
  performedBy: string;
  details?: string;
  createdAt: string;
}

export default function Audit() {
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getAuditLogs();
        setLogs(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold text-primary mb-6">Audit Log</h2>

      {error && (
        <div className="mb-4 text-sm text-danger border border-red-200 bg-red-50 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="border border-border bg-surface rounded overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-text-muted text-sm">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            No audit records yet. Actions will appear here after users create or update records.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Time</th>
                <th className="text-left px-4 py-3 font-medium">Action</th>
                <th className="text-left px-4 py-3 font-medium">Entity</th>
                <th className="text-left px-4 py-3 font-medium">Performed By</th>
                <th className="text-left px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.auditId} className="border-b border-border last:border-0 hover:bg-background">
                  <td className="px-4 py-3 text-text-muted">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{log.action}</td>
                  <td className="px-4 py-3">{log.entity}</td>
                  <td className="px-4 py-3">{log.performedBy}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{log.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

