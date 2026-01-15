#!/bin/bash
# Script d'automatisation des corrections de sécurité critiques
# SaXalis API Security Fix
# Date: 2026-01-15

echo "=================================================="
echo "  SaXalis API - Corrections de Sécurité Critiques"
echo "=================================================="
echo ""

# Vérifier qu'on est dans le bon dossier
if [ ! -d "API" ]; then
    echo "❌ ERREUR: Ce script doit être exécuté depuis la racine du projet SaXalis"
    echo "   Dossier actuel: $(pwd)"
    exit 1
fi

echo "✅ Dossier racine détecté: $(pwd)"
echo ""

# Demander confirmation
read -p "⚠️  Ce script va modifier des fichiers. Avez-vous fait un backup? (oui/non): " confirm
if [ "$confirm" != "oui" ]; then
    echo "❌ Annulé. Veuillez faire un backup avant de continuer."
    exit 1
fi

echo ""
echo "🚀 Démarrage des corrections..."
echo ""

# ============================================
# ETAPE 1: Supprimer les fichiers de log
# ============================================
echo "📝 Etape 1/9: Suppression des fichiers de log sensibles..."

LOG_FILES=(
    "API/login.log"
    "API/recurring_login.log"
    "API/check_avatar.log"
    "API/login_errors.log"
)

for file in "${LOG_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "   ✓ Supprimé: $file"
    else
        echo "   ℹ️  Non trouvé (OK): $file"
    fi
done

# Supprimer tous les autres .log dans API/
find API/ -name "*.log" -type f -delete 2>/dev/null
echo "   ✓ Tous les fichiers .log supprimés"
echo ""

# ============================================
# ETAPE 2: Créer/Mettre à jour .gitignore
# ============================================
echo "📝 Etape 2/9: Configuration de .gitignore..."

if [ ! -f ".gitignore" ]; then
    touch .gitignore
    echo "   ✓ Fichier .gitignore créé"
fi

# Ajouter les patterns s'ils n'existent pas
PATTERNS=(
    "*.log"
    ".env"
    ".env.local"
    "API/config.local.php"
    "*.bak"
    "*.backup"
)

for pattern in "${PATTERNS[@]}"; do
    if ! grep -q "^${pattern}$" .gitignore 2>/dev/null; then
        echo "$pattern" >> .gitignore
        echo "   ✓ Ajouté au .gitignore: $pattern"
    else
        echo "   ℹ️  Déjà présent: $pattern"
    fi
done
echo ""

# ============================================
# ETAPE 3: Créer fichier .env
# ============================================
echo "📝 Etape 3/9: Création du fichier .env..."

if [ -f ".env" ]; then
    echo "   ⚠️  Le fichier .env existe déjà, création d'un .env.example à la place"
    ENV_FILE=".env.example"
else
    ENV_FILE=".env"
fi

cat > "$ENV_FILE" << 'EOF'
# Configuration de la base de données
DB_HOST=sql107.infinityfree.com
DB_PORT=3306
DB_NAME=if0_40680976_suivi_depenses
DB_USER=if0_40680976
DB_PASS=OmarndiongueSN

# Configuration de l'application
APP_ENV=production
APP_DEBUG=false

# ⚠️ IMPORTANT: Changez le mot de passe DB après avoir configuré ce fichier!
EOF

echo "   ✓ Fichier $ENV_FILE créé"
echo "   ⚠️  N'oubliez pas de changer le mot de passe DB!"
echo ""

# ============================================
# ETAPE 4: Créer/Mettre à jour .htaccess
# ============================================
echo "📝 Etape 4/9: Configuration de .htaccess..."

if [ ! -f ".htaccess" ]; then
    touch .htaccess
fi

# Vérifier si les protections existent déjà
if ! grep -q "Bloquer .env" .htaccess 2>/dev/null; then
    cat >> .htaccess << 'EOF'

# ============================================
# Protection des fichiers sensibles
# ============================================

# Bloquer .env
<FilesMatch "^\.env">
    Require all denied
</FilesMatch>

# Bloquer .git
<DirectoryMatch "\.git">
    Require all denied
</DirectoryMatch>

# Bloquer config.local.php
<FilesMatch "^config\.local\.php$">
    Require all denied
</FilesMatch>

# Bloquer fichiers de backup et logs
<FilesMatch "\.(bak|backup|old|sql|log)$">
    Require all denied
</FilesMatch>

# Variables d'environnement (à configurer avec vos valeurs)
# SetEnv DB_HOST "sql107.infinityfree.com"
# SetEnv DB_PORT "3306"
# SetEnv DB_NAME "if0_40680976_suivi_depenses"
# SetEnv DB_USER "if0_40680976"
# SetEnv DB_PASS "CHANGEZ_MOI"
# SetEnv APP_ENV "production"

EOF
    echo "   ✓ Protections ajoutées au .htaccess"
else
    echo "   ℹ️  Protections déjà présentes dans .htaccess"
fi
echo ""

# ============================================
# ETAPE 5: Supprimer fichiers de test
# ============================================
echo "📝 Etape 5/9: Suppression des fichiers de test..."

TEST_FILES=(
    "API/test_db.php"
    "API/test_post.php"
)

for file in "${TEST_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "   ✓ Supprimé: $file"
    else
        echo "   ℹ️  Non trouvé: $file"
    fi
