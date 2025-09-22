# Instruções para CloudLinux NodeJS Selector

## ⚠️ Problema Identificado
O CloudLinux NodeJS Selector exige que os `node_modules` sejam armazenados em uma pasta separada (ambiente virtual) apontada por um symlink.

## 🔧 Solução

### 1. Configurar Ambiente Virtual no CloudLinux

1. **Acesse o painel do CloudLinux**
2. **Vá para "Node.js Selector"**
3. **Crie um novo ambiente virtual:**
   - Nome: `freelancer-backend`
   - Versão do Node.js: `18.x` ou `20.x`
   - Diretório: `/home/guimen/Documentos/GitHub/Freelancers/Freelancer-Backend-Cesta/backend`

### 2. Instalar Dependências

Após criar o ambiente virtual, execute:

```bash
cd /home/guimen/Documentos/GitHub/Freelancers/Freelancer-Backend-Cesta/backend
npm install
```

### 3. Configurar Aplicação

No painel do CloudLinux, configure:

- **Caminho da aplicação**: `/home/guimen/Documentos/GitHub/Freelancers/Freelancer-Backend-Cesta/backend`
- **Comando de inicialização**: `./start-cloudlinux.sh`
- **Porta**: `3002`

### 4. Scripts Disponíveis

- **`start-cloudlinux.sh`** - Script principal para CloudLinux
- **`cloudlinux-setup.sh`** - Script de configuração automática
- **`start-production.sh`** - Script alternativo

## 🚀 Comandos de Teste

```bash
# Testar se o ambiente está configurado
ls -la node_modules  # Deve ser um symlink

# Testar o script
./start-cloudlinux.sh

# Verificar se está funcionando
curl http://localhost:3002/api/health
```

## 📋 Checklist

- [ ] Ambiente virtual criado no CloudLinux
- [ ] Symlink `node_modules` configurado
- [ ] Dependências instaladas
- [ ] Script de inicialização configurado
- [ ] Aplicação testada e funcionando

## 🔍 Troubleshooting

### Erro: "node_modules must be a symlink"
- Verifique se o ambiente virtual foi criado corretamente
- Confirme que o symlink `node_modules` existe
- Reinstale as dependências se necessário

### Erro: "Cannot find module"
- Verifique se as dependências foram instaladas no ambiente virtual
- Confirme que o symlink está apontando para o diretório correto

### Erro: "Port already in use"
- Pare outros processos na porta 3002
- Use `lsof -ti:3002 | xargs kill -9` para liberar a porta
