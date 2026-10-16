import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from './auth-session.service';
import { authInterceptor } from './auth.interceptor';
import { AzureSessionService } from './azure-session.service';

describe('authInterceptor', () => {
  const accessToken = vi.fn<() => Promise<string | null>>();

  it('attaches the Cognito access token to API requests', async () => {
    accessToken.mockReset();
    accessToken.mockResolvedValue('signed-access-token');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthSessionService, useValue: { accessToken } },
      ],
    });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(http.get('/api/shipments'));
    await Promise.resolve();
    const request = controller.expectOne('/api/shipments');
    expect(request.request.headers.get('Authorization')).toBe('Bearer signed-access-token');
    request.flush([]);
    await response;
    controller.verify();
  });

  it('never sends the token to an external address', async () => {
    accessToken.mockReset();
    accessToken.mockResolvedValue('must-not-leak');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthSessionService, useValue: { accessToken } },
      ],
    });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(http.get('https://example.com/public'));
    const request = controller.expectOne('https://example.com/public');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(accessToken).not.toHaveBeenCalled();
    request.flush({});
    await response;
    controller.verify();
  });

  it('uses Azure only for operator APIs and never falls back to Cognito if its token expires', async () => {
    const azureToken = vi.fn().mockResolvedValue('operator-access-token');
    accessToken.mockReset().mockResolvedValue('admin-access-token');
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: AuthSessionService, useValue: { accessToken } },
      { provide: AzureSessionService, useValue: { isAuthenticated: () => true, accessToken: azureToken } },
    ] });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    const first = firstValueFrom(http.get('/api/operator/shipments'));
    await Promise.resolve();
    const request = controller.expectOne('/api/operator/shipments');
    expect(request.request.headers.get('Authorization')).toBe('Bearer operator-access-token');
    expect(accessToken).not.toHaveBeenCalled();
    request.flush([]); await first;
    azureToken.mockResolvedValue(null);
    const second = firstValueFrom(http.get('/api/operator/shipments'));
    await Promise.resolve();
    const expired = controller.expectOne('/api/operator/shipments');
    expect(expired.request.headers.has('Authorization')).toBe(false);
    expect(accessToken).not.toHaveBeenCalled();
    expired.flush([]); await second; controller.verify();
  });
});
