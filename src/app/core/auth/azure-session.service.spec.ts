import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { AZURE_RUNTIME } from './azure.config';
import { AzureSessionService } from './azure-session.service';

describe('AzureSessionService', () => {
  it('never authenticates when Azure is not configured', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: AZURE_RUNTIME, useValue: {
      config: { enabled: false }, client: null, error: '',
    } }] });
    const session = TestBed.inject(AzureSessionService);
    expect(session.isAuthenticated()).toBe(false);
    expect(await session.accessToken()).toBeNull();
    await session.signIn();
    expect(session.error()).toContain('Faltan');
  });
  it('requests only the API delegated scope and never returns an ID token', async () => {
    const account = { name: 'Operador de prueba' };
    const client = { getActiveAccount: vi.fn(() => account),
      acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: 'api-token', idToken: 'id-token' }),
      loginRedirect: vi.fn(), logoutRedirect: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: AZURE_RUNTIME, useValue: {
      config: { enabled: true, apiClientId: 'api-id', scope: 'operator.access' }, client, error: '',
    } }] });
    const session = TestBed.inject(AzureSessionService);
    expect(await session.accessToken()).toBe('api-token');
    expect(client.acquireTokenSilent).toHaveBeenCalledWith({ account, scopes: ['api://api-id/operator.access'] });
    client.acquireTokenSilent.mockRejectedValue(new Error('interaction required'));
    expect(await session.accessToken()).toBeNull();
    expect(client.loginRedirect).not.toHaveBeenCalled();
    expect(session.error()).toContain('necesita autorización');
  });
});
