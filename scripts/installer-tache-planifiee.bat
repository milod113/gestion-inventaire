@echo off
REM A lancer une seule fois, en administrateur, sur le serveur.
REM Cree la tache "G-Inventaire planificateur" qui execute scheduler.bat chaque minute.
schtasks /Create /TN "G-Inventaire planificateur" /TR "\"%~dp0scheduler.bat\"" /SC MINUTE /MO 1 /RU SYSTEM /RL HIGHEST /F
if errorlevel 1 (echo Echec : lancez ce fichier en administrateur. & pause & exit /b 1)
echo Tache creee. La sauvegarde se fera chaque nuit a l heure BACKUP_TIME du .env.
pause
