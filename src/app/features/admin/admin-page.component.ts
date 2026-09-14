import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Shipment, ShipmentApiService, ShipmentStatus } from '../../core/shipments/shipment-api.service';

@Component({ selector: 'app-admin-page', imports: [CommonModule, ReactiveFormsModule], templateUrl: './admin-page.component.html', styleUrl: './admin-page.component.scss' })
export class AdminPageComponent implements OnInit {
  protected readonly shipments = signal<Shipment[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly statuses: ShipmentStatus[] = ['CREADO', 'ACEPTADO', 'EN_BODEGA', 'EN_RUTA', 'ENTREGADO', 'CANCELADO'];
  protected readonly form;
  constructor(private readonly api: ShipmentApiService, formBuilder: FormBuilder) { this.form = formBuilder.nonNullable.group({ nombreDestinatario: ['', Validators.required], emailDestinatario: ['', [Validators.required, Validators.email]], direccionOrigen: ['Santiago', Validators.required], direccionDestino: ['', Validators.required], pesoKg: [1, [Validators.required, Validators.min(0.1)]] }); }
  ngOnInit(): void { this.load(); }
  protected load(): void { this.loading.set(true); this.error.set(''); this.api.list().subscribe({ next: (shipments) => { this.shipments.set(shipments); this.loading.set(false); }, error: () => { this.error.set('No se pudo conectar al BFF. Inicia catálogo, shipments y BFF para cargar datos reales.'); this.loading.set(false); } }); }
  protected create(): void { if (this.form.invalid) { this.form.markAllAsTouched(); return; } this.api.create(this.form.getRawValue()).subscribe({ next: (shipment) => { this.shipments.update((items) => [shipment, ...items]); this.form.reset({ direccionOrigen: 'Santiago', pesoKg: 1 }); }, error: () => this.error.set('El BFF rechazó la creación. Comprueba la sesión Cognito y el grupo Admin.') }); }
  protected updateStatus(shipment: Shipment, estado: ShipmentStatus): void { this.api.updateStatus(shipment.id, estado).subscribe({ next: (updated) => this.shipments.update((items) => items.map((item) => item.id === updated.id ? updated : item)), error: () => this.error.set('No fue posible actualizar el estado. Revisa el flujo permitido y el acceso.') }); }
}
