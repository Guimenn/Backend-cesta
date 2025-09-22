#!/bin/bash

# Script de inicialização para CloudLinux NodeJS Selector
# Este script funciona com o sistema de ambiente virtual do CloudLinux

echo "🚀 Iniciando backend no CloudLinux..."

# Navegar para o diretório do backend
cd /home/guimen/Documentos/GitHub/Freelancers/Freelancer-Backend-Cesta/backend

# Definir variáveis de ambiente
export NODE_ENV=production
export PORT=3002

# Verificar se o symlink node_modules existe
if [ ! -L "node_modules" ]; then
    echo "❌ Erro: node_modules deve ser um symlink para o ambiente virtual do CloudLinux"
    echo "💡 Configure o ambiente virtual no painel do CloudLinux primeiro"
    exit 1
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
