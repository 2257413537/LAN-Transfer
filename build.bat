@echo off
echo ================================
echo   LAN Transfer - Build
echo ================================
echo.

if not exist "public\app.ico" (
    echo [1/4] Generating icon...
    python generate_icon.py
    echo.
) else (
    echo [1/4] Icon exists, skipping
)

echo [2/4] Cleaning previous build...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist "LAN Transfer.spec" del "LAN Transfer.spec"

echo [3/4] Building with PyInstaller...
python -m PyInstaller --noconfirm --onefile --windowed --name "LAN Transfer" --icon "public\app.ico" --add-data "public;public" desktop.py

echo [4/4] Done!
echo.
echo Output: dist\LAN Transfer.exe
echo.
pause
