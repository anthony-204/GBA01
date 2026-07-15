@echo off
setlocal EnableExtensions

REM Trigger a Vercel preview deploy for a collaborator branch via an empty commit.
REM Usage:
REM   trigger-vercel-branch.bat
REM   trigger-vercel-branch.bat v1_nat
REM
REM Run from any directory. Requires git and a remote named "origin".

set "BRANCH=%~1"
if "%BRANCH%"=="" set "BRANCH=v1_nat"

cd /d "%~dp0.."
if errorlevel 1 (
  echo Failed to change to repo root.
  exit /b 1
)

for /f "delims=" %%b in ('git branch --show-current') do set "CURRENT_BRANCH=%%b"
if "%CURRENT_BRANCH%"=="" (
  echo Could not determine current branch. Are you inside the git repo?
  exit /b 1
)

echo Current branch: %CURRENT_BRANCH%
echo Target branch:  %BRANCH%
echo.

echo Stashing local changes (including untracked)...
git stash push -u -m "auto-stash before Vercel trigger for %BRANCH%"
set "STASHED=1"
git stash list -1 | findstr /C:"auto-stash before Vercel trigger for %BRANCH%" >nul
if errorlevel 1 set "STASHED=0"

echo Fetching origin/%BRANCH%...
git fetch origin %BRANCH%
if errorlevel 1 (
  echo Fetch failed.
  goto :restore
)

echo Switching to %BRANCH%...
git switch %BRANCH%
if errorlevel 1 (
  echo Switch failed.
  goto :restore
)

echo Resetting to origin/%BRANCH%...
git reset --hard origin/%BRANCH%
if errorlevel 1 (
  echo Reset failed.
  goto :restore_switch
)

echo Creating empty commit...
git commit --allow-empty -m "Trigger Vercel preview deployment"
if errorlevel 1 (
  echo Empty commit failed.
  goto :restore_switch
)

echo Pushing origin/%BRANCH%...
git push origin %BRANCH%
if errorlevel 1 (
  echo Push failed.
  goto :restore_switch
)

echo.
echo Pushed empty commit on %BRANCH%. Vercel should start a preview deploy.
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
exit /b 0
