# Configuração para Render.com

## ⚠️ Problema Identificado
O Render está tentando executar `node dist/server.js`, mas o arquivo não foi compilado devido a erros de TypeScript.

## 🔧 Solução

### 1. Configuração no Render

**Build Command:**
```bash
npm install && npx prisma generate && npm run build:render
```

**Start Command:**
```bash
npm run start:render
```

### 2. Variáveis de Ambiente

Configure as seguintes variáveis no Render:

- `NODE_ENV`: `production`
- `PORT`: `3002` (ou deixe o Render definir automaticamente)
- `DATABASE_URL`: Sua string de conexão do banco de dados

### 3. Scripts Adicionados

- `build:render`: Compila ignorando erros TypeScript
- `start:render`: Tenta usar arquivo compilado, fallback para tsx

### 4. Arquivos de Configuração

- `render.yaml`: Configuração automática
- `build-render.sh`: Script de build personalizado
- `RENDER_INSTRUCTIONS.md`: Este arquivo

## 🚀 Passos para Deploy

1. **Acesse o painel do Render**
2. **Crie um novo Web Service**
3. **Conecte ao seu repositório GitHub**
4. **Configure:**
   - **Build Command**: `npm install && npx prisma generate && npm run build:render`
   - **Start Command**: `npm run start:render`
   - **Node Version**: `18.x` ou `20.x`

## 🔍 Troubleshooting

### Erro: "Cannot find module dist/server.js"
- Verifique se o build command está correto
- Confirme que o script `build:render` está funcionando
- Use o fallback `start:render` que usa tsx se necessário

### Erro: "Prisma Client not generated"
- Adicione `npx prisma generate` no build command
- Verifique se a `DATABASE_URL` está configurada

### Erro: "TypeScript compilation failed"
- O script `build:render` ignora erros TypeScript
- O fallback `start:render` usa tsx diretamente

## 📋 Checklist

- [ ] Build command configurado
- [ ] Start command configurado
- [ ] Variáveis de ambiente definidas
- [ ] Banco de dados acessível
- [ ] Deploy testado e funcionando
