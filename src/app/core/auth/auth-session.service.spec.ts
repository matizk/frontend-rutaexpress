import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { fetchAuthSession, getCurrentUser, signInWithRedirect } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from './auth-session.service';

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
  getCurrentUser: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('aws-amplify/utils', () => ({ Hub: { listen: vi.fn() } }));

function mockAccount(groups: string[] = []): void {
  vi.mocked(getCurrentUser).mockResolvedValue({ username: 'cuenta-de-prueba', userId: 'test-user' });
  vi.mocked(fetchAuthSession).mockResolvedValue({
    tokens: {
      accessToken: { payload: { 'cognito:groups': groups }, toString: () => 'token-de-prueba' },
    },
  });
}

describe('Selección de perfil de Cognito', () => {
  const navigateByUrl = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.spyOn(AuthSessionService.prototype, 'isConfigured').mockReturnValue(true);
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Sin sesión'));
    vi.mocked(fetchAuthSession).mockResolvedValue({});
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: { navigateByUrl } }],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('bloquea el token administrativo si Cognito devuelve esa cuenta al elegir Cliente', async () => {
    const session = TestBed.inject(AuthSessionService);
    await session.initialize();
    await session.signIn('customer');
    expect(signInWithRedirect).toHaveBeenCalledExactlyOnceWith({
      options: { prompt: 'LOGIN', authSessionOpener: expect.any(Function) },
    });
    mockAccount(['Admin']);
    expect(await session.accessToken()).toBeNull();

    const returnedSession = new AuthSessionService(TestBed.inject(Router));
    await returnedSession.initialize();

    expect(returnedSession.isAuthenticated()).toBe(false);
    expect(returnedSession.isAdmin()).toBe(false);
    expect(returnedSession.profileConflict()).toBe('customer');
    expect(await returnedSession.accessToken()).toBeNull();
    expect(navigateByUrl).toHaveBeenCalledExactlyOnceWith('/login#customer-title');
  });

  it('mantiene el perfil de cliente al completar el registro alojado en Cognito', async () => {
    const session = TestBed.inject(AuthSessionService);
    await session.initialize();
    await session.registerCustomer();
    expect(signInWithRedirect).toHaveBeenCalledExactlyOnceWith({
      options: { prompt: 'LOGIN', authSessionOpener: expect.any(Function) },
    });

    mockAccount();
    const returnedSession = new AuthSessionService(TestBed.inject(Router));
    await returnedSession.initialize();
    expect(returnedSession.isAuthenticated()).toBe(true);
    expect(returnedSession.isAdmin()).toBe(false);
    expect(navigateByUrl).toHaveBeenCalledExactlyOnceWith('/cliente');
  });

  it('bloquea el acceso administrativo cuando Cognito devuelve una cuenta de cliente', async () => {
    const session = TestBed.inject(AuthSessionService);
    await session.initialize();
    await session.signIn('admin');
    mockAccount();
    const [channel, onAuth] = vi.mocked(Hub.listen).mock.calls[0];
    await onAuth({ channel, payload: { event: 'signedIn' }, source: 'Auth', patternInfo: [] });

    await vi.waitFor(() => expect(session.profileConflict()).toBe('admin'));
    expect(session.isAuthenticated()).toBe(false);
    expect(await session.accessToken()).toBeNull();
    expect(navigateByUrl).toHaveBeenCalledExactlyOnceWith('/login#admin-title');
  });

  it.each([
    { profile: 'customer', groups: [], path: '/cliente', isAdmin: false },
    { profile: 'admin', groups: ['Admin'], path: '/admin', isAdmin: true },
  ] as const)('abre $path cuando la cuenta coincide con el perfil elegido', async ({ profile, groups, path, isAdmin }) => {
    const session = TestBed.inject(AuthSessionService);
    await session.initialize();
    await session.signIn(profile);
    mockAccount([...groups]);
    const returnedSession = new AuthSessionService(TestBed.inject(Router));
    await returnedSession.initialize();

    expect(returnedSession.isAuthenticated()).toBe(true);
    expect(returnedSession.isAdmin()).toBe(isAdmin);
    expect(returnedSession.profileConflict()).toBeNull();
    expect(await returnedSession.accessToken()).toBe('token-de-prueba');
    expect(navigateByUrl).toHaveBeenCalledExactlyOnceWith(path);
  });
});
