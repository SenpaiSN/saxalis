# 🚀 MIGRATION RENDER - DÉMARRAGE RAPIDE

📍 **Vous êtes ici:** `c:\MAMP\htdocs\SaXalis\`

---

## 👇 ÉTAPE 0: LIRE CELLE-CI (2 min)

✅ **Vous avez créé:**
- Compte Render
- Database PostgreSQL sur Render
- Récupéré les infos d'accès

✅ **Nous avons préparé:**
- Dockerfile (✓)
- Configs Nginx/PHP (✓)
- Documentation complète (✓)

---

## 🎯 NE FAIRE QUE 5 CHOSES:

### 1️⃣ OUVRIR VOS DOCS

| Document | Durée | Utilité |
|----------|-------|---------|
| 📄 **[MIGRATION_RAPIDE_COPIER_COLLER.md](MIGRATION_RAPIDE_COPIER_COLLER.md)** | **⏱️ 45 min** | **👉 FAITES CELLE-CI MAINTENANT** |
| ✅ [CHECKLIST_INTERACTIVE.md](CHECKLIST_INTERACTIVE.md) | 5 min | Lire EN MÊME TEMPS |
| 📊 [MIGRATION_RESUME_VISUAL.md](MIGRATION_RESUME_VISUAL.md) | 2 min | Vue générale |
| 🐛 [TROUBLESHOOTING_RENDER.md](TROUBLESHOOTING_RENDER.md) | 5 min | Si erreur 🚨 |
| 📚 [GUIDE_MIGRATION_ETAPE_PAR_ETAPE.md](GUIDE_MIGRATION_ETAPE_PAR_ETAPE.md) | 30 min | Approfondissement |

### 2️⃣ COPIER INFOS RENDER

```
Allez à: https://dashboard.render.com/databases
Cliquer: saxalis-db

Copier:
─────────────────────
Host:     [       ]
Port:     [       ]
User:     [       ]
Password: [       ]
─────────────────────
```

### 3️⃣ OUVRIR TERMINAL POWERSHELL

```powershell
cd C:\MAMP\htdocs\SaXalis
```

### 4️⃣ SUIVRE [MIGRATION_RAPIDE_COPIER_COLLER.md](MIGRATION_RAPIDE_COLLER.md)

15 étapes, copier-coller chaque commande.

### 5️⃣ TESTER

```
https://saxalis.render.com
```

---

## ⏱️ TEMPS TOTAL: 45-60 min

```
Étape 1-3: 15 min  (GitHub + DB Import)
Étape 4-5: 10 min  (Render Setup)
Étape 6-7: 10 min  (Deploy + attente)
Étape 8-9: 10 min  (Tests)
───────────────────────
Total:    45 min
```

+ 15-30 min si dépannage

---

## 🆘 SI ERREUR

👉 Aller à: [TROUBLESHOOTING_RENDER.md](TROUBLESHOOTING_RENDER.md)

Erreurs couantes:
- 502 → DB not connected
- 404 → Frontend not built
- CORS → allowed_origins manquante

---

## 📂 VOS FICHIERS

Tous les fichiers Docker/config **sont prêts**:

```
✅ Dockerfile      ← Prêt!
✅ nginx.conf      ← Prêt!
✅ php.ini         ← Prêt!
✅ entrypoint.sh   ← Prêt!
✅ render.yaml     ← Prêt!
✅ .dockerignore   ← Prêt!

⚠️ API/config.php  ← À adapter (instructions dans [MIGRATION_RAPIDE_COPIER_COLLER.md](MIGRATION_RAPIDE_COPIER_COLLER.md))
⚠️ .env.production ← À créer (instructions aussi dedans)
```

---

## 🎬 DÉMARRER MAINTENANT

1. Ouvrir: [MIGRATION_RAPIDE_COPIER_COLLER.md](MIGRATION_RAPIDE_COPIER_COLLER.md)
2. Ouvrir Terminal: PowerShell, folder: `C:\MAMP\htdocs\SaXalis`
3. Copier première commande
4. GO! 🚀

---

## ✨ APRÈS LA MIGRATION

- Site sera live: `https://saxalis.render.com`
- Mise à jour auto: `git push` = redeploy
- Logs: Render Dashboard → Logs tab
- Custom domain: Render Dashboard → Settings

---

**Plus de questions?** Lire: [00_ACCUEIL_MIGRATION.md](00_ACCUEIL_MIGRATION.md)

**Prêt? Go! 👉 [MIGRATION_RAPIDE_COPIER_COLLER.md](MIGRATION_RAPIDE_COPIER_COLLER.md)**
