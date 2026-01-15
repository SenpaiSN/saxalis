# Déploiement sur InfinityFree (guide rapide)

## 1) Générer le build (sur votre machine)
### Options (Windows)
- Option A (recommandée): Ouvrez **Invite de commandes (cmd.exe)** ou **Git Bash**, allez à la racine du projet et lancez :
  ```bash
  npm install
  npm run build
  ```
- Option B (PowerShell bloque les scripts) : ouvrez PowerShell en tant qu'administrateur et exécutez :
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  npm install
  npm run build
  ```
  (Après les commandes, vous pouvez remettre la politique d'exécution précédente si souhaité.)

Après `npm run build`, un dossier `dist/` sera créé contenant les fichiers statiques prêts à être déployés.

---

## 2) Préparer le dossier `dist/` avant upload
- Copiez le fichier `deploy/.htaccess` dans la racine du `dist/` (ou placez le contenu dans `dist/.htaccess`). Cela permet la redirection vers `index.html` pour une SPA.

---

## 3) Upload vers InfinityFree
- Dans le panneau InfinityFree, ouvrez le **File Manager** (ou utilisez un client FTP comme FileZilla) et uploadez le contenu du dossier `dist/` dans `htdocs/` (racine du site). Assurez-vous que `index.html` se trouve bien à la racine.
- Uploadez également le dossier `API/` dans `htdocs/API/` (vos endpoints PHP).

---

## 4) Configuration serveur (API)
- Créez `API/config.local.php` sur le serveur (copiez le contenu de `API/config.local.example.php` et remplissez vos identifiants). Ce fichier est ignoré par Git et restera privé.
- Testez la connexion DB depuis le serveur : `https://saxalis.free.nf/API/test_db.php` → vous devriez recevoir `{"success": true, "message": "Connexion à la base OK", ...}`.

---

## 5) Vérifications finales
- Visitez `https://saxalis.free.nf/` et naviguez dans l'app (si vous utilisez la navigation par URL, le `.htaccess` gère le fallback vers `index.html`).
- Vérifiez les appels API depuis le frontend vers `https://saxalis.free.nf/API/...` et corrigez les éventuels problèmes CORS (le domaine est autorisé dans `API/config.php`).

---

## Migration: suppression du modèle legacy `coffre_projets`/`coffre_depots` (2026-01-04)

## Notes de déploiement : fuseaux horaires & exports OCR
- Les endpoints transactionnels normalisent maintenant les dates clients en **Europe/Paris** puis les convertissent en **UTC** avant insertion. Assurez-vous que les imports/exports de données envoient ou acceptent des dates au format ISO UTC (`YYYY-MM-DD HH:MM:SS` en UTC) ou incluent explicitement le fuseau (`+01:00`/`+02:00`).
- Pour les exports anonymisés d'OCR, l'export CLI `scripts/export_ocr_feedback.php` accepte un paramètre `--since` au format `YYYY-MM-DD` ou `YYYY-MM-DD HH:MM:SS` (interpreted as Europe/Paris if naive). Notez que le script applique des règles de redaction et sort du JSONL gzippé.

Si vos scripts d'importation / ETL fonctionnaient sur des dates locales, veuillez vérifier la conversion avant déploiement.


Si vous avez décidé de migrer vers le modèle `objectif_crees` + `transactions` (recommandé), procédez ainsi :

1) Prenez une sauvegarde complète de la base :
   - `mysqldump -u user -p database_name > backup_before_remove_coffre.sql`
2) Exécutez le script de migration fourni dans `deploy/migrations/2026-01-04_migrate_remove_coffre.sql` (ou appliquez les commandes SQL listées) :
   - Il enlève la contrainte FK qui pointait `transactions.goal_id` vers `coffre_projets`, puis la rattache à `objectif_crees.id_objectif`.
   - Il supprime les tables `coffre_depot_files`, `coffre_depots`, `coffre_projets`, `type_projet`.
3) Vérifiez l'intégrité :
   - `SELECT COUNT(*) FROM objectif_crees;`
   - `SELECT COUNT(*) FROM transactions WHERE goal_id IS NOT NULL;`
4) Testez manuellement les flux : création, versement (id_type=3), retrait (id_type=1 goal_id set), transfert entre objectifs.

Note: une fois la migration effectuée, certains endpoints legacy renverront 410 (Gone). Mettez à jour toute intégration externe pour utiliser `get_objectifs_crees.php`, `add_goal_transaction.php` (deposit), `add_goal_withdrawal.php` (withdraw), and `transfer_goal.php` (transfer).

Migration de devise (XOF canonique)
- Si vous souhaitez normaliser la base en XOF, exécutez le script CLI fourni :
  `php API/migrations/migrate_to_xof.php --confirm`
- Le script effectue des backups par utilisateur (`objectif_crees_backup_*`, `objectif_atteints_backup_*`, `transactions_backup_*`) et convertit `transactions`, `objectif_crees.montant`, et `objectif_atteints.(montant_objectif,total_collected)` en XOF.
- Testez d'abord sans `--confirm` (dry-run) et sauvegardez la base avant d'appliquer la migration.
Endpoints dépréciés (renvoient HTTP 410) :
- `get_coffre_projets.php`
- `get_coffre_depots.php`
- `add_depot_coffre.php`
- `add_projet_coffre.php`
- `update_projet_coffre.php`
- `update_depot_coffre.php`
- `delete_coffre_projet.php`
- `delete_coffre_depot.php`
- `upload_depot_invoice.php`
- `coffre_fort_type_recup.php`

Assurez-vous de mettre à jour toute intégration externe avant d'appliquer la migration.---

## Sécurité & recommandations
- Ne commitez jamais `API/config.local.php` contenant vos mots de passe.
- Après validation, pensez à supprimer ou restreindre l'accès à `API/test_db.php` si vous ne voulez pas l'exposer.

Si vous voulez, je peux :
- vous fournir le contenu prêt à copier pour `API/config.local.php`,
- créer automatiquement `dist/.htaccess` après le build (si vous préférez que je le fasse localement ici — il faut que `npm run build` réussisse sur votre machine ou que je puisse exécuter npm ici).

Dites-moi comment vous voulez procéder.