import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ReportApiService } from '../../core/reports/report-api.service';
import { ReportsPageComponent } from './reports-page.component';

describe('Disponibilidad de los reportes', () => {
  it('retira los indicadores de otro periodo si falla la carga y permite reintentar', () => {
    const report = { range: 'last7d', from: '', to: '', totalShipments: 12, activeShipments: 4,
      deliveredShipments: 8, cancelledShipments: 0, averageDeliveredLeadTimeHours: 2, shipmentsByStatus: {} };
    const api = { kpis: vi.fn().mockReturnValue(of(report)), topDestinations: vi.fn().mockReturnValue(of({ destinations: [] })) };
    TestBed.configureTestingModule({ imports: [ReportsPageComponent], providers: [{ provide: ReportApiService, useValue: api }] });
    const fixture = TestBed.createComponent(ReportsPageComponent); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.kpi-grid')).not.toBeNull();
    api.kpis.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    const period = root.querySelector('select')!;
    period.value = 'last24h'; period.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(root.querySelector('.kpi-grid')).toBeNull();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('servicio no está disponible');
    expect(root.textContent).not.toContain('grupo Admin');
    api.kpis.mockReturnValue(of({ ...report, range: 'last24h' }));
    root.querySelector<HTMLButtonElement>('.report-unavailable button')!.click(); fixture.detectChanges();
    expect(api.kpis).toHaveBeenLastCalledWith('last24h');
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.querySelector('.kpi-grid')).not.toBeNull();
    fixture.destroy();
  });
});
