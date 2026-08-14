# FisioStar - Sistema de Gestão de Clínica de Fisioterapia

Sistema completo e moderno para gestão de clínicas de fisioterapia com autenticação, agendamento multi-unidade, controle de prontuários com assinatura digital, substituição de profissionais e dashboards financeiros.

---

## 🌐 Produção

- **URL do Sistema**: [https://fisiostarclinica.com.br](https://fisiostarclinica.com.br)
- **Infraestrutura**: VPS Produção (`mdr-vps`)
- **Reverse Proxy / SSL**: Caddy Server (HTTPS automático com certificado TLS Let's Encrypt)
- **Containers Docker em Produção**:
  - `fisiostar-frontend`: Nginx + SPA React (Porta 3005)
  - `supabase-kong-fisiostar`: Supabase Gateway API (Porta 8020)
  - `supabase-studio-fisiostar`: Supabase Dashboard Studio (Porta 8021)
  - `supabase-db-fisiostar`: PostgreSQL (Porta 5435)

---

## 🚀 Stack Tecnológica

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Recharts
- **Backend**: Supabase Self-Hosted (PostgreSQL 15, GoTrue Auth, PostgREST, Supavisor)
- **Infraestrutura**: Docker & Docker Compose + Caddy Proxy

---

## 💻 Desenvolvimento Local

### 1. Pré-requisitos
- Node.js 18+ instalado
- npm ou yarn

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente (`.env`)
Crie o arquivo `.env` na raiz do projeto (baseado em `.env.example`):
```env
VITE_SUPABASE_URL=https://fisiostarclinica.com.br
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Iniciar o Servidor Local
```bash
npm run dev
```
O aplicativo estará disponível em: `http://localhost:3000`

---

## 👤 Perfis e Credenciais de Acesso (Demo)

- **Administrador**: `admin@fisiostar.com` / `123456`
- **Secretária**: `julia@fisiostar.com` / `123456`
- **Profissional**: `ana.silva@fisiostar.com` / `123456`

---

## 📁 Estrutura do Projeto

```
fisiostar-clinica/
├── components/           # Componentes da interface React
│   ├── Calendar/        # Visualizações de calendário (Dia, Semana, Mês)
│   ├── Dashboard.tsx    # Dashboard principal
│   ├── Financial.tsx    # Gestão e relatórios financeiros
│   ├── Patients.tsx     # Gestão completa de pacientes e prontuários
│   ├── Professionals.tsx# Gestão e agenda dos profissionais
│   ├── Schedule.tsx     # Sistema de agendamento de sessões
│   └── Units.tsx        # Cadastro de unidades e filiais
├── src/
│   ├── contexts/        # AuthContext e estado global
│   ├── lib/            # Cliente do Supabase
│   └── services/       # Serviços de integração com a API
├── supabase/           # Scripts SQL e schemas de banco de dados
├── types.ts            # Tipagens TypeScript
├── vite.config.ts      # Configuração do Vite (Porta 3000)
└── .env                # Variáveis de ambiente
```

---

## 🎯 Funcionalidades Implementadas

### 🏥 Gestão Clínica & Agendamento
- **Multi-unidade**: Alternância e visibilidade de horários entre diferentes unidades da clínica.
- **Substituição de Profissionais**: Permite alterar o profissional designado para uma consulta sem perder o histórico.
- **Agenda Inteligente**: Visualização em lista, dia, semana e mês com controle de status da sessão (Agendado, Realizado, Cancelado, Falta).

### 📋 Pacientes & Prontuário Digital
- Cadastro detalhado de pacientes com plano de tratamento.
- Anamnese, histórico de sessões e evoluções.
- Modal com **Assinatura Digital** para confirmação do paciente/profissional.

### 📊 Gestão Financeira & Dashboards
- Relatórios de faturamento por unidade, tratamento e profissional.
- Métricas em tempo real e gráficos informativos.

---

## 🛠️ Comandos Úteis

```bash
npm run dev        # Inicia o servidor de desenvolvimento na porta 3000
npm run build      # Compila a aplicação para produção
npm run preview    # Visualiza o build de produção localmente
```

---

**Desenvolvido para FisioStar** 🏥
