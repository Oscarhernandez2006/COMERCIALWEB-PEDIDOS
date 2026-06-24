<#
  Despliegue por SSH a un servidor Ubuntu con Docker Swarm + Traefik (Dokploy).

  Qué hace:
    1. Se conecta por SSH al servidor.
    2. Clona el repo si no existe, o lo actualiza (git reset --hard) si ya está.
    3. Ejecuta deploy.sh, que construye la imagen y despliega el stack de swarm.

  Requisitos en el servidor:
    - Docker en modo Swarm (Dokploy ya lo tiene) y la red overlay "dokploy-network".
    - El archivo backend/.env creado en el servidor (NO se sube al repo).

  Uso (desde PowerShell, en la raíz del proyecto):
    ./deploy.ps1 -Server "usuario@IP_O_HOST"

  Ejemplos:
    ./deploy.ps1 -Server "adminsvr@190.131.223.74"
    ./deploy.ps1 -Server "adminsvr@servidor" -Branch main
#>

param(
  # Usuario y host del servidor: "usuario@ip" o "usuario@dominio".
  [Parameter(Mandatory = $true)]
  [string]$Server,

  # Carpeta del repo en el servidor.
  [string]$RepoDir = "/opt/sigcom",

  # URL del repositorio git.
  [string]$RepoUrl = "https://github.com/Oscarhernandez2006/COMERCIALWEB-PEDIDOS.git",

  # Rama a desplegar.
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

# Comandos que se ejecutarán en el servidor remoto (Ubuntu).
$remote = @"
set -e
if [ ! -d "$RepoDir/.git" ]; then
  echo '==> Clonando repositorio...'
  sudo mkdir -p "$RepoDir"
  sudo chown -R \$(id -u):\$(id -g) "$RepoDir"
  git clone "$RepoUrl" "$RepoDir"
fi
cd "$RepoDir"
echo '==> Actualizando codigo...'
git fetch origin "$Branch"
git checkout "$Branch"
git reset --hard "origin/$Branch"

chmod +x deploy.sh
./deploy.sh
"@

Write-Host "Conectando a $Server y desplegando (swarm)..." -ForegroundColor Cyan
ssh $Server $remote
Write-Host "Despliegue finalizado." -ForegroundColor Green
