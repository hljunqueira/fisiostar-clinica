# Documentação de Migração - Isolamento Docker dos Projetos

## Resumo da Arquitetura Atual

### Projetos na VPS (76.13.171.93)

| Projeto | Containers | Portas Externas | Rede Atual |
|---------|------------|-----------------|------------|
| **SaladaSoul** | saladasoul_* | 8000, 3000, 3001, 3003, 5432 | bridge padrão |
| **FisioStar** | supabase-* | 8002, 8445, 3002, 5434, 6544, 4002 | bridge padrão |
| **IG Imports** | ig-imports-* | 8001, 8444, 32769, 4001 | bridge padrão |

### Problemas
- Todos os projetos compartilham a mesma rede bridge (172.17.0.0/16)
- Possíveis conflitos de DNS interno
- Falta de isolamento de tráfego entre projetos

---

## Arquitetura Proposta

### Redes Isoladas

| Projeto | Rede Docker | Subnet | Gateway |
|---------|-------------|--------|---------|
| **SaladaSoul** | saladasoul-network | 172.18.0.0/16 | 172.18.0.1 |
| **FisioStar** | fisiostar-network | 172.19.0.0/16 | 172.19.0.1 |
| **IG Imports** | igimports-network | 172.20.0.0/16 | 172.20.0.1 |

### Portas Mantidas (para não quebrar produção)

| Projeto | Serviço | Porta Externa | Porta Interna |
|---------|---------|---------------|---------------|
| **SaladaSoul** | API | 8000 | 8001 |
| **SaladaSoul** | Frontend Cliente | 3001 | 80 |
| **SaladaSoul** | Frontend Admin | 3003 | 80 |
| **SaladaSoul** | PostgreSQL | 5432 | 5432 |
| **FisioStar** | Kong HTTP | 8002 | 8000 |
| **FisioStar** | Kong HTTPS | 8445 | 8443 |
| **FisioStar** | Studio | 3002 | 3000 |
| **FisioStar** | Pooler | 5434 | 5432 |
| **FisioStar** | Pooler (transaction) | 6544 | 6543 |
| **FisioStar** | Analytics | 4002 | 4000 |
| **IG Imports** | Kong HTTP | 8001 | 8000 |
| **IG Imports** | Kong HTTPS | 8444 | 8443 |
| **IG Imports** | Analytics | 4001 | 4000 |

---

## Passo 1: Criar Redes Docker

```bash
# Criar redes isoladas
docker network create --driver bridge --subnet 172.18.0.0/16 saladasoul-network
docker network create --driver bridge --subnet 172.19.0.0/16 fisiostar-network
docker network create --driver bridge --subnet 172.20.0.0/16 igimports-network

# Verificar redes criadas
docker network ls
```

---

## Passo 2: Docker Compose - SaladaSoul

Arquivo: `/root/saladasoul/docker-compose.yml`

```yaml
version: '3.8'

networks:
  saladasoul-network:
    external: true

services:
  db:
    image: postgres:15-alpine
    container_name: saladasoul_db
    networks:
      - saladasoul-network
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    restart: unless-stopped

  backend:
    image: saladasoul-backend
    container_name: saladasoul_backend
    networks:
      - saladasoul-network
    ports:
      - "8000:8001"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
    depends_on:
      - db
    restart: unless-stopped

  frontend:
    image: saladasoul-frontend
    container_name: saladasoul_frontend
    networks:
      - saladasoul-network
    ports:
      - "3000:80"
    restart: unless-stopped

  frontend-client:
    image: saladasoul-frontend-client
    container_name: saladasoul_frontend_client
    networks:
      - saladasoul-network
    ports:
      - "3001:80"
    restart: unless-stopped

  frontend-admin:
    image: saladasoul-frontend-admin
    container_name: saladasoul_frontend_admin
    networks:
      - saladasoul-network
    ports:
      - "3003:80"
    restart: unless-stopped
```

---

## Passo 3: Docker Compose - FisioStar

Arquivo: `/root/fisiostar/docker-compose.yml`

