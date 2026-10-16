import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OperatorPageComponent } from './operator-page.component';
import { OperatorApiService } from '../../core/operator/operator-api.service';
import { AzureSessionService } from '../../core/auth/azure-session.service';
import { AuthSessionService } from '../../core/auth/auth-session.service';

const pending = { id: 1, codigoSeguimiento: 'RX-OP-TEST', estado: 'CREADO', nombreDestinatario: 'Persona ficticia',
  emailDestinatario: 'prueba@example.test', direccionOrigen: 'Santiago', direccionDestino: 'Valparaíso',
  pesoKg: 1, servicioNombre: 'Express', fechaCreacion: '2026-10-15T12:00:00' };
const accepted = { ...pending, estado: 'ACEPTADO' };
const ticket = { id: 'TICKET:test', eventId: 'test', trackingCode: pending.codigoSeguimiento,
  domain: 'TICKET', eventType: 'shipment.status_changed', status: 'ACEPTADO', processedAt: '2026-10-15T12:01:00Z' };

function setup(authenticated = true) {
  const api = { list: vi.fn().mockReturnValue(of([pending])), accept: vi.fn().mockReturnValue(of(accepted)),
    confirmation: vi.fn().mockReturnValue(of(ticket)) };
  TestBed.configureTestingModule({ imports: [OperatorPageComponent], providers: [provideRouter([]),
    { provide: OperatorApiService, useValue: api },
    { provide: AuthSessionService, useValue: { isAdmin: signal(authenticated), initialize: () => Promise.resolve() } },
    { provide: AzureSessionService, useValue: {
      isAuthenticated: signal(false), isConfigured: signal(false), error: signal(''), signIn: vi.fn(),
    } },
  ] });
  const fixture = TestBed.createComponent(OperatorPageComponent); fixture.detectChanges();
  return { api, fixture, text: () => fixture.nativeElement.textContent as string };
}
describe('Operator workflow', () => {
  afterEach(() => vi.useRealTimers());
  it('does not load protected data or pretend Azure is configured for an anonymous visitor', async () => {
    const { api, fixture, text } = setup(false);
    await Promise.resolve(); fixture.detectChanges();
    expect(api.list).not.toHaveBeenCalled();
    expect(text()).toContain('Azure pendiente de configuración');
    expect(fixture.nativeElement.querySelector('.request')).toBeNull();
  });
  it('separates creation from acceptance and waits for the real RabbitMQ ticket', async () => {
    vi.useFakeTimers();
    const { api, fixture, text } = setup();
    const acceptance = new Subject<unknown>(); api.accept.mockReturnValue(acceptance);
    api.confirmation.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404 })))
      .mockReturnValue(of(ticket));
    await Promise.resolve(); fixture.detectChanges();
    expect(text()).toContain('Cognito');
    fixture.nativeElement.querySelector('.request').click(); fixture.detectChanges();
    expect(text()).toContain('todavía no ha sido aceptada');
    expect(api.confirmation).not.toHaveBeenCalled();
    const acceptButton = fixture.nativeElement.querySelector('[data-testid="accept"]') as HTMLButtonElement;
    acceptButton.click(); acceptButton.click(); fixture.detectChanges();
    expect(api.accept).toHaveBeenCalledTimes(1); expect(acceptButton.disabled).toBe(true);
    acceptance.next(accepted); acceptance.complete(); fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0); fixture.detectChanges();
    expect(text()).toContain('Buscando el ticket');
    expect(text()).not.toContain('Descargar confirmación');
    await vi.advanceTimersByTimeAsync(3000); fixture.detectChanges();
    expect(text()).toContain('Descargar confirmación');
    const calls = api.confirmation.mock.calls.length;
    await vi.advanceTimersByTimeAsync(9000);
    expect(api.confirmation).toHaveBeenCalledTimes(calls);
    fixture.destroy();
  });
  it('preserves acceptance errors and cancels ticket polling when leaving the page', async () => {
    vi.useFakeTimers();
    const { api, fixture, text } = setup();
    api.accept.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400, error: { message: 'La solicitud ya fue aceptada por otro operador' },
    })));
    await Promise.resolve(); fixture.detectChanges();
    fixture.nativeElement.querySelector('.request').click(); fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="accept"]').click(); fixture.detectChanges();
    expect(text()).toContain('ya fue aceptada por otro operador');
    api.list.mockReturnValue(of([accepted]));
    fixture.nativeElement.querySelector('.secondary').click(); fixture.detectChanges();
    api.confirmation.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    fixture.nativeElement.querySelector('.request').click(); fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.destroy();
    const calls = api.confirmation.mock.calls.length;
    await vi.advanceTimersByTimeAsync(9000);
    expect(api.confirmation).toHaveBeenCalledTimes(calls);
  });
});
