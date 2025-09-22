# Whisper Backend API

Backend completo em MVC para o sistema Whisper of Shadows Unseen, substituindo todas as funções RPC do Supabase por uma API REST robusta e escalável.

## 🏗️ Arquitetura

Este projeto segue o padrão **MVC (Model-View-Controller)** com as seguintes camadas:

- **Models**: Schema do Prisma e tipos TypeScript
- **Views**: Respostas JSON da API
- **Controllers**: Lógica de negócio e manipulação de dados
- **Routes**: Definição de endpoints da API
- **Middleware**: Autenticação, autorização e auditoria
- **Services**: Lógica de negócio complexa (futuro)

## 🚀 Tecnologias

- **Node.js** + **Express.js**
- **TypeScript** para tipagem estática
- **Prisma** como ORM
- **PostgreSQL** como banco de dados
- **JWT** para autenticação
- **bcrypt** para hash de senhas
- **UUID** para identificadores únicos

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── controllers/          # Controladores MVC
│   │   ├── authController.ts
│   │   ├── clientController.ts
│   │   ├── saleController.ts
│   │   ├── receiptController.ts
│   │   └── vendorController.ts
│   ├── middleware/           # Middlewares
│   │   ├── auth.ts          # Autenticação JWT
│   │   ├── audit.ts         # Sistema de auditoria
│   │   └── errorHandler.ts  # Tratamento de erros
│   ├── routes/              # Definição de rotas
│   │   ├── auth.ts
│   │   ├── clients.ts
│   │   ├── sales.ts
│   │   ├── receipts.ts
│   │   ├── vendors.ts
│   │   └── index.ts
│   ├── types/               # Tipos TypeScript
│   │   └── index.ts
│   ├── lib/                 # Bibliotecas e configurações
│   │   └── prisma.ts
│   ├── prisma/              # Schema e migrações
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── server.ts            # Servidor principal
├── package.json
├── tsconfig.json
├── env.example
└── README.md
```

## 🔧 Instalação

### Pré-requisitos

- Node.js 18+ 
- PostgreSQL 14+
- npm ou yarn

### Passos

1. **Clonar o repositório**
   ```bash
   git clone <repository-url>
   cd whisper-backend
   ```

2. **Instalar dependências**
   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente**
   ```bash
   cp env.example .env
   # Editar .env com suas configurações
   ```

4. **Configurar banco de dados**
   ```bash
   # Gerar cliente Prisma
   npm run db:generate
   
   # Aplicar schema ao banco
   npm run db:push
   
   # Opcional: Executar seed
   npm run db:seed
   ```

5. **Executar o servidor**
   ```bash
   # Desenvolvimento
   npm run dev
   
   # Produção
   npm run build
   npm start
   ```

## 🌐 Endpoints da API

### Autenticação (`/api/auth`)
- `POST /login` - Login de usuário
- `POST /register` - Registro de novo usuário
- `GET /needs-admin-setup` - Verificar se precisa de setup admin
- `POST /enable-admin-setup` - Habilitar setup admin
- `POST /assign-role` - Atribuir role a usuário (admin)
- `GET /profile/:userId` - Perfil do usuário
- `POST /logout` - Logout

### Clientes (`/api/clients`)
- `POST /` - Criar cliente
- `GET /` - Listar clientes (com paginação)
- `GET /:id` - Buscar cliente por ID
- `PUT /:id` - Atualizar cliente
- `DELETE /:id` - Deletar cliente
- `GET /neighborhood/:neighborhood` - Clientes por bairro
- `GET /overdue/all` - Clientes em atraso
- `GET /rescheduled/all` - Clientes reagendados
- `GET /stats/all` - Estatísticas dos clientes

### Vendas (`/api/sales`)
- `POST /` - Criar venda
- `GET /` - Listar vendas (com paginação)
- `GET /:id` - Buscar venda por ID
- `PUT /:id` - Atualizar venda
- `DELETE /:id` - Deletar venda
- `GET /period/search` - Vendas por período
- `GET /vendor/search` - Vendas por vendedor
- `GET /stats/all` - Estatísticas das vendas

### Recebimentos (`/api/receipts`)
- `POST /` - Criar recebimento
- `GET /` - Listar recebimentos (com paginação)
- `GET /:id` - Buscar recebimento por ID
- `PUT /:id` - Atualizar recebimento
- `DELETE /:id` - Deletar recebimento
- `POST /fiado/register` - Registrar recebimento fiado
- `GET /period/search` - Recebimentos por período
- `GET /vendor/search` - Recebimentos por vendedor
- `GET /stats/all` - Estatísticas dos recebimentos

### Vendedores (`/api/vendors`)
- `POST /` - Criar vendedor
- `GET /` - Listar vendedores (com paginação)
- `GET /:id` - Buscar vendedor por ID
- `PUT /:id` - Atualizar vendedor
- `DELETE /:id` - Deletar vendedor
- `GET /active/all` - Vendedores ativos
- `GET /hire-period/search` - Vendedores por período de contratação
- `GET /commission/search` - Vendedores por comissão
- `GET /stats/all` - Estatísticas dos vendedores
- `GET /:vendorId/performance` - Performance do vendedor

## 🔐 Autenticação e Autorização

### JWT Token
- Tokens expiram em 7 dias por padrão
- Incluem informações do usuário e organização
- Validados em todas as rotas protegidas

### Roles e Permissões
- **admin**: Acesso total ao sistema
- **vendedor**: Pode criar vendas e recebimentos
- **manager**: Acesso intermediário
- **finance**: Acesso a módulos financeiros
- **inventory**: Acesso ao controle de estoque

### Middleware de Segurança
- `authenticateToken`: Valida JWT
- `requireRole`: Verifica permissões específicas
- `requireOrganization`: Garante contexto organizacional

## 📊 Sistema de Auditoria

Todas as ações importantes são registradas automaticamente:
- Criação, edição e exclusão de registros
- Login/logout de usuários
- Vendas e recebimentos
- Alterações em clientes

## 🗄️ Banco de Dados

### Schema Principal
- **organizations**: Organizações/empresas
- **users**: Usuários do sistema
- **user_roles**: Roles e permissões
- **clients**: Clientes
- **vendors**: Vendedores
- **products**: Produtos
- **inventory_items**: Itens de estoque
- **sales**: Vendas
- **sale_items**: Itens das vendas
- **receipts**: Recebimentos
- **categories**: Categorias
- **audit_logs**: Logs de auditoria

### Relacionamentos
- Organizações têm múltiplos usuários, clientes, vendedores, etc.
- Vendas são vinculadas a clientes e vendedores
- Recebimentos são vinculados a vendas e clientes
- Sistema de auditoria rastreia todas as mudanças

## 🚀 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Servidor com hot reload

# Build e produção
npm run build           # Compilar TypeScript
npm start               # Executar servidor compilado

# Banco de dados
npm run db:generate     # Gerar cliente Prisma
npm run db:push         # Aplicar schema
npm run db:migrate      # Executar migrações
npm run db:studio       # Abrir Prisma Studio
npm run db:seed         # Executar seed

# Linting e formatação
npm run lint            # Verificar código
```

