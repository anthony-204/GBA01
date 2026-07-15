@echo off
setlocal EnableExtensions

REM ============================================================================
REM  Redeploy THIS branch (v1_testing) on Vercel via an empty commit.
REM
REM  Unlike REDEPLOY_VERCEL_BRANCH.bat (for collaborator branches such as
REM  v1_nat), this script only touches v1_testing and always finishes on
REM  v1_testing so these .bat files stay on disk.
REM
REM  Usage:
REM    Double-click REDEPLOY_V1_TESTING.bat
REM    OR:  REDEPLOY_V1_TESTING.bat
REM
REM  Target / return branch: v1_testing
REM ============================================================================

set "TARGET_BRANCH=v1_testing"
set "HOME_BRANCH=v1_testing"
set "REPO=D:\GB Engineering"

REM Re-launch from TEMP so a mid-run working-tree change cannot stop the script.
if /I not "%~dp0"=="%TEMP%\" (
  copy /Y "%~f0" "%TEMP%\REDEPLOY_V1_TESTING.bat" >nul
  if errorlevel 1 (
    echo Failed to copy script to TEMP.
    pause
    exit /b 1
  )
  call "%TEMP%\REDEPLOY_V1_TESTING.bat" %*
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
echo  Vercel redeploy — v1_testing
echo ========================================
echo  Target / stay on : %TARGET_BRANCH%
echo  Repo             : %CD%
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
  goto :ensure_home
)

echo [3/6] Switching to %TARGET_BRANCH%...
git switch %TARGET_BRANCH%
if errorlevel 1 (
  echo Switch to %TARGET_BRANCH% failed.
  goto :ensure_home
)

echo [4/6] Resetting to origin/%TARGET_BRANCH%...
git reset --hard origin/%TARGET_BRANCH%
if errorlevel 1 (
  echo Reset failed.
  goto :ensure_home
)

echo [5/6] Creating empty commit...
git commit --allow-empty -m "Trigger Vercel preview deployment"
if errorlevel 1 (
  echo Empty commit failed.
  goto :ensure_home
)

echo [6/6] Pushing origin/%TARGET_BRANCH%...
git push origin %TARGET_BRANCH%
if errorlevel 1 (
  echo Push failed.
  goto :ensure_home
)

echo.
echo SUCCESS: Empty commit pushed on %TARGET_BRANCH%.
echo Check Vercel for a new preview deployment.
echo.

:ensure_home
echo.
echo Ensuring we are on %HOME_BRANCH% (batch files stay here)...
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
echo Batch files:
echo   %REPO%\REDEPLOY_V1_TESTING.bat
echo   %REPO%\REDEPLOY_VERCEL_BRANCH.bat
echo.
pause
exit /b 0
