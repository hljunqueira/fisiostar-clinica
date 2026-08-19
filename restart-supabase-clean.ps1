$sshKey = "$env:USERPROFILE\.ssh\id_ed25519"
Write-Host "Restabelecendo Supabase na VPS..." -ForegroundColor Cyan

ssh -i "$sshKey" -o StrictHostKeyChecking=no root@23.80.89.116 '
  cd /root/fisiostar-clinica/supabase || cd /root/fisiostar
  docker compose restart
  sleep 3
  docker ps --filter name=supabase
'

Write-Host "Supabase restabelecido com sucesso!" -ForegroundColor Green
