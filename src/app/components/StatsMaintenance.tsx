import React from 'react';

export default function StatsMaintenance() {
  return (
    <div className="p-6 lg:p-8">
      <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Statistiques — En maintenance</h2>
        <p className="mt-2 text-sm text-gray-600">Nous travaillons actuellement sur l'onglet Statistiques pour améliorer la stabilité et les performances. Revenez bientôt — merci de votre patience.</p>

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm"
          >
            Réessayer
          </button>
          <a href="mailto:support@example.com" className="px-4 py-2 rounded-md border border-gray-200 text-sm text-gray-700">Contacter le support</a>
        </div>

        <div className="mt-4 text-xs text-gray-500">Si vous avez des données ou captures d'écran utiles, merci de nous les envoyer — cela accélérera la correction.</div>
      </div>
    </div>
  );
}
