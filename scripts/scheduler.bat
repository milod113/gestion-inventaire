@echo off
REM Lance le planificateur Laravel (sauvegarde de nuit, etc.).
REM A executer chaque minute par une tache planifiee Windows, voir scripts\installer-tache-planifiee.bat.
cd /d "%~dp0.."
"C:\xampp\php\php.exe" artisan schedule:run >> storage\logs\scheduler.log 2>&1
