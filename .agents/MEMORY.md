# FisioStar - Memória do Projeto (MEMORY.md)

Este documento contém a memória persistente e o mapeamento atualizado do sistema FisioStar (Backend, Frontend, Banco de Dados e Infraestrutura de Deploy).

---

## 📌 Contexto Rápido e Diretrizes Invioláveis

- **Domínio de Produção**: `https://fisiostarclinica.com.br`
- **Servidor Host Único**: VPS Produção `mdr-vps` (IP `23.80.89.116`, SSH com chave `~/.ssh/id_ed25519` ou `~/.ssh/ig-imports-deploy`)
- **Arquitetura 100% Unificada**: Tanto o Frontend SPA (React + Nginx) quanto o Backend Supabase (Kong, Auth, Rest, Postgres DB) rodam **exclusivamente na VPS `23.80.89.116`**.
- **Regras Obrigatórias**:
  1. **Sem Endereços IP Brutos em Código/Docs**: Utilizar sempre `fisiostarclinica.com.br`, `mdr-vps` ou `localhost`.
  2. **Regra do Super Admin**: O Super Admin (`super_admin` / `henriquelinharesjunqueira@gmail.com`) NUNCA aparece em listas públicas de usuários ou em relatórios de auditoria.
  3. **Acesso da Secretária**: Secretária (`secretary`) **NÃO** tem acesso à tela de Configurações (`/settings`), apenas a Serviços e Planos (`/settings?tab=plans`), Agenda e Pacientes.
  4. **Sem Dados Fakes / Mocks**: Todos os registros de logs de auditoria e financeiro devem ler e gravar em dados reais no PostgreSQL.

---

## 🗄️ 1. BANCO DE DADOS & CONTAINERS SUPABASE (VPS `23.80.89.116`)

### 1.1 Containers FisioStar no Servidor `23.80.89.116`
- **Frontend SPA**: `fisiostar-frontend` (Porta `3005`)
- **Supabase Kong API Gateway**: `supabase-kong-fisiostar` (Porta `8020`)
- **Supabase PostgreSQL DB**: `supabase-db-fisiostar` (Porta `5435` / Interna `5432`)
- **Supabase Auth GoTrue**: `supabase-auth-fisiostar`
- **Supabase REST PostgREST**: `supabase-rest-fisiostar`
- **Supabase Studio**: `supabase-studio-fisiostar` (Porta `8021`)

### 1.2 Schemas e Enums
- **`user_role`**: `'admin'`, `'secretary'`, `'manager'`, `'financial'`, `'professional'`, `'super_admin'`
- **`session_status`**: `'Agendada'`, `'Confirmada'`, `'Realizada'`, `'Cancelada'`, `'Falta'`
- **`patient_status`**: `'Active'`, `'Inactive'`
- **`announcement_type`**: `'info'`, `'warning'`, `'urgent'`
- **`target_role`**: `'all'`, `'professional'`, `'secretary'`

### 1.3 Tabelas Principais
1. **`units`**: Unidades/filiais da clínica (`id`, `name`, `city`, `has_pool`, `is_active`).
2. **`unit_operating_hours`**: Horário de funcionamento das unidades.
3. **`unit_holidays`**: Feriados e datas de fechamento por unidade.
4. **`specialties`**: Especialidades oferecidas (Fisioterapia, RPG, Pilates, etc.).
5. **`professionals`**: Profissionais de saúde (`id`, `name`, `crf`, `specialty`, `hourly_rate`, `color`).
6. **`professional_units`**: Relação N:N entre profissionais e unidades.
7. **`patients`**: Pacientes (`id`, `name`, `unit_id`, `phone`, `cpf`, `birth_date`, `facial_descriptor`).
8. **`patient_plans`**: Planos contratados pelos pacientes (`total_sessions`, `remaining_sessions`).
9. **`plan_templates`**: Modelos reutilizáveis de planos de tratamento.
10. **`sessions`**: Agendamentos e consultas (`patient_id`, `professional_id`, `unit_id`, `date`, `time`, `signed`, `price`).
11. **`system_users`**: Usuários do sistema vinculados ao Supabase Auth (`custom_permissions`, `role`).
12. **`announcements`**: Comunicados e avisos internos gerais e individuais.
13. **`payments`**: Módulo financeiro - repasses a profissionais (`total_amount`, `status`, `payment_method`).
14. **`expenses`**: Módulo financeiro - controle de custos e despesas da clínica.
15. **`audit_logs`**: Tabela de logs de auditoria do sistema:
    - Campos: `id` (UUID), `user_name`, `user_role`, `category` (`'schedule'`|`'patients'`|`'services_plans'`|`'financial'`|`'users'`), `action`, `details`, `created_at`.

