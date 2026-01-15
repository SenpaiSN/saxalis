import { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import IconFromName, { normalizeIconName } from './IconFromName';

const ICONS = ['Target','Car','Taxi','SUV','Bus','Plane','Train','MoneyBag','MoneyWings','Bride','Girl','ManRedHair','CableCar','Hospital','Shopping','Books','Clothes','ShoppingCart','Coffee','Gift','CreditCard','Book','Heart','Film','Truck','User','Calendar','Package','Wallet','LowBattery','Lightning','Plug','WomanWithHeadscarf','Dining','Pasta','HaircutMan','Construction','Factory','CalendarAlt','Bank','DoctorWoman','Medical','Pill','Stethoscope','HealthWorker','Tooth','Droplet','Tools','Graduation','Home','Pin','Phone','Laptop'];

export default function Parametres() {
  const [tab, setTab] = useState<'types' | 'categories' | 'subcategories'>('types');

  // types
  const [types, setTypes] = useState<Array<{ id_type: number; code: string; label: string }>>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeLabel, setNewTypeLabel] = useState('');

  // categories
  const [categories, setCategories] = useState<Array<{ id_category: number; name: string; id_type: number }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<number | ''>('');

  // subcategories
  const [subcategories, setSubcategories] = useState<Array<{ id_subcategory: number; name: string; category_id: number }>>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCategory, setNewSubCategory] = useState<number | ''>('');
  const [newSubIcon, setNewSubIcon] = useState<string | null>(ICONS[0]);
  const [editingIconId, setEditingIconId] = useState<number | null>(null);
  const [editingIconValue, setEditingIconValue] = useState<string | null>(null);

  // feedback
  const [message, setMessage] = useState<string | null>(null);

  // load helpers
  const loadTypes = async () => {
    setLoadingTypes(true);
    try {
      const res = await api.getTransactionTypes();
      if (res.ok && res.data && Array.isArray(res.data.types)) setTypes(res.data.types);
    } catch (e) {
      console.warn('Failed to load types', e);
    } finally { setLoadingTypes(false); }
  };
  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await api.getCategories();
      if (res.ok && res.data && Array.isArray(res.data.categories)) setCategories(res.data.categories);
    } catch (e) {
      console.warn('Failed to load categories', e);
    } finally { setLoadingCategories(false); }
  };
  const loadSubcategories = async () => {
    setLoadingSubcategories(true);
    try {
      const res = await api.getSubcategories();
      if (res.ok && res.data && Array.isArray(res.data.subcategories)) setSubcategories(res.data.subcategories);
    } catch (e) {
      console.warn('Failed to load subcategories', e);
    } finally { setLoadingSubcategories(false); }
  };

  useEffect(() => { loadTypes(); loadCategories(); loadSubcategories(); }, []);

  // Types handlers
  const handleAddType = async () => {
    if (!newTypeCode || !newTypeLabel) return setMessage('Code et libellé requis');
    try {
      const res = await api.addType({ code: newTypeCode, label: newTypeLabel });
      if (res.ok && res.data && res.data.success) {
        setNewTypeCode(''); setNewTypeLabel(''); setMessage('Type ajouté'); loadTypes();
      } else {
        setMessage(res.data?.error || 'Erreur ajout');
      }
    } catch (e) { setMessage('Erreur serveur'); }
  };

  const handleRenameType = async (t: { id_type: number; code: string; label: string }) => {
    const newLabel = window.prompt('Nouveau nom pour le type', t.label);
    if (!newLabel) return;
    try {
      const res = await api.updateType({ id_type: t.id_type, label: newLabel, code: t.code });
      if (res.ok && res.data && res.data.success) { setMessage('Type modifié'); loadTypes(); } else setMessage(res.data?.error || 'Erreur');
    } catch (e) { setMessage('Erreur'); }
  };

  const handleDeleteType = async (t: { id_type: number; code: string; label: string }) => {
    if (!window.confirm(`Supprimer le type "${t.label}" ?`)) return;
    try {
      const res = await api.deleteType({ id_type: t.id_type });
      if (res.ok && res.data && res.data.success) { setMessage('Type supprimé'); loadTypes(); loadCategories(); } else if (res.data?.error === 'contains_related') {
        setMessage(`Impossible de supprimer: contient ${res.data.counts?.categories || 'des'} catégories. Réaffectez d'abord.`);
      } else setMessage(res.data?.error || 'Erreur suppression');
    } catch (e) { setMessage('Erreur serveur'); }
  };

  // Categories handlers
  const handleAddCategory = async () => {
    if (!newCategoryName || !newCategoryType) return setMessage('Nom et type requis');
    try {
      const res = await api.addCategory({ id_type: Number(newCategoryType), name: newCategoryName });
      if (res.ok && res.data && res.data.success) { setMessage('Catégorie ajoutée'); setNewCategoryName(''); setNewCategoryType(''); loadCategories(); loadSubcategories(); } else setMessage(res.data?.error || 'Erreur');
    } catch (e) { setMessage('Erreur serveur'); }
  };

  const handleRenameCategory = async (c: { id_category: number; name: string; id_type: number }) => {
    const newName = window.prompt('Nouveau nom pour la catégorie', c.name);
    if (!newName) return;
    try {
      const res = await api.updateCategory({ id_category: c.id_category, name: newName, id_type: c.id_type });
      if (res.ok && res.data && res.data.success) { setMessage('Catégorie modifiée'); loadCategories(); } else setMessage(res.data?.error || 'Erreur');
    } catch (e) { setMessage('Erreur'); }
  };

  const handleDeleteCategory = async (c: { id_category: number; name: string; id_type: number }) => {
    if (!window.confirm(`Supprimer la catégorie "${c.name}" ?`)) return;
    try {
      const res = await api.deleteCategory({ id_category: c.id_category });
      if (res.ok && res.data && res.data.success) { setMessage('Catégorie supprimée'); loadCategories(); loadSubcategories(); }
      else if (res.data?.error === 'contains_related') {
        setMessage(`Impossible de supprimer: contient ${res.data.counts.subcategories} sous-catégories et ${res.data.counts.transactions} transactions.`);
      } else setMessage(res.data?.error || 'Erreur suppression');
    } catch (e) { setMessage('Erreur serveur'); }
  };

  // Subcategories handlers
  const handleAddSub = async () => {
    if (!newSubName || !newSubCategory) return setMessage('Nom et catégorie requis');
    try {
      const res = await api.addSubcategory({ category_id: Number(newSubCategory), name: newSubName, icon: newSubIcon ?? undefined });
      if (res.ok && res.data && res.data.success) { setMessage('Sous-catégorie ajoutée'); setNewSubName(''); setNewSubCategory(''); loadSubcategories(); } else setMessage(res.data?.error || 'Erreur');
    } catch (e) { setMessage('Erreur serveur'); }
  };

  const handleRenameSub = async (s: { id_subcategory: number; name: string; category_id: number }) => {
    const newName = window.prompt('Nouveau nom pour la sous-catégorie', s.name);
    if (!newName) return;
    try {
      const res = await api.updateSubcategory({ id_subcategory: s.id_subcategory, name: newName, category_id: s.category_id });
      if (res.ok && res.data && res.data.success) { setMessage('Sous-catégorie modifiée'); loadSubcategories(); } else setMessage(res.data?.error || 'Erreur');
    } catch (e) { setMessage('Erreur'); }
  };

  const handleDeleteSub = async (s: { id_subcategory: number; name: string; category_id: number }) => {
    if (!window.confirm(`Supprimer la sous-catégorie "${s.name}" ?`)) return;
    try {
      const res = await api.deleteSubcategory({ id_subcategory: s.id_subcategory });
      if (res.ok && res.data && res.data.success) { setMessage('Sous-catégorie supprimée'); loadSubcategories(); }
      else if (res.data?.error === 'contains_related') {
        setMessage(`Impossible de supprimer: contient ${res.data.counts.transactions} transactions et ${res.data.counts.objectifs} objectifs.`);
      } else setMessage(res.data?.error || 'Erreur suppression');
    } catch (e) { setMessage('Erreur serveur'); }
  };

  return (
    <div className="p-6 lg:p-8">
      <h2 className="text-2xl font-bold mb-4">Paramètres</h2>
      <div className="flex gap-2 mb-4">
        <button onClick={()=>setTab('types')} className={`px-4 py-2 rounded-xl ${tab==='types'?'bg-blue-600 text-white':'bg-white border'}`}>Types</button>
        <button onClick={()=>setTab('categories')} className={`px-4 py-2 rounded-xl ${tab==='categories'?'bg-blue-600 text-white':'bg-white border'}`}>Catégories</button>
        <button onClick={()=>setTab('subcategories')} className={`px-4 py-2 rounded-xl ${tab==='subcategories'?'bg-blue-600 text-white':'bg-white border'}`}>Sous‑catégories</button>
      </div>

      {message && <div className="mb-4 text-sm text-gray-700">{message}</div>}

      {tab === 'types' && (
        <div>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <input value={newTypeCode} onChange={(e)=>setNewTypeCode(e.target.value)} placeholder="code (ex: expense)" className="px-3 py-2 border rounded-md" />
            <input value={newTypeLabel} onChange={(e)=>setNewTypeLabel(e.target.value)} placeholder="Libellé" className="px-3 py-2 border rounded-md" />
            <div className="flex gap-2">
              <button onClick={handleAddType} className="px-4 py-2 bg-green-600 text-white rounded-md">Ajouter <Plus size={14} /></button>
            </div>
          </div>

          <div className="space-y-2">
            {loadingTypes ? <div>Chargement…</div> : (
              types.map(t => (
                <div key={t.id_type} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <div className="font-medium">{t.label} <span className="text-xs text-gray-500">({t.code})</span></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>handleRenameType(t)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-50"><Edit3 size={18} /></button>
                    <button onClick={()=>handleDeleteType(t)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-red-600 hover:bg-gray-50"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <div>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={newCategoryType} onChange={(e)=>setNewCategoryType(e.target.value ? Number(e.target.value) : '')} className="px-3 py-2 border rounded-md">
              <option value="">Choisir un type</option>
              {types.map(t => (<option key={t.id_type} value={t.id_type}>{t.label}</option>))}
            </select>
            <input value={newCategoryName} onChange={(e)=>setNewCategoryName(e.target.value)} placeholder="Nom catégorie" className="px-3 py-2 border rounded-md" />
            <div className="flex gap-2"><button onClick={handleAddCategory} className="px-4 py-2 bg-green-600 text-white rounded-md">Ajouter</button></div>
          </div>

          <div className="space-y-2">
            {loadingCategories ? <div>Chargement…</div> : (
              categories.map(c => (
                <div key={c.id_category} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <div className="font-medium">{c.name} <span className="text-xs text-gray-500">(type {c.id_type})</span></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>handleRenameCategory(c)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-50"><Edit3 size={18} /></button>
                    <button onClick={()=>handleDeleteCategory(c)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-red-600 hover:bg-gray-50"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'subcategories' && (
        <div>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <select value={newSubCategory} onChange={(e)=>setNewSubCategory(e.target.value ? Number(e.target.value) : '')} className="px-3 py-2 border rounded-md">
              <option value="">Choisir une catégorie</option>
              {categories.map(t => (<option key={t.id_category} value={t.id_category}>{t.name} (type {t.id_type})</option>))}
            </select>
            <input value={newSubName} onChange={(e)=>setNewSubName(e.target.value)} placeholder="Nom sous-catégorie" className="px-3 py-2 border rounded-md" />
            <div className="flex items-start gap-4">
              <div className="max-h-40 overflow-y-auto w-full pr-2">
                <div className="grid grid-cols-6 gap-2 w-full">
                  {ICONS.map(ic => (
                    <button key={ic} type="button" aria-label={ic} title={ic} onClick={() => setNewSubIcon(ic)} className={`p-2 rounded-md hover:bg-gray-100 flex items-center justify-center ${newSubIcon === ic ? 'ring-2 ring-blue-500' : ''}`}>
                      <IconFromName name={ic} size={18} />
                    </button>
                  ))}
                  <button type="button" aria-label="Aucune" title="Aucune" onClick={() => setNewSubIcon(null)} className={`p-2 rounded-md hover:bg-gray-100 flex items-center justify-center ${newSubIcon === null ? 'ring-2 ring-blue-500' : ''}`}>
                    —
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-start">
                <div className="text-xs text-gray-500">Choisir une icône depuis la bibliothèque (aucun upload permis).</div>
                <div className="mt-2 text-sm text-gray-700">Aperçu: <span className="inline-block ml-2 align-middle"><IconFromName name={newSubIcon ?? undefined} fallback={'📁'} size={18} /></span></div>
              </div>
            </div>
            <div className="flex gap-2"><button onClick={handleAddSub} className="px-4 py-2 bg-green-600 text-white rounded-md">Ajouter</button></div> 
          </div>

          <div className="space-y-2">
            {loadingSubcategories ? <div>Chargement…</div> : (
              <div className="max-h-96 overflow-y-auto pr-2">
                {subcategories.map(s => (
                  <div key={s.id_subcategory} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--card-bg-epargne)' }}>
                        <IconFromName name={s.icon} fallback={'📁'} size={18} />
                      </div>
                      <div>
                        <div className="font-medium">{s.name} <span className="text-xs text-gray-500">(cat {s.category_id})</span></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {editingIconId === s.id_subcategory ? (
                        <div className="grid grid-cols-6 gap-2 items-center">
                          {ICONS.map(ic => (
                            <button key={ic} type="button" aria-label={ic} title={ic} onClick={async () => {
                              try {
                                const res = await api.updateSubcategory({ id_subcategory: s.id_subcategory, name: s.name, category_id: s.category_id, icon: ic });
                                if (res.ok && res.data && res.data.success) { setMessage('Icone mise à jour'); setEditingIconId(null); loadSubcategories(); } else setMessage(res.data?.error || 'Erreur');
                              } catch (err) { setMessage('Erreur serveur'); }
                            }} className={`p-2 rounded-md hover:bg-gray-100 flex items-center justify-center ${s.icon === ic ? 'ring-2 ring-blue-500' : ''}`}>
                              <IconFromName name={ic} size={18} />
                            </button>
                          ))}
                          <button type="button" aria-label="Aucune" title="Aucune" onClick={async () => {
                            try {
                              const res = await api.updateSubcategory({ id_subcategory: s.id_subcategory, name: s.name, category_id: s.category_id, icon: undefined });
                              if (res.ok && res.data && res.data.success) { setMessage('Icone supprimée'); setEditingIconId(null); loadSubcategories(); } else setMessage(res.data?.error || 'Erreur');
                            } catch (err) { setMessage('Erreur serveur'); }
                          }} className={`p-2 rounded-md hover:bg-gray-100 flex items-center justify-center ${!s.icon ? 'ring-2 ring-blue-500' : ''}`}>
                            —
                          </button>
                        </div>
                      ) : (
                        <>
                          <button onClick={()=>{ setEditingIconId(s.id_subcategory); setEditingIconValue(s.icon ?? ICONS[0]); }} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-50" title="Modifier icône">✏️</button>
                          <button onClick={()=>handleRenameSub(s)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-50"><Edit3 size={18} /></button>
                          <button onClick={()=>handleDeleteSub(s)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-red-600 hover:bg-gray-50"><Trash2 size={18} /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
