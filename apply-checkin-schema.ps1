$sshKey = "$env:USERPROFILE\.ssh\id_ed25519"
Write-Host "🚀 Enviando checkin_schema.sql para a VPS..." -ForegroundColor Cyan

scp -i "$sshKey" -o StrictHostKeyChecking=no ./supabase/checkin_schema.sql root@23.80.89.116:/tmp/checkin_schema.sql

Write-Host "⚙️ Aplicando checkin_schema.sql no PostgreSQL..." -ForegroundColor Cyan
ssh -i "$sshKey" -o StrictHostKeyChecking=no root@23.80.89.116 '
  DB_CONTAINER=$(docker ps --filter name=supabase-db-fisiostar -q | head -n 1)
  if [ -z "$DB_CONTAINER" ]; then
    DB_CONTAINER=$(docker ps --filter name=supabase-db -q | head -n 1)
  fi
  echo "Container DB: $DB_CONTAINER"
  docker cp /tmp/checkin_schema.sql $DB_CONTAINER:/tmp/checkin_schema.sql
  docker exec $DB_CONTAINER psql -U postgres -d postgres -f /tmp/checkin_schema.sql
  rm -f /tmp/checkin_schema.sql
'

Write-Host "🔄 Reiniciando PostgREST para recarregar schema cache..." -ForegroundColor Cyan
ssh -i "$sshKey" -o StrictHostKeyChecking=no root@23.80.89.116 '
  REST_CONTAINER=$(docker ps --filter name=supabase-rest-fisiostar -q | head -n 1)
  if [ -z "$REST_CONTAINER" ]; then REST_CONTAINER=$(docker ps --filter name=supabase-rest -q | head -n 1); fi
  if [ -n "$REST_CONTAINER" ]; then docker restart $REST_CONTAINER; fi
'

Write-Host "✅ Tabela checkin_logs criada e PostgREST atualizado com sucesso!" -ForegroundColor Green
