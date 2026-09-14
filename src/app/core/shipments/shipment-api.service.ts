import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type ShipmentStatus = 'CREADO' | 'ACEPTADO' | 'EN_BODEGA' | 'EN_RUTA' | 'ENTREGADO' | 'CANCELADO';

export interface Shipment { id: number; codigoSeguimiento: string; nombreDestinatario: string; emailDestinatario: string; direccionOrigen: string; direccionDestino: string; pesoKg: number; estado: ShipmentStatus; fechaCreacion: string; fechaActualizacion: string; }
export interface CreateShipmentRequest { nombreDestinatario: string; emailDestinatario: string; direccionOrigen: string; direccionDestino: string; pesoKg: number; }

@Injectable({ providedIn: 'root' })
export class ShipmentApiService {
  private readonly endpoint = '/api/shipments';
  constructor(private readonly http: HttpClient) {}
  list(): Observable<Shipment[]> { return this.http.get<Shipment[]>(this.endpoint); }
  create(request: CreateShipmentRequest): Observable<Shipment> { return this.http.post<Shipment>(this.endpoint, request); }
  updateStatus(id: number, estado: ShipmentStatus): Observable<Shipment> { return this.http.put<Shipment>(`${this.endpoint}/${id}/status`, { estado }); }
}
