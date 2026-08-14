# Documentação de Migração & Arquitetura Docker - FisioStar

Esta documentação descreve a arquitetura de containers Docker, isolamento de redes e configuração do proxy reverso Caddy para a clínica **FisioStar**.

---

## 📌 Arquitetura em Produção

- **Domínio Ativo**: [https://fisiostarclinica.com.br](https://fisiostarclinica.com.br)
- **Servidor Host**: VPS Produção (`mdr-vps`)
- **Proxy Reverso / TLS**: Caddy Master (`/etc/caddy/Caddyfile`)
- **Rede Docker**: `fisiostar-network` (Subnet `172.19.0.0/16`)

---

## 📦 Mapeamento de Containers & Portas

| Serviço | Nome do Container | Porta Externa | Porta Interna | Descrição |
|---------|-------------------|---------------|---------------|-----------|
| **Frontend App** | `fisiostar-frontend` | `3005` | `80` | Nginx + React SPA |
| **Supabase Kong** | `supabase-kong-fisiostar` | `8020` | `8000` | Gateway da API |
| **Supabase Studio** | `supabase-studio-fisiostar` | `8021` | `3000` | Painel de Gestão do DB |
| **Supabase Postgres** | `supabase-db-fisiostar` | `5435` (127.0.0.1) | `5432` | Banco PostgreSQL 15 |
| **Supabase Auth** | `supabase-auth-fisiostar` | Interna | `9999` | GoTrue Auth |
| **Supabase REST** | `supabase-rest-fisiostar` | Interna | `3000` | PostgREST Engine |

---

## 🌐 Configuração do Caddyfile (`/etc/caddy/Caddyfile`)

O proxy reverso no servidor redireciona o tráfego HTTP/HTTPS do domínio `fisiostarclinica.com.br` para os containers correspondentes:

```caddy
# ==========================================
# FISIOSTAR CLINICA (fisiostarclinica.com.br)
# ==========================================
fisiostarclinica.com.br, www.fisiostarclinica.com.br {
	encode gzip zstd

	# Autenticação GoTrue (Supabase Auth)
	handle /auth/* {
		reverse_proxy localhost:8020 {
			header_up Host {host}
			header_up X-Real-IP {remote_host}
		}
	}

	# API PostgREST (Supabase Data API)
	handle /rest/* {
		reverse_proxy localhost:8020 {
			header_up Host {host}
			header_up X-Real-IP {remote_host}
		}
	}

	# Armazenamento (Supabase Storage)
	handle /storage/* {
		reverse_proxy localhost:8020 {
			header_up Host {host}
			header_up X-Real-IP {remote_host}
		}
	}

	# WebSocket Realtime (Supabase Realtime)
	handle /realtime/* {
		reverse_proxy localhost:8020 {
			header_up Host {host}
			header_up X-Real-IP {remote_host}
		}
	}

	# Frontend SPA (React / Nginx)
	handle {
		reverse_proxy localhost:3005 {
			header_up Host {host}
			header_up X-Real-IP {remote_host}
		}
	}
}
```

---

## 🛠️ Procedimento para Atualizar o Frontend em Produção

Para aplicar atualizações de código na VPS:

### 1. Empacotar o Código Local
No terminal do projeto no seu ambiente local:
```bash
tar --exclude="node_modules" --exclude=".git" -czf fisiostar-update.tar.gz .
```

### 2. Enviar para a VPS via SCP
```bash
scp -F NUL -i ~/.ssh/id_ed25519 fisiostar-update.tar.gz root@mdr-vps:/root/fisiostar-clinica/frontend/
```

### 3. Descompactar e Reconstruir Container na VPS
```bash
ssh -F NUL -i ~/.ssh/id_ed25519 root@mdr-vps "cd /root/fisiostar-clinica/frontend && tar -xzf fisiostar-update.tar.gz && rm fisiostar-update.tar.gz && docker compose build --no-cache && docker compose up -d"
```

### 4. Validar o Deploy
```bash
curl -s -I https://fisiostarclinica.com.br/
```

---

## 🔍 Comandos de Diagnóstico e Verificação

```bash
# Verificar status dos containers FisioStar
ssh root@mdr-vps "docker ps | grep -E 'fisiostar|supabase'"

# Verificar validação e logs do Caddy
ssh root@mdr-vps "caddy validate --config /etc/caddy/Caddyfile && systemctl status caddy"

# Testar conectividade com a API do Supabase
curl -s -I https://fisiostarclinica.com.br/rest/v1/
```
