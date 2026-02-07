# Script d'import avec mot de passe securise

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Importation PostgreSQL sur Render" -ForegroundColor Cyan
Write-Host "======================================== " -ForegroundColor Cyan
Write-Host ""

# Configuration
$DBHost = "dpg-d63gh51r0fns73bl24l0-a.oregon-postgres.render.com"
$DBPort = "5432"
$DBName = "suivi_depenses_82t6"
$DBUser = "suivi_depenses_82t6_user"
$SQL_FILE = "C:\MAMP\htdocs\SaXalis\BASE DE DONNEES\if0_40680976_suivi_depenses_postgresql.sql"
$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

# Verification du fichier SQL
if (-not (Test-Path $SQL_FILE)) {
    Write-Host "ERREUR: Le fichier SQL n'existe pas!" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Fichier SQL trouve" -ForegroundColor Green
Write-Host "[OK] PostgreSQL 18 trouve" -ForegroundColor Green
Write-Host ""

# Affichage des parametres
Write-Host "Connexion a:" -ForegroundColor Yellow
Write-Host "  Host:     $DBHost"
Write-Host "  Database: $DBName"
Write-Host "  User:     $DBUser"
Write-Host ""

# Demander le mot de passe
Write-Host "Entre ton mot de passe Render:" -ForegroundColor Cyan
Write-Host "[Astuce: Va sur render.com pour copier ton mot de passe exact]" -ForegroundColor Gray
$password = Read-Host "Mot de passe" -AsSecureString
$plainPassword = [System.Net.NetworkCredential]::new('', $password).Password

Write-Host ""
Write-Host "Debut de l'import..." -ForegroundColor Cyan
Write-Host ""

# Execution avec variable d'environnement
$env:PGPASSWORD = $plainPassword

try {
    & $psqlPath -h $DBHost -p $DBPort -U $DBUser -d $DBName -f $SQL_FILE
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] Import termine avec succes!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Ta base de donnees est maintenant sur Render!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Chaîne de connexion PostgreSQL:" -ForegroundColor Yellow
        Write-Host "postgresql://$($DBUser):***@$($DBHost):$($DBPort)/$($DBName)" -ForegroundColor White
    }
    else {
        Write-Host ""
        Write-Host "[ERREUR] Verifications:" -ForegroundColor Red
        Write-Host "1. Est-ce que le mot de passe est exact? (voir Render)" -ForegroundColor White
        Write-Host "2. Y a-t-il des caracteres speciaux? (!, @, #, etc.)" -ForegroundColor White
        Write-Host "3. Reessaye avec le bon mot de passe" -ForegroundColor White
    }
}
catch {
    Write-Host "[ERREUR] $_" -ForegroundColor Red
}
finally {
    # Nettoyer le mot de passe de la memoire
    $env:PGPASSWORD = ""
}
