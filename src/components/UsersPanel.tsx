// =============================================================================
// HYDRA-UMC STUDIO - Config > Users Panel: UsersPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real multi-user account management, replacing a single hardcoded
// "demo"/"demo" login - talks to the /api/users
// routes (server.ts + users.ts), all admin-only. Two roles: "admin"
// (full access - settings writes, user management, robot commands) and
// "operator" (robot commands only via the atomic /api/robot/:id/command
// endpoint - can log in, view state, jog/play/pause/stop, but can't
// overwrite global settings or touch this panel). A non-admin account
// never sees this tab reachable in practice - server-side 403s it
// regardless, this UI just doesn't bother rendering it for them either.
// =============================================================================

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users as UsersIcon, Trash2, KeyRound, UserPlus, ShieldCheck } from 'lucide-react';
import { useHydraStore } from '../store';
import { apiUrl } from '../lib/apiBase';
import { ConfirmDialog } from './ConfirmDialog';

interface StoredUserSummary {
  username: string;
  role: 'admin' | 'operator';
  createdAt: string;
}

export function UsersPanel() {
  const { t } = useTranslation();
  const { authToken } = useHydraStore();
  const [users, setUsers] = useState<StoredUserSummary[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'operator'>('operator');

  const [renameTarget, setRenameTarget] = useState('');
  const [renameNewName, setRenameNewName] = useState('');
  const [renamePassword, setRenamePassword] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const authHeaders = () => ({ 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) });

  const loadUsers = async () => {
    try {
      const res = await fetch(apiUrl('/api/users'), { headers: authHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
      setError('');
    } catch {
      setError(t('config.users_load_error'));
    }
  };

  useEffect(() => { loadUsers(); }, [authToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setNotice('');
    try {
      const res = await fetch(apiUrl('/api/users'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t('config.users_create_error')); return; }
      setNewUsername(''); setNewPassword(''); setNewRole('operator');
      setNotice(t('config.users_create_success'));
      loadUsers();
    } catch {
      setError(t('config.users_create_error'));
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    setError(''); setNotice('');
    try {
      const body: Record<string, string> = {};
      if (renameNewName.trim()) body.newUsername = renameNewName.trim();
      if (renamePassword) body.password = renamePassword;
      const res = await fetch(apiUrl(`/api/users/${encodeURIComponent(renameTarget)}`), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t('config.users_update_error')); return; }
      setRenameNewName(''); setRenamePassword('');
      setNotice(t('config.users_update_success'));
      loadUsers();
    } catch {
      setError(t('config.users_update_error'));
    }
  };

  const doDelete = async (username: string) => {
    setError(''); setNotice('');
    try {
      const res = await fetch(apiUrl(`/api/users/${encodeURIComponent(username)}`), { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t('config.users_delete_error')); return; }
      loadUsers();
    } catch {
      setError(t('config.users_delete_error'));
    }
  };

  const handleDelete = (username: string) => setDeleteTarget(username);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><UsersIcon size={16} /> {t('config.users')}</h3>
        <p className="text-[10px] text-slate-600 leading-relaxed pt-2">{t('config.users_desc')}</p>
      </div>

      {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</p>}
      {notice && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">{notice}</p>}

      {/* User list */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('config.users_username')}</th>
              <th className="px-4 py-3 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('config.users_role')}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.username} className="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors">
                <td className="px-4 py-3 text-slate-200 font-bold">{u.username}</td>
                <td className="px-4 py-3">
                  <span className={u.role === 'admin' ? 'inline-flex items-center gap-1 text-emerald-400 text-[10px] font-black uppercase' : 'inline-flex items-center gap-1 text-sky-400 text-[10px] font-black uppercase'}>
                    {u.role === 'admin' && <ShieldCheck size={12} />} {u.role === 'admin' ? t('config.users_role_admin') : t('config.users_role_operator')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(u.username)} className="text-slate-600 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-600 text-xs">{t('config.users_none')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Rename / change password */}
      <form onSubmit={handleRename} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><KeyRound size={14} /> {t('config.users_change_title')}</h4>
        <select value={renameTarget} onChange={e => setRenameTarget(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-sky-500">
          <option value="">{t('config.users_select_account')}</option>
          {users.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input value={renameNewName} onChange={e => setRenameNewName(e.target.value)} placeholder={t('config.users_new_username')} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-sky-500" />
          <input value={renamePassword} onChange={e => setRenamePassword(e.target.value)} type="password" placeholder={t('config.users_new_password')} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-sky-500" />
        </div>
        <button type="submit" disabled={!renameTarget} className="w-full py-2.5 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
          {t('config.users_apply')}
        </button>
      </form>

      {/* Create new user */}
      <form onSubmit={handleCreate} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><UserPlus size={14} /> {t('config.users_create_title')}</h4>
        <div className="grid grid-cols-2 gap-3">
          <input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder={t('config.users_username')} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-sky-500" />
          <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder={t('config.users_new_password')} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-sky-500" />
        </div>
        <select value={newRole} onChange={e => setNewRole(e.target.value as 'admin' | 'operator')} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-sky-500">
          <option value="operator">{t('config.users_role_operator')}</option>
          <option value="admin">{t('config.users_role_admin')}</option>
        </select>
        <p className="text-[9px] text-slate-600 leading-relaxed">{t('config.users_role_hint')}</p>
        <button type="submit" disabled={!newUsername || !newPassword} className="w-full py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
          {t('config.users_create_button')}
        </button>
      </form>
      <ConfirmDialog
        open={deleteTarget !== null}
        message={deleteTarget ? t('config.users_delete_confirm', { username: deleteTarget }) : ''}
        onConfirm={() => { if (deleteTarget) doDelete(deleteTarget); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
