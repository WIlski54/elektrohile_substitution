@echo off
cd /d "%~dp0"
if not exist .venv ( python -m venv .venv )
call .venv\Scripts\activate
pip install -q -r requirements.txt
echo.
echo Schueler: http://localhost:5000   Lehrkraft: http://localhost:5000/lehrer  (Passwort: siehe .env)
echo.
python app.py
pause
