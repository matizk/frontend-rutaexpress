import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { CustomerApiService } from '../../core/shipments/customer-api.service';
import { CustomerPageComponent } from './customer-page.component';

describe('Pedidos del cliente', () => {
  it('crea la solicitud con el servicio elegido y muestra el código que devuelve el servidor', () => {
    const api = {
      list: vi.fn().mockReturnValue(of([])),
      services: vi.fn().mockReturnValue(of([{ id: 7, nombre: 'Express', precio: 2300, cantidadDisponible: 2 }])),
      create: vi.fn().mockReturnValue(of({
        id: 11, codigoSeguimiento: 'RX-PRUEBA-CLIENTE', estado: 'CREADO',
        direccionOrigen: 'Santiago', direccionDestino: 'Valparaíso', servicioNombre: 'Express',
        fechaActualizacion: '2026-11-09T18:00:00',
      })),
    };
    TestBed.configureTestingModule({
      imports: [CustomerPageComponent],
      providers: [{ provide: CustomerApiService, useValue: api }],
    });
    const fixture = TestBed.createComponent(CustomerPageComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const request = {
      nombreDestinatario: 'Destinatario',
      emailDestinatario: 'entregas@example.test',
      direccionOrigen: 'Santiago',
      direccionDestino: 'Valparaíso',
    };
    for (const [field, value] of Object.entries(request)) {
      const input = root.querySelector<HTMLInputElement>(`[formControlName="${field}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const select = root.querySelector('select')!;
    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(api.create).toHaveBeenCalledExactlyOnceWith({ ...request, pesoKg: 1, servicioId: 7 });
    expect(root.querySelector('.confirmation')?.textContent).toContain('RX-PRUEBA-CLIENTE');
    expect(root.querySelector('.order-list')?.textContent).toContain('CREADO');
    fixture.destroy();
  });
});
