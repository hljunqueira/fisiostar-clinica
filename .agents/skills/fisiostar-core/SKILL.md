---
name: fisiostar-core
description: Mapeamento completo do sistema FisioStar (Banco de Dados, APIs, Componentes React, Autenticação, Permissões e Deploy). Deve ser utilizado para entender o funcionamento do sistema e realizar alterações no código ou infraestrutura.
---

# FisioStar Core Skill

Esta skill fornece instruções operacionais detalhadas para o desenvolvimento, manutenção e suporte do sistema **FisioStar**.

---

## 🎯 Quando Usar Esta Skill

Use esta skill sempre que for:
1. Adicionar ou alterar funcionalidades no frontend (React / TypeScript).
2. Criar ou alterar tabelas, views, triggers ou funções no Supabase (PostgreSQL).
3. Modificar métodos de integração de API em `src/services/api.ts`.
4. Trabalhar com a agenda multi-unidade, substituição de profissional ou prontuários.
5. Realizar novos deploys ou atualizações no ambiente de produção (`fisiostarclinica.com.br`).

---

## 📂 Visão Geral da Arquitetura de Código

### Stack Principal
- **Frontend**: React 18 (Hooks, Context API), TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Backend / BaaS**: Supabase Self-Hosted (PostgreSQL 15, GoTrue Auth, PostgREST).
- **Servidor Web**: Nginx em container Docker (`fisiostar-frontend`).
- **Proxy Inverso**: Caddy Server no host da VPS (`mdr-vps`).

---

## 🛠️ Procedimento de Desenvolvimento Local

### 1. Iniciar o Servidor
```bash
# 1. Instalar dependências (se necessário)
npm install

# 2. Iniciar servidor de desenvolvimento (Porta 3000)
npm run dev
```
Acesse em: `http://localhost:3000`

### 3. Compilação e Validação de Tipos
Antes de concluir qualquer tarefa, valide a compilação:
```bash
npm run build
```

---

## 🗄️ Estrutura de Tabelas e Chaves do Banco

- `units`: Filiais da clínica.
- `unit_operating_hours`: Horários de funcionamento (por dia da semana).
- `unit_holidays`: Feriados cadastrados por unidade.
- `specialties`: Especialidades clínicas.
- `professionals`: Profissionais de fisioterapia e saúde.
- `professional_units`: Associação N:N entre profissional e unidade.
- `patients`: Dados do paciente, anamnese e foto.
- `patient_plans`: Sessões totais e restantes do plano do paciente.
- `plan_templates`: Templates de pacotes/planos.
- `sessions`: Agendamentos (`patient_id`, `professional_id`, `unit_id`, `date`, `time`, `status`, `notes`, `signed`).
- `system_users`: Controle de permissões e associação com `auth_user_id`.
- `payments` / `expenses`: Módulo financeiro de repasses e custos.

---

## 🚀 Fluxo de Deploy em Produção

1. **Geração do Pacote Local**:
   ```bash
   tar --exclude="node_modules" --exclude=".git" -czf fisiostar-update.tar.gz .
   ```
2. **Transferência para a VPS**:
   ```bash
   scp -F NUL -i ~/.ssh/id_ed25519 fisiostar-update.tar.gz root@mdr-vps:/root/fisiostar-clinica/frontend/
   ```
3. **Rebuild e Restart do Container**:
   ```bash
   ssh -F NUL -i ~/.ssh/id_ed25519 root@mdr-vps "cd /root/fisiostar-clinica/frontend && tar -xzf fisiostar-update.tar.gz && rm fisiostar-update.tar.gz && docker compose build --no-cache && docker compose up -d"
   ```
4. **Validação**:
   ```bash
   curl -s -I https://fisiostarclinica.com.br/
   ```
