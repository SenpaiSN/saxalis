# 📚 Index - Documentation SaXalis

**Créé:** 26 janvier 2026  
**Version:** 1.0  
**Projet:** SaXalis - Gestion financière personnelle

---

## 🎯 Commencer ici

Vous venez de lancer l'analyse? Commencez par:

1. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** ⭐ (5 min)
   - Infos essentielles, stack résumé, endpoints clés
   - **Meilleur point de départ pour vue d'ensemble rapide**

2. **[ANALYSE_GLOBALE.md](ANALYSE_GLOBALE.md)** (20 min)
   - Vue d'ensemble complète, architecture détaillée
   - Toutes les fonctionnalités expliquées

3. **[GUIDE_PRATIQUE.md](GUIDE_PRATIQUE.md)** (15 min)
   - Démarrage du développement
   - Commandes courantes et dépannage

---

## 📖 Documentation organisée par sujet

### 🏗️ Architecture
- **Fichier:** [ANALYSE_GLOBALE.md](ANALYSE_GLOBALE.md#-architecture-technique)
- **Contient:**
  - Stack frontend (React, Vite, TailwindCSS, Radix UI)
  - Stack backend (PHP, MySQL, REST API)
  - Modèle de données (tables, relations)
  - Components React (liste complète)

### 🔌 API
- **Fichier:** [API_REFERENCE.md](API_REFERENCE.md) ⭐ **Complète**
- **Alternatives:**
  - [ANALYSE_GLOBALE.md#-api-rest-backend-php](ANALYSE_GLOBALE.md#-api-rest-backend-php) - Liste endpoints par catégorie
  - [QUICK_REFERENCE.md#-endpoints-api-par-type](QUICK_REFERENCE.md#-endpoints-api-par-type) - Vue rapide
- **Contient:**
  - Tous les ~80 endpoints
  - Requêtes/réponses JSON
  - Exemples curl

### 🎨 Flux de données
- **Fichier:** [ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md)
- **Contient:**
  - Flux global (utilisateur → React → PHP → MySQL)
  - Flux authentification
  - Flux OCR
  - Flux objectifs
  - Flux filtres
  - Components tree
  - Diagrammes SQL relations

### 🚀 Développement pratique
- **Fichier:** [GUIDE_PRATIQUE.md](GUIDE_PRATIQUE.md)
- **Contient:**
  - Installation/démarrage
  - Commandes npm
  - Comment ajouter features (devise, catégorie, page)
  - Debugging checklist
  - Déploiement
  - Code examples

### 💼 Cas d'usage
- **Fichier:** [QUICK_REFERENCE.md#-flux-dutilisateur-principal](QUICK_REFERENCE.md#-flux-dutilisateur-principal)
- **Contient:**
  - Ajouter transaction (manuel + OCR)
  - Analyser dépenses
  - Créer objectif épargne

---

## 🔍 Besoin de retrouver quelque chose?

| Vous cherchez... | Fichier | Section |
|---|---|---|
| **Vue d'ensemble du projet** | QUICK_REFERENCE.md | [Infos essentielles](QUICK_REFERENCE.md#informations-essentielles) |
| **Stack technique** | ANALYSIS_GLOBALE.md | [Architecture technique](ANALYSE_GLOBALE.md#-architecture-technique) |
| **Endpoints API** | API_REFERENCE.md | [Tous les endpoints](API_REFERENCE.md) |
| **Liste rapide endpoints** | QUICK_REFERENCE.md | [Endpoints par type](QUICK_REFERENCE.md#-endpoints-api-par-type) |
| **Démarrer développement** | GUIDE_PRATIQUE.md | [Installation](GUIDE_PRATIQUE.md#démarrage-du-développement) |
| **Commandes npm/php** | GUIDE_PRATIQUE.md | [Commandes courantes](GUIDE_PRATIQUE.md#commandes-courantes) |
| **Structure des fichiers** | ANALYSE_GLOBALE.md | [Structure des fichiers](ANALYSE_GLOBALE.md#-structure-des-fichiers) |
| **Fluxe OCR** | ARCHITECTURE_DIAGRAMS.md | [Flux OCR](ARCHITECTURE_DIAGRAMS.md#flux-dajout-de-transaction-cas-ocr) |
| **Flux authentification** | ARCHITECTURE_DIAGRAMS.md | [Flux auth](ARCHITECTURE_DIAGRAMS.md#flux-dauthentification) |
| **Sécurité** | ANALYSE_GLOBALE.md | [Sécurité](ANALYSE_GLOBALE.md#-sécurité) |
| **Multi-devise** | ANALYSE_GLOBALE.md | [Multi-devise](ANALYSE_GLOBALE.md#-multi-devises) |
| **Déboguer CORS** | GUIDE_PRATIQUE.md | [Déboguer API](GUIDE_PRATIQUE.md#déboguer-connexion-api) |
| **Ajouter nouvelle devise** | GUIDE_PRATIQUE.md | [Nouvelle devise](GUIDE_PRATIQUE.md#supporter-une-nouvelle-devise) |
| **Ajouter nouvelle page** | GUIDE_PRATIQUE.md | [Nouvelle page](GUIDE_PRATIQUE.md#ajouter-nouvelle-pageonglet) |
| **Components React** | ANALYSE_GLOBALE.md | [Components clés](ANALYSE_GLOBALE.md#composants-clés) |
| **Base de données** | ANALYSE_GLOBALE.md | [Modèle de données](ANALYSE_GLOBALE.md#-modèle-de-données-mysql) |
| **SQL relations** | ARCHITECTURE_DIAGRAMS.md | [Relations DB](ARCHITECTURE_DIAGRAMS.md#database-relations-diagram) |
| **Checklist déploiement** | GUIDE_PRATIQUE.md | [Déploiement](GUIDE_PRATIQUE.md#checklist-déploiement-production) |
| **Résumé rapide** | QUICK_REFERENCE.md | Tout le fichier ⭐ |

---

## 📋 Liste des documents

### 1. **QUICK_REFERENCE.md** (2-3 pages)
- **Durée lecture:** 5 minutes
- **Idéal pour:** Vue rapide, retrouver infos clés
- **Contient:**
  - Infos essentielles (domaine, stack, ports)
  - Dossiers importants
  - Endpoints par type (résumé)
  - Pages principales (onglets)
  - Flux OCR simplifié
  - Commandes démarrage rapide
  - **Checklist dev rapide**

### 2. **ANALYSE_GLOBALE.md** (10-15 pages)
- **Durée lecture:** 20 minutes
- **Idéal pour:** Comprendre complètement le projet
- **Contient:**
  - Vue d'ensemble (domaine, objectif)
  - Architecture complète (frontend + backend)
  - Stack technologique détaillé
  - Modèle de données (toutes tables)
  - Architecture frontend (components)
  - API REST (~80 endpoints par catégorie)
  - Sécurité (CSRF, auth, validation)
  - Multi-devise (EUR/XOF)
  - Flux utilisateur complet
  - Filtres et recherche
  - Thème light/dark
  - Fonctionnalités avancées (transactions récurrentes, budgets, OCR, etc.)
  - Outils de développement
  - Structure des fichiers
  - Points clés pour extensions futures
  - Ressources & apprentissages

### 3. **ARCHITECTURE_DIAGRAMS.md** (8-10 pages)
- **Durée lecture:** 15 minutes
- **Idéal pour:** Comprendre le flux de données visuellement
- **Contient:**
  - Diagramme flux global (ASCII art)
  - Flux d'authentification
  - Flux d'ajout transaction + OCR
  - Flux d'analyse financière
  - Flux de gestion d'objectifs
  - Arborescence des filtres
  - Components tree React
  - CSRF security flow
  - Multi-devise conversion
  - Database relations (ER-like)

### 4. **GUIDE_PRATIQUE.md** (8-10 pages)
- **Durée lecture:** 20 minutes
- **Idéal pour:** Développer et déboguer
- **Contient:**
  - Prérequis & installation
  - Commandes courantes (npm, php, mysql)
  - Points clés de développement
  - Comment ajouter: nouvelle devise, catégorie, page, OCR
  - Structure réponse API standard
  - Optimisations frontend (lazy load, memoize, batching)
  - Testing (Vitest)
  - Dépannage courant (avec solutions)
  - Checklist déploiement
  - Commandes supplémentaires
  - Ressources & doc

### 5. **API_REFERENCE.md** (15-20 pages)
- **Durée lecture:** 30-60 minutes (selon profondeur)
- **Idéal pour:** Référence complète API
- **Contient:**
  - Tous les ~80 endpoints détaillés
  - Pour chaque endpoint:
    - Description
    - Requête JSON (format)
    - Réponse JSON (succès + erreur)
    - HTTP status codes
  - Catégories: Auth, CSRF, Transactions, Types, Catégories, Budgets, Objectifs, Récurrences, Coffres, Analyse, Profil, OCR, Utilitaires
  - Exemples curl complets
  - Codes erreur HTTP standard

### 6. **INDEX.md** (ce fichier)
- **Durée lecture:** 5 minutes
- **Rôle:** Navigation et orientation

---

## 🎓 Chemins de lecture suggérés

### 👤 Je suis nouveau sur le projet
1. **QUICK_REFERENCE.md** (infos clés)
2. **ANALYSE_GLOBALE.md** (vue complète)
3. **ARCHITECTURE_DIAGRAMS.md** (flux visuels)

### 👨‍💻 Je dois développer une feature
1. **GUIDE_PRATIQUE.md** (setup + commandes)
2. **API_REFERENCE.md** (endpoints pertinents)
3. **ARCHITECTURE_DIAGRAMS.md** (flux de la feature)

### 🐛 Je dois déboguer
1. **GUIDE_PRATIQUE.md** → section "Dépannage courant"
2. **ARCHITECTURE_DIAGRAMS.md** → flux spécifique
3. **API_REFERENCE.md** → endpoint pertinent

### 📡 Je dois intégrer une API externe
1. **API_REFERENCE.md** → structure requête/réponse
2. **GUIDE_PRATIQUE.md** → point "Implémenter OCR personnalisé"
3. **ANALYSE_GLOBALE.md** → sécurité (CSRF, validation)

### 🚀 Je dois déployer en production
1. **GUIDE_PRATIQUE.md** → section "Déploiement production"
2. **ANALYSE_GLOBALE.md** → section "Multi-devises & Migration"
3. **API_REFERENCE.md** → vérifier endpoints stabilité

---

## 🔗 Points d'entrée rapides

**Besoin de faire X?** Cliquez directement:

- **[Ajouter une page/onglet](GUIDE_PRATIQUE.md#ajouter-nouvelle-pageonglet)**
- **[Ajouter une devise](GUIDE_PRATIQUE.md#supporter-une-nouvelle-devise)**
- **[Ajouter une catégorie](GUIDE_PRATIQUE.md#ajouter-une-nouvelle-catégorie)**
- **[Implémenter OCR custom](GUIDE_PRATIQUE.md#implémenter-ocr-personnalisé)**
- **[Déboguer API](GUIDE_PRATIQUE.md#déboguer-connexion-api)**
- **[Appels API spécifiques](API_REFERENCE.md)**
- **[Flux d'un processus](ARCHITECTURE_DIAGRAMS.md)**
- **[Démarrer développement](GUIDE_PRATIQUE.md#démarrage-du-développement)**

---

## 📊 Statistiques du projet

| Aspect | Chiffre |
|--------|---------|
| **Fichiers frontend** | React components: ~30+ |
| **Fichiers backend** | API endpoints: ~80 |
| **Tables DB** | types, categories, subcategories, transactions, users, budgets, goals, recurring, safes, etc. |
| **Onglets UI** | 6 (dashboard, ajouter, transactions, stats, objectifs, profil) |
| **Devises** | 2 (EUR, XOF) |
| **Types transaction** | 3 (expense, income, savings) |
| **Lignes de code** | ~3000 (frontend) + ~2000 (backend) |
| **Documentation** | 6 fichiers markdown, ~200 pages |

---

## ✅ Vérification checklist

Maintenant que vous avez l'analyse, vous pouvez:

- [ ] Comprendre l'architecture générale
- [ ] Identifier les composants clés
- [ ] Localiser les endpoints API pertinents
- [ ] Déboguer les erreurs courantes
- [ ] Déployer en production
- [ ] Ajouter de nouvelles features
- [ ] Contribuer au projet

---

## 📞 Questions rapides

**Q: Par où commencer?**  
A: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

**Q: Comment fonctionne l'API?**  
A: [API_REFERENCE.md](API_REFERENCE.md)

**Q: Comment développer?**  
A: [GUIDE_PRATIQUE.md](GUIDE_PRATIQUE.md)

**Q: Comment voyager les flux?**  
A: [ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md)

**Q: Vue d'ensemble complète?**  
A: [ANALYSE_GLOBALE.md](ANALYSE_GLOBALE.md)

---

## 🎯 Objectif atteint ✅

Vous avez maintenant une documentation complète et structurée de votre projet **SaXalis**. Les 6 fichiers markdown couvrent:

- ✅ Vue d'ensemble et architecture
- ✅ Tous les endpoints API avec exemples
- ✅ Diagrammes visuels des flux
- ✅ Guide pratique de développement
- ✅ Quick reference pour retrouver rapidement
- ✅ Index de navigation (ce fichier)

**Bon développement! 🚀**

---

**Index créé:** 26 janvier 2026  
**Nombre de fichiers:** 6 markdown files  
**Pages totales:** ~50-60 pages  
**Temps de lecture complet:** ~2-3 heures  
**Temps de lecture rapide:** ~15 minutes
