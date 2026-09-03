import React, { useState, useEffect } from 'react';
import { getBackups, createBackup, restoreBackup } from '../services/backupService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Database, Download, RotateCcw, Check, AlertCircle } from 'lucide-react';

export const Backups = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getBackups();
      setBackups(data.backups || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setActionLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await createBackup();
      setMessage(res.message || 'Database snapshot backup created successfully!');
      fetchList();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create backup');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreBackup = async (filename) => {
    if (!window.confirm(`WARNING: Restoring backup "${filename}" will overwrite current database records. Proceed?`)) return;
    setActionLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await restoreBackup(filename);
      setMessage(res.message || 'Database successfully restored!');
      fetchList();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restore backup');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-wide">Database Backup & Restore</h1>
          <p className="text-xs text-slate-500 font-medium">Create local database snapshot dumps & restore data for business safety</p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={actionLoading}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-2 transition shadow-md shadow-amber-500/20 cursor-pointer"
        >
          <Database className="w-4 h-4" />
          <span>{actionLoading ? 'Creating Backup...' : 'BACKUP DATABASE NOW'}</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <LoadingSpinner label="Loading backup snapshots..." />
        ) : backups.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-semibold">No database backups created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-500 font-extrabold">
                <tr>
                  <th className="py-3 px-4">Backup Snapshot File</th>
                  <th className="py-3 px-4">Created Date & Time</th>
                  <th className="py-3 px-4 text-center">File Size</th>
                  <th className="py-3 px-4 text-center">Restore Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map((b) => (
                  <tr key={b.filename} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-extrabold text-amber-800">{b.filename}</td>
                    <td className="py-3 px-4 text-slate-500 font-medium">{new Date(b.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">{Math.round(b.sizeBytes / 1024)} KB</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleRestoreBackup(b.filename)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 mx-auto cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore Snapshot</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
