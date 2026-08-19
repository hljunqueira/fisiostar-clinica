-- ==============================================================================
-- FisioStar: Chat V2 - Limpeza de duplicados, Ícones de Canais e Favoritos
-- ==============================================================================

-- 1. Adicionar coluna de ícone aos canais (se não existir)
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📢';
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Limpeza de canais duplicados mantendo o mais antigo de cada nome/tipo
DELETE FROM chat_channels a
USING chat_channels b
WHERE a.id > b.id 
  AND a.name = b.name 
  AND a.type = b.type
  AND (a.unit_id = b.unit_id OR (a.unit_id IS NULL AND b.unit_id IS NULL));

-- 3. Tabela de Favoritos / Canais Fixados por Usuário
CREATE TABLE IF NOT EXISTS chat_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_favorites_user ON chat_favorites(user_id);
