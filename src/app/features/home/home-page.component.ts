import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { PublicTrackingResponse, ShipmentApiService, ShipmentStatus } from '../../core/shipments/shipment-api.service';

@Component({ selector: 'app-home-page', imports: [DatePipe], templateUrl: './home-page.component.html', styleUrl: './home-page.component.scss' })
export class HomePageComponent {
  protected readonly trackingCode = signal('');
  protected readonly trackingResult = signal<PublicTrackingResponse | null>(null);
  protected readonly trackingError = signal('');
  protected readonly trackingLoading = signal(false);
  protected readonly statusLabels: Record<ShipmentStatus, string> = {
    CREADO: 'Solicitud creada', ACEPTADO: 'Aceptado', EN_BODEGA: 'En bodega',
    EN_RUTA: 'En ruta', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado',
  };
  constructor(private readonly shipmentApi: ShipmentApiService) {}
  protected search(): void {
    if (this.trackingLoading()) return;
    const code = this.trackingCode().trim().toUpperCase();
    this.trackingCode.set(code);
    this.trackingResult.set(null);
    this.trackingError.set('');
    if (!code) { this.trackingError.set('Ingresa un código de seguimiento.'); return; }
    this.trackingLoading.set(true);
    this.shipmentApi.track(code).subscribe({
      next: (shipment) => { this.trackingResult.set(shipment); this.trackingLoading.set(false); },
      error: (error: HttpErrorResponse) => {
        this.trackingError.set(error.status === 404
          ? 'No encontramos ese código. Comprueba que esté completo e inténtalo nuevamente.'
          : 'El seguimiento no está disponible en este momento. Inténtalo de nuevo en unos minutos.');
        this.trackingLoading.set(false);
      },
    });
  }
}
