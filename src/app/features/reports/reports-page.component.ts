import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
  protected readonly grafanaDashboard = signal<{ href: string; frame: SafeResourceUrl } | null>(null);

  constructor(private readonly reports: ReportApiService, private readonly sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.load('last7d');
    void this.loadDashboard();
  }

  private async loadDashboard(): Promise<void> {
    try {
      const response = await fetch('/reportes-config.json', { cache: 'no-store' });
      if (!response.ok) return;
      const config = await response.json();
      if (typeof config?.grafanaBaseUrl !== 'string' || !config.grafanaBaseUrl.trim()) return;
      const base = new URL(config.grafanaBaseUrl);
      const local = base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname);
      if ((!local && base.protocol !== 'https:') || base.username || base.password || base.search || base.hash) return;
      if (!base.pathname.endsWith('/')) base.pathname += '/';
      const dashboard = new URL('d/rutaexpress-ev3/rutaexpress-ev3', base);
      const frame = new URL(dashboard);
      frame.searchParams.set('kiosk', 'true');
      this.grafanaDashboard.set({
        href: dashboard.href,
        frame: this.sanitizer.bypassSecurityTrustResourceUrl(frame.href),
      });
    } catch {
      // La reportería sigue disponible cuando el panel de monitoreo no está configurado.
    }
  }

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