```yaml
version: '3.8'

networks:
  fisiostar-network:
    external: true

services:
  # PostgreSQL
  db:
    image: supabase/postgres:15.8.1.085
    container_name: supabase-db
    networks:
      - fisiostar-network
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./volumes/db/data:/var/lib/postgresql/data
    restart: unless-stopped

  # Kong API Gateway
  kong:
    image: kong:2.8.1
    container_name: supabase-kong
    networks:
      - fisiostar-network
    ports:
      - "8002:8000"
      - "8445:8443"
    environment:
      KONG_DATABASE: off
      KONG_DECLARATIVE_CONFIG: /home/kong/temp.yml
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,basic-auth,request-termination,ip-restriction
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
      DASHBOARD_USERNAME: ${DASHBOARD_USERNAME}
      DASHBOARD_PASSWORD: ${DASHBOARD_PASSWORD}
    volumes:
      - ./volumes/api/kong.yml:/home/kong/temp.yml:ro
    depends_on:
      - auth
      - rest
      - realtime
      - storage
    restart: unless-stopped

  # GoTrue Auth
  auth:
    image: supabase/gotrue:v2.185.0
    container_name: supabase-auth
    networks:
      - fisiostar-network
    environment:
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:${POSTGRES_PASSWORD}@db:5432/postgres
      GOTRUE_SITE_URL: ${SITE_URL}
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_JWT_EXP: 3600
    depends_on:
      - db
    restart: unless-stopped

  # PostgREST
  rest:
    image: postgrest/postgrest:v14.3
    container_name: supabase-rest
    networks:
      - fisiostar-network
    environment:
      PGRST_DB_URI: postgres://authenticator:${POSTGRES_PASSWORD}@db:5432/postgres
      PGRST_DB_SCHEMAS: public,storage,graphql_public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - db
    restart: unless-stopped

  # Realtime
  realtime:
    image: supabase/realtime:v2.72.0
    container_name: realtime-dev.supabase-realtime
    networks:
      - fisiostar-network
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: postgres
      DB_USER: supabase_admin
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - db
    restart: unless-stopped

  # Storage
  storage:
    image: supabase/storage-api:v1.37.1
    container_name: supabase-storage
    networks:
      - fisiostar-network
    environment:
      ANON_KEY: ${SUPABASE_ANON_KEY}
      SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
      POSTGREST_URL: http://rest:3000
      DATABASE_URL: postgres://supabase_storage_admin:${POSTGRES_PASSWORD}@db:5432/postgres
    depends_on:
      - db
      - rest
    restart: unless-stopped

  # Studio
  studio:
    image: supabase/studio:2026.01.27-sha-6aa59ff
    container_name: supabase-studio
    networks:
      - fisiostar-network
    ports:
      - "3002:3000"
    environment:
      STUDIO_PG_META_URL: http://meta:8080
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      SUPABASE_URL: http://kong:8000
      SUPABASE_PUBLIC_URL: https://fisiostar.76.13.171.93.nip.io
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
    depends_on:
      - kong
      - meta
    restart: unless-stopped

  # Meta
  meta:
    image: supabase/postgres-meta:v0.95.2
    container_name: supabase-meta
    networks:
      - fisiostar-network
    environment:
      PG_META_PORT: 8080
      PG_META_DB_HOST: db
      PG_META_DB_PORT: 5432
      PG_META_DB_NAME: postgres
      PG_META_DB_USER: supabase_admin
      PG_META_DB_PASSWORD: ${POSTGRES_PASSWORD}
    depends_on:
      - db
    restart: unless-stopped

  # Pooler
  pooler:
    image: supabase/supavisor:2.7.4
    container_name: supabase-pooler
    networks:
      - fisiostar-network
    ports:
      - "5434:5432"
      - "6544:6543"
    environment:
      DATABASE_URL: postgres://supabase_admin:${POSTGRES_PASSWORD}@db:5432/postgres
    depends_on:
      - db
    restart: unless-stopped

  # Analytics
  analytics:
    image: supabase/logflare:1.30.3
    container_name: supabase-analytics
    networks:
      - fisiostar-network
    ports:
      - "4002:4000"
    environment:
      LOGFLARE_NODE_HOST: 127.0.0.1
    restart: unless-stopped

  # Vector
  vector:
    image: timberio/vector:0.28.1-alpine
    container_name: supabase-vector
    networks:
      - fisiostar-network
    volumes:
      - ./volumes/vector:/etc/vector
    restart: unless-stopped

  # Edge Functions
  edge-functions:
    image: supabase/edge-runtime:v1.70.0
    container_name: supabase-edge-functions
    networks:
      - fisiostar-network
    volumes:
      - ./volumes/functions:/home/deno/functions
    restart: unless-stopped

  # ImgProxy
  imgproxy:
    image: darthsim/imgproxy:v3.30.1
    container_name: supabase-imgproxy
    networks:
      - fisiostar-network
    environment:
      IMGPROXY_KEY: ${IMGPROXY_KEY}
      IMGPROXY_SALT: ${IMGPROXY_SALT}
    restart: unless-stopped
```

