# FisioStar - Diretrizes e Regras do Projeto (AGENTS.md)

Este arquivo contém as diretrizes fundamentais, convenções e regras que **TODOS** os agentes de IA devem seguir estritamente ao trabalhar neste repositório.

---

## 📌 Contexto Rápido do Projeto

- **Nome**: FisioStar - Sistema de Gestão de Clínica de Fisioterapia
- **Domínio Principal**: [https://fisiostarclinica.com.br](https://fisiostarclinica.com.br)
- **Stack**: React 18 + TypeScript + Vite + Tailwind CSS + Supabase (PostgreSQL, Auth, RLS) + Docker + Caddy
- **Ambiente Local**: `npm run dev` na porta `3000` (`http://localhost:3000`)
- **VPS Host**: `mdr-vps` (Docker SPA na porta `3005`, Supabase Kong na porta `8020`)

---

## 🚨 Regras Obrigatórias e Invioláveis

1. **Sem Endereços IP Brutos**:
   - NUNCA inclua endereços IP públicos brutos (como IPv4 numéricos) na documentação, código ou mensagens.
   - Utilize sempre os nomes de domínio (`fisiostarclinica.com.br`), hosts do SSH (`mdr-vps`, `vps-supabase`) ou `localhost`.

2. **Leitura Obrigatória no Início da Conversa**:
   - Ao iniciar qualquer atendimento neste repositório, consulte [.agents/MEMORY.md](file:///.agents/MEMORY.md) e [.agents/skills/fisiostar-core/SKILL.md](file:///.agents/skills/fisiostar-core/SKILL.md) para obter o mapa completo do banco de dados, frontend, backend e fluxos de trabalho.

3. **Nunca Adivinhar Código ou Schemas**:
   - Sempre inspecione os arquivos autoritativos em `supabase/schema.sql`, `supabase/financial_schema.sql`, `types.ts` e `src/services/api.ts` antes de implementar ou alterar funções.

4. **Preservação de Contratos de API**:
   - Não altere assinaturas de funções em `src/services/api.ts` sem atualizar todos os componentes chamadores.
   - Respeite as permissões e enums (`UserRole`: `admin`, `secretary`, `professional`; `SessionStatus`: `Agendada`, `Confirmada`, `Realizada`, `Cancelada`, `Falta`).

5. **Verificação Empírica Pós-Edição**:
   - Sempre execute a compilação ou build de teste (`npm run build` ou `npx tsc --noEmit`) após alterações de código para garantir que não existam erros de TypeScript ou syntax.

---

## 📁 Links Úteis do Projeto

- [README.md](file:///README.md)
- [MEMORY.md](file:///.agents/MEMORY.md)
- [SKILL - FisioStar Core](file:///.agents/skills/fisiostar-core/SKILL.md)
- [Schema do Banco](file:///supabase/schema.sql)
- [Schema Financeiro](file:///supabase/financial_schema.sql)
- [API Service Layer](file:///src/services/api.ts)
- [Tipos Globais](file:///types.ts)
