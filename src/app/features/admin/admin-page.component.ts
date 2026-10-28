import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogApiService, CatalogService } from '../../core/catalog/catalog-api.service';
import { Shipment, ShipmentApiService, ShipmentStatus } from '../../core/shipments/shipment-api.service';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { UserApiService } from '../../core/auth/user-api.service';
import { MessagingPanelComponent } from './messaging-panel.component';
import { mensajeErrorApi } from '../../core/http/errores-api';

@Component({ selector: 'app-admin-page', host: { class: 'workspace-page' }, imports: [CommonModule, FormsModule, ReactiveFormsModule, MessagingPanelComponent], templateUrl: './admin-page.component.html', styleUrl: './admin-page.component.scss' })
export class AdminPageComponent implements OnInit {
  protected readonly shipments = signal<Shipment[]>([]);
  protected readonly services = signal<CatalogService[]>([]);
  protected readonly loading = signal(false);
  protected readonly servicesLoading = signal(false);
  protected readonly servicesLoaded = signal(false);
  protected readonly creating = signal(false);
  protected readonly loadError = signal('');
  protected readonly servicesError = signal('');
  private readonly profileError = signal('');
  private readonly actionError = signal('');
  protected readonly error = computed(() => this.actionError() || this.loadError() || this.servicesError() || this.profileError());
  protected readonly statuses: ShipmentStatus[] = ['CREADO', 'ACEPTADO', 'EN_BODEGA', 'EN_RUTA', 'ENTREGADO', 'CANCELADO'];
  protected readonly form;
  constructor(private readonly api: ShipmentApiService, private readonly catalogApi: CatalogApiService, private readonly session: AuthSessionService, private readonly userApi: UserApiService, formBuilder: FormBuilder) { this.form = formBuilder.nonNullable.group({ nombreDestinatario: ['', Validators.required], emailDestinatario: ['', [Validators.required, Validators.email]], direccionOrigen: ['Santiago', Validators.required], direccionDestino: ['', Validators.required], pesoKg: [1, [Validators.required, Validators.min(0.1)]], servicioId: [0, [Validators.required, Validators.min(1)]] }); }
  ngOnInit(): void { void this.syncCurrentUser(); this.load(); }
  protected load(): void {
    if (this.loading() || this.servicesLoading()) return;
    this.loading.set(true); this.loadError.set(''); this.actionError.set('');
    this.loadServices();
    this.api.list().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: shipments => this.shipments.set(shipments),
      error: error => { this.shipments.set([]); this.loadError.set(mensajeErrorApi(error, 'cargar los envíos')); },
    });
  }
  protected create(): void {
    if (this.creating() || this.loading() || this.loadError() || this.servicesLoading()
        || !this.servicesLoaded() || this.servicesError() || !this.services().length) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.creating.set(true); this.actionError.set('');
    const request = { ...this.form.getRawValue(), codigoSeguimiento: `RX-${Date.now()}` };
    this.api.create(request).pipe(finalize(() => this.creating.set(false))).subscribe({
      next: shipment => {
        this.shipments.update(items => [shipment, ...items]);
        this.form.reset({ direccionOrigen: 'Santiago', pesoKg: 1, servicioId: 0 });
        this.loadServices();
      },
      error: error => this.actionError.set(mensajeErrorApi(error, 'crear la solicitud')),
    });
  }
  protected updateStatus(shipment: Shipment, estado: ShipmentStatus, control: FormControl<ShipmentStatus>): void {
    control.setValue(shipment.estado, { emitEvent: false, emitViewToModelChange: false });
    if (this.loading() || this.loadError() || estado === shipment.estado) return;
    this.actionError.set('');
    control.disable({ emitEvent: false });
    this.api.updateStatus(shipment.id, estado).pipe(finalize(() => control.enable({ emitEvent: false }))).subscribe({
      next: updated => {
        this.shipments.update(items => items.map(item => item.id === updated.id ? updated : item));
        control.setValue(updated.estado, { emitEvent: false, emitViewToModelChange: false });
      },
      error: error => this.actionError.set(mensajeErrorApi(error, 'actualizar el estado')),
    });
  }
  private loadServices(): void {
    this.servicesLoading.set(true); this.servicesLoaded.set(false); this.servicesError.set('');
    this.catalogApi.list().pipe(finalize(() => this.servicesLoading.set(false))).subscribe({
      next: services => { this.services.set(services.filter(service => service.cantidadDisponible > 0)); this.servicesLoaded.set(true); },
      error: error => { this.services.set([]); this.servicesError.set(mensajeErrorApi(error, 'cargar los servicios disponibles')); },
    });
  }
  private async syncCurrentUser(): Promise<void> {
    const profile = await this.session.applicationUserProfile();
    if (profile) this.userApi.sync(profile).subscribe({
      error: error => this.profileError.set(mensajeErrorApi(error, 'sincronizar el perfil de administración')),
    });
  }
}
