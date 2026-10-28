import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, finalize, startWith, switchMap, take, timer } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { AzureSessionService } from '../../core/auth/azure-session.service';
import { OperatorApiService } from '../../core/operator/operator-api.service';
import { Shipment, ShipmentStatus } from '../../core/shipments/shipment-api.service';
import { MessageReceipt } from '../../core/messaging/messaging-api.service';
import { mensajeErrorApi } from '../../core/http/errores-api';

@Component({
  host: { class: 'workspace-page' },
  selector: 'app-operator-page', imports: [CommonModule, RouterLink],
  templateUrl: './operator-page.component.html', styleUrl: './operator-page.component.scss',
})
export class OperatorPageComponent implements OnInit {
  protected readonly admin = inject(AuthSessionService);
  protected readonly azure = inject(AzureSessionService);
  private readonly api = inject(OperatorApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refresh = new Subject<void>();
  private readonly selectedShipment = new Subject<Shipment | null>();
  protected readonly access = computed(() => this.azure.isAuthenticated());
  protected readonly requests = signal<Shipment[]>([]);
  protected readonly search = signal('');
  protected readonly visibleRequests = computed(() => {
    const query = this.normalize(this.search().trim());
    return this.requests().filter(shipment => this.normalize(
      `${shipment.codigoSeguimiento} ${shipment.direccionOrigen} ${shipment.direccionDestino}`,
    ).includes(query));
  });
  protected readonly statusLabels: Record<ShipmentStatus, string> = {
    CREADO: 'Pendiente', ACEPTADO: 'Aceptado', EN_BODEGA: 'En bodega',
    EN_RUTA: 'En ruta', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado',
  };
  protected readonly selected = signal<Shipment | null>(null);
  protected readonly ticket = signal<MessageReceipt | null>(null);
  protected readonly filter = signal<ShipmentStatus>('CREADO');
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly ticketError = signal('');
  protected readonly actionError = signal('');
  protected readonly ticketWaiting = signal(false);
  protected readonly notice = signal('');

  ngOnInit(): void {
    this.refresh.pipe(startWith(undefined),
      switchMap(() => {
        if (!this.access()) return EMPTY;
        this.loading.set(true);
        this.error.set('');
        return this.api.list(this.filter()).pipe(
          catchError((error: HttpErrorResponse) => {
            this.requests.set([]);
            this.error.set(mensajeErrorApi(error, 'cargar las solicitudes', 'operador')); return EMPTY;
          }), finalize(() => this.loading.set(false)));
      }), takeUntilDestroyed(this.destroyRef),
    ).subscribe(items => { this.requests.set(items); this.error.set(''); });
    this.selectedShipment.pipe(switchMap(shipment => {
      if (!shipment || shipment.estado === 'CREADO' || shipment.estado === 'CANCELADO') return EMPTY;
      this.ticketWaiting.set(true);
      return timer(0, 3000).pipe(switchMap(() => this.api.confirmation(shipment.codigoSeguimiento).pipe(
        catchError((error: HttpErrorResponse) => {
          this.ticketError.set(error.status === 404 ? '' : this.apiError(error));
          return EMPTY;
        }))), take(1));
    }), takeUntilDestroyed(this.destroyRef)).subscribe(ticket => {
      this.ticket.set(ticket); this.ticketWaiting.set(false); this.ticketError.set('');
    });
  }
  protected reload(): void { this.refresh.next(); }
  protected changeFilter(value: string): void {
    this.filter.set(value as ShipmentStatus); this.reload();
  }
  protected open(shipment: Shipment): void {
    if (this.busy()) return;
    this.selected.set(shipment); this.ticket.set(null); this.ticketError.set('');
    this.notice.set(''); this.actionError.set(''); this.ticketWaiting.set(false); this.selectedShipment.next(shipment);
  }
  protected accept(): void {
    const shipment = this.selected();
    if (!shipment || shipment.estado !== 'CREADO' || this.busy()) return;
    this.busy.set(true); this.actionError.set('');
    this.api.accept(shipment.id).pipe(finalize(() => this.busy.set(false)),
      takeUntilDestroyed(this.destroyRef)).subscribe({
      next: accepted => {
        this.selected.set(accepted); this.selectedShipment.next(accepted);
        this.notice.set('Solicitud aceptada. Estamos preparando tu confirmación.');
        this.reload();
      },
      error: (error: HttpErrorResponse) => {
        this.actionError.set(this.apiError(error));
        // Another operator may have processed it; refresh without issuing a second acceptance.
        this.reload();
      },
    });
  }
  protected download(): void {
    const receipt = this.ticket();
    if (!receipt || receipt.status !== 'ACEPTADO' || receipt.eventType !== 'shipment.status_changed') return;
    const body = ['RUTAEXPRESS - CONFIRMACIÓN DE SOLICITUD', '',
      'Seguimiento: ' + receipt.trackingCode, 'Estado confirmado: ACEPTADO',
      'Referencia: TK-' + receipt.eventId, 'Aceptación: ' + new Date(receipt.occurredAt).toLocaleString('es-CL'),
      'Procesado: ' + new Date(receipt.processedAt).toLocaleString('es-CL'), '',
      'Confirma la aceptación de la solicitud, no la entrega del envío.', ''].join('\n');
    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url;
    link.download = receipt.trackingCode + '-confirmacion.txt'; link.click(); URL.revokeObjectURL(url);
  }
  private apiError(error: HttpErrorResponse): string {
    return mensajeErrorApi(error, 'completar la operación', 'operador');
  }
  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
