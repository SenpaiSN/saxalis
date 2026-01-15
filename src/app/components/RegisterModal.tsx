import React, { useState } from 'react';
import * as api from '../../services/api';

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RegisterModal({ open, onClose, onSuccess }: RegisterModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      const res = await api.register({ email, mot_de_passe: password, firstName, lastName });
      if (res.ok && res.data && res.data.success) {
        // attempt auto-login
        try {
          const loginRes = await api.login({ email, mot_de_passe: password });
          if (loginRes.ok && loginRes.data && loginRes.data.success) {
            // propagated onSuccess will close LoginModal and refresh session
            onSuccess();
            onClose();
            return;
          } else {
            // registration ok but auto-login failed; close register modal and inform user
            onClose();
            alert('Inscription réussie, mais la connexion automatique a échoué. Vous pouvez vous connecter manuellement.');
            return;
          }
        } catch (e: any) {
          onClose();
          alert('Inscription réussie, mais la connexion automatique a échoué (erreur réseau). Vous pouvez vous connecter manuellement.');
          return;
        }
      } else {
        setError(res.data?.error || `Échec inscription (status ${res.status})`);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">S'inscrire</h3>
        {error && <div className="mb-3 text-sm" style={{ color: 'var(--color-depense)' }}>{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Prénom</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} type="text" required className="w-full border border-gray-200 rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Nom</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} type="text" required className="w-full border border-gray-200 rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full border border-gray-200 rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Mot de passe</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="w-full border border-gray-200 rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Confirmer le mot de passe</label>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" required className="w-full border border-gray-200 rounded-xl px-3 py-2" />
          </div>
          <div className="flex items-center justify-between">
            <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded-xl">
              {loading ? 'Inscription...' : "S'inscrire"}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-gray-600">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}
