import React, { useState } from 'react';
import TransactionModal from './TransactionModal';
import * as api from '../../services/api';

export type TransactionType = 'dépense' | 'revenu' | 'epargne';

interface TransactionModalContainerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialValues?: any;
}

export default function TransactionModalContainer({ open, onClose, onSuccess, initialValues }: TransactionModalContainerProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    let type: TransactionType = 'revenu';
    if (data.type === 'dépense' || data.type === 'depense' || data.type === 'expense') type = 'dépense';
    else if (data.type === 'revenu' || data.type === 'income') type = 'revenu';
    else if (data.type === 'epargne' || data.type === 'saving' || data.type === 'savings') type = 'epargne';

    // Construction du payload pour l'API
    const payload: any = {
      type,
      date: data.date,
      montant: data.montant,
      categorie: data.categorie,
      note: data.note,
      recurrence: data.recurrence,
    };
    // Gestion de la pièce jointe (file)
    if (data.file) {
      // Si l'API attend un upload séparé, il faut adapter ici
      // Pour l'exemple, on encode le nom du fichier
      payload.fileName = data.file.name;
      // Pour un vrai upload, il faudrait utiliser FormData et un endpoint dédié
    }
    const res = await api.addTransaction(payload);
    setLoading(false);
    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      throw new Error(res.error || 'Erreur API');
    }
  };

  return (
    <TransactionModal
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      initialValues={initialValues}
    />
  );
}
