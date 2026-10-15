@echo off
SETLOCAL EnableDelayedExpansion

echo ==========================================
echo   Student Attendance System Starter
echo ==========================================

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed. Please install it from https://nodejs.org/
    pause
    exit /b 1
)

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules\" (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
)

:: Prisma Setup
echo [INFO] Generating Prisma Client...
call npx prisma generate

echo [INFO] Syncing database schema...
call npx prisma db push

:: Start the server in a new window
echo [INFO] Starting backend server on http://localhost:3000...
start "Attendance System Server" cmd /k "node server.js"

:: Give the server a moment to start
timeout /t 3 /nobreak > nul

:: Open the frontend
echo [INFO] Opening frontend in default browser...
start index.html

echo.
echo [SUCCESS] Everything is up and running!
echo You can manage the server in the newly opened command window.
echo.
pause
