# 🚀 MIGRATION RENDER - RESUME VISUAL

```
┌─────────────────────────────────────────┐
│ ETAPE 1: CODE → GITHUB                  │
├─────────────────────────────────────────┤
│ Terminal PowerShell:                    │
│                                         │
│ cd C:\MAMP\htdocs\SaXalis              │
│ git add .                               │
│ git commit -m "Render migration"        │
│ git branch -M main                      │
│ git remote add origin https://...       │
│ git push -u origin main                 │
│                                         │
│ ⏱️ 5 min                                 │
│ ✅ Code sur GitHub PUBLIC               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ETAPE 2: DATABASE MySQL → PostgreSQL    │
├─────────────────────────────────────────┤
│                                         │
│ 💾 Exporter MySQL:                      │
│    mysqldump -u root suivi_depenses \  │
│      --no-data > schema.sql             │
│    mysqldump -u root suivi_depenses \  │
│      --no-create-info > data.sql        │
│                                         │
│ 📥 Importer dans PostgreSQL Render:    │
│    (Via PgAdmin Query Tool)             │
│    - Coller schema.sql (adapted)        │
│    - Coller data.sql                    │
│                                         │
│ ⏱️ 15 min                                │
│ ✅ Données sur PostgreSQL               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ETAPE 3: ADAPTER API/config.php        │
├─────────────────────────────────────────┤
│                                         │
│ Remplacer section "Database connection"│
│ pour support PostgreSQL                 │
│                                         │
│ git add API/config.php                  │
│ git commit -m "PostgreSQL support"      │
│ git push                                │
│                                         │
│ ⏱️ 5 min                                 │
│ ✅ API ready for Render                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ETAPE 4: CREER WEB SERVICE RENDER       │
├─────────────────────────────────────────┤
│                                         │
│ Render.com → "+ New" → "Web Service"   │
│ ├─ Connect GitHub repo                  │
│ ├─ Name: saxalis                        │
│ ├─ Branch: main                         │
│ ├─ Runtime: Docker                      │
│ ├─ Plan: Starter ($7/mois)              │
│ └─ Region: Frankfurt                    │
│                                         │
│ ⏱️ 3 min                                 │
│ ✅ Service créé: https://saxalis...    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ETAPE 5: ENV VARS & DATABASE           │
├─────────────────────────────────────────┤
│                                         │
│ Web Service → Environment:               │
│ ┌─────────────────────────────────────┐ │
│ │ DB_DRIVER    → pgsql                │ │
│ │ DB_HOST      → [votre host]         │ │
│ │ DB_PORT      → 5432                 │ │
│ │ DB_NAME      → saxalis              │ │
│ │ DB_USER      → [votre user]         │ │
│ │ DB_PASSWORD  → [votre password]     │ │
│ │ ENVIRONMENT  → production           │ │
│ │ FRONTEND_URL → https://saxalis...   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ + Add Database → saxalis-db             │
│                                         │
│ ⏱️ 5 min                                 │
│ ✅ Env vars + DB liées                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ETAPE 6: DEPLOY 🚀                      │
├─────────────────────────────────────────┤
│                                         │
│ Option A: Via Dashboard                │
│ → Tab "Deploys" → "Manual Deploy"      │
│                                         │
│ Option B: Via Terminal                 │
│ git push                                │
│ (Render auto-redeploy)                  │
│                                         │
│ Logs: Tab "Events" / "Logs"             │
│ ✅ "Service live on https://saxalis"   │
│                                         │
│ ⏱️ 5 min (attente)                       │
│ ✅ APP EN LIGNE!                        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ETAPE 7: TEST ✔️                        │
├─────────────────────────────────────────┤
│                                         │
│ ✓ Frontend: https://saxalis.render.com │
│ ✓ API: https://saxalis.render.com/API/ │
│ ✓ Logs: Render Dashboard → Logs tab     │
│ ✓ Data: pgAdmin check                   │
│                                         │
│ ⏱️ 2 min                                 │
│ ✅ DONE!                                 │
└─────────────────────────────────────────┘
```

---

## 📋 TEMPS TOTAL

```
Étape 1 (GitHub):        5 min
Étape 2 (DB Import):    15 min
Étape 3 (API Config):    5 min
Étape 4 (Render Setup):  3 min
Étape 5 (Env + DB):      5 min
Étape 6 (Deploy):        5 min (attente)
Étape 7 (Test):          2 min
─────────────────────────────
TOTAL:                  40 min
```

---

## 🎯 PROBLEME? TROUBLESHOOTING RAPIDE

```
502 Bad Gateway
→ Render Logs → chercher ERROR rouge
→ Vérifier env vars

Cannot connect DB
→ Copier EXACTEMENT les valeurs Render
→ Pas de typo!

CORS error
→ Ajouter https://saxalis.render.com
  à allowed_origins dans API/config.php
→ Git push

API 404
→ Vérifier fichiers API/ existent
→ Vérifier routing nginx.conf

PostgreSQL schema import échoue
→ Utiliser converter en ligne:
  https://www.beerus.dev/mysql2pgsql/

Frontend white screen
→ F12 DevTools → Console tab
→ Vérifier erreurs JavaScript
```

---

## 📞 DOCUMENTS CLES

| Document | Usage |
|----------|-------|
| [MIGRATION_RAPIDE_COPIER_COLLER.md](MIGRATION_RAPIDE_COPIER_COLLER.md) | **Démarrer ici** - Copier/coller commands |
| [CHECKLIST_INTERACTIVE.md](CHECKLIST_INTERACTIVE.md) | Cocher au fur et à mesure |
| [TROUBLESHOOTING_RENDER.md](TROUBLESHOOTING_RENDER.md) | Si problèmes |
| [GUIDE_MIGRATION_ETAPE_PAR_ETAPE.md](GUIDE_MIGRATION_ETAPE_PAR_ETAPE.md) | Documentation complète |

---

## ✨ APRÈS LA MIGRATION

```
[ ] Tester toutes les features
    - Login
    - Create dataset
    - Export/Import
    - Dashboard
    
[ ] Setup backups (Render Dashboard)

[ ] Supprimer ancienne version (InfinityFree)
    - Ou garder comme failover temporaire
    
[ ] Monitor logs pour prima giorni
    - Render Dashboard → Logs
    
[ ] Upgrade vers Standard plan si nécessaire
    (Si plus de resources)
```

---

**Prêt? Commencer par:** 
[MIGRATION_RAPIDE_COPIER_COLLER.md](MIGRATION_RAPIDE_COPIER_COLLER.md)

Bonne chance! 🚀🎉