---

## Passo 4: Docker Compose - IG Imports

Arquivo: `/root/ig-imports/docker-compose.yml`

```yaml
version: '3.8'

networks:
  igimports-network:
    external: true

services:
  # PostgreSQL
  db:
    image: supabase/postgres:15.8.1.085
    container_name: ig-imports-db
    networks:
      - igimports-network
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./volumes/db/data:/var/lib/postgresql/data
    restart: unless-stopped

  # Kong API Gateway
  kong:
    image: kong:2.8.1
    container_name: ig-imports-kong
    networks:
      - igimports-network
    ports:
      - "8001:8000"
      - "8444:8443"
    environment:
      KONG_DATABASE: off
      KONG_DECLARATIVE_CONFIG: /home/kong/temp.yml
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,basic-auth,request-termination,ip-restriction
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
      DASHBOARD_USERNAME: ${DASHBOARD_USERNAME}
      DASHBOARD_PASSWORD: ${DASHBOARD_PASSWORD}
    volumes:
      - ./volumes/api/kong.yml:/home/kong/temp.yml:ro
    depends_on:
      - auth
      - rest
      - realtime
      - storage
    restart: unless-stopped

  # GoTrue Auth
  auth:
    image: supabase/gotrue:v2.185.0
    container_name: ig-imports-auth
    networks:
      - igimports-network
    environment:
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:${POSTGRES_PASSWORD}@db:5432/postgres
      GOTRUE_SITE_URL: ${SITE_URL}
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - db
    restart: unless-stopped

  # PostgREST
  rest:
    image: postgrest/postgrest:v14.3
    container_name: ig-imports-rest
    networks:
      - igimports-network
    environment:
      PGRST_DB_URI: postgres://authenticator:${POSTGRES_PASSWORD}@db:5432/postgres
      PGRST_DB_SCHEMAS: public,storage,graphql_public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - db
    restart: unless-stopped

  # Realtime
  realtime:
    image: supabase/realtime:v2.72.0
    container_name: ig-imports-realtime
    networks:
      - igimports-network
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: postgres
      DB_USER: supabase_admin
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - db
    restart: unless-stopped

  # Storage
  storage:
    image: supabase/storage-api:v1.37.1
    container_name: ig-imports-storage
    networks:
      - igimports-network
    environment:
      ANON_KEY: ${SUPABASE_ANON_KEY}
      SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
      POSTGREST_URL: http://rest:3000
      DATABASE_URL: postgres://supabase_storage_admin:${POSTGRES_PASSWORD}@db:5432/postgres
    depends_on:
      - db
      - rest
    restart: unless-stopped

  # Studio
  studio:
    image: supabase/studio:2026.01.27-sha-6aa59ff
    container_name: ig-imports-studio
    networks:
      - igimports-network
    ports:
      - "32769:3000"
    environment:
      STUDIO_PG_META_URL: http://meta:8080
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      SUPABASE_URL: http://kong:8000
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
    depends_on:
      - kong
      - meta
    restart: unless-stopped

  # Meta
  meta:
    image: supabase/postgres-meta:v0.95.2
    container_name: ig-imports-meta
    networks:
      - igimports-network
    environment:
      PG_META_PORT: 8080
      PG_META_DB_HOST: db
      PG_META_DB_PORT: 5432
      PG_META_DB_NAME: postgres
      PG_META_DB_USER: supabase_admin
      PG_META_DB_PASSWORD: ${POSTGRES_PASSWORD}
    depends_on:
      - db
    restart: unless-stopped

  # Analytics
  analytics:
    image: supabase/logflare:1.30.3
    container_name: ig-imports-analytics
    networks:
      - igimports-network
    ports:
      - "4001:4000"
    environment:
      LOGFLARE_NODE_HOST: 127.0.0.1
    restart: unless-stopped

  # Vector
  vector:
    image: timberio/vector:0.28.1-alpine
    container_name: ig-imports-vector
    networks:
      - igimports-network
    volumes:
      - ./volumes/vector:/etc/vector
    restart: unless-stopped

  # Edge Functions
  edge-functions:
    image: supabase/edge-runtime:v1.70.0
    container_name: ig-imports-edge-functions
    networks:
      - igimports-network
    volumes:
      - ./volumes/functions:/home/deno/functions
    restart: unless-stopped

  # ImgProxy
  imgproxy:
    image: darthsim/imgproxy:v3.30.1
    container_name: ig-imports-imgproxy
    networks:
      - igimports-network
    environment:
      IMGPROXY_KEY: ${IMGPROXY_KEY}
      IMGPROXY_SALT: ${IMGPROXY_SALT}
    restart: unless-stopped
```

