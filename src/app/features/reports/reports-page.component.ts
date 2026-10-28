import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { KpiReport, ReportApiService, ReportRange, TopDestinationsReport } from '../../core/reports/report-api.service';
import { mensajeErrorApi } from '../../core/http/errores-api';

@Component({
  selector: 'app-reports-page',
  imports: [CommonModule, DecimalPipe],
  templateUrl: './reports-page.component.html',
  styleUrl: './reports-page.component.scss',
})
export class ReportsPageComponent implements OnInit {
  protected readonly selectedRange = signal<ReportRange>('last7d');
  protected readonly kpis = signal<KpiReport | null>(null);
  protected readonly destinations = signal<TopDestinationsReport | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  constructor(private readonly reports: ReportApiService) {}

  ngOnInit(): void { this.load('last7d'); }

  protected load(range: ReportRange): void {
    this.selectedRange.set(range);
    this.loading.set(true);
    this.error.set('');
    this.kpis.set(null); this.destinations.set(null);
    forkJoin({ kpis: this.reports.kpis(range), destinations: this.reports.topDestinations(range) }).subscribe({
      next: ({ kpis, destinations }) => {
        this.kpis.set(kpis);
        this.destinations.set(destinations);
        this.loading.set(false);
      },
      error: error => {
        this.error.set(mensajeErrorApi(error, 'cargar los reportes'));
        this.loading.set(false);
      },
    });
  }

  protected changeRange(value: string): void { this.load(value as ReportRange); }

  protected statusCount(status: string): number { return this.kpis()?.shipmentsByStatus[status] ?? 0; }
}
