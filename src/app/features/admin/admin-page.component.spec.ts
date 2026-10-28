import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { UserApiService } from '../../core/auth/user-api.service';
import { CatalogApiService } from '../../core/catalog/catalog-api.service';
import { MessagingApiService } from '../../core/messaging/messaging-api.service';
import { Shipment, ShipmentApiService } from '../../core/shipments/shipment-api.service';
import { AdminPageComponent } from './admin-page.component';

describe('Disponibilidad de la operación administrativa', () => {
  const accepted: Shipment = {
    id: 1, codigoSeguimiento: 'RX-SELECTOR-TEST', estado: 'ACEPTADO', nombreDestinatario: 'Persona ficticia',
    emailDestinatario: 'prueba@example.test', direccionOrigen: 'Santiago', direccionDestino: 'Valparaíso',
    pesoKg: 1, servicioId: 1, servicioNombre: 'Express',
    fechaCreacion: '2026-10-21T12:00:00Z', fechaActualizacion: '2026-10-21T12:01:00Z',
  };
  function setup(catalogFailure: boolean, initialShipments: Shipment[] = []) {
    const shipments = { list: vi.fn().mockReturnValue(of(initialShipments)), create: vi.fn(), updateStatus: vi.fn() };
    const catalog = { list: vi.fn().mockReturnValue(catalogFailure
      ? throwError(() => new HttpErrorResponse({ status: 503 }))
      : of([{ id: 1, nombre: 'Express', descripcion: '', precio: 1000, cantidadDisponible: 2 }])) };
    TestBed.configureTestingModule({ imports: [AdminPageComponent], providers: [
      { provide: ShipmentApiService, useValue: shipments },
      { provide: CatalogApiService, useValue: catalog },
      { provide: AuthSessionService, useValue: { applicationUserProfile: () => Promise.resolve(null) } },
      { provide: UserApiService, useValue: { sync: vi.fn() } },
      { provide: MessagingApiService, useValue: { summary: () => of({ notifications: 0, tickets: 0, audit: 0 }), receipts: () => of([]) } },
    ] });
    const fixture = TestBed.createComponent(AdminPageComponent); fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement, shipments, catalog };
  }

  it('sincroniza el selector con el estado recibido sin actualizar el envío al cargar', async () => {
    const { fixture, root, shipments } = setup(false, [accepted]);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector<HTMLSelectElement>('.shipment-actions select')!.value).toBe('ACEPTADO');
    expect(root.querySelector('.status-badge')?.getAttribute('data-status')).toBe('ACEPTADO');
    expect(shipments.updateStatus).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('mantiene el estado confirmado mientras espera y aplica el resultado del servidor', async () => {
    const { fixture, root, shipments } = setup(false, [accepted]);
    await fixture.whenStable(); fixture.detectChanges();
    const response = new Subject<Shipment>(); shipments.updateStatus.mockReturnValue(response);
    const select = root.querySelector<HTMLSelectElement>('.shipment-actions select')!;
    select.value = 'EN_BODEGA'; select.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(shipments.updateStatus).toHaveBeenCalledWith(1, 'EN_BODEGA');
    expect(shipments.updateStatus).toHaveBeenCalledTimes(1);
    expect(select.value).toBe('ACEPTADO'); expect(select.disabled).toBe(true);
    response.next({ ...accepted, estado: 'EN_BODEGA' }); response.complete();
    await fixture.whenStable(); fixture.detectChanges();
    expect(select.value).toBe('EN_BODEGA'); expect(select.disabled).toBe(false);
    expect(shipments.updateStatus).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.status-badge')?.getAttribute('data-status')).toBe('EN_BODEGA');
    fixture.destroy();
  });

  it('restaura el selector si el backend rechaza una transición', async () => {
    const { fixture, root, shipments } = setup(false, [accepted]);
    await fixture.whenStable(); fixture.detectChanges();
    shipments.updateStatus.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400,
      error: { message: 'No se puede cambiar un envío de ACEPTADO a CREADO' },
    })));
    const select = root.querySelector<HTMLSelectElement>('.shipment-actions select')!;
    select.value = 'CREADO'; select.dispatchEvent(new Event('change'));
    await fixture.whenStable(); fixture.detectChanges();
    expect(select.value).toBe('ACEPTADO'); expect(select.disabled).toBe(false);
    expect(root.querySelector('.status-badge')?.getAttribute('data-status')).toBe('ACEPTADO');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No se puede cambiar');
    expect(shipments.updateStatus).toHaveBeenCalledTimes(1);
    fixture.destroy();
  });

  it('no afirma falta de cupos ni permite crear cuando el catálogo no responde', () => {
    const { fixture, root, shipments, catalog } = setup(true);
    expect(root.textContent).toContain('servicio no está disponible');
    expect(root.textContent).toContain('No pudimos comprobar los servicios ni sus cupos');
    expect(root.textContent).not.toContain('No hay servicios con cupos disponibles');
    expect(root.querySelector<HTMLButtonElement>('form button[type="submit"]')!.disabled).toBe(true);
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(shipments.create).not.toHaveBeenCalled();
    catalog.list.mockReturnValue(of([{ id: 1, nombre: 'Express', descripcion: '', precio: 1000, cantidadDisponible: 2 }]));
    root.querySelector<HTMLButtonElement>('.admin-header button')!.click(); fixture.detectChanges();
    expect(root.querySelector<HTMLButtonElement>('form button[type="submit"]')!.disabled).toBe(false);
    expect(root.querySelector('[role="alert"]')).toBeNull();
    fixture.destroy();
  });

  it('no muestra cero registros como resultado de una consulta fallida de envíos', () => {
    const { fixture, root, shipments } = setup(false);
    shipments.list.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    root.querySelector<HTMLButtonElement>('.admin-header button')!.click(); fixture.detectChanges();
    expect(root.querySelector('.shipments-card')?.textContent).toContain('Sin datos disponibles');
    expect(root.querySelector('.shipments-card')?.textContent).not.toContain('0 registros cargados');
    expect(root.querySelector<HTMLButtonElement>('form button[type="submit"]')!.disabled).toBe(true);
    expect(root.textContent).not.toContain('Inicia catálogo');
    fixture.destroy();
  });
});
