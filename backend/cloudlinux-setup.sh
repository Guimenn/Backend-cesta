#!/bin/bash

# Script de configuração para CloudLinux NodeJS Selector
# Este script configura o ambiente virtual conforme exigido pelo CloudLinux

echo "🔧 Configurando ambiente para CloudLinux NodeJS Selector..."

# Navegar para o diretório do backend
cd /home/guimen/Documentos/GitHub/Freelancers/Freelancer-Backend-Cesta/backend

# Verificar se já existe um symlink node_modules
if [ -L "node_modules" ]; then
    echo "✅ Symlink node_modules já existe"
else
    echo "📦 Criando ambiente virtual..."
    
    # Criar diretório para ambiente virtual
    mkdir -p ../nodejs_env
    
    # Instalar dependências no ambiente virtual
    echo "📦 Instalando dependências no ambiente virtual..."
    cd ../nodejs_env
    npm install ../backend/package.json
    
    # Voltar para o diretório do backend
    cd ../backend
    
    # Criar symlink para node_modules
    ln -sf ../nodejs_env/node_modules node_modules
    
    echo "✅ Ambiente virtual configurado com sucesso!"
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
