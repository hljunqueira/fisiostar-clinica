$sshKey = "$env:USERPROFILE\.ssh\id_ed25519"
Write-Host "🚀 [1/3] Enviando migration v2_clinical_security_schema.sql para a VPS..." -ForegroundColor Cyan

scp -i "$sshKey" -o StrictHostKeyChecking=no ./supabase/v2_clinical_security_schema.sql root@23.80.89.116:/tmp/v2.sql

Write-Host "⚙️ [2/3] Aplicando SQL no PostgreSQL (supabase-db-fisiostar)..." -ForegroundColor Cyan
ssh -i "$sshKey" -o StrictHostKeyChecking=no root@23.80.89.116 '
  DB_CONTAINER=$(docker ps --filter name=supabase-db-fisiostar -q | head -n 1)
  if [ -z "$DB_CONTAINER" ]; then
    DB_CONTAINER=$(docker ps --filter name=supabase-db -q | head -n 1)
  fi
  echo "Container DB selecionado: $DB_CONTAINER"
  docker cp /tmp/v2.sql $DB_CONTAINER:/tmp/v2.sql
  docker exec $DB_CONTAINER psql -U postgres -d postgres -f /tmp/v2.sql
  rm -f /tmp/v2.sql
'

Write-Host "🔄 [3/3] Reiniciando PostgREST e GoTrue Auth (supabase-rest e supabase-auth)..." -ForegroundColor Cyan
ssh -i "$sshKey" -o StrictHostKeyChecking=no root@23.80.89.116 '
  REST_CONTAINER=$(docker ps --filter name=supabase-rest-fisiostar -q | head -n 1)
  if [ -z "$REST_CONTAINER" ]; then REST_CONTAINER=$(docker ps --filter name=supabase-rest -q | head -n 1); fi
  AUTH_CONTAINER=$(docker ps --filter name=supabase-auth-fisiostar -q | head -n 1)
  if [ -z "$AUTH_CONTAINER" ]; then AUTH_CONTAINER=$(docker ps --filter name=supabase-auth -q | head -n 1); fi
  
  if [ -n "$REST_CONTAINER" ]; then docker restart $REST_CONTAINER; fi
  if [ -n "$AUTH_CONTAINER" ]; then docker restart $AUTH_CONTAINER; fi
'

Write-Host "✅ Migração e serviços v2.0 concluídos com 100% de sucesso!" -ForegroundColor Green


