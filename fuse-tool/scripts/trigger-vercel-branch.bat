@echo off
REM Wrapper — launches the root script (always returns to v1_testing).
call "%~dp0..\..\REDEPLOY_VERCEL_BRANCH.bat" %*
