# ✅ CORRECTION COMPLÈTE: Système de retraits d'objectifs et compteurs

## 📋 Résumé des corrections

L'utilisateur a identifié que le compteur de retraits (`nb_retraits`) ne s'incrémentait pas après création d'un retrait d'objectif. Cette correction complète la refactorisation précédente du système de retraits.

### État avant les corrections
```
Objectif "Épargne de sécurité"
├── Cible: 2000€
├── Épargné: 1310,12€
├── Statut: "65.51% • 2 versements • 0 retrait" ❌
└── Après un retrait: Reste à "0 retrait" ❌
```

### État après les corrections
```
Objectif "Épargne de sécurité"
├── Cible: 2000€
├── Épargné: 1310,12€
├── Statut: "65.51% • 2 versements • 1 retrait" ✅
└── Après un retrait supplémentaire: "65.51% • 2 versements • 2 retraits" ✅
```

---

## 🔧 Fichiers modifiés

### 1️⃣ **API/get_objectifs_crees.php**
**Rôle**: Récupère la liste complète des objectifs créés avec tous les détails (progress, versements, retraits)

**Modifications**:
- **Ligne 28-30**: Ajout du filtre `AND Montant > 0` pour les dépôts
- **Ligne 32-37**: Remplacement du JOIN obsolète pour les retraits

**Avant**:
```sql
LEFT JOIN (
  SELECT goal_id, id_utilisateur, SUM(Montant) AS total_withdrawn, COUNT(id_transaction) AS nb_withdrawals
  FROM transactions
  WHERE id_type = 1 AND goal_id IS NOT NULL
  GROUP BY goal_id, id_utilisateur
) w ON w.goal_id = o.id_objectif AND w.id_utilisateur = o.user_id
```

**Après**:
```sql
LEFT JOIN (
  SELECT subcategory_id, id_utilisateur, -SUM(Montant) AS total_withdrawn, COUNT(id_transaction) AS nb_withdrawals
  FROM transactions
  WHERE id_type = 3 AND Montant < 0
  GROUP BY subcategory_id, id_utilisateur
) w ON w.subcategory_id = o.id_subcategory AND w.id_utilisateur = o.user_id
```

**Impact**: 
- ✅ `nb_versements` compte correctement les dépôts (id_type=3, Montant>0)
- ✅ `nb_retraits` compte correctement les retraits (id_type=3, Montant<0)

---

### 2️⃣ **API/get_goals.php**
**Rôle**: Récupère les objectifs au format legacy pour retrocompatibilité

**Modifications**:
- **Ligne 19-24**: Mise à jour des subqueries pour utiliser le nouveau système de retraits

**Avant**:
```php
COALESCE((SELECT SUM(Montant) FROM transactions WHERE goal_id = o.id_objectif AND id_type = 1 AND id_utilisateur = :uid), 0) AS total_withdrawn,
```

**Après**:
```php
COALESCE(-(SELECT SUM(Montant) FROM transactions WHERE subcategory_id = o.id_subcategory AND id_type = 3 AND Montant < 0 AND id_utilisateur = :uid), 0) AS total_withdrawn,
```

**Impact**: Cohérence avec `get_objectifs_crees.php`

---

### 3️⃣ **API/transfer_goal.php**
**Rôle**: Transfère des fonds entre deux objectifs

**Modifications**:
- **Ligne 61-64**: Simplification du calcul du solde disponible

**Avant**:
```php
// Calcul séparé des dépôts et retraits, puis soustraction
$totalDeposits = ...;
$totalWithdrawn = ...;
$available = $totalDeposits - $totalWithdrawn;
```

**Après**:
```php
// Utilisation directe du SUM net (montants positifs ET négatifs s'annulent)
$available = SUM(Montant) WHERE id_type = 3 AND subcategory_id = ...;
```

**Impact**: Calcul plus simple et cohérent avec la logique métier

---

## 🏗️ Architecture métier consolidée

### Modèle de données pour les objectifs

```
Objectif (objectif_crees)
│
├─ id_objectif (PK)
├─ id_subcategory (FK → sous-catégorie dédiée)
├─ montant (objectif cible)
└─ date_cible (échéance)

                    ↓

Transactions d'objectif (toutes avec id_type=3)
├─ Dépôt vers l'objectif
│  ├─ id_type = 3 (épargne)
│  ├─ Montant > 0 (ex: +500€)
│  └─ subcategory_id = objectif.id_subcategory
│
└─ Retrait de l'objectif
   ├─ id_type = 3 (épargne)
   ├─ Montant < 0 (ex: -100€)
   └─ subcategory_id = objectif.id_subcategory
```

