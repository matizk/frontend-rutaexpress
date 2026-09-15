import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface CatalogService {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  cantidadDisponible: number;
}

export interface CatalogServiceRequest {
  nombre: string;
  descripcion: string;
  precio: number;
  cantidadDisponible: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly endpoint = '/api/catalog/services';

  constructor(private readonly http: HttpClient) {}

  list(): Observable<CatalogService[]> {
    return this.http.get<CatalogService[]>(this.endpoint);
  }

  create(request: CatalogServiceRequest): Observable<CatalogService> {
    return this.http.post<CatalogService>(this.endpoint, request);
  }

  update(id: number, request: CatalogServiceRequest): Observable<CatalogService> {
    return this.http.put<CatalogService>(`${this.endpoint}/${id}`, request);
  }
}
