# Guide: Exécution des Transactions Récurrentes sur InfinityFree

## Le Problème avec InfinityFree

InfinityFree est un hébergement **gratuit et très limité**:
- ❌ Pas d'accès à **cron jobs** personnalisés
- ❌ Pas d'accès SSH/shell
- ❌ Pas d'accès aux variables d'environnement système
- ❌ Impossible de configurer des tâches planifiées automatiquement

Donc, les transactions récurrentes **ne peuvent pas s'exécuter automatiquement** sans intervention manuelle.

## Solutions Disponibles

### Option 1: Appel Manuel depuis l'Application (RECOMMANDÉ)

L'utilisateur appelle le runner depuis l'interface de l'application avec `force=1`:

```
POST /API/run_recurring_transactions.php?force=1
```

**Conditions:**
- L'utilisateur doit être authentifié (session active)
- Le code permet ce mode sur InfinityFree

**Comment l'implémenter dans le frontend:**
1. Ajouter un bouton "Générer transactions récurrentes maintenant"
2. Faire un POST à `/API/run_recurring_transactions.php?force=1`
3. Afficher le résultat (nombre de transactions créées)

**Exemple JavaScript/TypeScript:**
```typescript
async function runRecurringTransactions() {
  const response = await fetch('/API/run_recurring_transactions.php?force=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await response.json();
  if (data.success) {
    console.log(`${data.created.length} transactions générées`);
  }
}
```

### Option 2: Service Externe de Cron (Pour Après)

Si vous voulez l'automatiser, utilisez un **service externe gratuit** qui peut faire des appels HTTP:

**Exemples:**
- **cron-job.org** (gratuit, 100 appels/jour)
- **EasyCron** (gratuit)
- **AWS Lambda** (gratuit avec limitations)

**Configuration:**
1. Générez un long secret aléatoire:
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. Ajoutez-le à votre `config.local.php` sur InfinityFree:
   ```php
   $cron_secret = 'votre-secret-genere-ici';
   ```

3. Configurez le service externe pour appeler:
   ```
   POST https://saxalis.free.nf/API/run_recurring_transactions.php
   Body: cron_secret=votre-secret-genere-ici
   ```

4. Configurez la fréquence (ex: tous les jours à 3h du matin)

### Option 3: Webhook depuis un Autre Service

Si vous avez accès à un autre serveur avec cron, configurez un webhook vers votre site InfinityFree.

---

## Étapes de Configuration Pour InfinityFree

### 1️⃣ Créer `config.local.php` (si absent)

1. Via le **File Manager** de cPanel InfinityFree:
   - Allez à `/public_html/API/`
   - Créez un nouveau fichier: `config.local.php`
   - Copiez le contenu de `config.local.example.php`
   - Remplacez les credentials par vos vraies données InfinityFree

### 2️⃣ Ajouter le Secret Cron (Optionnel)

Si vous prévoyez d'utiliser un service externe:

```php
$cron_secret = 'remplacez-ceci-par-un-secret-aleatoire-long';
```

Générez un secret sûr avec:
- https://www.random.org/strings/ (choisissez "Base64" ou similaire)
- Ou: `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`

### 3️⃣ Tester l'Endpoint

Depuis votre navigateur, une fois authentifié:

```
https://saxalis.free.nf/API/run_recurring_transactions.php?force=1
```

Attendez la réponse JSON:
```json
{
  "success": true,
  "created": [
    {"plan_id": 1, "amount": 50.00},
    {"plan_id": 2, "amount": 25.50}
  ]
}
```

---

## Pour les Utilisateurs Avancés: Service de Cron Externe

### Utiliser cron-job.org

1. Allez à https://cron-job.org/en/
2. Inscrivez-vous (gratuit)
3. Créez un nouveau job:
   - **URL:** `https://saxalis.free.nf/API/run_recurring_transactions.php`
   - **Method:** POST
   - **Body:** `cron_secret=votre-secret`
   - **Schedule:** Daily at 03:00 (ou votre préférence)
4. Testez une fois manuellement
5. Activez le job

### Utiliser EasyCron

1. Allez à https://www.easycron.com/
2. Créez un compte
3. Ajoutez un nouveau cron:
   - **URL:** `https://saxalis.free.nf/API/run_recurring_transactions.php?cron_secret=votre-secret`
   - **Frequency:** Daily
   - **Time:** 03:00
4. Sauvegardez

---

## Dépannage

### ❌ "Runner disabled by default"

**Causes possibles:**
1. Pas d'authentification + pas de `force=1` → **Solution:** Ajouter `?force=1` à l'URL
2. Pas de `cron_secret` + pas authentifié → **Solution:** S'authentifier d'abord
3. `cron_secret` incorrect → **Solution:** Vérifier la config.local.php

### ❌ "Non authentifié"

Vous devez être connecté à l'application pour appeler avec `force=1`.

**Solution:** Authentifiez-vous dans l'app, puis appelez l'endpoint.

### ✅ Transactions créées mais pas visibles

Les transactions sont créées mais peut-être filtrées par date/période. Vérifiez:
- Les filtres appliqués dans l'app
- La date des transactions (aujourd'hui? le bon mois?)

---

## Recommandation

**Pour InfinityFree:** Utilisez **Option 1 (Manuel)** avec un bouton dans l'app.

C'est la solution la plus simple et la plus fiable sans dépendre de services externes.

**Pour production (serveur payant):** Utilisez **Option 2 ou 3** avec un cron externe pour l'automatisation.
