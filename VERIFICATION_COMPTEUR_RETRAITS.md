# 📋 CHECKLIST DE VÉRIFICATION - Correction du compteur de retraits

## ✅ Modifications appliquées

### 1. API/get_objectifs_crees.php
- [x] Ligne 28-30: Filtre `AND Montant > 0` pour dépôts
- [x] Ligne 32-37: LEFT JOIN pour retraits avec `id_type = 3 AND Montant < 0`
- [x] Utilise `subcategory_id` pour le JOIN (pas `goal_id`)
- [x] Négation du SUM: `-SUM(Montant)` pour les retraits
- [x] `nb_versements` et `nb_retraits` dans SELECT

### 2. API/get_goals.php
- [x] Ligne 22: Subquery pour dépôts avec `Montant > 0`
- [x] Ligne 23: Subquery pour retraits avec `Montant < 0` et négation
- [x] Utilise `subcategory_id` (pas `goal_id`)
- [x] Commentaire mis à jour: "id_type=3 with negative montant"

### 3. API/transfer_goal.php
- [x] Ligne 61-64: Simplification du calcul de solde disponible
- [x] Utilise le SUM net de `id_type = 3`
- [x] Variable `$available` correctement définie
- [x] Commentaire mis à jour

### 4. API/add_goal_withdrawal.php
- [x] Déjà correct (vérifié préalablement)
- [x] Enregistre les retraits comme `id_type = 3 WITH Montant < 0`

---

## 🧪 Scénarios de test

### Scénario 1: Création d'objectif avec versements
```
1. Créer objectif "Vacances" cible 3000€
2. Faire versement de 500€
3. Faire versement de 800€

Vérification:
- GET /API/get_objectifs_crees.php
- Réponse doit contenir:
  {
    "nb_versements": 2,        // 2 transactions id_type=3 Montant>0
    "nb_retraits": 0,          // 0 transactions id_type=3 Montant<0
    "total_deposits": 1300,    // 500 + 800
    "total_withdrawn": 0,      // aucun retrait
    "total_collected": 1300    // 1300 - 0
  }
```

### Scénario 2: Ajout d'un retrait
```
4. Effectuer un retrait de 200€

Vérification immédiate après:
- POST /API/add_goal_withdrawal.php retourne success=true
- Nouvelle transaction créée avec:
  - id_type = 3
  - Montant = -200
  - subcategory_id = objectif.id_subcategory

Appel GET /API/get_objectifs_crees.php:
- Réponse doit contenir:
  {
    "nb_versements": 2,        // Inchangé
    "nb_retraits": 1,          // 1 transaction id_type=3 Montant<0 ✅
    "total_deposits": 1300,    // Inchangé
    "total_withdrawn": 200,    // -(-200) = 200
    "total_collected": 1100    // 1300 - 200
  }
```

### Scénario 3: Transfert entre objectifs
```
1. Créer objectif A avec 1000€
2. Créer objectif B avec 0€
3. Transférer 300€ de A vers B

Vérification:
- POST /API/transfer_goal.php calcule:
  - A.available = 1000 (SUM id_type=3 de sa subcategory) ✅
  - B reçoit 300€ (nouveau id_type=3 transaction)
  
- GET /API/get_objectifs_crees.php:
  - A: "nb_versements": 1, "total_collected": 700
  - B: "nb_versements": 1, "total_collected": 300
```

### Scénario 4: Impact sur solde total
```
1. Revenus du mois: 3000€
2. Dépenses du mois: 1500€
3. Versements objectifs: 500€ (id_type=3, Montant>0)
4. Retraits objectifs: 100€ (id_type=3, Montant<0)

Dashboard stats:
- Revenus: 3000€
- Dépenses: 1500€
- Épargne nette: 400€ (500-100)
- Solde = 3000 - 1500 - 400 = 1100€ ✅

Vérification importantes:
- Retraits ne sont PAS compté comme dépenses
- Épargne nette = versements + retraits (négatifs)
- Solde RÉDUIT par épargne nette, pas impacté par retraits seuls
```

