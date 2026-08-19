$sshKey = "$env:USERPROFILE\.ssh\id_ed25519"
ssh -i "$sshKey" -o StrictHostKeyChecking=no root@23.80.89.116 '
  cd /root/fisiostar-clinica/supabase || cd /root/fisiostar-clinica
  docker compose down
  docker compose up -d
  docker ps
'
