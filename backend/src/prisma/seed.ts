import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  try {
    // 1. Criar organização padrão
    const organization = await prisma.organization.upsert({
      where: { slug: 'freelancer-cesta-default' },
      update: {},
      create: {
        id: uuidv4(),
        name: 'Freelancer Cesta Default',
        slug: 'freelancer-cesta-default',
        description: 'Organização padrão do sistema Freelancer Cesta'
      }
    });

    console.log('✅ Organização criada:', organization.name);

    // 2. Criar usuário admin
    const adminUserId = uuidv4();
    const hashedPassword = await bcrypt.hash('admin123', 12);

    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@freelancer-cesta.com' },
      update: {},
      create: {
        id: adminUserId,
        email: 'admin@freelancer-cesta.com',
        password: hashedPassword,
        name: 'Admin Freelancer Cesta',
        phone: '+55 11 99999-9999',
        role: 'ADMIN',
        organizationId: organization.id
      }
    });

    console.log('✅ Usuário admin criado:', adminUser.name);

    // 3. Criar categorias padrão
    const categories = await Promise.all([
      prisma.category.upsert({
        where: { 
          name_organizationId: {
            name: 'Alimentos',
            organizationId: organization.id
          }
        },
        update: {},
        create: {
          id: uuidv4(),
          name: 'Alimentos',
          color: '#FF6B6B',
          description: 'Produtos alimentícios em geral',
          organizationId: organization.id,
          createdBy: adminUser.id
        }
      }),
      prisma.category.upsert({
        where: { 
          name_organizationId: {
            name: 'Bebidas',
            organizationId: organization.id
          }
        },
        update: {},
        create: {
          id: uuidv4(),
          name: 'Bebidas',
          color: '#4ECDC4',
          description: 'Bebidas e refrigerantes',
          organizationId: organization.id,
          createdBy: adminUser.id
        }
      }),
      prisma.category.upsert({
        where: { 
          name_organizationId: {
            name: 'Limpeza',
            organizationId: organization.id
          }
        },
        update: {},
        create: {
          id: uuidv4(),
          name: 'Limpeza',
          color: '#45B7D1',
          description: 'Produtos de limpeza',
          organizationId: organization.id,
          createdBy: adminUser.id
        }
      })
    ]);

    console.log('✅ Categorias criadas:', categories.length);

    // 4. Criar produtos padrão
    const products = await Promise.all([
      prisma.product.upsert({
        where: { 
          name_organizationId: {
            name: 'Arroz Integral',
            organizationId: organization.id
          }
        },
        update: {},
        create: {
          id: uuidv4(),
          name: 'Arroz Integral',
          description: 'Arroz integral de alta qualidade',
          price: 8.50,
          costPrice: 6.00,
          categoryId: categories[0].id,
          organizationId: organization.id,
          unit: 'kg',
          active: true,
          createdBy: adminUser.id
        }
      }),
      prisma.product.upsert({
        where: { 
          name_organizationId: {
            name: 'Coca-Cola 2L',
            organizationId: organization.id
          }
        },
        update: {},
        create: {
          id: uuidv4(),
          name: 'Coca-Cola 2L',
          description: 'Refrigerante Coca-Cola 2 litros',
          price: 12.90,
          costPrice: 8.50,
          categoryId: categories[1].id,
          organizationId: organization.id,
          unit: 'un',
          active: true,
          createdBy: adminUser.id
        }
      }),
      prisma.product.upsert({
        where: { 
          name_organizationId: {
            name: 'Detergente Líquido',
            organizationId: organization.id
          }
        },
        update: {},
        create: {
          id: uuidv4(),
          name: 'Detergente Líquido',
          description: 'Detergente para louças',
          price: 5.90,
          costPrice: 3.50,
          categoryId: categories[2].id,
          organizationId: organization.id,
          unit: 'un',
          active: true,
          createdBy: adminUser.id
        }
      })
    ]);

    console.log('✅ Produtos criados:', products.length);

    // 5. Criar itens de estoque
    const estoqueItems = await Promise.all([
      prisma.estoque.create({
        data: {
          id: uuidv4(),
          organizationId: organization.id,
          nome: 'Arroz Integral',
          categoria: 'Alimentos',
          quantidade: 100,
          quantidadeMinima: 20,
          quantidadeMaxima: 200,
          precoCusto: 6.00,
          precoVenda: 8.50,
          unidade: 'kg',
          localizacao: 'Prateleira A1',
          fornecedor: 'Fornecedor ABC',
          codigoBarras: '1234567890123',
          observacoes: 'Produto de alta qualidade',
          ativo: true,
          createdBy: adminUser.id
        }
      }),
      prisma.estoque.create({
        data: {
          id: uuidv4(),
          organizationId: organization.id,
          nome: 'Coca-Cola 2L',
          categoria: 'Bebidas',
          quantidade: 50,
          quantidadeMinima: 10,
          quantidadeMaxima: 100,
          precoCusto: 8.50,
          precoVenda: 12.90,
          unidade: 'un',
          localizacao: 'Geladeira B2',
          fornecedor: 'Coca-Cola Brasil',
          codigoBarras: '7891234567890',
          observacoes: 'Refrigerante gelado',
          ativo: true,
          createdBy: adminUser.id
        }
      }),
      prisma.estoque.create({
        data: {
          id: uuidv4(),
          organizationId: organization.id,
          nome: 'Detergente Líquido',
          categoria: 'Limpeza',
          quantidade: 75,
          quantidadeMinima: 15,
          quantidadeMaxima: 150,
          precoCusto: 3.50,
          precoVenda: 5.90,
          unidade: 'un',
          localizacao: 'Prateleira C3',
          fornecedor: 'Limpeza Total',
          codigoBarras: '4567891234567',
          observacoes: 'Detergente concentrado',
          ativo: true,
          createdBy: adminUser.id
        }
      })
    ]);

    console.log('✅ Itens de estoque criados:', estoqueItems.length);

    // 6. Criar clientes padrão
    const clients = await Promise.all([
      prisma.client.upsert({
        where: { 
          name_organizationId: {
            name: 'João Silva',
            organizationId: organization.id
          }
        },
        update: {},
        create: {
          id: uuidv4(),
          name: 'João Silva',
          email: 'joao@email.com',
          phone: '+55 11 88888-8888',
          address: 'Rua das Flores, 123',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          observations: 'Cliente preferencial',
          organizationId: organization.id,
          createdBy: adminUser.id
        }
      }),
      prisma.client.upsert({
        where: { 
          name_organizationId: {
            name: 'Maria Santos',
            organizationId: organization.id
          }
        },
        update: {},
        create: {
          id: uuidv4(),
          name: 'Maria Santos',
          email: 'maria@email.com',
          phone: '+55 11 77777-7777',
          address: 'Av. Paulista, 456',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
          observations: 'Cliente novo',
          organizationId: organization.id,
          createdBy: adminUser.id
        }
      })
    ]);

    console.log('✅ Clientes criados:', clients.length);

    // 7. Criar vendedores padrão
    const vendors = await Promise.all([
      prisma.vendor.upsert({
        where: { 
          name_organizationId: {
            name: 'Pedro Vendedor',
            organizationId: organization.id
          }
        },
        update: {},
        create: {
          id: uuidv4(),
          name: 'Pedro Vendedor',
          email: 'pedro@freelancer-cesta.com',
          phone: '+55 11 66666-6666',
          comissaoPercentual: 5.0,
          active: true,
          organizationId: organization.id,
          createdBy: adminUser.id
        }
      }),
      prisma.vendor.upsert({
        where: { 
          name_organizationId: {
            name: 'Ana Vendedora',
            organizationId: organization.id
          }
        },
        update: {},
        create: {
          id: uuidv4(),
          name: 'Ana Vendedora',
          email: 'ana@freelancer-cesta.com',
          phone: '+55 11 55555-5555',
          comissaoPercentual: 4.5,
          active: true,
          organizationId: organization.id,
          createdBy: adminUser.id
        }
      })
    ]);

    console.log('✅ Vendedores criados:', vendors.length);

    // 8. Criar mais usuários com diferentes roles
    const additionalUsers = await Promise.all([
      prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'manager@freelancer-cesta.com',
          password: await bcrypt.hash('manager123', 12),
          name: 'Manager Silva',
          phone: '+55 11 44444-4444',
          role: 'MANAGER',
          organizationId: organization.id
        }
      }),
      prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'vendedor@freelancer-cesta.com',
          password: await bcrypt.hash('vendedor123', 12),
          name: 'Vendedor Costa',
          phone: '+55 11 33333-3333',
          role: 'VENDEDOR',
          organizationId: organization.id
        }
      }),
      prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'financeiro@freelancer-cesta.com',
          password: await bcrypt.hash('financeiro123', 12),
          name: 'Financeiro Santos',
          phone: '+55 11 22222-2222',
          role: 'FINANCEIRO',
          organizationId: organization.id
        }
      })
    ]);

    console.log('✅ Usuários adicionais criados:', additionalUsers.length);

    // 9. Criar mais produtos
    const additionalProducts = await Promise.all([
      prisma.product.create({
        data: {
          id: uuidv4(),
          name: 'Feijão Preto',
          description: 'Feijão preto de alta qualidade',
          price: 6.50,
          costPrice: 4.00,
          categoryId: categories[0].id,
          organizationId: organization.id,
          unit: 'kg',
          active: true,
          createdBy: adminUser.id
        }
      }),
      prisma.product.create({
        data: {
          id: uuidv4(),
          name: 'Açúcar Cristal',
          description: 'Açúcar cristal refinado',
          price: 4.20,
          costPrice: 2.80,
          categoryId: categories[0].id,
          organizationId: organization.id,
          unit: 'kg',
          active: true,
          createdBy: adminUser.id
        }
      }),
      prisma.product.create({
        data: {
          id: uuidv4(),
          name: 'Água Mineral 500ml',
          description: 'Água mineral natural',
          price: 2.50,
          costPrice: 1.20,
          categoryId: categories[1].id,
          organizationId: organization.id,
          unit: 'un',
          active: true,
          createdBy: adminUser.id
        }
      }),
      prisma.product.create({
        data: {
          id: uuidv4(),
          name: 'Sabão em Pó',
          description: 'Sabão em pó para roupas',
          price: 8.90,
          costPrice: 5.50,
          categoryId: categories[2].id,
          organizationId: organization.id,
          unit: 'kg',
          active: true,
          createdBy: adminUser.id
        }
      })
    ]);

    console.log('✅ Produtos adicionais criados:', additionalProducts.length);

    // 10. Criar mais itens de estoque
    const additionalEstoque = await Promise.all([
      prisma.estoque.create({
        data: {
          id: uuidv4(),
          organizationId: organization.id,
          nome: 'Feijão Preto',
          categoria: 'Alimentos',
          quantidade: 80,
          quantidadeMinima: 15,
          quantidadeMaxima: 150,
          precoCusto: 4.00,
          precoVenda: 6.50,
          unidade: 'kg',
          localizacao: 'Prateleira A2',
          fornecedor: 'Fornecedor XYZ',
          codigoBarras: '1111111111111',
          observacoes: 'Produto orgânico',
          ativo: true,
          createdBy: adminUser.id
        }
      }),
      prisma.estoque.create({
        data: {
          id: uuidv4(),
          organizationId: organization.id,
          nome: 'Açúcar Cristal',
          categoria: 'Alimentos',
          quantidade: 120,
          quantidadeMinima: 25,
          quantidadeMaxima: 200,
          precoCusto: 2.80,
          precoVenda: 4.20,
          unidade: 'kg',
          localizacao: 'Prateleira A3',
          fornecedor: 'Açúcar Brasil',
          codigoBarras: '2222222222222',
          observacoes: 'Açúcar refinado',
          ativo: true,
          createdBy: adminUser.id
        }
      }),
      prisma.estoque.create({
        data: {
          id: uuidv4(),
          organizationId: organization.id,
          nome: 'Água Mineral 500ml',
          categoria: 'Bebidas',
          quantidade: 200,
          quantidadeMinima: 50,
          quantidadeMaxima: 500,
          precoCusto: 1.20,
          precoVenda: 2.50,
          unidade: 'un',
          localizacao: 'Geladeira C1',
          fornecedor: 'Água Pura',
          codigoBarras: '3333333333333',
          observacoes: 'Água natural',
          ativo: true,
          createdBy: adminUser.id
        }
      }),
      prisma.estoque.create({
        data: {
          id: uuidv4(),
          organizationId: organization.id,
          nome: 'Sabão em Pó',
          categoria: 'Limpeza',
          quantidade: 60,
          quantidadeMinima: 12,
          quantidadeMaxima: 120,
          precoCusto: 5.50,
          precoVenda: 8.90,
          unidade: 'kg',
          localizacao: 'Prateleira D1',
          fornecedor: 'Limpeza Total',
          codigoBarras: '4444444444444',
          observacoes: 'Sabão concentrado',
          ativo: true,
          createdBy: adminUser.id
        }
      })
    ]);

    console.log('✅ Estoque adicional criado:', additionalEstoque.length);

    // 11. Criar mais clientes
    const additionalClients = await Promise.all([
      prisma.client.create({
        data: {
          id: uuidv4(),
          name: 'Carlos Oliveira',
          email: 'carlos@email.com',
          phone: '+55 11 11111-1111',
          address: 'Rua das Palmeiras, 789',
          neighborhood: 'Jardim das Flores',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '04567-890',
          observations: 'Cliente VIP',
          organizationId: organization.id,
          createdBy: adminUser.id,
          cpf: '123.456.789-00',
          rg: '12.345.678-9',
          nomeReferencia: 'Maria Oliveira',
          telefoneReferencia: '+55 11 99999-9999',
          ativo: true
        }
      }),
      prisma.client.create({
        data: {
          id: uuidv4(),
          name: 'Ana Costa',
          email: 'ana.costa@email.com',
          phone: '+55 11 00000-0000',
          address: 'Av. Brasil, 321',
          neighborhood: 'Vila Madalena',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '05432-109',
          observations: 'Cliente frequente',
          organizationId: organization.id,
          createdBy: adminUser.id,
          cpf: '987.654.321-00',
          rg: '98.765.432-1',
          nomeReferencia: 'João Costa',
          telefoneReferencia: '+55 11 88888-8888',
          ativo: true
        }
      })
    ]);

    console.log('✅ Clientes adicionais criados:', additionalClients.length);

    // 12. Criar algumas vendas de exemplo
    const sales = await Promise.all([
      prisma.sale.create({
        data: {
          id: uuidv4(),
          organizationId: organization.id,
          clientId: clients[0].id,
          vendorId: vendors[0].id,
          userId: adminUser.id,
          status: 'CONCLUIDA',
          total: 25.40,
          discount: 2.00,
          notes: 'Venda com desconto',
          dataVenda: new Date(),
          tipoPagamento: 'DINHEIRO',
          dataEntrega: new Date(Date.now() + 24 * 60 * 60 * 1000), // Amanhã
          createdBy: adminUser.id,
          pagamentos: JSON.stringify([{
            method: 'DINHEIRO',
            amount: 25.40,
            paidAt: new Date()
          }]),
          metodoEntrega: 'entrega'
        }
      }),
      prisma.sale.create({
        data: {
          id: uuidv4(),
          organizationId: organization.id,
          clientId: clients[1].id,
          vendorId: vendors[1].id,
          userId: adminUser.id,
          status: 'PENDENTE',
          total: 18.80,
          discount: 0,
          notes: 'Venda pendente de pagamento',
          dataVenda: new Date(),
          tipoPagamento: 'FIADO',
          dataEntrega: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Em 2 dias
          createdBy: adminUser.id,
          pagamentos: JSON.stringify([]),
          metodoEntrega: 'retirada'
        }
      })
    ]);

    console.log('✅ Vendas criadas:', sales.length);

    // 13. Criar itens das vendas
    const saleItems = await Promise.all([
      prisma.vendaItem.create({
        data: {
          id: uuidv4(),
          organizationId: organization.id,
          vendaId: sales[0].id,
          produtoId: estoqueItems[0].id,
          quantidade: 2,
          precoUnitario: 8.50,
          subtotal: 17.00
        }
      }),
      prisma.vendaItem.create({
        data: {
          id: uuidv4(),
          organizationId: organization.id,
          vendaId: sales[0].id,
          produtoId: estoqueItems[1].id,
          quantidade: 1,
          precoUnitario: 12.90,
          subtotal: 12.90
        }
      }),
      prisma.vendaItem.create({
        data: {
          id: uuidv4(),
          organizationId: organization.id,
          vendaId: sales[1].id,
          produtoId: estoqueItems[2].id,
          quantidade: 3,
          precoUnitario: 5.90,
          subtotal: 17.70
        }
      })
    ]);

    console.log('✅ Itens de venda criados:', saleItems.length);

    // 14. Criar alguns recebimentos
    const payments = await Promise.all([
      prisma.payment.create({
        data: {
          id: uuidv4(),
          organizationId: organization.id,
          saleId: sales[0].id,
          clientId: clients[0].id,
          vendedorId: vendors[0].id,
          amount: 25.40,
          method: 'DINHEIRO',
          status: 'PAGO',
          dueDate: new Date(),
          paidAt: new Date(),
          notes: 'Pagamento à vista',
          createdBy: adminUser.id,
          formaPagamento: 'dinheiro'
        }
      }),
      prisma.payment.create({
        data: {
          id: uuidv4(),
          organizationId: organization.id,
          saleId: sales[1].id,
          clientId: clients[1].id,
          vendedorId: vendors[1].id,
          amount: 18.80,
          method: 'FIADO',
          status: 'PENDENTE',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Em 7 dias
          notes: 'Pagamento a prazo',
          createdBy: adminUser.id,
          formaPagamento: 'fiado',
          proximoPagamento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      })
    ]);

    console.log('✅ Recebimentos criados:', payments.length);

    console.log('🎉 Seed concluído com sucesso!');
    console.log(`📊 Resumo:`);
    console.log(`   - Organização: ${organization.name}`);
    console.log(`   - Usuário Admin: ${adminUser.name} (${adminUser.email})`);
    console.log(`   - Categorias: ${categories.length}`);
    console.log(`   - Produtos: ${products.length + additionalProducts.length}`);
    console.log(`   - Estoque: ${estoqueItems.length + additionalEstoque.length}`);
    console.log(`   - Clientes: ${clients.length + additionalClients.length}`);
    console.log(`   - Vendedores: ${vendors.length}`);
    console.log(`   - Usuários: ${1 + additionalUsers.length}`);
    console.log(`   - Vendas: ${sales.length}`);
    console.log(`   - Itens de Venda: ${saleItems.length}`);
    console.log(`   - Recebimentos: ${payments.length}`);

  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Falha no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
