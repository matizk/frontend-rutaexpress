import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type ReportRange = 'last24h' | 'last7d' | 'last30d';

export interface KpiReport {
  range: ReportRange;
  from: string;
  to: string;
  totalShipments: number;
  activeShipments: number;
  deliveredShipments: number;
  cancelledShipments: number;
  averageDeliveredLeadTimeHours: number | null;
  shipmentsByStatus: Partial<Record<string, number>>;
}

export interface TopDestination {
  destination: string;
  shipments: number;
}

export interface TopDestinationsReport {
  range: ReportRange;
  from: string;
  to: string;
  destinations: TopDestination[];
}

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private readonly endpoint = '/api/report';

  constructor(private readonly http: HttpClient) {}

  kpis(range: ReportRange): Observable<KpiReport> {
    return this.http.get<KpiReport>(`${this.endpoint}/kpis`, { params: new HttpParams().set('range', range) });
  }

  topDestinations(range: ReportRange): Observable<TopDestinationsReport> {
    return this.http.get<TopDestinationsReport>(`${this.endpoint}/top-destinations`, {
      params: new HttpParams().set('range', range).set('limit', '5'),
    });
  }
}
