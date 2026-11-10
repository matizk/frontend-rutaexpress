import { Amplify, type ResourcesConfig } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { sessionStorage } from 'aws-amplify/utils';
import settings from './cognito-settings.json';

const PENDING: string = 'REPLACE_ME';

/** Identificadores públicos de Cognito. Una SPA nunca debe tener client secret. */
export const cognitoConfig = settings;

export const isCognitoConfigured = (): boolean =>
  [cognitoConfig.userPoolId, cognitoConfig.userPoolClientId, cognitoConfig.domain]
    .every((value) => value !== PENDING && value.trim().length > 0);

export function configureCognito(): void {
  if (!isCognitoConfigured()) return;

  const config: ResourcesConfig = {
    Auth: {
      Cognito: {
        userPoolId: cognitoConfig.userPoolId,
        userPoolClientId: cognitoConfig.userPoolClientId,
        loginWith: {
          oauth: {
            domain: cognitoConfig.domain,
            // El nombre visible usa el claim email; profile no es necesario para la SPA.
            scopes: ['openid', 'email'],
            redirectSignIn: [cognitoConfig.redirectSignIn],
            redirectSignOut: [cognitoConfig.redirectSignOut],
            responseType: 'code',
          },
        },
      },
    },
  };

  Amplify.configure(config);
  cognitoUserPoolsTokenProvider.setKeyValueStorage(sessionStorage);
}