---

## 🔍 Points de vérification SQL

### Query 1: Dépôts dans get_objectifs_crees.php
```sql
SELECT subcategory_id, id_utilisateur, 
       SUM(Montant) AS total_deposits, 
       COUNT(id_transaction) AS nb_deposits
FROM transactions
WHERE id_type = 3 AND Montant > 0    -- ✅ Filtre correct
GROUP BY subcategory_id, id_utilisateur
```

### Query 2: Retraits dans get_objectifs_crees.php
```sql
SELECT subcategory_id, id_utilisateur, 
       -SUM(Montant) AS total_withdrawn,  -- ✅ Négation correcte
       COUNT(id_transaction) AS nb_withdrawals
FROM transactions
WHERE id_type = 3 AND Montant < 0    -- ✅ Filtre sur montant négatif
GROUP BY subcategory_id, id_utilisateur
```

### Query 3: JOIN dans get_objectifs_crees.php
```sql
-- Dépôts
LEFT JOIN (...) d ON d.subcategory_id = o.id_subcategory 
                     AND d.id_utilisateur = o.user_id

-- Retraits (correction)
LEFT JOIN (...) w ON w.subcategory_id = o.id_subcategory  -- ✅ Pas goal_id!
                     AND w.id_utilisateur = o.user_id
```

### Query 4: Solde disponible dans transfer_goal.php
```sql
SELECT COALESCE(SUM(Montant), 0) 
FROM transactions 
WHERE subcategory_id = :subcat 
  AND id_type = 3                  -- ✅ Épargne seulement
  AND id_utilisateur = :uid
-- Montants positifs ET négatifs inclus → net automatique ✅
```

---

## 📊 Matrice de vérification par endpoint

| Endpoint | Modification | Vérification |
|----------|-------------|---|
| `get_objectifs_crees.php` | Ligne 28-37 | ✅ Compteurs corrects |
| `get_goals.php` | Ligne 22-24 | ✅ Cohérence retrocompat |
| `transfer_goal.php` | Ligne 61-64 | ✅ Solde disponible |
| `add_goal_withdrawal.php` | Inchangé | ✅ OK (correctif antérieur) |

---

## 🚀 Déploiement

### Avant le déploiement
- [x] Tester localement avec les 4 scénarios
- [x] Vérifier les requêtes SQL
- [x] Vérifier la cohérence entre endpoints

### Pendant le déploiement
1. [ ] Mettre en place les 3 fichiers modifiés
2. [ ] Vérifier les logs PHP pour erreurs
3. [ ] Faire un test d'objectif simple (versement + retrait)
4. [ ] Vérifier le dashboard solde total

### Après le déploiement
- [ ] Vérifier qu'un nouvel objectif fonctionne
- [ ] Vérifier que les anciens objectifs s'affichent correct
- [ ] Tester le retrait → compteur s'incrémente
- [ ] Vérifier le solde total du dashboard
- [ ] Monitorer les logs pour anomalies

---

## 🔧 Rollback (si nécessaire)

Les fichiers modifiés:
1. `API/get_objectifs_crees.php` - Revert ligne 28-37
2. `API/get_goals.php` - Revert ligne 22-24
3. `API/transfer_goal.php` - Revert ligne 61-64

Aucune donnée ne sera impactée (modifications SELECT only)

---

## 📝 Notes importantes

1. **Pas de migration**: Les données sont déjà correctement enregistrées
2. **Aucun changement BD**: Seules les requêtes SELECT
3. **Pas d'impact frontend**: Le frontend utilise déjà les champs retournés
4. **Rétro-compatibilité**: Pas de changement dans les structures de réponse JSON

---

Generated: 2024-11-XX
Status: ✅ COMPLET
