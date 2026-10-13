import { RegisteredAccount } from '../services/customer-rules';

/**
 * Contas FICTÍCIAS cadastradas que ainda não compraram (entram na lista de
 * clientes): o cliente da entrega em mãos e a equipe de teste. Some na Fase 2.
 */
export const REGISTERED_MOCK: readonly RegisteredAccount[] = [
  // Afiliados de teste (ver `core/data/affiliates-mock.ts`).
  {
    name: 'Júlia Andrade',
    email: 'julia.afiliada@email.com',
    city: 'Belo Horizonte, MG',
    phone: '(31) 98111-2233',
    createdAt: new Date(2026, 1, 10),
  },
  {
    name: 'Carla Mendes',
    email: 'carla.mendes@email.com',
    city: 'Curitiba, PR',
    phone: '(41) 98222-3344',
    createdAt: new Date(2026, 8, 30),
  },
  {
    name: 'Marina Lopes',
    email: 'marina.lopes@email.com',
    city: 'Recife, PE',
    phone: '(81) 98333-4455',
    createdAt: new Date(2026, 4, 5),
  },
  {
    name: 'Pedro Alves',
    email: 'pedro.alves@email.com',
    city: 'Campinas, SP',
    phone: '(19) 98444-5566',
    createdAt: new Date(2026, 6, 18),
  },
  {
    name: 'Vizinho da Loja',
    email: 'vizinho@email.com',
    city: 'São Paulo, SP',
    phone: '(11) 98123-4567',
    createdAt: new Date(2026, 8, 20),
  },
  {
    name: 'Cliente Google',
    email: 'cliente.google@gmail.com',
    city: 'Rio de Janeiro, RJ',
    phone: '(21) 99876-5432',
    createdAt: new Date(2026, 6, 14),
  },
  {
    name: 'Super Admin',
    email: 'superadmin@email.com',
    city: 'São Paulo, SP',
    phone: '(11) 97000-0001',
    createdAt: new Date(2024, 0, 2),
  },
  {
    name: 'Admin',
    email: 'admin@email.com',
    city: 'São Paulo, SP',
    phone: '(11) 97000-0002',
    createdAt: new Date(2024, 0, 2),
  },
  {
    name: 'Visualizador',
    email: 'viewer@email.com',
    city: 'São Paulo, SP',
    phone: '(11) 97000-0003',
    createdAt: new Date(2024, 0, 3),
  },
];
