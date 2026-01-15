import React, { useState, useRef } from 'react';
import { Camera, Upload, ScanLine, Loader2, CheckCircle, X } from 'lucide-react';

interface ExtractedData {
  merchant: string;
  amount: number;
  date?: string; // YYYY-MM-DD (ISO)
  time?: string; // HH:mm
  category: string;
}

interface Props {
  onClose: () => void;
  onComplete: (data: ExtractedData, file: File | null) => void;
  inline?: boolean;
}

export default function ReceiptScannerModal({ onClose, onComplete, inline = false }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  // Candidate UI state
  const [candidates, setCandidates] = useState<any[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number>(-1);
  const [candidateThumb, setCandidateThumb] = useState<string | null>(null);

  // Last OCR analysis (keep to send feedback)
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);

  // Category suggestion state
  const [categoryCandidates, setCategoryCandidates] = useState<any[]>([]);
  const [showCategoryCandidates, setShowCategoryCandidates] = useState(false);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number>(-1);
  const [subcategoryCandidates, setSubcategoryCandidates] = useState<any[]>([]);
  const [selectedSubcategoryIndex, setSelectedSubcategoryIndex] = useState<number>(-1);

  // Helper: compute SHA-256 hex of a dataURL (for privacy-conscious referencing of invoice files)
  async function dataUrlSha256(dataUrl: string | null) {
    if (!dataUrl || !window.crypto || !window.crypto.subtle) return null;
    // strip leading 'data:*/*;base64,'
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const binStr = atob(parts[1]);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
    const hashBuf = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuf));
    return hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
  }

  // Helper to crop a dataUrl with bbox and return a small thumbnail dataUrl
  async function cropDataUrl(dataUrl: string, bbox: { left: number; top: number; width: number; height: number } | null, padding = 6) {
    if (!dataUrl || !bbox) return null;
    return new Promise<string | null>((res) => {
      const img = new Image();
      img.onload = () => {
        const sx = Math.max(0, bbox.left - padding);
        const sy = Math.max(0, bbox.top - padding);
        const sw = Math.min(img.width - sx, bbox.width + padding * 2);
        const sh = Math.min(img.height - sy, bbox.height + padding * 2);
        const canvas = document.createElement('canvas');
        // small thumbnail size
        const tw = 160, th = Math.round((sh / sw) * tw);
        canvas.width = tw;
        canvas.height = Math.max(40, th);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        res(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => res(null);
      img.src = dataUrl;
    });
  }

  // Generate a thumbnail when selection changes
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedImage || selectedCandidateIndex === -1 || !candidates[selectedCandidateIndex]) { if (mounted) setCandidateThumb(null); return; }
      try {
        const t = await cropDataUrl(selectedImage, candidates[selectedCandidateIndex].bbox);
        if (mounted) setCandidateThumb(t);
      } catch (e) { if (mounted) setCandidateThumb(null); }
    })();
    return () => { mounted = false; };
  }, [selectedCandidateIndex, candidates, selectedImage]);

  // Use real OCR + extraction when available
  import('../../lib/receiptOcr').then(m => console.debug('[ReceiptScanner] receiptOcr helper loaded', m)).catch(() => {});

  const runOCRAndExtract = async (dataUrl: string) => {
    setIsProcessing(true);
    try {
      const { analyzeReceipt } = await import('../../lib/receiptOcr');
      const res = await analyzeReceipt(dataUrl);
      setLastAnalysis(res);
      // Convert best candidate to ExtractedData shape
      const amount = res.best ? res.best.value : (res.candidates && res.candidates.length ? res.candidates[0].value : 0);
      const category = res.best ? (res.best.raw.includes('%') ? '' : '') : '';
      const extracted: ExtractedData = { merchant: res.merchant || '', amount, date: res.date || new Date().toISOString().split('T')[0], time: res.time || new Date().toISOString().slice(11,16), category: '' };
      setExtracted(extracted);
      // Attach file to parent and auto-apply
      try {
        const fileForParent = dataURLtoFile(dataUrl);
        console.log('[ReceiptScanner] auto-apply extraction', { extracted, fileForParent, inline, candidates: res.candidates });
        onComplete(extracted, fileForParent);
        if (!inline) onClose();
      } catch (applyErr) {
        console.warn('Failed to auto-apply extracted data', applyErr);
      }
    } catch (err) {
      console.error('OCR failed', err);
      // fallback: minimal empty extraction
      setExtracted({ merchant: '', amount: 0, date: new Date().toISOString().split('T')[0], category: '' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFile = (f?: File | null) => {
    const file = f ?? fileRef.current?.files?.[0] ?? null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setSelectedImage(dataUrl);
      setExtracted(null);
      // Use OCR helper
      await runOCRAndExtract(dataUrl);
    };
    reader.readAsDataURL(file as Blob);
  };

  const dataURLtoFile = (dataurl: string, filename = 'receipt.jpg') => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8 = new Uint8Array(n);
    while (n--) u8[n] = bstr.charCodeAt(n);
    return new File([u8], filename, { type: mime });
  };

  const handleConfirm = async () => {
    if (!extracted) return;
    let file: File | null = null;
    if (selectedImage) file = dataURLtoFile(selectedImage);
    console.log('[ReceiptScanner] handleConfirm', { extracted, file });

    // Determine if this is an override vs accept
    try {
      const api = await import('../../services/api');
      const invoice_hash = await dataUrlSha256(selectedImage);
      const suggested_amt = lastAnalysis?.best?.value ?? (lastAnalysis?.candidates && lastAnalysis.candidates[0]?.value) ?? null;
      const suggested_cat = lastAnalysis?.bestCategory || null;
      const diffAmt = (suggested_amt != null && extracted.amount != null) ? Math.abs(Number(suggested_amt) - Number(extracted.amount)) : 0;
      const isOverride = suggested_amt != null && diffAmt > 0.01;
      const action = isOverride ? 'overridden' : 'accepted';
      await api.submitOcrFeedback({
        action,
        full_text: lastAnalysis?.text || null,
        merchant: lastAnalysis?.merchant || null,
        invoice_hash,
        suggested_amount: suggested_amt,
        applied_amount: extracted.amount,
        suggested_category: suggested_cat,
        applied_category: extracted.category || null,
        candidates: (lastAnalysis?.candidates || []).slice(0,5).map((c:any)=>({ raw: c.raw, value: c.value, score100: c.score100 })),
        meta: { via: 'confirm_button' }
      });
    } catch (err) {
      console.warn('ocr feedback submit error', err);
    }

    onComplete(extracted, file);
    onClose();
  };

  const content = (
    <div className="bg-white rounded-2xl shadow-xl w-full p-6">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="bg-indigo-50 p-4 rounded-full">
            <ScanLine className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 text-left">
            <h2 className="text-xl font-semibold text-gray-900">Scanner une facture</h2>
            <p className="text-sm text-gray-500 mt-1">Prenez une photo ou téléchargez une image pour extraire automatiquement les informations</p>
          </div>
          {!inline && (
            <div className="ml-4">
              <button onClick={onClose} className="text-gray-600">Fermer</button>
            </div>
          )}
        </div>
      </div>

      {!selectedImage ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => cameraRef.current?.click()}
            className="group relative bg-white border-2 border-gray-200 rounded-xl p-8 hover:border-indigo-500 hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center gap-4"
          >
            <div className="bg-gray-100 p-4 rounded-full group-hover:bg-indigo-100 transition-colors">
              <Camera className="w-8 h-8 text-gray-600 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Prendre une photo</p>
              <p className="text-sm text-gray-500 mt-1">Utilisez votre caméra</p>
            </div>
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            className="group relative bg-white border-2 border-gray-200 rounded-xl p-8 hover:border-indigo-500 hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center gap-4"
          >
            <div className="bg-gray-100 p-4 rounded-full group-hover:bg-indigo-100 transition-colors">
              <Upload className="w-8 h-8 text-gray-600 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Importer un fichier</p>
              <p className="text-sm text-gray-500 mt-1">Depuis votre appareil</p>
            </div>
          </button>

          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} className="hidden" />
          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} className="hidden" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Facture scannée</h3>
            <button onClick={() => { setSelectedImage(null); setExtracted(null); setIsProcessing(false); }} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><X className="w-5 h-5" /></button>
          </div>

          <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50">
            <img src={selectedImage as string} alt="Facture scannée" className="w-full h-auto max-h-80 object-contain" />
            {isProcessing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center backdrop-blur-sm">
                <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-3 shadow-xl">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                  <p className="text-gray-900 font-medium">Analyse en cours...</p>
                  <p className="text-sm text-gray-600">Extraction des données</p>
                </div>
              </div>
            )}
          </div>

          {extracted && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-3 text-green-600 bg-green-50 border border-green-200 rounded-xl p-4">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Données extraites</span>
              </div>

              {/* Show candidate amounts and let user pick */}
              <div className="text-sm text-gray-500">Les informations ont été extraites automatiquement. Vérifiez et choisissez le montant correct ci‑dessous.</div>

              <div className="mt-3 space-y-2">
                <button type="button" onClick={async () => {
                  if (!selectedImage) return;
                  setIsProcessing(true);
                  try {
                    const { analyzeReceipt } = await import('../../lib/receiptOcr');
                    const res = await analyzeReceipt(selectedImage);
                    setLastAnalysis(res);
                  } catch (e) {
                    console.error(e);
                    alert('Erreur lors de la récupération des candidats');
                  } finally { setIsProcessing(false); }
                }} className="px-4 py-2 rounded-md border bg-white">Afficher les montants candidats</button>

                {showCandidates && (
                  <div className="mt-3 border rounded-md p-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-700 font-medium">Choisissez le montant correct</div>
                      <div className="text-xs text-gray-500">Confiance</div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {candidates.map((c: any, idx: number) => (
                        <button key={idx} type="button" onClick={() => setSelectedCandidateIndex(idx)} className={`flex items-center gap-3 p-2 border rounded ${selectedCandidateIndex===idx? 'border-indigo-400 bg-indigo-50' : 'bg-gray-50'}`}>
                          <div className="flex-1 text-left">
                            <div className="font-medium">{c.raw}</div>
                            <div className="text-xs text-gray-500">Valeur: {Number.isFinite(c.value) ? c.value.toFixed(2) : c.raw} — <strong>{c.score100}%</strong></div>
                          </div>
                          <div className="text-sm text-gray-500">{selectedCandidateIndex===idx? 'Sélectionné' : 'Choisir'}</div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 flex gap-3 items-start">
                      <div className="w-32 h-20 border rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                        {candidateThumb ? <img src={candidateThumb} alt="crop" className="w-full h-full object-cover" /> : <div className="text-xs text-gray-500 px-2 text-center">Aperçu du candidat</div>}
                      </div>

                      <div className="flex-1">
                        <div className="text-sm text-gray-700 mb-2">Montant sélectionné: <strong>{candidates[selectedCandidateIndex]?.value?.toFixed ? candidates[selectedCandidateIndex]?.value?.toFixed(2) : candidates[selectedCandidateIndex]?.raw}</strong></div>
                        <div className="flex gap-2">
                          <button type="button" onClick={async () => {
                            const chosen = candidates[selectedCandidateIndex];
                            if (!chosen) return;
                            const newExtracted: ExtractedData = { merchant: (extracted?.merchant) || '', amount: chosen.value, date: (extracted?.date) || new Date().toISOString().split('T')[0], time: (extracted?.time) || new Date().toISOString().slice(11,16), category: '' };
                            setExtracted(newExtracted);
                            try {
                              onComplete(newExtracted, dataURLtoFile(selectedImage));
                              // Fire-and-forget: submit feedback that user accepted suggested amount
                              try {
                                const api = await import('../../services/api');
                                const invoice_hash = await dataUrlSha256(selectedImage);
                                await api.submitOcrFeedback({
                                  action: 'accepted',
                                  full_text: lastAnalysis?.text || null,
                                  merchant: lastAnalysis?.merchant || null,
                                  invoice_hash,
                                  suggested_amount: chosen.value,
                                  applied_amount: chosen.value,
                                  candidates: (candidates || []).slice(0,5).map((c:any)=>({ raw: c.raw, value: c.value, score100: c.score100 })),
                                  meta: { via: 'apply_amount_button' }
                                });
                              } catch (err) { console.warn('ocr feedback error', err); }
                              if (!inline) onClose();
                            } catch(e) { console.warn(e); }
                          }} className="px-3 py-2 bg-indigo-600 text-white rounded">Appliquer ce montant</button>
                          <button type="button" onClick={() => { setShowCandidates(false); setCandidates([]); setSelectedCandidateIndex(-1); setCandidateThumb(null); }} className="px-3 py-2 border rounded">Annuler</button>
                        </div>
                      </div>
                    </div>

                    {/* Category suggestion CTA */}
                    <div className="mt-4">
                      <button type="button" onClick={async () => {
                        if (!selectedImage) return;
                        setIsProcessing(true);
                        try {
                          const { analyzeReceipt, suggestCategoryCandidates } = await import('../../lib/receiptOcr');
                          const res = await analyzeReceipt(selectedImage);

                          const api = await import('../../services/api');
                          const catsRes = await api.getCategories();
                          const subsRes = await api.getSubcategories();
                          const txRes = await api.getTransactions();

                          if (!catsRes.ok || !catsRes.data || !Array.isArray(catsRes.data.categories)) {
                            throw new Error('Impossible de charger les catégories');
                          }

                          const cats = catsRes.data.categories;
                          const subs = (subsRes.ok && subsRes.data && Array.isArray(subsRes.data.subcategories)) ? subsRes.data.subcategories : [];
                          const txs = (txRes.ok && txRes.data && Array.isArray(txRes.data.transactions)) ? txRes.data.transactions : [];

                          const catRes = await suggestCategoryCandidates(res.text || selectedImage, res.merchant || '', cats, subs, txs);
                          setCategoryCandidates(catRes.categoryCandidates || []);
                          setSubcategoryCandidates(catRes.subCandidates || []);
                          setSelectedCategoryIndex(catRes.categoryCandidates && catRes.categoryCandidates.length ? 0 : -1);
                          setSelectedSubcategoryIndex(catRes.subCandidates && catRes.subCandidates.length ? 0 : -1);
                          setShowCategoryCandidates(true);
                        } catch (e) {
                          console.error(e);
                          alert('Erreur lors de la suggestion de catégories');
                        } finally { setIsProcessing(false); }
                      }} className="px-3 py-2 rounded-md border bg-white">Afficher les catégories suggérées</button>
                    </div>

                    {showCategoryCandidates && (
                      <div className="mt-3 border rounded-md p-3 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm text-gray-700 font-medium">Catégories suggérées</div>
                          <div className="text-xs text-gray-500">Confiance</div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {categoryCandidates.map((c: any, idx: number) => (
                            <button key={idx} type="button" onClick={() => { setSelectedCategoryIndex(idx); setSubcategoryCandidates([]); setSelectedSubcategoryIndex(-1); }} className={`flex items-center gap-3 p-2 border rounded ${selectedCategoryIndex===idx? 'border-green-400 bg-green-50' : 'bg-gray-50'}`}>
                              <div className="flex-1 text-left">
                                <div className="font-medium">{c.name}</div>
                                <div className="text-xs text-gray-500">Score: <strong>{c.score100}%</strong></div>
                              </div>
                              <div className="text-sm text-gray-500">{selectedCategoryIndex===idx? 'Sélectionné' : 'Choisir'}</div>
                            </button>
                          ))}
                        </div>

                        {selectedCategoryIndex !== -1 && (
                          <div className="mt-3">
                            <div className="text-sm text-gray-700 mb-2">Sous-catégories possibles</div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {(subcategoryCandidates.length ? subcategoryCandidates : [{ name: 'Aucune sous-catégorie suggérée', score100: 0 }]).map((s: any, si: number) => (
                                <button key={si} type="button" onClick={() => setSelectedSubcategoryIndex(si)} className={`px-2 py-1 text-left border rounded ${selectedSubcategoryIndex===si? 'border-indigo-400 bg-indigo-50' : 'bg-gray-50'}`}>
                                  <div className="text-sm">{s.name}</div>
                                  <div className="text-xs text-gray-500">{s.score100 ? `${s.score100}%` : ''}</div>
                                </button>
                              ))}

                            </div>

                            <div className="mt-3 flex gap-2">
                              <button type="button" onClick={async () => {
                                const chosenCat = categoryCandidates[selectedCategoryIndex];
                                const chosenSub = subcategoryCandidates[selectedSubcategoryIndex];
                                if (!chosenCat) return alert('Aucune catégorie sélectionnée');
                                const catName = chosenCat.name + (chosenSub?.name ? ` — ${chosenSub.name}` : '');
                                const newExtracted: ExtractedData = { merchant: (extracted?.merchant) || '', amount: (extracted?.amount) || 0, date: (extracted?.date) || new Date().toISOString().split('T')[0], time: (extracted?.time) || new Date().toISOString().slice(11,16), category: catName };
                                setExtracted(newExtracted);
                                try {
                                  onComplete(newExtracted, selectedImage ? dataURLtoFile(selectedImage) : null);
                                  try {
                                    const api = await import('../../services/api');
                                    const invoice_hash = await dataUrlSha256(selectedImage);
                                    await api.submitOcrFeedback({
                                      action: 'accepted',
                                      full_text: lastAnalysis?.text || null,
                                      merchant: lastAnalysis?.merchant || null,
                                      invoice_hash,
                                      suggested_category: chosenCat.name,
                                      applied_category: catName,
                                      candidates: (categoryCandidates||[]).slice(0,5).map((c:any)=>({ name: c.name, score100: c.score100 })),
                                      meta: { via: 'apply_category_button' }
                                    });
                                  } catch (err) { console.warn('ocr feedback error', err); }
                                  if (!inline) onClose();
                                } catch (e) { console.warn(e); }
                                setShowCategoryCandidates(false);
                                setCategoryCandidates([]);
                                setSubcategoryCandidates([]);
                                setSelectedCategoryIndex(-1);
                                setSelectedSubcategoryIndex(-1);
                              }} className="px-3 py-2 bg-green-600 text-white rounded">Appliquer catégorie / sous-catégorie</button>
                              <button type="button" onClick={() => { setShowCategoryCandidates(false); setCategoryCandidates([]); setSelectedCategoryIndex(-1); setSubcategoryCandidates([]); setSelectedSubcategoryIndex(-1); }} className="px-3 py-2 border rounded">Annuler</button>
                            </div>
                          </div>
                        )}

                      </div>
                    )}

                  </div>
                )}

              </div>

            </div>
          )}

        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800"><strong>💡 Astuce:</strong> Pour de meilleurs résultats, assurez-vous que la facture est bien éclairée et lisible.</p>
      </div>
    </div>
  );

  if (inline) return (<div className="mb-6">{content}</div>);
  return (<div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">{content}</div>);
}
