import { Amplify, type ResourcesConfig } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { sessionStorage } from 'aws-amplify/utils';

const PENDING: string = 'REPLACE_ME';

/** Identificadores públicos de Cognito. Una SPA nunca debe tener client secret. */
export const cognitoConfig = {
  userPoolId: PENDING,
  userPoolClientId: PENDING,
  domain: PENDING,
  redirectSignIn: 'http://localhost:4200/',
  redirectSignOut: 'http://localhost:4200/',
} as const;

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
            scopes: ['openid', 'email', 'profile'],
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
