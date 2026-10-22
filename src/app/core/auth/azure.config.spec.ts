import { describe, expect, it } from 'vitest';
import { validateAzureConfiguration } from './azure.config';

const valid = { enabled: true, tenantId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222', apiClientId: '33333333-3333-4333-8333-333333333333',
  scope: 'operator.access', redirectPath: '/auth/azure' };
describe('Azure configuration', () => {
  it('allows a deliberately disabled setup without fake IDs', () => {
    expect(validateAzureConfiguration({ enabled: false }).enabled).toBe(false);
  });
  it('requires the tenant, SPA and API identifiers and a fixed callback', () => {
    expect(validateAzureConfiguration(valid)).toEqual(valid);
    for (const invalid of [null, {}, { ...valid, tenantId: 'common' }, { ...valid, apiClientId: '' },
      { ...valid, scope: 'User.Read other' }, { ...valid, redirectPath: 'https://other.example/' }]) {
      expect(() => validateAzureConfiguration(invalid)).toThrow();
    }
  });
});