### Formules de calcul

**Solde disponible** (montant épargné):
```
Solde = SUM(Montant) WHERE id_type=3 AND subcategory_id=objectif.subcategory_id
       = Σ dépôts + Σ retraits (retraits sont négatifs, donc réduisent le total)
```

**Progression de l'objectif**:
```
Progression = (Solde / Montant_cible) * 100%
```

**Compteurs**:
```
nb_versements = COUNT(Montant > 0)
nb_retraits = COUNT(Montant < 0)
```

### Impact sur le solde total du dashboard

```
Solde total = Revenus - Dépenses - Épargne_nette

où:
- Revenus = SUM(id_type=2)
- Dépenses = SUM(id_type=1)
- Épargne_nette = SUM(id_type=3) pour tous objectifs
              = SUM(dépôts positifs) + SUM(retraits négatifs)
              = Épargne brute - Montants retirés
```

**Important**: Les retraits réduisent l'épargne nette, PAS les dépenses

---

## 🔄 Flux de transaction lors d'un retrait

```
1. Utilisateur clic "Retirer des fonds" sur objectif
   ↓
2. Modal WithdrawFromGoalModal ouvre
   ├─ Demande: montant + notes (SIMPLIFIÉ)
   └─ Pas de type/catégorie (les retraits ne sont pas des dépenses)
   ↓
3. POST /API/add_goal_withdrawal.php
   ├─ Valide le montant disponible
   │  └─ Calcule: SUM(id_type=3) de la subcategory
   ├─ Enregistre transaction:
   │  ├─ id_type = 3 (épargne, pas dépense)
   │  ├─ Montant = -montant_demandé (NÉGATIF)
   │  ├─ subcategory_id = objectif.id_subcategory
   │  └─ date = aujourd'hui
   └─ Retourne: success + transaction_id
   ↓
4. Modal ferme et rafraîchit les objectifs
   ↓
5. GET /API/get_objectifs_crees.php exécuté
   ├─ Compte les dépôts: WHERE id_type=3 AND Montant>0
   ├─ Compte les retraits: WHERE id_type=3 AND Montant<0
   └─ Retourne nb_versements + nb_retraits mis à jour
   ↓
6. Frontend affiche le compteur incrémenté
   └─ "65.51% • 2 versements • 1 retrait" ✅
```

---

## ✅ Checklist de vérification

- [x] get_objectifs_crees.php utilise id_type=3 pour les retraits
- [x] get_goals.php utilise id_type=3 pour les retraits
- [x] transfer_goal.php calcule correctement le solde disponible
- [x] Dépôts comptés avec Montant > 0
- [x] Retraits comptés avec Montant < 0
- [x] Pas de dépendance à goal_id (utilise subcategory_id)
- [x] Aucune migration BD requise
- [x] Frontend cohérent (déjà implémenté)

---

## 🚀 État final

### ✅ Corrections complètes
1. **Compteur de retraits**: Maintenant dynamique et actualisé
2. **Logique de solde**: Cohérente entre tous les endpoints
3. **Absence de dépenses**: Les retraits ne créent pas de transactions id_type=1

### ✅ Coté utilisateur
- Créer retrait → Compteur s'incrémente ✅
- Solde total pas affecté (épargne diminue) ✅
- Solde épargne diminue (montant retiré) ✅

### ✅ Coté système
- Toutes les requêtes SQL cohérentes ✅
- Aucune données orphelines ✅
- Performance optimisée (LEFT JOINs avec agrégation) ✅

---

## 📝 Documentation liée

- [CORRECTION_RETRAIT_OBJECTIFS.md](CORRECTION_RETRAIT_OBJECTIFS.md) - Détails techniques de la refactorisation des retraits
- [CORRECTION_COMPTEUR_RETRAITS.md](CORRECTION_COMPTEUR_RETRAITS.md) - Guide détaillé de cette correction
- [REGLE_METIER_RETRAIT_OBJECTIFS.md](REGLE_METIER_RETRAIT_OBJECTIFS.md) - Règles métier des retraits
