# Correction du Calcul du Solde Total

## 🐛 Problème identifié

Les transactions d'épargne (id_type=3, id_categorie=13) n'étaient **pas déduites** du solde total.

**Ancienne formule :**
$$\text{Solde} = \text{Revenus} - \text{Dépenses}$$

**Nouvelle formule correcte :**
$$\text{Solde} = \text{Revenus} - \text{Dépenses} - \text{Épargne}$$

---

## ✅ Fichiers modifiés

### 1. **src/app/components/statsUtils.ts**
- Clarification du commentaire pour indiquer que les épargnes sont gérées **séparément** et déduites du solde
- Les dépenses ne incluent que `type='dépense'` (excluent les épargnes)

**Avant :**
```typescript
// Inclure toutes les transactions d'épargne (y compris Objectif) dans les dépenses pour impacter le solde
const depensesAll = transactions.filter(t => (t.type === 'dépense') && !isTotalGeneralCategory(t.categorie));
```

**Après :**
```typescript
// N'inclure QUE les vraies dépenses (type='dépense'). Les épargnes sont gérées séparément et déduites du solde.
const depensesAll = transactions.filter(t => (t.type === 'dépense') && !isTotalGeneralCategory(t.categorie));
```

---

### 2. **src/app/components/Dashboard.tsx** et **Rubbish/2026-01-29/Dashboard.tsx**

#### Correction 1 : Calcul du solde réel global
```typescript
// AVANT
const soldeRealGlobal = totalsGlobal.revenus.real - totalsGlobal.depenses.real;
const soldeReal = totalsGlobal.revenus.real - totalsGlobal.depenses.real;
const soldeAll = totalsGlobal.revenus.total - totalsGlobal.depenses.total;

// APRÈS
const soldeRealGlobal = totalsGlobal.revenus.real - totalsGlobal.depenses.real - totalsGlobal.epargne.real;
const soldeReal = totalsGlobal.revenus.real - totalsGlobal.depenses.real - totalsGlobal.epargne.real;
const soldeAll = totalsGlobal.revenus.total - totalsGlobal.depenses.total - totalsGlobal.epargne.total;
```

#### Correction 2 : Comparaison avec le mois précédent
```typescript
// AVANT
const prevSolde = prevRevenus - prevDepenses;

// APRÈS
const prevSolde = prevRevenus - prevDepenses - prevEpargne;
```

#### Correction 3 : Prévision fin de mois
```typescript
// AVANT
const upcomingExpensesTotal = upcomingTransactions.filter(t => t.type === 'dépense').reduce((s, t) => s + Math.abs(t.montant ?? 0), 0);
const previsionFinDeMois = soldeReal - upcomingExpensesTotal;

// APRÈS
const upcomingExpensesTotal = upcomingTransactions.filter(t => t.type === 'dépense').reduce((s, t) => s + Math.abs(t.montant ?? 0), 0);
const upcomingSavingsTotal = upcomingTransactions.filter(t => isSavingsTx(t, types)).reduce((s, t) => s + (t.montant ?? 0), 0);
const previsionFinDeMois = soldeReal - upcomingExpensesTotal - upcomingSavingsTotal;
```

---

## 📊 Impact sur les indicateurs

### Exemple avec vos données
Avant correction :
- **Revenus janvier** : 2 400€
- **Dépenses janvier** : 2 169,50€
- **Épargne janvier** : 200€
- **Ancien solde** : 2 400 - 2 169,50 = **230,50€** ❌

Après correction :
- **Nouveau solde** : 2 400 - 2 169,50 - 200 = **30,50€** ✅

Le solde réel disponible est réduit de la valeur de l'épargne, ce qui reflète correctement l'argent qu'il vous reste après épargne.

---

## 🔍 Classification des transactions

Les épargnes sont identifiées par :
- **Type** : `isSavingsTx()` → détecte code='épargne', 'epargne', 'savings', 'saving'
- **Base de données** : `id_type=3` (Épargne), `id_categorie=13` (Objectif)

### Cas d'usage
- **Transactions réelles** (date ≤ aujourd'hui, validées)
- **Transactions futures** (forecast : aujourd'hui < date ≤ +3 mois)
- **Transactions futures du mois** (pour prévision fin de mois)

---

## 🧪 Validation

Pour vérifier la correction :

1. Ouvrir le dashboard
2. Vérifier que le **Solde total** déduit bien les épargnes
3. Comparer avec : `Revenus - Dépenses - Épargne`
4. Vérifier que la **prévision fin de mois** inclut les épargnes futures
5. Contrôler que la comparaison avec décembre déduit aussi l'épargne décembrienne

---

## 📝 Notes de développement

- Les épargnes et dépenses utilisent des méthodes de somme différentes :
  - **Revenus** : `sum()` (somme directe)
  - **Dépenses** : `reduce() + Math.abs()` (valeur absolue)
  - **Épargnes** : `sum()` (somme directe, valeurs positives)
- La détection des épargnes se fait via **le code du type**, pas via la catégorie
- Les transactions "Objectif" sont classées comme épargnes (type=3)
