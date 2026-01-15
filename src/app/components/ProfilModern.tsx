import { User, Mail, Bell, Lock, Download, Upload, CreditCard, Moon, Globe, LogOut, ChevronRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import * as api from '../../services/api';
import { addCsrfToBody } from '../../services/csrf';
import { usePreferences, LANGUAGE_OPTIONS, CURRENCY_OPTIONS } from '../contexts/PreferencesContext';
import GestionPostes from './GestionPostes';

export default function ProfilModern({ theme, setTheme, currentUser, setCurrentUser, isAuthenticated, onLogout, onOpenLogin }: { theme: 'light'|'dark'; setTheme: (t: 'light'|'dark') => void; currentUser?: any; setCurrentUser?: (u: any) => void; isAuthenticated?: boolean | null; onLogout?: () => Promise<void> | void; onOpenLogin?: () => void }) {
  const { locale, currency, setLocale, setCurrency } = usePreferences();
  const [converting, setConverting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL) ?? '';

  const handleAvatarChange = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await api.updateUserProfile(fd);
      if (res.ok && res.data && res.data.success) {
        if (setCurrentUser) {
          setCurrentUser((prev: any) => prev ? { ...prev, photo: res.data.path } : prev);
        }
        alert('Photo mise à jour.');
      } else {
        alert('Erreur pendant le téléversement: ' + (res?.data?.error ?? res?.error ?? 'ERREUR'));
      }
    } catch (e) {
      console.error('upload avatar failed', e);
      alert('Erreur réseau pendant le téléversement');
    } finally {
      setUploading(false);
    }
  }; 

  // Profile edit / change password state
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState<string>(currentUser ? `${currentUser.firstName ?? currentUser.first_name ?? ''} ${currentUser.lastName ?? currentUser.last_name ?? ''}`.trim() : '');
  const [editEmail, setEditEmail] = useState<string>(currentUser?.email ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);

  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    // sync initial values when currentUser changes
    setEditName(currentUser ? `${currentUser.firstName ?? currentUser.first_name ?? ''} ${currentUser.lastName ?? currentUser.last_name ?? ''}`.trim() : '');
    setEditEmail(currentUser?.email ?? '');
  }, [currentUser]);

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editEmail.trim()) { alert('Nom et email sont requis'); return; }
    setProfileSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', editName);
      fd.append('email', editEmail);
      if (profilePhotoFile) fd.append('photo', profilePhotoFile);
      const res = await api.updateUserProfile(fd);
      if (res.ok && res.data && res.data.success) {
        // update local user
        if (setCurrentUser) {
          const parts = editName.trim().split(/\s+/, 2);
          const first = parts[0] ?? '';
          const last = parts[1] ?? '';
          setCurrentUser((prev: any) => prev ? { ...prev, firstName: first, lastName: last, email: editEmail } : prev);
        }
        setEditingProfile(false);
        setProfilePhotoFile(null);
        alert('Profil mis à jour');
      } else {
        alert('Erreur: ' + (res?.data?.error ?? res?.error ?? 'Erreur serveur'));
      }
    } catch (e) {
      console.error('handleSaveProfile failed', e);
      alert('Erreur réseau');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      alert('Vérifiez vos champs de mot de passe');
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await api.updatePassword({ current_password: currentPassword, new_password: newPassword });
      if (res.ok && res.data && res.data.success) {
        setChangingPassword(false);
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        alert('Mot de passe mis à jour');
      } else {
        alert('Erreur: ' + (res?.data?.error ?? res?.error ?? 'Erreur serveur'));
      }
    } catch (e) {
      console.error('change password failed', e);
      alert('Erreur réseau');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleCurrencyChange = async (next: string) => {
    if (next === currency) return;
    // We only support user-driven DB conversion for XOF <-> EUR for now
    if (next === 'XOF' || next === 'EUR') {
      const ok = confirm(`Voulez-vous convertir toutes vos transactions vers ${next} ? Continuer ?`);
      if (!ok) return;
      setConverting(true);
      try {
        const body = await addCsrfToBody({ target: next, confirm: true });
        const res = await fetch(`${API_BASE}/API/convert_currency.php`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const json = await res.json();
        if (json.success) {
          alert('Conversion réussie.');
          setCurrency(next);
          // Persist preference server-side for coherence across sessions
          try {
            if (isAuthenticated) {
              const prefBody = await addCsrfToBody({ currency: next });
              const prefRes = await fetch(`${API_BASE}/API/update_user_pref.php`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prefBody) });
              const prefJson = await prefRes.json();
              if (!(prefJson && prefJson.success)) {
                console.warn('Failed to persist currency on server', prefJson);
              }
            }
          } catch (e) {
            console.warn('persist currency failed', e);
          }
        } else {
          alert('Erreur: ' + (json.error || JSON.stringify(json)));
        }
      } catch (e) {
        console.error('convert_currency failed', e);
        alert('Erreur réseau pendant la conversion');
      } finally {
        setConverting(false);
      }
    } else {
      setCurrency(next);
      try {
        if (isAuthenticated) {
          const prefBody = await addCsrfToBody({ currency: next });
          const prefRes = await fetch(`${API_BASE}/API/update_user_pref.php`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prefBody) });
          const prefJson = await prefRes.json();
          if (!(prefJson && prefJson.success)) console.warn('Failed to persist currency on server', prefJson);
        }
      } catch (e) { console.warn('persist currency failed', e); }
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">Paramètres</h2>
        <p className="text-gray-500 mt-1">Gérez votre compte et vos préférences</p>
      </div>

      {/* Profil utilisateur */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 lg:p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative">
            <img
              src={currentUser?.photo ? (currentUser.photo.startsWith('http') ? currentUser.photo : `${API_BASE}/${currentUser.photo.replace(/^\//, '')}`) : "/images/default-avatar.svg"}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-white/30"
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              aria-label="Changer la photo"
              className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-lg hover:scale-110 transition-transform disabled:opacity-60"
            >
              {uploading ? (
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M22 12a10 10 0 0 1-10 10" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 2L14 5L5 14H2V11L11 2Z" />
                </svg>
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleAvatarChange(f); } e.currentTarget.value = ''; }}
            />
          </div>
          <div className="text-center md:text-left flex-1">
            <h3 className="text-2xl font-bold mb-1">{currentUser ? `${currentUser.firstName ?? currentUser.first_name ?? ''} ${currentUser.lastName ?? currentUser.last_name ?? ''}`.trim() : 'Invité'}</h3>
            <p className="opacity-90 mb-3">{currentUser?.email ?? 'non connecté'}</p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">
                Premium
              </span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">
                {currentUser?.date_inscription ? `Membre depuis ${new Date(currentUser.date_inscription).getFullYear()}` : 'Membre'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit modals */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-xl p-6 shadow-lg">
            <h3 className="font-bold text-lg mb-4">Modifier le profil</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Nom complet</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1" />
              </div>

              <div>
                <label className="text-xs text-gray-600">Email</label>
                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1" />
              </div>

              <div>
                <label className="text-xs text-gray-600">Photo de profil (optionnel)</label>
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setProfilePhotoFile(f); }} className="mt-1" />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => { setEditingProfile(false); setProfilePhotoFile(null); }} className="px-4 py-2 rounded-xl border">Annuler</button>
                <button onClick={handleSaveProfile} disabled={profileSaving} className="px-4 py-2 rounded-xl bg-blue-600 text-white">{profileSaving ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {changingPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
            <h3 className="font-bold text-lg mb-4">Changer le mot de passe</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Mot de passe actuel</label>
                <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1" />
              </div>

              <div>
                <label className="text-xs text-gray-600">Nouveau mot de passe</label>
                <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1" />
              </div>

              <div>
                <label className="text-xs text-gray-600">Confirmer le nouveau mot de passe</label>
                <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1" />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => { setChangingPassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }} className="px-4 py-2 rounded-xl border">Annuler</button>
                <button onClick={handleChangePassword} disabled={passwordSaving || newPassword !== confirmPassword} className="px-4 py-2 rounded-xl bg-blue-600 text-white">{passwordSaving ? 'Enregistrement...' : 'Modifier le mot de passe'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sections de paramètres */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compte */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)', borderRadius: 'var(--card-border-radius)' }}>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <User size={20} className="text-blue-600" />
            Informations du compte
          </h3>
          <div className="space-y-3">
            <button onClick={() => setEditingProfile(true)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <User size={18} className="text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Modifier le profil</p>
                  <p className="text-xs text-gray-500">Nom, photo, bio</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600" />
            </button>

            <button onClick={() => setEditingProfile(true)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Mail size={18} className="text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Email</p>
                  <p className="text-xs text-gray-500">{currentUser?.email ?? 'non connecté'}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600" />
            </button>

            <button onClick={() => setChangingPassword(true)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--card-bg-depense)', color: 'var(--color-depense)' }}>
                  <Lock size={18} style={{ color: 'var(--color-depense)' }} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Mot de passe</p>
                  <p className="text-xs text-gray-500">Modifié il y a 2 mois</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600" />
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Bell size={20} className="text-blue-600" />
            Notifications
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Alertes de budget</p>
                <p className="text-xs text-gray-500">Recevoir des notifications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Rappels de paiement</p>
                <p className="text-xs text-gray-500">Pour les factures récurrentes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Résumé mensuel</p>
                <p className="text-xs text-gray-500">Email récapitulatif</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Données */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)', borderRadius: 'var(--card-border-radius)' }}>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Download size={20} className="text-blue-600" />
            Gestion des données
          </h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--card-bg-revenu)', color: 'var(--color-revenu)' }}>
                  <Download size={18} style={{ color: 'var(--color-revenu)' }} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Exporter les données</p>
                  <p className="text-xs text-gray-500">CSV, Excel, PDF</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600" />
            </button>

            <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Upload size={18} className="text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Importer des données</p>
                  <p className="text-xs text-gray-500">CSV, Excel</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600" />
            </button>

            <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <CreditCard size={18} className="text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Synchronisation bancaire</p>
                  <p className="text-xs text-gray-500">Connecter vos comptes</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600" />
            </button>
          </div>
        </div>

        {/* Préférences */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)', borderRadius: 'var(--card-border-radius)' }}>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Globe size={20} className="text-blue-600" />
            Préférences
          </h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Moon size={18} className="text-yellow-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Mode sombre</p>
                  <p className="text-xs text-gray-500">Apparence de l'app — <span className="font-medium">{theme === 'dark' ? 'Sombre' : 'Clair'}</span></p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={theme === 'dark'} onChange={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); }} aria-label="Basculer le thème" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </button>

            <div className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--card-bg-epargne)', color: 'var(--color-epargne)' }}>
                  <Globe size={18} style={{ color: 'var(--color-epargne)' }} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Langue</p>
                  <p className="text-xs text-gray-500">Choisissez la langue de l'interface</p>
                </div>
              </div>
              <div>
                <select aria-label="Choisir langue" className="bg-transparent text-sm" value={locale} onChange={(e) => { setLocale(e.target.value); }}>
                  {LANGUAGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>

            <div className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pink-600">
                    <circle cx="12" cy="12" r="10" />
                    <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor">€</text>
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Devise</p>
                  <p className="text-xs text-gray-500">Format monétaire</p>
                </div>
              </div>
              <div>
                <select aria-label="Choisir devise" className="bg-transparent text-sm" value={currency} onChange={(e) => { handleCurrencyChange(e.target.value); }} disabled={converting}>
                  {CURRENCY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gestion postes de dépense */}
      <div className="col-span-1 lg:col-span-2">
        <GestionPostes />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors">
          <Download size={20} />
          Télécharger mes données
        </button>
        <button
          onClick={async () => {
            if (isAuthenticated) {
              try {
                await onLogout?.();
              } catch (e) {
                console.warn('logout from ProfilModern failed', e);
                alert('Erreur lors de la déconnexion');
              }
            } else {
              onOpenLogin?.();
            }
          }}
          className={isAuthenticated ? "flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-medium" : "flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors"}
          style={isAuthenticated ? { backgroundColor: 'var(--color-depense)', color: 'var(--color-depense-foreground)' } : undefined}
        >
          <LogOut size={20} />
          {isAuthenticated ? 'Se déconnecter' : 'Se connecter'}
        </button>
      </div>

      {/* Footer info */}
      <div className="bg-gray-50 rounded-2xl p-6 text-center">
        <p className="text-sm font-semibold text-gray-700 mb-2">SaXalis Version 1.0.0</p>
        <p className="text-xs text-gray-500">© 2025 SaXalis. Tous droits réservés.</p>
      </div>
    </div>
  );
}
