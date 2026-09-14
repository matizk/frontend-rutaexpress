import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from './auth-session.service';
import { authInterceptor } from './auth.interceptor';

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
});
