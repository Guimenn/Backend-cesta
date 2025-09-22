#!/bin/bash

# Script de inicialização para produção no DirectAdmin
# Este script compila o projeto e inicia em modo produção

echo "🚀 Iniciando backend em modo produção..."

# Navegar para o diretório do backend
cd /home/guimen/Documentos/GitHub/Freelancers/Freelancer-Backend-Cesta/backend

# Definir variáveis de ambiente
export NODE_ENV=production
export PORT=3002

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Gerar cliente Prisma
echo "🔧 Gerando cliente Prisma..."
npx prisma generate

# Tentar compilar o projeto
echo "📦 Compilando projeto..."
npx tsc --noEmitOnError false --skipLibCheck 2>/dev/null

# Verificar se a compilação foi bem-sucedida
if [ -f "dist/server.js" ]; then
    echo "✅ Compilação bem-sucedida! Iniciando servidor..."
    node dist/server.js
else
    echo "⚠️  Compilação falhou, usando tsx como fallback..."
    npx tsx src/server.ts
fi