## 🔒 Variáveis de Ambiente

```env
# Banco de dados
DATABASE_URL="postgresql://user:password@localhost:5432/whisper_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Servidor
PORT=3001
NODE_ENV="development"

# CORS
CORS_ORIGIN="http://localhost:5173"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Segurança
BCRYPT_ROUNDS=12
```

## 📈 Funcionalidades Principais

### ✅ Implementadas
- Sistema completo de autenticação JWT
- CRUD completo para todas as entidades
- Sistema de auditoria automático
- Controle de acesso baseado em roles
- Paginação e filtros avançados
- Validação de dados
- Tratamento robusto de erros
- Sistema de seed para desenvolvimento

### 🔄 Em Desenvolvimento
- Upload de arquivos
- Relatórios avançados
- Notificações em tempo real
- Cache Redis
- Testes automatizados
- Documentação Swagger/OpenAPI

## 🧪 Testes

```bash
# Executar testes
npm test

# Testes com coverage
npm run test:coverage

# Testes em modo watch
npm run test:watch
```

## 📚 Documentação da API

A documentação completa da API está disponível em:
- **Swagger UI**: `/api/docs` (quando implementado)
- **Postman Collection**: Disponível no repositório
- **Exemplos de uso**: Veja a pasta `examples/`

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- **Issues**: Use o GitHub Issues para reportar bugs
- **Discussions**: Para discussões e perguntas
- **Wiki**: Documentação adicional e FAQs

## 🔄 Migração do Supabase

Este backend substitui completamente as seguintes funções RPC do Supabase:

- `get_clientes_secure` → `GET /api/clients`
- `get_vendas_secure` → `GET /api/sales`
- `get_recebimentos_secure` → `GET /api/receipts`
- `get_vendedores_secure` → `GET /api/vendors`
- `registrar_recebimento_fiado` → `POST /api/receipts/fiado/register`
- `assign_role` → `POST /api/auth/assign-role`
- `needs_admin_setup` → `GET /api/auth/needs-admin-setup`
- `enable_admin_setup` → `POST /api/auth/enable-admin-setup`

### Vantagens da Migração

1. **Controle Total**: Sem dependência de serviços externos
2. **Performance**: Queries otimizadas e cache local
3. **Segurança**: Middleware de segurança personalizado
4. **Escalabilidade**: Arquitetura preparada para crescimento
5. **Manutenibilidade**: Código organizado em MVC
6. **Testes**: Facilidade para implementar testes automatizados
