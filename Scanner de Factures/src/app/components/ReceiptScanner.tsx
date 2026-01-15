import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, CheckCircle, ScanLine } from 'lucide-react';
import type { Transaction } from '../App';

interface ReceiptScannerProps {
  onSubmit: (transaction: Omit<Transaction, 'id'>) => void;
}

interface ExtractedData {
  merchant: string;
  amount: number;
  date: string;
  category: string;
}

export function ReceiptScanner({ onSubmit }: ReceiptScannerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Simule l'extraction de données d'une facture avec OCR
  const simulateOCR = async (imageData: string): Promise<ExtractedData> => {
    // Simuler un délai de traitement
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Données mockées pour la démonstration
    const mockReceipts = [
      {
        merchant: 'Carrefour Market',
        amount: 32.45,
        date: new Date().toISOString().split('T')[0],
        category: 'Alimentation',
      },
      {
        merchant: 'Shell Station',
        amount: 55.00,
        date: new Date().toISOString().split('T')[0],
        category: 'Transport',
      },
      {
        merchant: 'Pharmacie Lafayette',
        amount: 18.90,
        date: new Date().toISOString().split('T')[0],
        category: 'Santé',
      },
      {
        merchant: 'Restaurant Le Bistrot',
        amount: 42.50,
        date: new Date().toISOString().split('T')[0],
        category: 'Loisirs',
      },
    ];

    return mockReceipts[Math.floor(Math.random() * mockReceipts.length)];
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      setSelectedImage(imageData);
      setIsProcessing(true);
      setExtractedData(null);

      try {
        const { analyzeReceipt } = await import('../../../lib/receiptOcr');
        const res = await analyzeReceipt(imageData);
        if (res && res.best) {
          setExtractedData({ merchant: res.merchant || '', amount: res.best.value, date: res.date || new Date().toISOString().split('T')[0], category: res.candidates && res.candidates.length ? '' : '' });
        } else {
          setExtractedData({ merchant: res.merchant || '', amount: res.candidates && res.candidates.length ? res.candidates[0].value : 0, date: res.date || new Date().toISOString().split('T')[0], category: '' });
        }
      } catch (error) {
        console.error('Erreur lors du traitement:', error);
        alert('Erreur lors du traitement de l\'image');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleSubmit = async () => {
    if (!extractedData) return;
    setIsProcessing(true);

    try {
      // 1) get CSRF token
      const tokenRes = await fetch('/API/get_csrf_token.php', { credentials: 'include' });
      const tokenJson = await tokenRes.json();
      const csrf = tokenJson?.csrf_token;

      // 2) fetch categories to map category name -> id
      const catsRes = await fetch('/API/get_categories.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const catsJson = await catsRes.json();
      let catId = 0;
      if (catsJson && Array.isArray(catsJson.categories) && catsJson.categories.length > 0) {
        const found = catsJson.categories.find((c: any) => c.name === extractedData.category);
        catId = found ? Number(found.id_category) : Number(catsJson.categories[0].id_category);
      }

      // 3) build FormData and upload to wrapper endpoint
      const fd = new FormData();
      fd.append('Date', extractedData.date);
      fd.append('Type', type);
      fd.append('id_type', '0');
      fd.append('category_id', String(catId));
      fd.append('Montant', String(extractedData.amount));
      fd.append('currency', 'EUR');
      fd.append('Notes', description || 'Scanné depuis une facture');
      if (csrf) fd.append('csrf_token', csrf);

      if (selectedImage) {
        const blob = dataURLtoBlob(selectedImage);
        fd.append('invoice', blob, 'receipt.jpg');
      }

      const resp = await fetch('/API/add_transaction_with_invoice.php', {
        method: 'POST',
        credentials: 'include',
        body: fd
      });
      const result = await resp.json();
      if (!result || !result.success) {
        console.error('API error', result);
        alert('Erreur lors de l\'ajout de la transaction');
        return;
      }

      // Notify parent UI with transaction data (no server id mapping required here)
      onSubmit({
        date: extractedData.date,
        merchant: extractedData.merchant,
        amount: extractedData.amount,
        category: extractedData.category,
        type: type,
        description: description || 'Scanné depuis une facture',
        receiptImage: selectedImage || undefined,
      });

      // Reset
      setSelectedImage(null);
      setExtractedData(null);
      setDescription('');
    } catch (err) {
      console.error(err);
      alert('Erreur réseau lors de l\'envoi');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setSelectedImage(null);
    setExtractedData(null);
    setDescription('');
    setIsProcessing(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {!selectedImage ? (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-indigo-100 p-4 rounded-full">
                <ScanLine className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Scanner une facture
            </h2>
            <p className="text-gray-600 text-sm">
              Prenez une photo ou téléchargez une image pour extraire automatiquement les informations
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => cameraInputRef.current?.click()}
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
              onClick={() => fileInputRef.current?.click()}
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
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
            <p className="text-sm text-blue-800">
              <strong>💡 Astuce:</strong> Pour de meilleurs résultats, assurez-vous que la facture est bien éclairée et lisible.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Facture scannée
            </h3>
            <button
              onClick={handleCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50">
            <img
              src={selectedImage}
              alt="Facture scannée"
              className="w-full h-auto max-h-80 object-contain"
            />
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

          {extractedData && (
            <div className="space-y-6 mt-6">
              <div className="flex items-center gap-3 text-green-600 bg-green-50 border border-green-200 rounded-xl p-4">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Données extraites avec succès</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={extractedData.amount}
                      onChange={(e) =>
                        setExtractedData({
                          ...extractedData,
                          amount: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      fcfa
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de transaction
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'expense' | 'income')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="expense">Dépense</option>
                    <option value="income">Revenu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catégorie
                  </label>
                  <select
                    value={extractedData.category}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, category: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="Alimentation">Alimentation</option>
                    <option value="Transport">Transport</option>
                    <option value="Logement">Logement</option>
                    <option value="Loisirs">Loisirs</option>
                    <option value="Santé">Santé</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Salaire">Salaire</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commerçant
                    </label>
                    <input
                      type="text"
                      value={extractedData.merchant}
                      onChange={(e) =>
                        setExtractedData({ ...extractedData, merchant: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={extractedData.date}
                      onChange={(e) =>
                        setExtractedData({ ...extractedData, date: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note (optionnel)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ajouter une note..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
                >
                  Ajouter la transaction
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}