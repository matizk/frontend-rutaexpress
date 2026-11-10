import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { CatalogService } from '../../core/catalog/catalog-api.service';
import { mensajeErrorApi } from '../../core/http/errores-api';
import { CustomerApiService } from '../../core/shipments/customer-api.service';
import { Shipment } from '../../core/shipments/shipment-api.service';

@Component({
  selector: 'app-customer-page',
  host: { class: 'workspace-page' },
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './customer-page.component.html',
  styleUrl: './customer-page.component.scss',
})
export class CustomerPageComponent implements OnInit {
  private readonly api = inject(CustomerApiService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly orders = signal<Shipment[]>([]);
  protected readonly services = signal<CatalogService[]>([]);
  protected readonly availableServices = computed(() =>
    this.services().filter(service => service.cantidadDisponible > 0),
  );
  protected readonly loadingOrders = signal(false);
  protected readonly loadingServices = signal(false);
  protected readonly creating = signal(false);
  protected readonly orderError = signal('');
  protected readonly catalogError = signal('');
  protected readonly submissionError = signal('');
  protected readonly confirmation = signal('');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    nombreDestinatario: ['', [Validators.required, Validators.maxLength(120)]],
    emailDestinatario: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    direccionOrigen: ['', [Validators.required, Validators.maxLength(250)]],
    direccionDestino: ['', [Validators.required, Validators.maxLength(250)]],
    pesoKg: [1, [Validators.required, Validators.min(0.01), Validators.max(99999999.99)]],
    servicioId: [0, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.refresh();
  }

  protected refresh(): void {
    if (this.creating() || this.loadingOrders() || this.loadingServices()) return;
    this.loadingOrders.set(true);
    this.orderError.set('');
    this.api.list().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingOrders.set(false)),
    ).subscribe({
      next: orders => this.orders.set(orders),
      error: error => this.orderError.set(mensajeErrorApi(error, 'consultar tus pedidos', 'cliente')),
    });
    this.loadServices();
  }

  protected create(): void {
    if (this.creating() || this.loadingOrders() || this.loadingServices() || this.catalogError()) return;
    const request = this.form.getRawValue();
    if (this.form.invalid || !this.availableServices().some(service => service.id === request.servicioId)) {
      this.form.markAllAsTouched();
      this.submissionError.set('Completa los datos del envío y elige un servicio disponible.');
      return;
    }

    this.creating.set(true);
    this.confirmation.set('');
    this.submissionError.set('');
    this.api.create(request).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.creating.set(false)),
    ).subscribe({
      next: order => {
        this.orders.update(orders => [order, ...orders]);
        this.form.reset();
        this.confirmation.set(`Pedido creado. Tu código de seguimiento es ${order.codigoSeguimiento}.`);
        this.loadServices();
      },
      error: error => this.submissionError.set(mensajeErrorApi(error, 'crear el pedido', 'cliente')),
    });
  }

  private loadServices(): void {
    this.loadingServices.set(true);
    this.catalogError.set('');
    this.api.services().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingServices.set(false)),
    ).subscribe({
      next: services => {
        this.services.set(services);
        if (!this.availableServices().some(service => service.id === this.form.controls.servicioId.value)) {
          this.form.controls.servicioId.setValue(0);
        }
      },
      error: error => {
        this.services.set([]);
        this.catalogError.set(mensajeErrorApi(error, 'cargar los servicios disponibles', 'cliente'));
      },
    });
  }
}
