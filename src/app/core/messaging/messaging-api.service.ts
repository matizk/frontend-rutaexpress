import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface MessageReceipt {
  id: string;
  eventId: string;
  domain: 'NOTIFICATION' | 'TICKET' | 'AUDIT';
  trackingCode: string;
  eventType: string;
  status: string;
  occurredAt: string;
  processedAt: string;
}
export interface MessagingSummary { notifications: number; tickets: number; audit: number; }

@Injectable({ providedIn: 'root' })
export class MessagingApiService {
  constructor(private readonly http: HttpClient) {}
  summary() { return this.http.get<MessagingSummary>('/api/messaging/summary'); }
  receipts() { return this.http.get<MessageReceipt[]>('/api/messaging/receipts'); }
}