done
echo ""

# ============================================
# ETAPE 6: Créer backup de config.php
# ============================================
echo "📝 Etape 6/9: Création du backup de config.php..."

if [ -f "API/config.php" ]; then
    cp "API/config.php" "API/config.php.backup.$(date +%Y%m%d_%H%M%S)"
    echo "   ✓ Backup créé: API/config.php.backup.*"
else
    echo "   ❌ config.php non trouvé!"
fi
echo ""

# ============================================
# ETAPE 7: Créer backup de login.php
# ============================================
echo "📝 Etape 7/9: Création du backup de login.php..."

if [ -f "API/login.php" ]; then
    cp "API/login.php" "API/login.php.backup.$(date +%Y%m%d_%H%M%S)"
    echo "   ✓ Backup créé: API/login.php.backup.*"
else
    echo "   ❌ login.php non trouvé!"
fi
echo ""

# ============================================
# ETAPE 8: Retirer config.local.php du git
# ============================================
echo "📝 Etape 8/9: Retrait de config.local.php du repository git..."

if [ -f "API/config.local.php" ] && [ -d ".git" ]; then
    if git ls-files --error-unmatch API/config.local.php > /dev/null 2>&1; then
        git rm --cached API/config.local.php
        echo "   ✓ config.local.php retiré du git (fichier conservé localement)"
        echo "   ⚠️  N'oubliez pas de commit: git commit -m 'security: remove config.local.php'"
    else
        echo "   ℹ️  config.local.php n'est pas dans le repository git"
    fi
else
    echo "   ℹ️  config.local.php non trouvé ou pas de repository git"
fi
echo ""

# ============================================
# ETAPE 9: Créer fichier de rappel
# ============================================
echo "📝 Etape 9/9: Création du fichier de rappel des actions manuelles..."

cat > "ACTIONS_MANUELLES_REQUISES.txt" << 'EOF'
ACTIONS MANUELLES REQUISES - À faire maintenant
================================================

Le script automatique a effectué ces actions:
✓ Suppression des fichiers .log
✓ Configuration de .gitignore
✓ Création du fichier .env
✓ Configuration de .htaccess
✓ Suppression des fichiers de test
✓ Création des backups

VOUS DEVEZ MAINTENANT:

1. MODIFIER API/config.php (lignes 54-60)
   Remplacer:
     $pass = $pass ?? getenv('DB_PASS') ?? 'OmarndiongueSN';
   Par:
     $pass = getenv('DB_PASS') ?: '';
     if (empty($pass)) {
         die(json_encode(['success' => false, 'message' => 'Config error']));
     }

2. MODIFIER API/login.php
   Supprimer les lignes 22-31 (bloc $logEntry)
   Supprimer la ligne 3 (header X-Served-By)

3. AJOUTER CSRF dans API/delete_all_transactions.php
   Après la ligne 5, ajouter:
     require 'security.php';
     verify_csrf_token();

4. AJOUTER CSRF dans API/update_password.php
   Après la ligne 7, ajouter:
     require 'security.php';
     verify_csrf_token();

5. AJOUTER CSRF dans API/update_user_profile.php
   Après la ligne 6, ajouter:
     require 'security.php';
     verify_csrf_token();

6. CONFIGURER les variables d'environnement sur votre serveur
   - Éditer .htaccess et décommenter les lignes SetEnv
   - OU configurer via panel d'hébergement

7. CHANGER le mot de passe de la base de données
   - Générer un nouveau mot de passe fort
   - Changer dans panel hébergeur
   - Mettre à jour .env et .htaccess

8. TESTER l'application
   - Login/logout
   - Ajout transaction
   - Suppression transaction
   - Changement mot de passe

Voir ACTIONS_IMMEDIATES.md pour les détails complets.
EOF

echo "   ✓ Fichier de rappel créé: ACTIONS_MANUELLES_REQUISES.txt"
echo ""

# ============================================
# RESUME
# ============================================
echo "=================================================="
echo "✅ SCRIPT TERMINE AVEC SUCCES"
echo "=================================================="
echo ""
echo "Actions automatiques complétées:"
echo "  ✓ Fichiers .log supprimés"
echo "  ✓ .gitignore configuré"
echo "  ✓ .env créé"
echo "  ✓ .htaccess configuré"
echo "  ✓ Fichiers de test supprimés"
echo "  ✓ Backups créés"
echo ""
echo "⚠️  ACTIONS MANUELLES REQUISES:"
echo "  → Lire le fichier: ACTIONS_MANUELLES_REQUISES.txt"
echo "  → Modifier config.php (retirer credentials en dur)"
echo "  → Modifier login.php (retirer logging)"
echo "  → Ajouter CSRF sur 3 fichiers"
echo "  → Configurer variables d'environnement serveur"
echo "  → Changer mot de passe base de données"
echo ""
echo "📖 Documentation complète:"
echo "  - RESUME_AUDIT_SECURITE.md"
echo "  - ACTIONS_IMMEDIATES.md"
echo "  - CHECKLIST_SECURITE.md"
echo "  - RAPPORT_SECURITE.md"
echo ""
echo "⏰ Temps estimé pour actions manuelles: 30-45 minutes"
echo ""
echo "🔒 Une fois terminé, votre application sera beaucoup plus sécurisée!"
echo "=================================================="
