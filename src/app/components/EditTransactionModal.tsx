import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import * as api from '../../services/api';
import { usePreferences } from '../contexts/PreferencesContext';
import { Transaction } from '../App';

interface Props {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (payload: { id: string; Date: string; Type: string; Catégorie: string; SousCatégorie: string; Montant: number; Notes?: string }) => Promise<any> | void;
  types: Array<{ id_type: number; code: string; label: string }>;
  categories: Array<{ id_category: number; name: string }>;
  subcategories: Array<{ id_subcategory: number; name: string }>;
}

export default function EditTransactionModal({ open, transaction, onClose, onSave, types, categories, subcategories }: Props) {
  const { locale } = usePreferences();
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('12:00');
  const [editType, setEditType] = useState<string>('expense');
  const [editCategorie, setEditCategorie] = useState<string>('');
  const [editSousCategorie, setEditSousCategorie] = useState<string>('');
  const [editMontant, setEditMontant] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');

  const [modalCategories, setModalCategories] = useState<Array<{ id_category: number; name: string }>>([]);
  const [loadingModalCategories, setLoadingModalCategories] = useState(false);
  const [modalSubcategories, setModalSubcategories] = useState<Array<{ id_subcategory: number; name: string }>>([]);
  const [loadingModalSubcategories, setLoadingModalSubcategories] = useState(false);

  useEffect(() => {
    if (!transaction) return;
    try {
      const dt = new Date(transaction.date);
      setEditDate(dt.toISOString().split('T')[0]);
      setEditTime(dt.toISOString().slice(11,16));
    } catch (e) {
      setEditDate(transaction.date);
      setEditTime('12:00');
    }
    const typeCode = transaction.type === 'dépense' ? 'expense' : (transaction.type === 'revenu' ? 'income' : transaction.type);
    setEditType(typeCode);
    setEditMontant(Math.abs(transaction.montant));
    setEditNotes(transaction.note || '');

    // Load categories for this type
    (async () => {
      try {
        setLoadingModalCategories(true);
        const typeItem = types.find(tt => tt.code === typeCode as string);
        const res = await api.getCategories(typeItem?.id_type);
        if (res.ok && res.data && Array.isArray(res.data.categories)) {
          setModalCategories(res.data.categories);
          const foundCat = res.data.categories.find((c: any) => c.name === transaction.categorie);
          const prefCat = foundCat ? foundCat.name : (res.data.categories[0]?.name ?? '');
          setEditCategorie(prefCat);

          if (foundCat) {
            try {
              setLoadingModalSubcategories(true);
              const subRes = await api.getSubcategories(foundCat.id_category);
              if (subRes.ok && subRes.data && Array.isArray(subRes.data.subcategories)) {
                setModalSubcategories(subRes.data.subcategories);
                const foundSub = subRes.data.subcategories.find((s: any) => s.name === (transaction as any).subcategoryName || s.name === transaction.categorie || s.name === (transaction as any).subCategory);
                const subFromId = (transaction as any).subcategoryId ? subRes.data.subcategories.find((s: any) => s.id_subcategory === (transaction as any).subcategoryId) : null;
                setEditSousCategorie((subFromId && subFromId.name) ? (subFromId.name) : (foundSub ? foundSub.name : (subRes.data.subcategories[0]?.name ?? '')));
              } else {
                setModalSubcategories([]);
                setEditSousCategorie('');
              }
            } catch (e) {
              console.warn('Failed to load subcategories for edit', e);
              setModalSubcategories([]);
            } finally {
              setLoadingModalSubcategories(false);
            }
          }
        } else {
          setModalCategories([]);
        }
      } catch (e) {
        console.warn('Failed to load categories for type', e);
        setModalCategories([]);
      } finally {
        setLoadingModalCategories(false);
      }
    })();

  }, [transaction]);

  if (!open || !transaction) return null;

  const handleSave = async () => {
    const payload = {
      id: transaction.id,
      Date: `${editDate} ${editTime}:00`,
      Type: editType,
      Catégorie: editCategorie,
      SousCatégorie: editSousCategorie,
      Montant: editMontant,
      Notes: editNotes
    };

    try { await onSave(payload); } catch (e) { console.error('EditTransactionModal save error', e); }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
      <div className="bg-white rounded-2xl p-6 z-10 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Modifier la transaction</h3>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <label className="text-xs text-gray-600">Date et heure</label>
          <div className="flex gap-2">
            <input type="date" value={editDate} onChange={(e)=>setEditDate(e.target.value)} className="px-3 py-2 border rounded-md" />
            <input type="time" value={editTime} onChange={(e)=>setEditTime(e.target.value)} className="px-3 py-2 border rounded-md" />
          </div>

          <label className="text-xs text-gray-600">Type</label>
          <select value={editType} onChange={async (e)=>{
            const newType = e.target.value; setEditType(newType); setEditCategorie(''); setEditSousCategorie('');
            try {
              setLoadingModalCategories(true);
              const typeItem = types.find(tt => tt.code === newType);
              const res = await api.getCategories(typeItem?.id_type);
              if (res.ok && res.data && Array.isArray(res.data.categories)) {
                setModalCategories(res.data.categories);
                setEditCategorie(res.data.categories[0]?.name ?? '');
                const firstCat = res.data.categories[0];
                if (firstCat) {
                  setLoadingModalSubcategories(true);
                  const subRes = await api.getSubcategories(firstCat.id_category);
                  if (subRes.ok && subRes.data && Array.isArray(subRes.data.subcategories)) {
                    setModalSubcategories(subRes.data.subcategories);
                    setEditSousCategorie(subRes.data.subcategories[0]?.name ?? '');
                  } else {
                    setModalSubcategories([]);
                    setEditSousCategorie('');
                  }
                  setLoadingModalSubcategories(false);
                }
              } else {
                setModalCategories([]);
              }
            } catch (e) {
              console.warn('Failed to load categories for type', e);
              setModalCategories([]);
            } finally {
              setLoadingModalCategories(false);
            }
          }} className="px-3 py-2 border rounded-md">
            {types.map(t => (<option key={t.id_type} value={t.code}>{t.label}</option>))}
          </select>

          <label className="text-xs text-gray-600">Catégorie</label>
          <select value={editCategorie} onChange={async (e)=>{
            const catName = e.target.value; setEditCategorie(catName); setEditSousCategorie('');
            const chosen = (modalCategories.length ? modalCategories : categories).find(c => c.name === catName);
            if (!chosen) { setModalSubcategories([]); return; }
            try {
              setLoadingModalSubcategories(true);
              const subRes = await api.getSubcategories(chosen.id_category);
              if (subRes.ok && subRes.data && Array.isArray(subRes.data.subcategories)) {
                setModalSubcategories(subRes.data.subcategories);
                setEditSousCategorie(subRes.data.subcategories[0]?.name ?? '');
              } else {
                setModalSubcategories([]);
              }
            } catch (e) {
              console.warn('Failed to load subcategories for category', e);
              setModalSubcategories([]);
            } finally {
              setLoadingModalSubcategories(false);
            }
          }} className="px-3 py-2 border rounded-md">
            {loadingModalCategories ? (
              <option key="loading">Chargement…</option>
            ) : (
              (modalCategories.length ? modalCategories : categories).map((c:any) => (<option key={c.id_category} value={c.name}>{c.name}</option>))
            )}
          </select>

          <label className="text-xs text-gray-600">Sous-catégorie</label>
          <select value={editSousCategorie} onChange={(e)=>setEditSousCategorie(e.target.value)} className="px-3 py-2 border rounded-md">
            {loadingModalSubcategories ? (
              <option key="loading">Chargement…</option>
            ) : (
              (modalSubcategories.length ? modalSubcategories : subcategories).map((s:any) => (<option key={s.id_subcategory} value={s.name}>{s.name}</option>))
            )}
          </select>

          <label className="text-xs text-gray-600">Montant</label>
          <input type="number" value={String(editMontant)} onChange={(e)=>setEditMontant(Number(e.target.value))} className="px-3 py-2 border rounded-md" />

          <label className="text-xs text-gray-600">Notes</label>
          <input type="text" value={editNotes} onChange={(e)=>setEditNotes(e.target.value)} className="px-3 py-2 border rounded-md" />

          <div className="flex justify-end gap-2 mt-2">
            <button onClick={onClose} className="px-4 py-2 border rounded-md">Annuler</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
