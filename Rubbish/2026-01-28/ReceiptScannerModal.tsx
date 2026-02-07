import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, ScanLine, Loader2, CheckCircle, X, AlertCircle } from 'lucide-react';
import { convertPdfFirstPageToImage, isPdf } from '../../lib/pdfToImage';

// Convertir une date UTC en heure Europe/Paris (HH:MM)
function getLocalTimeString(): string {
  const now = new Date();
  return now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
}

interface ExtractedData {
  merchant: string;
  amount: number;
  date?: string;
  time?: string;
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
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<{ step: string; percent: number }>({ step: '', percent: 0 });
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  const [candidates, setCandidates] = useState<any[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number>(-1);
  const [candidateThumb, setCandidateThumb] = useState<string | null>(null);

  const [lastAnalysis, setLastAnalysis] = useState<any>(null);

  const [categoryCandidates, setCategoryCandidates] = useState<any[]>([]);
  const [showCategoryCandidates, setShowCategoryCandidates] = useState(false);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number>(-1);
  const [subcategoryCandidates, setSubcategoryCandidates] = useState<any[]>([]);
  const [selectedSubcategoryIndex, setSelectedSubcategoryIndex] = useState<number>(-1);



  async function dataUrlSha256(dataUrl: string | null) {
    if (!dataUrl || !window.crypto || !window.crypto.subtle) return null;
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedImage || selectedCandidateIndex === -1 || !candidates[selectedCandidateIndex]) { 
        if (mounted) setCandidateThumb(null); 
        return; 
      }
      try {
        const t = await cropDataUrl(selectedImage, candidates[selectedCandidateIndex].bbox);
        if (mounted) setCandidateThumb(t);
      } catch (e) { 
        if (mounted) setCandidateThumb(null); 
      }
    })();
    return () => { mounted = false; };
  }, [selectedCandidateIndex, candidates, selectedImage]);

  // Auto-confirm when extraction is complete
  useEffect(() => {
    if (extracted && !isProcessing && !ocrError && selectedImage) {
      // Give a tiny delay for UI to update
      const timer = setTimeout(() => handleConfirm(), 100);
      return () => clearTimeout(timer);
    }
  }, [extracted, isProcessing, ocrError, selectedImage]);

  const handleFile = (f?: File | null) => {
    const file = f ?? fileRef.current?.files?.[0] ?? null;
    if (!file) return;
    
    // Check if it's a PDF and convert to image
    if (isPdf(file)) {
      setIsProcessing(true);
      setOcrProgress({ step: 'Conversion du PDF en image...', percent: 5 });
      
      convertPdfFirstPageToImage(file)
        .then((dataUrl) => {
          setSelectedImage(dataUrl);
          setExtracted(null);
          setIsProcessing(false);
          // Créer un blob depuis le dataUrl pour Mindee
          const arr = dataUrl.split(',');
          const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8 = new Uint8Array(n);
          while (n--) u8[n] = bstr.charCodeAt(n);
          const imageFile = new File([u8], 'receipt.jpg', { type: mime });
          runOCRAndExtract(dataUrl, imageFile);
        })
        .catch((err) => {
          console.error('PDF conversion error', err);
          setOcrError('Erreur lors de la conversion du PDF en image');
          setIsProcessing(false);
        });
    } else {
      // Handle image files normally
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setSelectedImage(dataUrl);
        setExtracted(null);
        await runOCRAndExtract(dataUrl, file);
      };
      reader.readAsDataURL(file as Blob);
    }
  };

  const runOCRAndExtract = async (dataUrl: string, file: File | null) => {
    setIsProcessing(true);
    setOcrError(null);
    setOcrProgress({ step: 'Préparation de l\'image...', percent: 10 });
    
    let res: any = null;
    let ocrSource = 'unknown';

    try {
      // 1️⃣ Essayer Mindee API d'abord (plus précis)
      if (file) {
        try {
          setOcrProgress({ step: 'Envoi vers Mindee (serveur)...', percent: 30 });
          
          const formData = new FormData();
          formData.append('document', file);
          
          const mindeeRes = await fetch('/API/analyze_receipt_mindee.php', {
            method: 'POST',
            credentials: 'include',
            body: formData
          });
          
          const mindeeJson = await mindeeRes.json();
          
          if (mindeeJson.success && mindeeJson.data) {
            res = mindeeJson.data;
            ocrSource = 'mindee';
            console.log('✅ OCR via Mindee API');
          } else {
            // Mindee failed, will fallback to Tesseract
            console.warn('⚠️ Mindee failed, falling back to Tesseract:', mindeeJson.error);
          }
        } catch (err: any) {
          console.warn('⚠️ Mindee API error, falling back to Tesseract:', err.message);
        }
      }

      // 2️⃣ Fallback: Utiliser Tesseract.js si Mindee a échoué
      if (!res) {
        setOcrProgress({ step: 'Analyse du texte (Tesseract client-side)...', percent: 40 });
        
        const { analyzeReceipt } = await import('../../lib/receiptOcr');
        
        res = await analyzeReceipt(dataUrl, {
          onProgress: (p) => setOcrProgress({ 
            step: 'Analyse du texte...', 
            percent: 40 + Math.round(p * 40)
          })
        });
        
        ocrSource = 'tesseract';
        console.log('✅ OCR via Tesseract.js');
      }

      setOcrProgress({ step: 'Extraction des données...', percent: 85 });
      
      setLastAnalysis({ ...res, source: ocrSource });
      setCandidates(res.candidates || []);
      
      // Find candidate with highest confidence score (for Tesseract results)
      let bestCandidate = res.best;
      if (res.candidates && res.candidates.length > 0) {
        bestCandidate = res.candidates.reduce((best: any, current: any) => {
          return (current.score100 || 0) > (best.score100 || 0) ? current : best;
        }, res.candidates[0]);
      }
      
      const amount = bestCandidate ? bestCandidate.value : (res.amount || 0);
      const extracted: ExtractedData = { 
        merchant: res.merchant || '', 
        amount, 
        date: res.date || new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }).split('/').reverse().join('-'), 
        time: res.time || getLocalTimeString(), 
        category: '' 
      };
      setExtracted(extracted);
      
      setOcrProgress({ step: 'Terminé', percent: 100 });
      
      // Store candidates for reference but don't show the selection modal
      setCandidates(res.candidates || []);
      setShowCandidates(false);
      
    } catch (err: any) {
      console.error('OCR failed (both Mindee and Tesseract)', err);
      const errorMsg = err?.message || 'Erreur lors de l\'analyse OCR';
      setOcrError(errorMsg);
      setExtracted({ merchant: '', amount: 0, date: new Date().toISOString().split('T')[0], category: '' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setOcrProgress({ step: '', percent: 0 }), 500);
    }
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

    try {
      const api = await import('../../services/api');
      const invoice_hash = await dataUrlSha256(selectedImage);
      const suggested_amt = lastAnalysis?.best?.value ?? (lastAnalysis?.candidates && lastAnalysis.candidates[0]?.value) ?? (lastAnalysis?.amount) ?? null;
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
        meta: { 
          via: 'confirm_button',
          ocr_source: lastAnalysis?.source || 'unknown'  // Track which OCR was used
        }
      });
    } catch (err) {
      console.warn('ocr feedback submit error', err);
    }

    onComplete(extracted, file);
    onClose();
  };

  const content = (
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
      <div className="text-center mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 text-left">
            <h2 className="text-xl font-semibold text-gray-900">Scanner une facture</h2>
            <p className="text-sm text-gray-500 mt-1">Prenez une photo ou téléchargez une image pour extraire automatiquement les informations</p>
          </div>
          {!inline && (
            <button onClick={onClose} className="ml-4 text-gray-600 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {!selectedImage ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => cameraRef.current?.click()}
            className="group relative bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-indigo-500 hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center gap-2"
          >
            <div className="bg-gray-100 p-3 rounded-full group-hover:bg-indigo-100 transition-colors">
              <Camera className="w-5 h-5 text-gray-600 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900 text-sm">Prendre une photo</p>
              <p className="text-xs text-gray-500 mt-0.5">Utilisez votre caméra</p>
            </div>
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            className="group relative bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-indigo-500 hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center gap-2"
          >
            <div className="bg-gray-100 p-3 rounded-full group-hover:bg-indigo-100 transition-colors">
              <Upload className="w-5 h-5 text-gray-600 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900 text-sm">Importer un fichier</p>
              <p className="text-xs text-gray-500 mt-0.5">Depuis votre appareil</p>
            </div>
          </button>

          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} className="hidden" />
          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} className="hidden" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Facture scannée</h3>
            <button 
              onClick={() => { 
                setSelectedImage(null); 
                setExtracted(null); 
                setIsProcessing(false); 
                setShowCandidates(false);
                setCandidates([]);
              }} 
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50">
            <img src={selectedImage} alt="Facture scannée" className="w-full h-auto max-h-80 object-contain" />
            {isProcessing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center backdrop-blur-sm">
                <div className="bg-white rounded-xl p-6 min-w-[300px]">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
                  <p className="text-center font-medium text-gray-900">{ocrProgress.step || 'Analyse en cours...'}</p>
                  {ocrProgress.percent > 0 && (
                    <div className="mt-3 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{width: `${ocrProgress.percent}%`}}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {ocrError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-800 font-medium">Erreur OCR</p>
              <p className="text-sm text-red-600 mt-1">{ocrError}</p>
              <button
                onClick={() => {
                  setOcrError(null);
                  if (selectedImage) runOCRAndExtract(selectedImage);
                }}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                Réessayer
              </button>
            </div>
          )}

          {showCandidates && (
            <div className="mt-3 border rounded-md p-3 bg-white">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-700 font-medium">Choisissez le montant correct</div>
                <div className="text-xs text-gray-500">Confiance</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {candidates.map((c: any, idx: number) => (
                  <button 
                    key={idx} 
                    type="button" 
                    onClick={() => setSelectedCandidateIndex(idx)} 
                    className={`flex items-center gap-3 p-2 border rounded ${selectedCandidateIndex===idx? 'border-indigo-400 bg-indigo-50' : 'bg-gray-50'}`}
                  >
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
                  {candidateThumb ? (
                    <img src={candidateThumb} alt="crop" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-xs text-gray-500 px-2 text-center">Aperçu du candidat</div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="text-sm text-gray-700 mb-2">
                    Montant sélectionné: <strong>
                      {candidates[selectedCandidateIndex]?.value?.toFixed 
                        ? candidates[selectedCandidateIndex]?.value?.toFixed(2) 
                        : candidates[selectedCandidateIndex]?.raw}
                    </strong>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={async () => {
                        const chosen = candidates[selectedCandidateIndex];
                        if (!chosen) return;
                        const newExtracted: ExtractedData = { 
                          merchant: (extracted?.merchant) || '', 
                          amount: chosen.value, 
                          date: (extracted?.date) || new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }).split('/').reverse().join('-'), 
                          time: (extracted?.time) || getLocalTimeString(), 
                          category: '' 
                        };
                        setExtracted(newExtracted);
                        try {
                          onComplete(newExtracted, dataURLtoFile(selectedImage));
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
                          } catch (err) { 
                            console.warn('ocr feedback error', err); 
                          }
                          if (!inline) onClose();
                        } catch(e) { 
                          console.warn(e); 
                        }
                      }} 
                      className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Appliquer ce montant
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { 
                        setShowCandidates(false); 
                        setCandidates([]); 
                        setSelectedCandidateIndex(-1); 
                        setCandidateThumb(null); 
                      }} 
                      className="px-3 py-2 border rounded hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Astuce:</strong> Pour de meilleurs résultats, assurez-vous que la facture est bien éclairée et lisible.
        </p>
      </div>
    </div>
  );

  if (inline) return <div className="mb-6">{content}</div>;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      {content}
    </div>
  );
}