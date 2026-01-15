# Scanneur de factures (OCR)

## Vue d'ensemble
Le scanneur de factures permet à l'utilisateur de prendre en photo ou d'uploader une image/PDF de facture afin d'extraire automatiquement des champs clés : montant, date/heure, catégorie et note. L'UI propose des **candidates** (résultats OCR triés par score) que l'utilisateur peut accepter, modifier ou ignorer.

## Architecture
- Frontend : `src/app/components/ReceiptScannerModal.tsx` et hooks associés
- OCR : `tesseract.js` (worker singleton, two-pass approach — TSV pass puis high-res crop)
- Backend feedback ingestion : `API/ocr_feedback.php`
- Anonymized export : `scripts/export_ocr_feedback.php` (CLI) et `API/export_ocr_feedback.php` (admin endpoint)

## Flux utilisateur
1. L'utilisateur ouvre le modal "Ajouter" puis lance le scan.
2. L'OCR propose des valeurs candidates pour `montant`, `date`, `catégorie`, `notes`.
3. L'utilisateur :
   - Accepte un candidate -> valeur appliquée et feedback envoyé en arrière-plan (action: `accept`).
   - Modifie puis enregistre -> feedback envoyé (action: `override`).
   - Ignore/ferme -> aucun feedback envoyé.
4. Les feedbacks aident à construire le dataset d'apprentissage anonymisé.

## Endpoint de feedback
- `POST API/ocr_feedback.php`
  - Corps attendu (JSON) :
    - `text` (string) : texte OCR initial haché/limité
    - `redacted_text` (string) : version redacted (max 500 chars)
    - `candidates` (JSON) : liste des candidates (montant, date, catégorie, score)
    - `action` (string enum) : `accept` | `override` | `ignore`
    - `user_id` (optionnel serveur)
  - Retour : `{ success: true }`

## Export anonymisé
- CLI : `php scripts/export_ocr_feedback.php --since "YYYY-MM-DD" | gzip > export.gz`
- Admin HTTP : `GET API/export_ocr_feedback.php?since=YYYY-MM-DD` (auth admin)
- Redaction : emails -> `[EMAIL]`, sequences numériques trop longues -> `X` ou équivalent, `redacted_text` stocké pour chaque feedback.

## Respect de la vie privée
- Les textes originaux ne sont **pas** exportés en clair.
- Les champs sensibles sont redacted au moment de l'export.
- La table `ocr_feedback` garde un hachage permettant d'identifier des doublons sans révéler le texte clair.

## Développeur : tests & débogage
- Frontend : ouvrez le modal et testez avec plusieurs images. Utilisez les devtools et fortify le worker Tesseract si besoin.
- Backend : injectez des lignes tests via `scripts/insert_test_ocr_feedback.php` et vérifiez `scripts/export_ocr_feedback.php`.

---

Si vous souhaitez, je peux ajouter une page d'administration simple qui déclenche les exports et montre des statistiques sur les actions `accept`/`override`.