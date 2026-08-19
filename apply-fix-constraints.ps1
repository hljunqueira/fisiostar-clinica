$sshKey = "$env:USERPROFILE\.ssh\id_ed25519"
scp -i "$sshKey" -o StrictHostKeyChecking=no ./supabase/fix_chat_constraints.sql root@23.80.89.116:/tmp/fix_chat.sql

ssh -i "$sshKey" -o StrictHostKeyChecking=no root@23.80.89.116 "docker cp /tmp/fix_chat.sql supabase-db-fisiostar:/tmp/fix_chat.sql; docker exec supabase-db-fisiostar psql -U postgres -d postgres -f /tmp/fix_chat.sql; rm -f /tmp/fix_chat.sql"

ssh -i "$sshKey" -o StrictHostKeyChecking=no root@23.80.89.116 "docker restart supabase-rest-fisiostar"

Write-Host "Done applying fix!"
