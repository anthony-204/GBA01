@echo off
setlocal EnableExtensions

REM ============================================================================
REM  Redeploy a collaborator branch on Vercel (Hobby / private repo).
REM
REM  This script is tracked on branch v1_testing. When it switches to
REM  another branch (e.g. v1_nat), Git removes this file from disk.
REM  Fix: copy itself to %%TEMP%% and re-run from there, then ALWAYS
REM  switch back to v1_testing so the .bat reappears for next use.
REM
REM  Usage:
REM    Double-click REDEPLOY_VERCEL_BRANCH.bat
REM    OR:  REDEPLOY_VERCEL_BRANCH.bat
REM    OR:  REDEPLOY_VERCEL_BRANCH.bat v1_nat
REM
REM  Default target: v1_nat
REM  Always returns to: v1_testing
REM ============================================================================

set "TARGET_BRANCH=%~1"
if "%TARGET_BRANCH%"=="" set "TARGET_BRANCH=v1_nat"
set "HOME_BRANCH=v1_testing"
set "REPO=D:\GB Engineering"

REM Re-launch from TEMP so "git switch" cannot delete this running script.
if /I not "%~dp0"=="%TEMP%\" (
  copy /Y "%~f0" "%TEMP%\REDEPLOY_VERCEL_BRANCH.bat" >nul
  if errorlevel 1 (
    echo Failed to copy script to TEMP.
    pause
    exit /b 1
  )
  call "%TEMP%\REDEPLOY_VERCEL_BRANCH.bat" %*
  exit /b %ERRORLEVEL%
)

REM --- Running from TEMP from here ---

if not exist "%REPO%\.git" (
  echo Repo not found at %REPO%
  echo Edit the REPO= line at the top of this script if your clone path differs.
  pause
  exit /b 1
)

cd /d "%REPO%"
if errorlevel 1 (
  echo Failed to cd to %REPO%
  pause
  exit /b 1
)

echo.
echo ========================================
echo  Vercel branch redeploy
echo ========================================
echo  Target branch : %TARGET_BRANCH%
echo  Return branch : %HOME_BRANCH%
echo  Repo          : %CD%
echo ========================================
echo.

echo [1/6] Stashing local changes (including untracked)...
git stash push -u -m "auto-stash before Vercel trigger for %TARGET_BRANCH%"
set "STASHED=0"
git stash list -1 2>nul | findstr /C:"auto-stash before Vercel trigger for %TARGET_BRANCH%" >nul
if not errorlevel 1 set "STASHED=1"
if "%STASHED%"=="0" echo       (nothing to stash)

echo [2/6] Fetching origin/%TARGET_BRANCH%...
git fetch origin %TARGET_BRANCH%
if errorlevel 1 (
  echo Fetch failed.
  goto :go_home
)

echo [3/6] Switching to %TARGET_BRANCH%...
git switch %TARGET_BRANCH%
if errorlevel 1 (
  echo Switch to %TARGET_BRANCH% failed.
  goto :go_home
)

echo [4/6] Resetting to origin/%TARGET_BRANCH%...
git reset --hard origin/%TARGET_BRANCH%
if errorlevel 1 (
  echo Reset failed.
  goto :go_home
)

echo [5/6] Creating empty commit...
git commit --allow-empty -m "Trigger Vercel preview deployment"
if errorlevel 1 (
  echo Empty commit failed.
  goto :go_home
)

echo [6/6] Pushing origin/%TARGET_BRANCH%...
git push origin %TARGET_BRANCH%
if errorlevel 1 (
  echo Push failed.
  goto :go_home
)

echo.
echo SUCCESS: Empty commit pushed on %TARGET_BRANCH%.
echo Check Vercel for a new preview deployment.
echo.

:go_home
echo.
echo Returning to %HOME_BRANCH% (so this .bat stays available)...
git fetch origin %HOME_BRANCH% >nul 2>&1
git switch %HOME_BRANCH%
if errorlevel 1 (
  echo WARNING: could not switch to %HOME_BRANCH%.
  echo Run manually: git switch %HOME_BRANCH%
  pause
  exit /b 1
)

if "%STASHED%"=="1" (
  echo Restoring stashed work onto %HOME_BRANCH%...
  git stash pop
)

echo.
echo Done. Current branch:
git branch --show-current
echo Batch file: %REPO%\REDEPLOY_VERCEL_BRANCH.bat
echo.
pause
exit /b 0
