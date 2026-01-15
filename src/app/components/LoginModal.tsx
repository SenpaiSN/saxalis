import React, { useState } from 'react';
import * as api from '../../services/api';
import RegisterModal from './RegisterModal';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ email, mot_de_passe: password });
      if (res.ok && res.data && res.data.success) {
        onSuccess();
        onClose();
      } else {
        // show structured error if available
        setError(res.error ?? res.data?.error ?? `Échec connexion (status ${res.status})`);
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
        <h3 className="text-lg font-semibold mb-4">Se connecter</h3>
        {error && <div className="mb-3 text-sm" style={{ color: 'var(--color-depense)' }}>{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Mot de passe</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2"
            />
          </div>
          <div className="flex items-center justify-between">
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-xl">
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setShowRegister(true)} className="text-sm text-blue-600">S'inscrire</button>
              <button type="button" onClick={onClose} className="text-sm text-gray-600">Annuler</button>
            </div>
          </div>
        </form>
        {showRegister && (
          <RegisterModal
            open={showRegister}
            onClose={() => setShowRegister(false)}
            onSuccess={() => {
              // Close register modal, close login modal and trigger parent login-success flow
              setShowRegister(false);
              onClose();
              onSuccess();
            }}
          />
        )}
      </div>
    </div>
  );
}
