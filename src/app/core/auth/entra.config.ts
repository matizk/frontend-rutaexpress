const PENDING_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Identificadores públicos de las aplicaciones registradas en Microsoft Entra ID.
 * No se usa ni se debe crear un client secret en un SPA: el navegador es un cliente
 * público. Reemplazar los tres valores al crear las aplicaciones en el tenant.
 */
export const entraConfig = {
  tenantId: PENDING_ID,
  frontendClientId: PENDING_ID,
  bffApiClientId: PENDING_ID,
  redirectUri: 'http://localhost:4200/',
  apiScopeName: 'access_as_user',
} as const;

export const isEntraConfigured = (): boolean =>
  [entraConfig.tenantId, entraConfig.frontendClientId, entraConfig.bffApiClientId]
    .every((id) => id !== PENDING_ID);

export const bffApiScope = (): string =>
  `api://${entraConfig.bffApiClientId}/${entraConfig.apiScopeName}`;
