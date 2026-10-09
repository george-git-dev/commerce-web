import { RegisteredAccount } from '../services/customer-rules';

/**
 * Contas FICTÍCIAS cadastradas que ainda não compraram (entram na lista de
 * clientes): o cliente da entrega em mãos e a equipe de teste. Some na Fase 2.
 */
export const REGISTERED_MOCK: readonly RegisteredAccount[] = [
  {
    name: 'Vizinho da Loja',
    email: 'vizinho@email.com',
    city: 'São Paulo, SP',
    phone: '(11) 98123-4567',
    createdAt: new Date(2026, 8, 20),
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
