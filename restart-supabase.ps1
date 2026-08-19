$sshKey = "$env:USERPROFILE\.ssh\id_ed25519"
Write-Host "Conectando na VPS e restabelecendo servicos do Supabase..." -ForegroundColor Cyan

ssh -i "$sshKey" -o StrictHostKeyChecking=no root@23.80.89.116 'cd /root/fisiostar-clinica/supabase && docker compose up -d && sleep 4 && docker compose restart auth rest && docker ps --filter name=supabase'

Write-Host "Servicos do Supabase prontos!" -ForegroundColor Green



