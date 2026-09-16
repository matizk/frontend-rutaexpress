import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogApiService, CatalogService } from '../../core/catalog/catalog-api.service';
import { Shipment, ShipmentApiService, ShipmentStatus } from '../../core/shipments/shipment-api.service';

@Component({ selector: 'app-admin-page', imports: [CommonModule, ReactiveFormsModule], templateUrl: './admin-page.component.html', styleUrl: './admin-page.component.scss' })
export class AdminPageComponent implements OnInit {
  protected readonly shipments = signal<Shipment[]>([]);
  protected readonly services = signal<CatalogService[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly statuses: ShipmentStatus[] = ['CREADO', 'ACEPTADO', 'EN_BODEGA', 'EN_RUTA', 'ENTREGADO', 'CANCELADO'];
  protected readonly form;
  constructor(private readonly api: ShipmentApiService, private readonly catalogApi: CatalogApiService, formBuilder: FormBuilder) { this.form = formBuilder.nonNullable.group({ nombreDestinatario: ['', Validators.required], emailDestinatario: ['', [Validators.required, Validators.email]], direccionOrigen: ['Santiago', Validators.required], direccionDestino: ['', Validators.required], pesoKg: [1, [Validators.required, Validators.min(0.1)]], servicioId: [0, [Validators.required, Validators.min(1)]] }); }
  ngOnInit(): void { this.load(); }
  protected load(): void { this.loading.set(true); this.error.set(''); this.api.list().subscribe({ next: (shipments) => { this.shipments.set(shipments); this.loadServices(); this.loading.set(false); }, error: () => { this.error.set('No se pudo conectar al BFF. Inicia catálogo, shipments y BFF para cargar datos reales.'); this.loading.set(false); } }); }
  protected create(): void { if (this.form.invalid) { this.form.markAllAsTouched(); return; } this.api.create(this.form.getRawValue()).subscribe({ next: (shipment) => { this.shipments.update((items) => [shipment, ...items]); this.form.reset({ direccionOrigen: 'Santiago', pesoKg: 1, servicioId: 0 }); this.loadServices(); }, error: () => this.error.set('No se pudo crear el envío. Revisa que el servicio tenga capacidad disponible y tu sesión Admin siga activa.') }); }
  protected updateStatus(shipment: Shipment, estado: ShipmentStatus): void { this.api.updateStatus(shipment.id, estado).subscribe({ next: (updated) => this.shipments.update((items) => items.map((item) => item.id === updated.id ? updated : item)), error: () => this.error.set('No fue posible actualizar el estado. Revisa el flujo permitido y el acceso.') }); }
  private loadServices(): void { this.catalogApi.list().subscribe({ next: (services) => this.services.set(services.filter((service) => service.cantidadDisponible > 0)), error: () => this.error.set('No se pudo cargar el Catálogo. Verifica que Catálogo y BFF estén activos.') }); }
}
