# FisioStar - Sistema de Gestão de Clínica de Fisioterapia

Sistema completo de gestão para clínicas de fisioterapia com autenticação, agendamento, prontuários e controle de unidades.

## 🚀 Stack Tecnológica

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (BaaS - Backend as a Service)
- **Database**: PostgreSQL (via Supabase)
- **Autenticação**: Supabase Auth
- **UI**: Tailwind CSS + Lucide Icons

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase (gratuita)

## 🔧 Configuração Inicial

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Banco de Dados Supabase

1. Acesse seu projeto Supabase: https://paurrgakxtxbmgnstwbm.supabase.co

2. Vá para **SQL Editor** e execute os seguintes scripts na ordem:

   **a) Schema (criar tabelas):**
   - Copie todo o conteúdo de `supabase/schema.sql`
   - Cole no SQL Editor e execute

   **b) Seed Data (dados iniciais):**
   - Copie todo o conteúdo de `supabase/seed.sql`
   - Cole no SQL Editor e execute

### 3. Criar Usuários de Teste

No Supabase, vá para **Authentication** → **Users** → **Add User** e crie:

**Admin:**
  - Email: `admin@fisiostar.com`
  - Password: `123456`

**Secretária:**
  - Email: `julia@fisiostar.com`
  - Password: `123456`

**Profissional:**
  - Email: `ana.silva@fisiostar.com`
  - Password: `123456`

### 4. Iniciar o Projeto

```bash
npm run dev:all
```

O aplicativo estará disponível em: `http://localhost:5173`

## 👤 Credenciais de Login

Use uma das contas criadas acima para fazer login:

- **Admin**: admin@fisiostar.com / 123456
- **Secretária**: julia@fisiostar.com / 123456
- **Profissional**: ana.silva@fisiostar.com / 123456

## 📁 Estrutura do Projeto

```
fisiostar-clinica/
├── components/           # Componentes React da aplicação
├── src/
│   ├── contexts/        # Context API (AuthContext)
│   ├── lib/            # Configuração do Supabase
│   └── services/       # API Layer (CRUD operations)
├── supabase/           # Scripts SQL para banco de dados
│   ├── schema.sql      # Estrutura das tabelas
│   └── seed.sql        # Dados iniciais
├── types.ts            # Definições TypeScript
├── constants.ts        # Constantes (deprecated - usar DB)
├── .env               # Variáveis de ambiente (credenciais)
└── App.tsx           # Componente principal
```

## 🗄️ Estrutura do Banco de Dados

O sistema possui 12 tabelas principais:

- `specialties` - Especialidades oferecidas
- `units` - Unidades/filiais com horários e feriados
- `professionals` - Profissionais de saúde
- `patients` - Pacientes com planos ativos
- `sessions` - Agendamentos e consultas
- `plan_templates` - Templates de planos de tratamento
- `system_users` - Usuários do sistema
- `announcements` - Avisos e comunicados

## 🔐 Variáveis de Ambiente

O arquivo `.env` já está configurado com as credenciais do seu projeto Supabase:

```env
VITE_SUPABASE_URL=https://paurrgakxtxbmgnstwbm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

**⚠️ Importante**: O `.env` está no `.gitignore` e não será commitado.

## 🎯 Funcionalidades

### Por Tipo de Usuário

**Admin:**
- ✅ Dashboard com estatísticas
- ✅ Agendamento completo
- ✅ Gestão de pacientes
- ✅ Gestão de profissionais
- ✅ Gestão de unidades
- ✅ Configurações do sistema

**Secretária:**
- ✅ Dashboard
- ✅ Agendamento
- ✅ Gestão de pacientes

**Profissional:**
- ✅ Portal exclusivo
- ✅ Visualização da própria agenda
- ✅ Assinatura digital de evoluções

## 🛠️ Desenvolvimento

### Comandos Disponíveis

```bash
npm run dev        # Inicia servidor de desenvolvimento
npm run dev:all    # Alias para dev (Supabase é BaaS)
npm run build      # Build para produção
npm run preview    # Preview do build de produção
```

### Adicionar Novos Dados

Você pode adicionar dados diretamente:
1. Via interface do aplicativo (após login)
2. Via SQL Editor do Supabase
3. Via funções da API em `src/services/api.ts`

## 📝 Próximos Passos

1. ✅ **Remover `constants.ts`**: Todos os dados agora vêm do banco
2. 🔄 **Migrar componentes**: Atualizar Dashboard, Schedule, Patients, etc. para usar a API
3. 🔄 **Implementar Realtime**: Usar Supabase Realtime para atualiz ações automáticas
4. 🔄 **Upload de Fotos**: Configurar Supabase Storage para fotos de pacientes
5. 🔄 **Relatórios**: Adicionar geração de relatórios em PDF

## 🐛 Troubleshooting

**Erro ao fazer login:**
- Verifique se criou os usuários no Supabase Authentication
- Confirme que os emails correspondem aos da tabela `system_users`

**Erro de conexão com Supabase:**
- Confirme que o `.env` está configurado corretamente
- Verifique se as variáveis começam com `VITE_`

**Tabelas vazias:**
- Execute novamente o `seed.sql` no SQL Editor

## 📧 Suporte

Para questões técnicas, consulte a documentação do Supabase: https://supabase.com/docs

---

**Desenvolvido com ❤️ para FisioStar**
