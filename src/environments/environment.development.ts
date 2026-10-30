import { AuthMode } from '../app/core/config/auth-mode';

/**
 * Ambiente local (`npm start` / `ng serve`). As chamadas `/api` vão para o
 * BFF (`proxy.conf.json` → localhost:8090), que precisa estar rodando junto
 * com o Keycloak (commerce-auth). Sem eles: `npm run start:mock`.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  auth: 'bff' as AuthMode,
};
