import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { PublicTrackingResponse, ShipmentApiService } from '../../core/shipments/shipment-api.service';
import { HomePageComponent } from './home-page.component';

const accepted: PublicTrackingResponse = {
  codigoSeguimiento: 'RX-PRUEBA', estado: 'ACEPTADO', direccionOrigen: 'Santiago',
  direccionDestino: 'Valparaíso', fechaActualizacion: '2026-10-21T23:59:47Z',
};

function setup() {
  const api = { track: vi.fn().mockReturnValue(of(accepted)) };
  TestBed.configureTestingModule({ imports: [HomePageComponent],
    providers: [provideRouter([]), { provide: ShipmentApiService, useValue: api }],
  });
  const fixture = TestBed.createComponent(HomePageComponent); fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const submit = (code = 'RX-PRUEBA') => {
    const input = root.querySelector('input')!;
    input.value = code; input.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  };
  return { api, fixture, root, submit };
}

describe('Seguimiento público', () => {
  it('normaliza el código y distingue aceptación de entrega en el resultado real', () => {
    const { api, root, submit } = setup();
    submit('  rx-prueba  ');
    expect(api.track).toHaveBeenCalledWith('RX-PRUEBA');
    const result = root.querySelector('.tracking-result')!;
    expect(result.textContent).toContain('Valparaíso');
    expect(result.textContent).toContain('La entrega del envío es una etapa posterior');
    expect(result.querySelector('[data-status="ACEPTADO"]')?.textContent).toContain('Aceptado');
  });

  it('indica código inexistente solamente cuando la API devuelve 404', () => {
    const { api, root, submit } = setup();
    api.track.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    submit();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No encontramos ese código');
    expect(root.querySelector('.tracking-result')).toBeNull();
  });

  it.each([0, 503])('explica indisponibilidad con HTTP %s sin culpar al código de seguimiento', status => {
    const { api, root, submit } = setup();
    api.track.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    submit();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('no está disponible');
    expect(root.textContent).not.toContain('No encontramos ese código');
    expect(root.querySelector('button')?.disabled).toBe(false);
  });

  it('evita consultas duplicadas mientras espera y permite consultar de nuevo al terminar', () => {
    const { api, root, submit } = setup();
    const response = new Subject<PublicTrackingResponse>(); api.track.mockReturnValue(response);
    submit(); submit();
    expect(api.track).toHaveBeenCalledTimes(1);
    expect(root.querySelector('button')?.disabled).toBe(true);
    response.next(accepted); response.complete();
    submit();
    expect(api.track).toHaveBeenCalledTimes(2);
  });
});
