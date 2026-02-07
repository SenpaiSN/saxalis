import React, { useState } from 'react';
import { X, FilePlus, Calendar } from 'lucide-react';
import { usePreferences } from '../contexts/PreferencesContext';

// Convertir une date UTC en chaîne YYYY-MM-DD (Europe/Paris)
function getLocalDateString(): string {
  const now = new Date();
  return now.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }).split('/').reverse().join('-');
}

// Exemple de structure de catégorie (à adapter à ton modèle)
const CATEGORIES = [
  { key: 'Alimentation', emoji: '🍔' },
  { key: 'Transport', emoji: '🚗' },
  { key: 'Logement', emoji: '🏠' },
  { key: 'Abonnements', emoji: '📱' },
  { key: 'Santé', emoji: '⚕️' },
  { key: 'Loisirs', emoji: '🎮' },
  { key: 'Shopping', emoji: '🛍️' },
  { key: 'Éducation', emoji: '📚' },
  { key: 'Autre', emoji: '➕' },
  { key: 'Objectif', emoji: '🎯' },
];

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: string;
    date: string;
    montant: number;
    categorie: string;
    note: string;
    file: File | null;
    recurrence: boolean;
  }) => Promise<void>;
  initialValues?: {
    type?: string;
    date?: string;
    montant?: string | number;
    categorie?: string;
    note?: string;
    recurrence?: boolean;
  };
}

export default function TransactionModal({
  open,
  onClose,
  onSubmit,
  initialValues = {},
}: TransactionModalProps) {
  const [type, setType] = useState(initialValues.type || 'dépense');
  const [date, setDate] = useState(initialValues.date || getLocalDateString());
  const [montant, setMontant] = useState(initialValues.montant ? String(initialValues.montant) : '');
  const [categorie, setCategorie] = useState(initialValues.categorie || 'Alimentation');
  const [note, setNote] = useState(initialValues.note || '');
  const [file, setFile] = useState<File | null>(null);
  const [recurrence, setRecurrence] = useState(initialValues.recurrence || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currency } = usePreferences();

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!montant || isNaN(Number(montant)) || Number(montant) <= 0) {
      setError('Montant invalide');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ type, date, montant: Number(montant), categorie, note, file, recurrence });
      onClose();
    } catch (err) {
      setError("Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <form
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative"
        onSubmit={handleSubmit}
      >
        {/* Close */}
        <button type="button" className="absolute top-4 right-4 text-gray-400 hover:text-gray-700" onClick={onClose}>
          <X size={22} />
        </button>
        <div className="col-span-2">
          <h2 className="text-2xl font-bold mb-1">Nouvelle transaction</h2>
          <p className="text-gray-500 text-sm mb-4">Ajoutez une dépense ou un revenu</p>
        </div>
        {/* Type & Date */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Type de transaction *</label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setType('dépense')} className={`flex-1 px-4 py-2 rounded-lg border text-base font-semibold transition-all ${type === 'dépense' ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>💸 Dépense</button>
              <button type="button" onClick={() => setType('revenu')} className={`flex-1 px-4 py-2 rounded-lg border text-base font-semibold transition-all ${type === 'revenu' ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>💰 Revenu</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Date *</label>
            <div className="relative">
              <input type="date" className="w-full border rounded-lg px-3 py-2" value={date} onChange={e => setDate(e.target.value)} required />
              <Calendar className="absolute right-3 top-2.5 text-gray-400" size={18} />
            </div>
          </div>
        </div>
        {/* Montant & Note */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Montant *</label>
            <div className="relative">
              <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 pr-10" value={montant} onChange={e => setMontant(e.target.value)} required />
              <span className="absolute right-3 top-2.5 text-gray-400">{currency === 'EUR' ? '€' : currency}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Note (optionnelle)</label>
            <textarea className="w-full border rounded-lg px-3 py-2 min-h-[40px]" value={note} onChange={e => setNote(e.target.value)} placeholder="Ajouter une description..." />
          </div>
        </div>
        {/* Catégorie */}
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-2">Catégorie *</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 max-h-40 overflow-y-auto">
            {CATEGORIES.map(cat => (
              <button
                type="button"
                key={cat.key}
                className={`flex flex-col items-center justify-center border rounded-xl py-3 transition-all text-base font-medium gap-1 ${categorie === cat.key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                onClick={() => setCategorie(cat.key)}
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-xs">{cat.key}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Facture & Récurrence */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Joindre une facture</label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-6 cursor-pointer hover:border-blue-400 transition-all">
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleFileChange} />
              <FilePlus size={32} className="mb-2 text-gray-400" />
              <span className="text-xs text-gray-500">Cliquez pour télécharger<br />PDF, PNG, JPG (max 5MB)</span>
              {file && <span className="mt-2 text-xs text-blue-600">{file.name}</span>}
            </label>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Transaction récurrente</label>
            <button type="button" onClick={() => setRecurrence(r => !r)} className={`w-10 h-6 rounded-full flex items-center transition-all ${recurrence ? 'bg-blue-500' : 'bg-gray-200'}`}>
              <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-all ${recurrence ? 'translate-x-4' : 'translate-x-0'}`}></span>
            </button>
          </div>
        </div>
        {/* Actions */}
        <div className="col-span-2 flex justify-between items-center mt-4 gap-4">
          <button type="button" className="flex-1 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold" onClick={onClose} disabled={loading}>Annuler</button>
          <button type="submit" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg hover:from-blue-600 hover:to-purple-600 transition-all" disabled={loading}>{loading ? 'Ajout...' : 'Ajouter la transaction'}</button>
        </div>
        {error && <div className="col-span-2 text-center text-red-600 mt-2 text-sm">{error}</div>}
      </form>
    </div>
  );
}


