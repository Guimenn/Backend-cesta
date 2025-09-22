# Script de inicialização para DirectAdmin
# Este script ignora erros de TypeScript e inicia o servidor

echo "🚀 Iniciando servidor backend..."

# Tentar compilar primeiro
echo "📦 Tentando compilar..."
npm run build 2>/dev/null || echo "⚠️  Compilação falhou, usando modo desenvolvimento..."

# Se a compilação falhou, usar tsx diretamente
if [ ! -f "dist/server.js" ]; then
    echo "🔄 Usando tsx (modo desenvolvimento)..."
    npx tsx src/server.ts
else
    echo "✅ Usando versão compilada..."
    node dist/server.js
fi
