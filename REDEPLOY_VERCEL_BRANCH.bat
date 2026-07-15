@echo off
setlocal EnableExtensions

REM ============================================================================
REM  Redeploy a collaborator branch on Vercel (Hobby / private repo).
REM
REM  What this does:
REM    1. Stashes your local work
REM    2. Fetches and resets to origin/<branch>
REM    3. Creates an empty commit (no file changes)
REM    4. Pushes it so Vercel can deploy from YOUR account
REM    5. Switches back and restores your stash
REM
REM  Usage (double-click or from Command Prompt):
REM    REDEPLOY_VERCEL_BRANCH.bat
REM    REDEPLOY_VERCEL_BRANCH.bat v1_nat
REM
REM  Default branch: v1_nat
REM  Location: repo root (D:\GB Engineering\REDEPLOY_VERCEL_BRANCH.bat)
REM ============================================================================

set "BRANCH=%~1"
if "%BRANCH%"=="" set "BRANCH=v1_nat"

REM This file lives at the repo root.
cd /d "%~dp0"
if errorlevel 1 (
  echo Failed to change to repo root: %~dp0
  pause
  exit /b 1
)

if not exist ".git" (
  echo No .git folder found. Put this .bat in the GB Engineering repo root.
  pause
  exit /b 1
)

for /f "delims=" %%b in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%b"
if "%CURRENT_BRANCH%"=="" (
  echo Could not determine current branch.
  pause
  exit /b 1
)

echo.
echo ========================================
echo  Vercel branch redeploy
echo ========================================
echo  Current branch : %CURRENT_BRANCH%
echo  Target branch  : %BRANCH%
echo  Repo           : %CD%
echo ========================================
echo.

echo [1/6] Stashing local changes (including untracked)...
git stash push -u -m "auto-stash before Vercel trigger for %BRANCH%"
set "STASHED=0"
git stash list -1 2>nul | findstr /C:"auto-stash before Vercel trigger for %BRANCH%" >nul
if not errorlevel 1 set "STASHED=1"
if "%STASHED%"=="0" echo       (nothing to stash)

echo [2/6] Fetching origin/%BRANCH%...
git fetch origin %BRANCH%
if errorlevel 1 (
  echo Fetch failed.
  goto :restore
)

echo [3/6] Switching to %BRANCH%...
git switch %BRANCH%
if errorlevel 1 (
  echo Switch failed. Try: git fetch origin %BRANCH%
  goto :restore
)

echo [4/6] Resetting to origin/%BRANCH%...
git reset --hard origin/%BRANCH%
if errorlevel 1 (
  echo Reset failed.
  goto :restore_switch
)

echo [5/6] Creating empty commit...
git commit --allow-empty -m "Trigger Vercel preview deployment"
if errorlevel 1 (
  echo Empty commit failed.
  goto :restore_switch
)

echo [6/6] Pushing origin/%BRANCH%...
git push origin %BRANCH%
if errorlevel 1 (
  echo Push failed.
  goto :restore_switch
)

echo.
echo SUCCESS: Empty commit pushed on %BRANCH%.
echo Check Vercel for a new preview deployment.
echo.
goto :restore_switch

:restore_switch
echo Switching back to %CURRENT_BRANCH%...
git switch "%CURRENT_BRANCH%"

:restore
if "%STASHED%"=="1" (
  echo Restoring stashed work...
  git stash pop
)

echo.
echo Done. Current branch:
git branch --show-current
echo.
pause
exit /b 0
