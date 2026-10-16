import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Shipment, ShipmentStatus } from '../shipments/shipment-api.service';
import { MessageReceipt } from '../messaging/messaging-api.service';

@Injectable({ providedIn: 'root' })
export class OperatorApiService {
  private readonly http = inject(HttpClient);
  list(status: ShipmentStatus = 'CREADO') {
    return this.http.get<Shipment[]>('/api/operator/shipments', { params: { status } });
  }
  detail(id: number) { return this.http.get<Shipment>('/api/operator/shipments/' + id); }
  accept(id: number) { return this.http.post<Shipment>('/api/operator/shipments/' + id + '/accept', {}); }
  confirmation(code: string) {
    return this.http.get<MessageReceipt>('/api/operator/confirmations/' + encodeURIComponent(code));
  }
}
