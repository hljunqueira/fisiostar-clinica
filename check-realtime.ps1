$sshKey = "$env:USERPROFILE\.ssh\id_ed25519"
ssh -i "$sshKey" -o StrictHostKeyChecking=no root@23.80.89.116 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
ssh -i "$sshKey" -o StrictHostKeyChecking=no root@23.80.89.116 "cat /etc/caddy/Caddyfile || cat /root/Caddyfile"
