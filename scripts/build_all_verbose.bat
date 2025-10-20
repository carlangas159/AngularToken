@echo off
REM Script para construir imágenes Docker de los servicios y guardar logs con timestamp (Windows cmd.exe)
SET ROOT=%~dp0..
cd /d %ROOT%

for %%S in (frontend security clients mails) do (
  set SERVICE=%%S
  set TIMESTAMP=%DATE:~-4%-%DATE:~3,2%-%DATE:~0,2%_%TIME:~0,2%%TIME:~3,2%_%TIME:~6,2%
  set LOGFILE=build_%%S_%TIMESTAMP%.log
  echo Building %%S ...
  docker build --progress=plain -f services\%%S\Dockerfile -t linkediin_%%S_build services\%%S > %%LOGFILE%% 2>&1
  if ERRORLEVEL 1 (
    echo Build failed for %%S. See %%LOGFILE%%
    exit /b 1
  ) else (
    echo Build succeeded for %%S. Log: %%LOGFILE%%
  )
)

echo All builds completed successfully.
exit /b 0