---

## Passo 5: Script de Migração

Arquivo: `/root/migrar-projetos.sh`

```bash
#!/bin/bash

# Script de migração para isolamento Docker
# Execute com: sudo bash migrar-projetos.sh

set -e

echo "=========================================="
echo "Migração para Isolamento Docker"
echo "=========================================="

# 1. Backup
echo "[1/6] Criando backups..."
cp /root/caddy/Caddyfile /root/caddy/Caddyfile.bak.$(date +%Y%m%d)
docker ps > /root/containers-backup-$(date +%Y%m%d).txt

# 2. Criar redes
echo "[2/6] Criando redes Docker..."
docker network create --driver bridge --subnet 172.18.0.0/16 saladasoul-network 2>/dev/null || echo "Rede saladasoul-network já existe"
docker network create --driver bridge --subnet 172.19.0.0/16 fisiostar-network 2>/dev/null || echo "Rede fisiostar-network já existe"
docker network create --driver bridge --subnet 172.20.0.0/16 igimports-network 2>/dev/null || echo "Rede igimports-network já existe"

# 3. Parar containers antigos
echo "[3/6] Parando containers antigos..."
docker stop saladasoul_backend saladasoul_frontend saladasoul_frontend_client saladasoul_frontend_admin 2>/dev/null || true
docker stop supabase-kong supabase-rest supabase-auth supabase-storage supabase-meta supabase-studio supabase-pooler supabase-edge-functions supabase-analytics supabase-vector supabase-imgproxy realtime-dev.supabase-realtime 2>/dev/null || true
docker stop ig-imports-kong ig-imports-rest ig-imports-auth ig-imports-storage ig-imports-meta ig-imports-studio ig-imports-realtime ig-imports-edge-functions ig-imports-analytics ig-imports-vector ig-imports-imgproxy 2>/dev/null || true

# 4. Remover containers antigos
echo "[4/6] Removendo containers antigos..."
docker rm saladasoul_backend saladasoul_frontend saladasoul_frontend_client saladasoul_frontend_admin 2>/dev/null || true
docker rm supabase-kong supabase-rest supabase-auth supabase-storage supabase-meta supabase-studio supabase-pooler supabase-edge-functions supabase-analytics supabase-vector supabase-imgproxy realtime-dev.supabase-realtime 2>/dev/null || true
docker rm ig-imports-kong ig-imports-rest ig-imports-auth ig-imports-storage ig-imports-meta ig-imports-studio ig-imports-realtime ig-imports-edge-functions ig-imports-analytics ig-imports-vector ig-imports-imgproxy 2>/dev/null || true

# 5. Atualizar Caddyfile
echo "[5/6] Atualizando Caddyfile..."
cat > /root/caddy/Caddyfile << 'EOF'
# API - Backend
api.saladasoul.com {
    reverse_proxy 172.18.0.1:8000
}

# Frontend Clientes
saladasoul.com {
    reverse_proxy 172.18.0.1:3001
}

# Frontend Clientes WWW
www.saladasoul.com {
    reverse_proxy 172.18.0.1:3001
}

# Frontend Admin
saladasoul.shop {
    reverse_proxy 172.18.0.1:3003
}

# Frontend Admin WWW
www.saladasoul.shop {
    reverse_proxy 172.18.0.1:3003
}

# Domínios antigos
saladasoul.76.13.171.93.nip.io {
    reverse_proxy 172.18.0.1:3001
}

api.saladasoul.76.13.171.93.nip.io {
    reverse_proxy 172.18.0.1:8000
}

# FisioStar - Supabase API
fisiostar.76.13.171.93.nip.io {
    reverse_proxy 172.19.0.1:8002
}
EOF

# 6. Subir containers com docker-compose
echo "[6/6] Subindo containers..."

cd /root/saladasoul && docker-compose up -d 2>/dev/null || echo "SaladaSoul não configurado ainda"
cd /root/fisiostar && docker-compose up -d 2>/dev/null || echo "FisioStar não configurado ainda"
cd /root/ig-imports && docker-compose up -d 2>/dev/null || echo "IG Imports não configurado ainda"

# Recarregar Caddy
docker restart caddy
sleep 3
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

echo "=========================================="
echo "Migração concluída!"
echo "=========================================="
echo ""
echo "Verifique os containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Verifique as redes:"
docker network ls | grep -E "(salada|fisio|igimport)"
```

