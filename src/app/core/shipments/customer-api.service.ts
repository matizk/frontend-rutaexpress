import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CatalogService } from '../catalog/catalog-api.service';
import { CreateShipmentRequest, Shipment } from './shipment-api.service';

@Injectable({ providedIn: 'root' })
export class CustomerApiService {
  private readonly endpoint = '/api/customer';

  constructor(private readonly http: HttpClient) {}

  services() {
    return this.http.get<CatalogService[]>(`${this.endpoint}/services`);
  }

  list() {
    return this.http.get<Shipment[]>(`${this.endpoint}/shipments`);
  }

  create(request: Omit<CreateShipmentRequest, 'codigoSeguimiento'>) {
    return this.http.post<Shipment>(`${this.endpoint}/shipments`, request);
  }
}
