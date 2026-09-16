import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicTrackingResponse, ShipmentApiService } from '../../core/shipments/shipment-api.service';

@Component({ selector: 'app-home-page', imports: [RouterLink], templateUrl: './home-page.component.html', styleUrl: './home-page.component.scss' })
export class HomePageComponent {
  protected readonly trackingCode = signal('');
  protected readonly trackingResult = signal<PublicTrackingResponse | null>(null);
  protected readonly trackingError = signal('');
  protected readonly trackingLoading = signal(false);
  constructor(private readonly shipmentApi: ShipmentApiService) {}
  protected search(): void {
    const code = this.trackingCode().trim().toUpperCase();
    this.trackingCode.set(code);
    this.trackingResult.set(null);
    this.trackingError.set('');
    if (!code) { this.trackingError.set('Ingresa un código de seguimiento.'); return; }
    this.trackingLoading.set(true);
    this.shipmentApi.track(code).subscribe({
      next: (shipment) => { this.trackingResult.set(shipment); this.trackingLoading.set(false); },
      error: () => { this.trackingError.set('No encontramos un envío con ese código.'); this.trackingLoading.set(false); },
    });
  }
}
