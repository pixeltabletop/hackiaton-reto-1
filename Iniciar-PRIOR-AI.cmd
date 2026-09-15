@echo off
setlocal enabledelayedexpansion
title PRIOR AI

rem ---------------------------------------------------------------------------
rem  Arranque de doble clic para quien no usa la terminal.
rem  Comprueba Node, comprueba que el puerto este libre, instala si hace falta,
rem  compila si hace falta, levanta la web y la abre en el navegador.
rem  Si algo falla, lo dice y se detiene con codigo distinto de cero.
rem ---------------------------------------------------------------------------

cd /d "%~dp0"
set PUERTO=3000

echo.
echo   PRIOR AI - el dictamen con la poliza en la mano
echo   ------------------------------------------------
echo.

rem --- 1. Node 24 o superior -------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
  echo   [X] No se encontro Node.js.
  echo       Instale Node 24 o superior desde https://nodejs.org y vuelva a ejecutar este archivo.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set MAYOR=%%v
if !MAYOR! LSS 24 (
  echo   [X] Node !MAYOR! es demasiado antiguo. Hace falta Node 24 o superior.
  node -v
  pause
  exit /b 1
)
echo   [ok] Node
node -v

rem --- 2. El puerto tiene que estar libre ------------------------------------
netstat -ano | findstr /r /c:"LISTENING" | findstr /c:":%PUERTO% " >nul
if not errorlevel 1 (
  echo   [X] El puerto %PUERTO% ya esta ocupado por otro programa.
  echo       Cierrelo y vuelva a intentar, o abra el que ya esta corriendo en http://localhost:%PUERTO%
  pause
  exit /b 1
)
echo   [ok] Puerto %PUERTO% libre

rem --- 3. Dependencias -------------------------------------------------------
if not exist "node_modules" (
  echo.
  echo   Instalando dependencias por primera vez. Tarda uno o dos minutos...
  call npm ci
  if errorlevel 1 (
    echo   [X] Fallo la instalacion de dependencias.
    pause
    exit /b 1
  )
)
echo   [ok] Dependencias

rem --- 4. Compilacion --------------------------------------------------------
if not exist ".next\BUILD_ID" (
  echo.
  echo   Compilando la aplicacion...
  call npm run build
  if errorlevel 1 (
    echo   [X] Fallo la compilacion.
    pause
    exit /b 1
  )
)
echo   [ok] Compilado

rem --- 5. Modo: con modelo o solo reglas -------------------------------------
if exist ".env.local" (
  echo   [i] Se usara la configuracion de .env.local
) else (
  if "%ANTHROPIC_API_KEY%%GOOGLE_API_KEY%%GROQ_API_KEY%%OPENAI_API_KEY%"=="" (
    echo.
    echo   [i] MODO SIN MODELO: no hay clave de IA configurada.
    echo       La web funciona: busca asegurados y dictamina, leyendo el informe con reglas.
    echo       Para que la IA lea informes escritos en prosa, copie .env.example a .env.local
    echo       y complete UNA clave. La pantalla "Subir un informe" dice en que modo esta.
  ) else (
    echo   [i] Hay una clave de modelo en el entorno: la IA leera los informes.
  )
)

rem --- 6. Arrancar y abrir ---------------------------------------------------
echo.
echo   Abriendo http://localhost:%PUERTO% ...
echo   Para detener la aplicacion, cierre esta ventana.
echo.
start "" "http://localhost:%PUERTO%"
call npm run start
exit /b %errorlevel%
