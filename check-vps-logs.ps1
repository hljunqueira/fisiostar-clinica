# Verificação de status dos contêineres e logs na VPS
$sshKey = "$env:USERPROFILE\.ssh\id_ed25519"
Write-Host "Verificando containers na VPS..." -ForegroundColor Cyan

ssh -i $sshKey -o StrictHostKeyChecking=no root@23.80.89.116 "docker ps"
