import { useEffect, useState } from 'react';
import { PlusCircle, Trash2, Edit3 } from 'lucide-react';
import * as api from '../../services/api';
import IconFromName, { normalizeIconName } from './IconFromName';
import { matchesFieldSearch } from './searchUtils';

const ICONS = ['Target','Car','Taxi','SUV','Bus','Plane','Train','MoneyBag','MoneyWings','Bride','Girl','ManRedHair','CableCar','Hospital','Shopping','Books','Clothes','ShoppingCart','Coffee','Gift','CreditCard','Book','Heart','Film','Truck','User','Calendar','Package','Wallet','LowBattery','Lightning','Plug','WomanWithHeadscarf','Dining','Pasta','HaircutMan','Construction','Factory','CalendarAlt','Bank','DoctorWoman','Medical','Pill','Stethoscope','HealthWorker','Tooth','Droplet','Tools','Graduation','Home','Pin','Phone','Laptop'];

export default function GestionPostes() {
  const [tab, setTab] = useState<'types'|'categories'|'subcategories'>('categories');

  const [types, setTypes] = useState<Array<any>>([]);
  const [categories, setCategories] = useState<Array<any>>([]);
  const [subcategories, setSubcategories] = useState<Array<any>>([]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // local search filter for the management list
  const [search, setSearch] = useState('');

  // forms
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeLabel, setNewTypeLabel] = useState('');

  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<number | ''>('');
  const [newCatManualBudget, setNewCatManualBudget] = useState<string>('');

  const [newSubName, setNewSubName] = useState('');
  const [newSubCategory, setNewSubCategory] = useState<number | ''>('');
  const [newSubManualBudget, setNewSubManualBudget] = useState<string>('');
  const [newSubIcon, setNewSubIcon] = useState<string | null>(ICONS[0]);
  const [editingIconId, setEditingIconId] = useState<number | null>(null);
  const [editingIconValue, setEditingIconValue] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const t = await api.getTransactionTypes(); if (t.ok && t.data && Array.isArray(t.data.types)) setTypes(t.data.types);
      const c = await api.getCategories(); if (c.ok && c.data && Array.isArray(c.data.categories)) setCategories(c.data.categories);
      const s = await api.getSubcategories(); if (s.ok && s.data && Array.isArray(s.data.subcategories)) setSubcategories(s.data.subcategories);
    } catch (e) {
      console.warn('loadAll failed', e);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  // add handlers
  const addType = async () => {
    if (!newTypeCode || !newTypeLabel) return setMsg('Code et libellé requis');
    try {
      const res = await api.addType({ code: newTypeCode, label: newTypeLabel });
      if (res.ok && res.data && res.data.success) { setMsg('Type ajouté'); setNewTypeCode(''); setNewTypeLabel(''); await loadAll(); }
      else setMsg(res.data?.error || 'Erreur');
    } catch (e) { setMsg('Erreur serveur'); }
  };

  const addCategory = async () => {
    if (!newCatName || !newCatType) return setMsg('Nom et type requis');
    try {
      const manual = newCatManualBudget ? parseFloat(newCatManualBudget.replace(',', '.')) : undefined;
      const res = await api.addCategory({ id_type: Number(newCatType), name: newCatName, manual_budget: manual });
      if (res.ok && res.data && res.data.success) { setMsg('Catégorie ajoutée'); setNewCatName(''); setNewCatType(''); setNewCatManualBudget(''); await loadAll(); }
      else setMsg(res.data?.error || 'Erreur');
    } catch (e) { setMsg('Erreur serveur'); }
  };

  const addSub = async () => {
    if (!newSubName || !newSubCategory) return setMsg('Nom et catégorie requis');
    try {
      const sanitizedIcon = normalizeIconName(newSubIcon);
      const manual = newSubManualBudget ? parseFloat(newSubManualBudget.replace(',', '.')) : undefined;
      const res = await api.addSubcategory({ category_id: Number(newSubCategory), name: newSubName, icon: sanitizedIcon ?? undefined, manual_budget: manual });
      if (res.ok && res.data && res.data.success) { setMsg('Sous-catégorie ajoutée'); setNewSubName(''); setNewSubCategory(''); setNewSubIcon(ICONS[0]); setNewSubManualBudget(''); await loadAll(); }
      else setMsg(res.data?.error || 'Erreur');
    } catch (e) { setMsg('Erreur serveur'); }
  };

  // rename handlers
  const renameType = async (t: any) => {
    const name = window.prompt('Nouveau libellé', t.label);
    if (!name) return;
    try {
      const res = await api.updateType({ id_type: t.id_type, label: name, code: t.code });
      if (res.ok && res.data && res.data.success) { setMsg('Type renommé'); await loadAll(); } else setMsg(res.data?.error || 'Erreur');
    } catch (e) { setMsg('Erreur'); }
  };
  const renameCategory = async (c: any) => {
    const name = window.prompt('Nouveau nom', c.name);
    if (!name) return;
    const manualInput = window.prompt('Budget manuel (laisser vide pour automatique)', c.manual_budget ?? '');
    const manual = manualInput ? parseFloat(manualInput.replace(',', '.')) : null;
    try {
      const res = await api.updateCategory({ id_category: c.id_category, name, id_type: c.id_type, manual_budget: manual });
      if (res.ok && res.data && res.data.success) { setMsg('Catégorie mise à jour'); await loadAll(); } else setMsg(res.data?.error || 'Erreur');
    } catch (e) { setMsg('Erreur'); }
  };
  const renameSub = async (s: any) => {
    const name = window.prompt('Nouveau nom', s.name);
    if (!name) return;
    const manualInput = window.prompt('Budget manuel (laisser vide pour automatique)', s.manual_budget ?? '');
    const manual = manualInput ? parseFloat(manualInput.replace(',', '.')) : null;
    try {
      const res = await api.updateSubcategory({ id_subcategory: s.id_subcategory, name, category_id: s.category_id, manual_budget: manual });
      if (res.ok && res.data && res.data.success) { setMsg('Sous-catégorie mise à jour'); await loadAll(); } else setMsg(res.data?.error || 'Erreur');
    } catch (e) { setMsg('Erreur'); }
  };

  // delete handlers
  const deleteType = async (t: any) => {
    if (!confirm(`Supprimer le type "${t.label}" ?`)) return;
    try {
      const res = await api.deleteType({ id_type: t.id_type });
      if (res.ok && res.data && res.data.success) { setMsg('Type supprimé'); await loadAll(); }
      else if (res.data?.error === 'contains_related') { setMsg(`Impossible de supprimer: contient ${res.data.counts?.categories || 'des'} catégories.`); }
      else setMsg(res.data?.error || 'Erreur');
    } catch (e) { setMsg('Erreur serveur'); }
  };
  const deleteCategory = async (c: any) => {
    if (!confirm(`Supprimer la catégorie "${c.name}" ?`)) return;
    try {
      const res = await api.deleteCategory({ id_category: c.id_category });
      if (res.ok && res.data && res.data.success) { setMsg('Catégorie supprimée'); await loadAll(); }
      else if (res.data?.error === 'contains_related') { setMsg(`Impossible de supprimer: contient ${res.data.counts.subcategories} sous-catégories et ${res.data.counts.transactions} transactions.`); }
      else setMsg(res.data?.error || 'Erreur');
    } catch (e) { setMsg('Erreur serveur'); }
  };
  const deleteSub = async (s: any) => {
    if (!confirm(`Supprimer la sous-catégorie "${s.name}" ?`)) return;
    try {
      const res = await api.deleteSubcategory({ id_subcategory: s.id_subcategory });
      if (res.ok && res.data && res.data.success) { setMsg('Sous-catégorie supprimée'); await loadAll(); }
      else if (res.data?.error === 'contains_related') { setMsg(`Impossible de supprimer: contient ${res.data.counts.transactions} transactions et ${res.data.counts.objectifs} objectifs.`); }
      else setMsg(res.data?.error || 'Erreur');
    } catch (e) { setMsg('Erreur serveur'); }
  };

  return (
    <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm">
      <h3 className="font-bold text-lg mb-4">Gestion des postes de dépense</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Add area (spans 2 cols on large screens) */}
        <div className="lg:col-span-1 bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4 overflow-x-auto whitespace-nowrap -mx-3 px-3 snap-x snap-mandatory no-scrollbar">
            <button onClick={()=>setTab('types')} className={`inline-flex flex-shrink-0 snap-start px-3 py-2 rounded-full text-sm ${tab==='types' ? 'bg-blue-600 text-white shadow' : 'bg-white border'}`}>Types</button>
            <button onClick={()=>setTab('categories')} className={`inline-flex flex-shrink-0 snap-start px-3 py-2 rounded-full text-sm ${tab==='categories' ? 'bg-blue-600 text-white shadow' : 'bg-white border'}`}>Catégories</button>
            <button onClick={()=>setTab('subcategories')} className={`inline-flex flex-shrink-0 snap-start px-3 py-2 rounded-full text-sm ${tab==='subcategories' ? 'bg-blue-600 text-white shadow' : 'bg-white border'}`}>Sous‑catégories</button>
          </div>

          {msg && <div className="mb-4 px-4 py-3 rounded-md text-sm text-green-700 bg-green-50 border border-green-100">{msg}</div>}

          <div className="bg-white rounded-lg border border-gray-100 p-6">
            {tab === 'types' && (
              <div>
                <h4 className="font-semibold mb-3">Ajouter un type</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input aria-label="code type" value={newTypeCode} onChange={(e)=>setNewTypeCode(e.target.value)} placeholder="Code (ex: expense)" className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100" />
                  <input aria-label="libelle type" value={newTypeLabel} onChange={(e)=>setNewTypeLabel(e.target.value)} placeholder="Libellé" className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="mt-4">
                  <button onClick={addType} className="inline-flex items-center justify-center w-full sm:w-auto gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full shadow"> <PlusCircle size={16}/> Ajouter le type</button>
                </div>
              </div>
            )}

            {tab === 'categories' && (
              <div>
                <h4 className="font-semibold mb-3">Ajouter une catégorie</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select aria-label="type parent" value={newCatType} onChange={(e)=>setNewCatType(e.target.value?Number(e.target.value):'')} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100">
                    <option value="">Sélectionner un type</option>
                    {types.map(t => (<option key={t.id_type} value={t.id_type}>{t.label}</option>))}
                  </select>
                  <input aria-label="nom categorie" value={newCatName} onChange={(e)=>setNewCatName(e.target.value)} placeholder="Nom catégorie" className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                  <input aria-label="budget manuel catégorie" value={newCatManualBudget} onChange={(e)=>setNewCatManualBudget(e.target.value)} placeholder="Budget manuel (optionnel)" className="w-full px-3 py-2 border rounded-md text-sm" />
                  <div className="text-right">
                    <button onClick={() => addCategory()} className="inline-flex items-center justify-center w-full sm:w-auto gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"> <PlusCircle size={14}/> Ajouter</button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'subcategories' && (
              <div>
                <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <select value={newSubCategory} onChange={(e)=>setNewSubCategory(e.target.value ? Number(e.target.value) : '')} className="w-full px-3 py-2 border rounded-md">
                    <option value="">Choisir une catégorie</option>
                    {categories.map(t => (<option key={t.id_category} value={t.id_category}>{t.name}</option>))}
                  </select>
                  <input value={newSubName} onChange={(e)=>setNewSubName(e.target.value)} placeholder="Nom sous-catégorie" className="w-full px-3 py-2 border rounded-md" />
                  <input value={newSubManualBudget} onChange={(e)=>setNewSubManualBudget(e.target.value)} placeholder="Budget manuel (optionnel)" className="w-full px-3 py-2 border rounded-md" />
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="max-h-40 overflow-y-auto w-full pr-2">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 w-full">
                        {ICONS.map(ic => (
                          <button key={ic} type="button" aria-label={ic} title={ic} onClick={() => setNewSubIcon(ic)} className={`p-1 rounded-md hover:bg-gray-100 flex items-center justify-center ${newSubIcon === ic ? 'ring-2 ring-blue-500' : ''}`}>
                            <IconFromName name={ic} size={16} />
                          </button>
                        ))}
                        <button type="button" aria-label="Aucune" title="Aucune" onClick={() => setNewSubIcon(null)} className={`p-1 rounded-md hover:bg-gray-100 flex items-center justify-center ${newSubIcon === null ? 'ring-2 ring-blue-500' : ''}`}>
                          —
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-start">
                      <div className="text-xs text-gray-500">Choisir une icône depuis la bibliothèque (aucun upload permis).</div>
                      <div className="mt-2 text-sm text-gray-700">Aperçu: <span className="inline-block ml-2 align-middle"><IconFromName name={newSubIcon ?? undefined} fallback={'📁'} size={16} /></span></div>
                    </div>
                  </div>
                  <div className="flex gap-2"><button onClick={addSub} className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md">Ajouter</button></div>
                </div>

                <div className="mb-2 text-sm text-gray-500">La gestion (renommer / supprimer) des sous‑catégories se fait dans la colonne de droite — utilisez la colonne « Suppression / Renommer » pour ces actions.</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: list / actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Suppression / Renommer</h4>
            <input placeholder="Rechercher…" value={search} onChange={(e)=>setSearch(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-40" aria-label="search postes" />
          </div>
          <div className="space-y-2 max-h-80 overflow-auto">
            {tab === 'types' && types.filter(t => matchesFieldSearch(t.label, search)).map(t => (
              <div key={t.id_type} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div>
                  <div className="font-medium">{t.label} <span className="text-xs text-gray-400">({t.code})</span></div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>renameType(t)} title="Renommer" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-50"><Edit3 size={18} /></button>
                  <button onClick={()=>deleteType(t)} title="Supprimer" className="min-h-[44px] min-w-[44px] flex items-center justify-center text-red-600 rounded-md hover:bg-red-50"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}

            {tab === 'categories' && categories.filter(c => matchesFieldSearch(c.name, search)).map(c => (
              <div key={c.id_category} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div>
                  <div className="font-medium">{c.name} <span className="ml-2 text-xs text-gray-400">(type {c.id_type})</span></div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>renameCategory(c)} title="Renommer" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-50"><Edit3 size={18} /></button>
                  <button onClick={()=>deleteCategory(c)} title="Supprimer" className="min-h-[44px] min-w-[44px] flex items-center justify-center text-red-600 rounded-md hover:bg-red-50"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}

            {tab === 'subcategories' && (
              <div className="max-h-72 md:max-h-96 overflow-y-auto pr-2">
                {subcategories.filter(s => matchesFieldSearch(s.name, search)).map(s => (
              <div key={s.id_subcategory} className="flex items-center justify-between p-2 border border-gray-100 rounded-md hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: 'var(--card-bg-epargne)' }}>
                    <IconFromName name={s.icon} fallback={s.emoji || '📁'} size={16} />
                  </div>
                  <div>
                    <div className="font-medium">{s.name} <span className="ml-2 text-xs text-gray-400">(cat {s.category_id})</span>
                    {s.manual_budget ? <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600">Budget: {s.manual_budget}</span> : null}
                  </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editingIconId === s.id_subcategory ? (
                    <div className="max-h-40 overflow-y-auto w-full pr-2">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1 items-center">
                        {ICONS.map(ic => (
                          <button key={ic} type="button" aria-label={ic} title={ic} onClick={async () => {
                            try {
                              const res = await api.updateSubcategory({ id_subcategory: s.id_subcategory, name: s.name, category_id: s.category_id, icon: ic });
                              if (res.ok && res.data && res.data.success) { setMsg('Icone mise à jour'); setEditingIconId(null); await loadAll(); } else setMsg(res.data?.error || 'Erreur');
                            } catch (err) { setMsg('Erreur serveur'); }
                          }} className={`p-1 rounded-md hover:bg-gray-100 flex items-center justify-center ${s.icon === ic ? 'ring-2 ring-blue-500' : ''}`}>
                            <IconFromName name={ic} size={16} />
                          </button>
                        ))}
                        <button type="button" aria-label="Aucune" title="Aucune" onClick={async () => {
                          try {
                            const res = await api.updateSubcategory({ id_subcategory: s.id_subcategory, name: s.name, category_id: s.category_id, icon: undefined });
                            if (res.ok && res.data && res.data.success) { setMsg('Icone supprimée'); setEditingIconId(null); await loadAll(); } else setMsg(res.data?.error || 'Erreur');
                          } catch (err) { setMsg('Erreur serveur'); }
                        }} className={`p-1 rounded-md hover:bg-gray-100 flex items-center justify-center ${!s.icon ? 'ring-2 ring-blue-500' : ''}`}>
                          —
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button onClick={()=>{ setEditingIconId(s.id_subcategory); setEditingIconValue(s.icon ?? ICONS[0]); }} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-50" title="Modifier icône">✏️</button>
                      <button onClick={()=>renameSub(s)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-50"><Edit3 size={18} /></button>
                      <button onClick={()=>deleteSub(s)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-red-600 hover:bg-red-50"><Trash2 size={18} /></button>
                    </>
                  )}
                </div>
              </div>
                ))}
              </div>
            )}

            {!types.length && tab === 'types' && <div className="text-sm text-gray-500">Aucun type</div>}
            {!categories.length && tab === 'categories' && <div className="text-sm text-gray-500">Aucune catégorie</div>}
            {!subcategories.length && tab === 'subcategories' && <div className="text-sm text-gray-500">Aucune sous‑catégorie</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
