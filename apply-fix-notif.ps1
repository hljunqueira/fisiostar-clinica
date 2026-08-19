$sshKey = "$env:USERPROFILE\.ssh\id_ed25519"
scp -i "$sshKey" -o StrictHostKeyChecking=no ./supabase/fix_notifications_link_url.sql root@23.80.89.116:/tmp/fix_notif.sql

ssh -i "$sshKey" -o StrictHostKeyChecking=no root@23.80.89.116 "docker cp /tmp/fix_notif.sql supabase-db-fisiostar:/tmp/fix_notif.sql; docker exec supabase-db-fisiostar psql -U postgres -d postgres -f /tmp/fix_notif.sql; rm -f /tmp/fix_notif.sql; docker restart supabase-rest-fisiostar"

Write-Host "Done adding link_url column!"
