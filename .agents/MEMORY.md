# FisioStar - Memória do Projeto (MEMORY.md)

Este documento contém o mapeamento completo e detalhado da arquitetura do banco de dados, backend, frontend e infraestrutura do sistema FisioStar.

---

## 🗄️ 1. BANCO DE DADOS (PostgreSQL / Supabase)

### 1.1 Schemas e Enums
- **`user_role`**: `'admin'`, `'secretary'`, `'professional'`
- **`session_status`**: `'Agendada'`, `'Confirmada'`, `'Realizada'`, `'Cancelada'`, `'Falta'`
- **`patient_status`**: `'Active'`, `'Inactive'`
- **`announcement_type`**: `'info'`, `'warning'`, `'urgent'`
- **`target_role`**: `'all'`, `'professional'`, `'secretary'`
- **`week_day`**: `'sunday'`, `'monday'`, `'tuesday'`, `'wednesday'`, `'thursday'`, `'friday'`, `'saturday'`

### 1.2 Tabelas Principais

1. **`units`**: Unidades/filiais da clínica.
   - Campos: `id` (UUID), `name`, `city`, `has_pool`, `is_active`, `created_at`, `updated_at`.
2. **`unit_operating_hours`**: Horário de funcionamento das unidades.
   - Campos: `id`, `unit_id` (FK), `day` (week_day), `is_open`, `start_time`, `end_time`.
3. **`unit_holidays`**: Feriados e datas de fechamento por unidade.
   - Campos: `id`, `unit_id` (FK), `date`, `name`.
4. **`specialties`**: Especialidades oferecidas (Fisioterapia, Hidroterapia, RPG, Pilates, etc.).
5. **`professionals`**: Cadastro de profissionais de saúde.
   - Campos: `id`, `name`, `crf`, `specialty`, `hourly_rate`, `color`.
6. **`professional_units`**: Relação N:N entre profissionais e unidades.
7. **`patients`**: Cadastro de pacientes.
   - Campos: `id`, `name`, `unit_id` (FK), `phone`, `cpf`, `birth_date`, `address`, `city`, `status`, `photo_url`, `facial_descriptor`, `last_visit`.
8. **`patient_plans`**: Planos contratados pelos pacientes.
   - Campos: `id`, `patient_id` (FK), `name`, `total_sessions`, `remaining_sessions`, `expires_at`.
9. **`plan_templates`**: Modelos reutilizáveis de planos de tratamento.
10. **`sessions`**: Agendamentos e consultas.
    - Campos: `id`, `patient_id` (FK), `professional_id` (FK), `unit_id` (FK), `date`, `time`, `duration_minutes`, `type`, `status` (session_status), `notes`, `signed`, `signature_url`, `is_outside_plan`, `price`.
11. **`system_users`**: Usuários do sistema vinculados ao Supabase Auth.
    - Campos: `id`, `auth_user_id` (FK unique), `name`, `email`, `role` (user_role), `unit_id` (FK), `custom_permissions` (array).
12. **`announcements`**: Comunicados e avisos internos.
    - Campos: `id`, `title`, `message`, `type` ('info'|'warning'|'urgent'), `date`, `target_role` ('all'|'professional'|'secretary'|'individual'), `target_professional_id` (FK optional).
13. **`payments`**: Módulo financeiro - repasses e pagamentos a profissionais.
    - Campos: `id`, `professional_id`, `period_start`, `period_end`, `total_sessions`, `amount_per_session`, `total_amount`, `status` ('pending'|'paid'|'cancelled'), `paid_at`, `paid_by`, `payment_method`.
14. **`expenses`**: Módulo financeiro - controle de custos e despesas da clínica.

---

## ⚙️ 2. BACKEND (Supabase & API Layer)

- **Auth**: Supabase Auth (JWT) integrado com `system_users`.
- **API Services ([src/services/api.ts](file:///src/services/api.ts))**:
  - `unitsApi`: Operações CRUD de unidades, horários e feriados.
  - `professionalsApi`: Operações de profissionais e associação de unidades.
  - `patientsApi`: Gestão de pacientes, planos, prontuário e biometria facial.
  - `sessionsApi`: Agendamento de sessões com filtro inteligente de unidade (ignora `'ALL'` em queries de UUID).
  - `specialtiesApi`, `planTemplatesApi`, `announcementsApi`, `systemUsersApi`.
  - `financialApi` ([src/services/financial-api.ts](file:///src/services/financial-api.ts)): Controle de repasses aos profissionais e receitas/despesas da clínica.
  - `notificationsApi`: Sistema de notificações internas.

---

## 💻 3. FRONTEND (React + TypeScript + Vite)

### 3.1 Componentes Principais ([components/](file:///components/))
- **`App.tsx`**: Roteamento principal, renderização por perfil (`admin`, `secretary`, `professional`), cabeçalho com menu dropdown de unidade (`z-[60]`).
- **`Dashboard.tsx`**: Painel geral com estatísticas, métricas de sessões e avisos.
- **`SecretaryDashboard.tsx`**: Visão simplificada focada em recepção e agendamento.
- **`ProfessionalPortal.tsx`**: Portal exclusivo do profissional para visualizar sua agenda do dia, rendimentos em tempo real e assinar evoluções.
- **`AnnouncementsView.tsx`**: Painel e gerenciamento de comunicados internos gerais e individuais.
- **`Schedule.tsx`**: Tela principal de agendamento multi-unidade.
- **`Calendar/`**: `CalendarHeader.tsx`, `DayView.tsx`, `WeekView.tsx`, `MonthView.tsx`, `DayListView.tsx`, `WeekListView.tsx`.
- **`Patients.tsx`**: Gestão completa de pacientes, histórico de consultas, planos e prontuário.
- **`FacialScanModal.tsx`**: Modal interativo para biometria facial do paciente.
- **`SignatureModal.tsx`**: Modal interativo com canvas para colher Assinatura Digital.
- **`Professionals.tsx`**: Gestão da equipe, especialidades, valor-hora e unidades de atendimento.
- **`Units.tsx`**: Configuração de filiais, cadastramento de feriados e horários de funcionamento.
- **`Financial.tsx` / `FinancialDashboard.tsx`**: Relatório de repasses a pagar aos profissionais e controle de caixa.
- **`Settings.tsx`**: Configurações de permissões do sistema, usuários e perfil.

---

## 🔑 4. USUÁRIOS DEMO DE TESTE

- **Administrador**: `admin@fisiostar.com` / `123456`
- **Secretária**: `nay@fisiostar.com` / `123456` (Nairelle Secretaria)
- **Profissional (Pilates)**: `pedro@fisiostar.com` / `123456` (Dr. Pedro Santos, Valor Hora: R$ 85,00)
- **Profissional (Fisioterapia)**: `ana.silva@fisiostar.com` / `123456` (Dra. Ana Silva, Valor Hora: R$ 80,00)

---

## 🚀 5. INFRAESTRUTURA & DEPLOYMENT

- **Ambiente Local**: `npm run dev` na porta `3000` ou `3001` (`http://localhost:3001`).
- **Ambiente de Produção**:
  - **Domínio**: `https://fisiostarclinica.com.br`
  - **Servidor Host**: VPS Produção (`mdr-vps`)
  - **Reverse Proxy**: Caddy (`/etc/caddy/Caddyfile`) com TLS automático.
  - **Container Frontend**: SPA React compilado em Nginx (`fisiostar-frontend` na porta `3005`).
  - **Container Backend**: Gateway Supabase Kong (`supabase-kong-fisiostar` na porta `8020`).