---

## Passo 6: Atualização do Caddyfile

Após a migração, o Caddyfile usará os gateways das novas redes:

```caddyfile
# API - Backend
api.saladasoul.com {
    reverse_proxy 172.18.0.1:8000
}

# Frontend Clientes
saladasoul.com {
    reverse_proxy 172.18.0.1:3001
}

# Frontend Clientes WWW
www.saladasoul.com {
    reverse_proxy 172.18.0.1:3001
}

# Frontend Admin
saladasoul.shop {
    reverse_proxy 172.18.0.1:3003
}

# Frontend Admin WWW
www.saladasoul.shop {
    reverse_proxy 172.18.0.1:3003
}

# Domínios antigos
saladasoul.76.13.171.93.nip.io {
    reverse_proxy 172.18.0.1:3001
}

api.saladasoul.76.13.171.93.nip.io {
    reverse_proxy 172.18.0.1:8000
}

# FisioStar - Supabase API
fisiostar.76.13.171.93.nip.io {
    reverse_proxy 172.19.0.1:8002
}
```

---

## Instruções de Execução

1. **Criar estrutura de diretórios:**
```bash
mkdir -p /root/saladasoul
mkdir -p /root/fisiostar
mkdir -p /root/ig-imports
```

2. **Copiar arquivos:**
- Copie `docker-compose.yml` do SaladaSoul para `/root/saladasoul/`
- Copie `docker-compose.yml` do FisioStar para `/root/fisiostar/`
- Copie `docker-compose.yml` do IG Imports para `/root/ig-imports/`

3. **Copiar volumes existentes:**
```bash
# FisioStar
cp -r /root/supabase/docker/volumes /root/fisiostar/

# IG Imports
cp -r /root/ig-imports-supabase/volumes /root/ig-imports/
```

4. **Criar arquivos .env:**
Crie arquivos `.env` em cada diretório com as variáveis necessárias.

5. **Executar migração:**
```bash
chmod +x /root/migrar-projetos.sh
sudo bash /root/migrar-projetos.sh
```

---

## Rollback (Se necessário)

Se algo der errado, restaure o backup:

```bash
# Restaurar Caddyfile
cp /root/caddy/Caddyfile.bak.20240227 /root/caddy/Caddyfile
docker restart caddy

# Subir containers antigos (se ainda existirem)
docker start $(cat /root/containers-backup-20240227.txt | awk '{print $NF}')
```

---

## Verificação Pós-Migração

```bash
# Verificar redes
docker network inspect saladasoul-network
docker network inspect fisiostar-network
docker network inspect igimports-network

# Verificar containers
docker ps

# Testar endpoints
curl -I https://fisiostar.76.13.171.93.nip.io/rest/v1/units
curl -I https://saladasoul.com
curl -I http://76.13.171.93:8001/rest/v1/  # IG Imports (sem domínio)
```
