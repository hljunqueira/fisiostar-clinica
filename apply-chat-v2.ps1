$sshKey = "$env:USERPROFILE\.ssh\id_ed25519"
Write-Host "🚀 [1/3] Enviando migration chat_v2_channels_favorites.sql para a VPS..." -ForegroundColor Cyan

scp -i "$sshKey" -o StrictHostKeyChecking=no ./supabase/chat_v2_channels_favorites.sql root@23.80.89.116:/tmp/chat_v2.sql

Write-Host "⚙️ [2/3] Aplicando SQL no PostgreSQL (supabase-db-fisiostar)..." -ForegroundColor Cyan
ssh -i "$sshKey" -o StrictHostKeyChecking=no root@23.80.89.116 '
  DB_CONTAINER=$(docker ps --filter name=supabase-db-fisiostar -q | head -n 1)
  if [ -z "$DB_CONTAINER" ]; then
    DB_CONTAINER=$(docker ps --filter name=supabase-db -q | head -n 1)
  fi
  docker cp /tmp/chat_v2.sql $DB_CONTAINER:/tmp/chat_v2.sql
  docker exec $DB_CONTAINER psql -U postgres -d postgres -f /tmp/chat_v2.sql
  rm -f /tmp/chat_v2.sql
'

Write-Host "🔄 [3/3] Reiniciando PostgREST..." -ForegroundColor Cyan
ssh -i "$sshKey" -o StrictHostKeyChecking=no root@23.80.89.116 '
  REST_CONTAINER=$(docker ps --filter name=supabase-rest-fisiostar -q | head -n 1)
  if [ -z "$REST_CONTAINER" ]; then REST_CONTAINER=$(docker ps --filter name=supabase-rest -q | head -n 1); fi
  if [ -n "$REST_CONTAINER" ]; then docker restart $REST_CONTAINER; fi
'

Write-Host "✅ Chat V2 aplicado com sucesso no banco de dados!" -ForegroundColor Green
