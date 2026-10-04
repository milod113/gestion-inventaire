@echo off

cd /d "C:\xampp\htdocs\gestion-inevntaire-2026"

:START
echo ========================================
echo    Demarrage du serveur Laravel...
echo ========================================

php artisan serve --host=0.0.0.0 --port=8000

echo.
echo Le serveur Laravel s'est arrete.
echo Redemarrage dans 5 secondes...

timeout /t 5 /nobreak >nul

goto START