---

## ⚙️ 2. BACKEND & CAMADA DE API (`src/services/api.ts`)

- **`unitsApi`**: Gestão de unidades e suporte inteligente ao ID `'ALL'` no `getById`.
- **`auditLogsApi`**: Serviço real para consulta e gravação de logs de auditoria no PostgreSQL. Oculta silenciosamente o perfil `super_admin`.
- **`sessionsApi`**: Agendamento de sessões com filtro de unidade e suporte ao seletor quando `ALL` estiver selecionado.
- **`financialApi`**: Controle de repasses aos profissionais, despesas (`ExpenseModal`) e receitas entrantes (`RevenueModal`).

---

## 💻 3. FRONTEND & COMPONENTES (`components/`)

- **`App.tsx`**: Roteamento principal e permissões por papel.
- **`Settings.tsx`**: Configurações da clínica (`/settings`), com guia dedicada de **Logs de Auditoria & Sistema** (`/settings?tab=logs`) e modal unificado para Criar/Editar Colaborador (`UserModal`). Card "Geral & Sistema" removido.
- **`Financial.tsx`**: Redesign responsivo em Widescreen (`max-w-2xl`) para os modais **Registrar Pagamento**, **Lançar Nova Despesa** e **Lançar Nova Receita Entrante** com grid de 4 colunas para formas de pagamento (PIX, TED, Dinheiro, Cartão Crédito, Cartão Débito, Cheque).
- **`AppointmentModal.tsx`**: Modal de agendamento com seletor de unidade quando a visão "Todas as Unidades" estiver ativa.

---

## 🚀 4. INFRAESTRUTURA & SCRIPTS DE DEPLOYMENT

### 4.1 Mapeamento em Produção (VPS Única `23.80.89.116`)
- **Domínio**: `https://fisiostarclinica.com.br`
- **Servidor Host**: VPS Produção `mdr-vps` (`23.80.89.116`)
- **Reverse Proxy**: Caddy Master (`/etc/caddy/Caddyfile`) com TLS automático.
- **Container Frontend**: Nginx + React SPA (`fisiostar-frontend` na porta `3005`).
- **Container Backend**: Gateway Supabase Kong (`supabase-kong-fisiostar` na porta `8020`), PostgreSQL (`supabase-db-fisiostar`).

### 4.2 Script de Deploy Automático (`deploy-fisiostar.ps1` / `deploy-fisiostar.sh`)
Para realizar o deploy completo na VPS com 1 comando:

```powershell
# No PowerShell local:
.\deploy-fisiostar.ps1
```

```bash
# No Git Bash / Linux:
./deploy-fisiostar.sh
```

**Etapas executadas pelo script:**
1. Compilação de teste `npx tsc --noEmit`.
2. Empacotamento limpo em `fisiostar-update.tar.gz`.
3. Upload via SCP para `root@23.80.89.116:/root/fisiostar-clinica/frontend/`.
4. Recompilação sem cache na VPS via `docker compose build --no-cache && docker compose up -d`.
5. Limpeza de temporários.
