import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessagingApiService } from '../../core/messaging/messaging-api.service';
import { MessagingPanelComponent } from './messaging-panel.component';

describe('MessagingPanelComponent', () => {
  afterEach(() => vi.useRealTimers());
  it('recovers after a failed refresh and stops polling when destroyed', async () => {
    vi.useFakeTimers();
    const api = {
      summary: vi.fn().mockReturnValueOnce(throwError(() => new Error('offline')))
        .mockReturnValue(of({ notifications: 1, tickets: 1, audit: 1 })),
      receipts: vi.fn().mockReturnValue(of([{ id: 'TICKET:event-1', eventId: 'event-1', domain: 'TICKET',
        trackingCode: 'RX-TEST-1', eventType: 'shipment.created', status: 'CREADO',
        occurredAt: '2026-10-15T12:00:00Z', processedAt: '2026-10-15T12:00:01Z' }])),
    };
    TestBed.configureTestingModule({ imports: [MessagingPanelComponent], providers: [{ provide: MessagingApiService, useValue: api }] });
    const fixture = TestBed.createComponent(MessagingPanelComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(5000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('RX-TEST-1');
    expect(fixture.nativeElement.querySelector('button').textContent).toContain('Descargar comprobante');
    fixture.destroy();
    const calls = api.summary.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10000);
    expect(api.summary.mock.calls.length).toBe(calls);
  });
});
