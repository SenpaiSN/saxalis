import { useEffect, useState } from 'react';
import * as api from '../../services/api';

interface Props {
  open: boolean;
  goal: any;
  onClose: () => void;
  onDone: () => void;
}

export default function WithdrawFromGoalModal({ open, goal, onClose, onDone }: Props) {
  const [montant, setMontant] = useState('');
  const [notes, setNotes] = useState('');
  const [typeId, setTypeId] = useState<number | undefined>(undefined);
  const [types, setTypes] = useState<Array<{ id_type: number; code: string; label: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id_category: number; name: string }>>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [subcategories, setSubcategories] = useState<Array<{ id_subcategory: number; name: string }>>([]);
  const [subcategoryId, setSubcategoryId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load transaction types and default to 'Dépense' (id_type === 1) when possible
    (async () => {
      try {
        const res = await api.getTransactionTypes();
        if (res.ok && res.data && Array.isArray(res.data.types)) {
          setTypes(res.data.types);
          const defaultType = res.data.types.find((t: any) => t.id_type === 1) || res.data.types[0];
          setTypeId(defaultType?.id_type);
        }
      } catch (e) {
        console.warn('Failed to load transaction types', e);
      }
    })();
  }, []);

  useEffect(() => {
    // Load categories for selected transaction type
    (async () => {
      if (!typeId) return;
      try {
        const res = await api.getCategories(typeId);
        if (res.ok && res.data && Array.isArray(res.data.categories)) {
          setCategories(res.data.categories);
        }
      } catch (e) {
        console.warn('Failed to load categories for type', typeId, e);
      }
    })();
  }, [typeId]);

  useEffect(() => {
    // Load subcategories when category changes
    (async () => {
      if (!categoryId) { setSubcategories([]); setSubcategoryId(undefined); return; }
      try {
        const res = await api.getSubcategories(Number(categoryId));
        if (res.ok && res.data && Array.isArray(res.data.subcategories)) {
          setSubcategories(res.data.subcategories);
        }
      } catch (e) {
        console.warn('Failed to load subcategories for category', categoryId, e);
      }
    })();
  }, [categoryId]);

  // Prefill category/subcategory based on the goal's linked subcategory (if any)
  useEffect(() => {
    (async () => {
      if (!open || !goal) return;
      const targetSubId = goal.id_subcategory ?? null;
      if (!targetSubId) return;

      try {
        // Fetch all subcategories and find the target one to obtain its category
        const allRes = await api.getSubcategories();
        if (allRes.ok && allRes.data && Array.isArray(allRes.data.subcategories)) {
          const all = allRes.data.subcategories as any[];
          const found = all.find(s => s.id_subcategory === targetSubId);
          if (found) {
            // pre-select category and subcategory
            setCategoryId(found.category_id ?? undefined);
            setSubcategoryId(found.id_subcategory ?? undefined);

            // also load only the subcategories for this category so UI shows relevant choices
            if (found.category_id) {
              const subRes = await api.getSubcategories(Number(found.category_id));
              if (subRes.ok && subRes.data && Array.isArray(subRes.data.subcategories)) {
                setSubcategories(subRes.data.subcategories);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to prefill category/subcategory from goal', e);
      }
    })();
  }, [open, goal]);

  if (!open || !goal) return null;

  const submit = async (e: any) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(montant.replace(',', '.'));
    if (isNaN(amt) || amt <= 0) { setError('Montant invalide'); return; }
    setLoading(true);
    try {
      const payload: any = { goal_id: goal.id, montant: amt, notes: notes || undefined, id_type: typeId ?? 1 };
      if (categoryId) payload.category_id = categoryId;
      if (subcategoryId) payload.subcategory_id = subcategoryId;
      const res = await api.withdrawFromGoal(payload);
      if (res.ok && res.data && res.data.success) {
        onDone();
        onClose();
      } else {
        setError(res.data?.error || 'Erreur serveur');
      }
    } catch (e) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={submit} className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-2">Retirer des fonds — {goal.nom}</h3>
        <p className="text-sm text-gray-500 mb-4">Ce retrait crée une transaction de dépense liée à cet objectif.</p>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Montant</label>
            <input value={montant} onChange={e => setMontant(e.target.value)} className="w-full mt-1 p-2 border rounded-md" placeholder="300.00" />
          </div>

          <div>
            <label className="text-sm text-gray-600">Type</label>
            <select className="w-full mt-1 p-2 border rounded-md" value={typeId ?? ''} onChange={e => setTypeId(e.target.value ? Number(e.target.value) : undefined)}>
              {types.map(t => <option key={t.id_type} value={t.id_type}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">Catégorie (optionnel)</label>
            <select className="w-full mt-1 p-2 border rounded-md" value={categoryId ?? ''} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Aucune</option>
              {categories && categories.map(c => <option key={c.id_category} value={c.id_category}>{c.name}</option>)}
            </select>
          </div>

          {subcategories.length > 0 && (
            <div>
              <label className="text-sm text-gray-600">Sous-catégorie (optionnel)</label>
              <select className="w-full mt-1 p-2 border rounded-md" value={subcategoryId ?? ''} onChange={e => setSubcategoryId(e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">Aucune</option>
                {subcategories.map(s => <option key={s.id_subcategory} value={s.id_subcategory}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600">Notes (optionnel)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full mt-1 p-2 border rounded-md" placeholder="Réparation voiture" />
          </div>
        </div>

        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}

        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md">Annuler</button>
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-red-600 text-white">{loading ? 'En cours…' : 'Retirer'}</button>
        </div>
      </form>
    </div>
  );
}
