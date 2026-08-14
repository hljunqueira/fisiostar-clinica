# Script de Deploy Automatizado - FisioStar Clinica (PowerShell)
# Execução: .\deploy-fisiostar.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 [1/6] Iniciando verificacao TypeScript (tsc)..." -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Falha na compilacao TypeScript! Cancelei o deploy." -ForegroundColor Red
    exit 1
}
Write-Host "✅ TypeScript verificado sem erros!" -ForegroundColor Green

Write-Host "`n📦 [2/6] Gerando arquivo compactado fisiostar-update.tar.gz..." -ForegroundColor Cyan
if (Test-Path "fisiostar-update.tar.gz") { Remove-Item "fisiostar-update.tar.gz" -Force }
tar --exclude="node_modules" --exclude=".git" --exclude="fisiostar-update.tar.gz" -czf fisiostar-update.tar.gz .
Write-Host "✅ Arquivo gerado com sucesso!" -ForegroundColor Green

Write-Host "`n📤 [3/6] Enviando arquivo via SCP para a VPS (mdr-vps: 23.80.89.116)..." -ForegroundColor Cyan
$sshKey = "$env:USERPROFILE\.ssh\id_ed25519"
scp -i "$sshKey" -o StrictHostKeyChecking=no fisiostar-update.tar.gz root@23.80.89.116:/root/fisiostar-clinica/frontend/
Write-Host "✅ Upload concluído com sucesso!" -ForegroundColor Green

Write-Host "`n🏗️ [4/6] Reconstruindo container Docker no servidor..." -ForegroundColor Cyan
ssh -i "$sshKey" -o StrictHostKeyChecking=no root@23.80.89.116 "cd /root/fisiostar-clinica/frontend && tar -xzf fisiostar-update.tar.gz && rm -f fisiostar-update.tar.gz && docker compose build --no-cache && docker compose up -d"
Write-Host "✅ Container docker reconstruido e iniciado na VPS!" -ForegroundColor Green

Write-Host "`n🧹 [5/6] Limpando arquivos temporarios locais..." -ForegroundColor Cyan
if (Test-Path "fisiostar-update.tar.gz") { Remove-Item "fisiostar-update.tar.gz" -Force }

Write-Host "`n🎉 [6/6] DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "🌐 Acesse a aplicacao atualizada em: https://fisiostarclinica.com.br" -ForegroundColor Yellow
