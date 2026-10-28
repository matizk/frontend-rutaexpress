import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, forkJoin, switchMap, timer } from 'rxjs';
import { MessageReceipt, MessagingApiService, MessagingSummary } from '../../core/messaging/messaging-api.service';
import { mensajeErrorApi } from '../../core/http/errores-api';

@Component({
  selector: 'app-messaging-panel',
  imports: [CommonModule],
  templateUrl: './messaging-panel.component.html',
  styleUrl: './messaging-panel.component.scss',
})
export class MessagingPanelComponent implements OnInit {
  private readonly api = inject(MessagingApiService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly summary = signal<MessagingSummary>({ notifications: 0, tickets: 0, audit: 0 });
  protected readonly receipts = signal<MessageReceipt[]>([]);
  protected readonly search = signal('');
  protected readonly error = signal('');
  protected readonly updatedAt = signal<Date | null>(null);
  protected readonly visible = computed(() => this.receipts()
    .filter(item => item.trackingCode.includes(this.search().trim().toUpperCase())).slice(0, 12));
  protected readonly labels = { NOTIFICATION: 'Notificación interna', TICKET: 'Comprobante', AUDIT: 'Registro de actividad' };

  ngOnInit(): void {
    timer(0, 5000).pipe(
      switchMap(() => forkJoin({ summary: this.api.summary(), receipts: this.api.receipts() }).pipe(
        catchError(error => {
          this.error.set(mensajeErrorApi(error, 'actualizar la actividad'));
          return EMPTY;
        }),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(snapshot => {
      this.summary.set(snapshot.summary);
      this.receipts.set(snapshot.receipts);
      this.updatedAt.set(new Date());
      this.error.set('');
    });
  }

  protected download(receipt: MessageReceipt): void {
    const text = ['RUTAEXPRESS - COMPROBANTE DE ENVÍO', '', `Envío: ${receipt.trackingCode}`,
      `Estado: ${receipt.status}`, `Fecha del evento: ${new Date(receipt.occurredAt).toLocaleString('es-CL')}`,
      `Emitido: ${new Date(receipt.processedAt).toLocaleString('es-CL')}`, `Referencia: TK-${receipt.eventId}`,
      '', 'Este comprobante registra el estado indicado; no acredita entrega si el estado es distinto de ENTREGADO.', ''].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${receipt.trackingCode}-${receipt.status}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
