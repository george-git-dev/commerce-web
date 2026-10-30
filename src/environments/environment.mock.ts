import { AuthMode } from '../app/core/config/auth-mode';

/**
 * Local SEM back (`npm run start:mock`): login simulado, para mexer em tela
 * sem subir Keycloak e BFF.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  auth: 'mock' as AuthMode,
};
