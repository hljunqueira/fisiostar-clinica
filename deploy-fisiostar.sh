#!/bin/bash
# Script de Deploy Automatizado - FisioStar Clinica (Bash)
# Execução: ./deploy-fisiostar.sh

set -e

echo "🚀 [1/6] Iniciando verificação TypeScript (tsc)..."
npx tsc --noEmit
echo "✅ TypeScript verificado sem erros!"

echo ""
echo "📦 [2/6] Gerando arquivo compactado fisiostar-update.tar.gz..."
rm -f fisiostar-update.tar.gz
tar --exclude="node_modules" --exclude=".git" --exclude="fisiostar-update.tar.gz" -czf fisiostar-update.tar.gz .
echo "✅ Arquivo gerado com sucesso!"

echo ""
echo "📤 [3/6] Enviando arquivo via SCP para a VPS (23.80.89.116)..."
SSH_KEY="$HOME/.ssh/id_ed25519"
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no fisiostar-update.tar.gz root@23.80.89.116:/root/fisiostar-clinica/frontend/
echo "✅ Upload concluído com sucesso!"

echo ""
echo "🏗️ [4/6] Reconstruindo container Docker no servidor..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no root@23.80.89.116 "cd /root/fisiostar-clinica/frontend && tar -xzf fisiostar-update.tar.gz && rm -f fisiostar-update.tar.gz && docker compose build --no-cache && docker compose up -d"
echo "✅ Container docker reconstruído e iniciado na VPS!"

echo ""
echo "🧹 [5/6] Limpando arquivos temporários..."
rm -f fisiostar-update.tar.gz

echo ""
echo "🎉 [6/6] DEPLOY CONCLUÍDO COM SUCESSO!"
echo "🌐 Acesse a aplicação atualizada em: https://fisiostarclinica.com.br"
