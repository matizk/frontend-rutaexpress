import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogApiService, CatalogService } from '../../core/catalog/catalog-api.service';
import { mensajeErrorApi } from '../../core/http/errores-api';

@Component({
  selector: 'app-catalog-page',
  imports: [CommonModule, CurrencyPipe, ReactiveFormsModule],
  templateUrl: './catalog-page.component.html',
  styleUrl: './catalog-page.component.scss',
})
export class CatalogPageComponent implements OnInit {
  protected readonly services = signal<CatalogService[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal('');
  private readonly actionError = signal('');
  protected readonly saving = signal(false);
  protected readonly error = computed(() => this.actionError() || this.loadError());
  protected readonly editingId = signal<number | null>(null);
  protected readonly form;

  constructor(private readonly api: CatalogApiService, formBuilder: FormBuilder) {
    this.form = formBuilder.nonNullable.group({
      nombre: ['', [Validators.required, Validators.maxLength(120)]],
      descripcion: ['', Validators.maxLength(300)],
      precio: [0, [Validators.required, Validators.min(0)]],
      cantidadDisponible: [0, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.loadError.set(''); this.actionError.set('');
    this.api.list().subscribe({
      next: (services) => {
        this.services.set(services);
        this.loading.set(false);
      },
      error: error => {
        this.services.set([]);
        this.loadError.set(mensajeErrorApi(error, 'cargar los servicios'));
        this.loading.set(false);
      },
    });
  }

  protected save(): void {
    if (this.loading() || this.loadError() || this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.form.getRawValue();
    this.actionError.set(''); this.saving.set(true);
    const currentId = this.editingId();
    const operation = currentId === null
      ? this.api.create(request)
      : this.api.update(currentId, request);

    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.cancelEdit();
        this.load();
      },
      error: error => this.actionError.set(mensajeErrorApi(error, 'guardar el servicio')),
    });
  }

  protected edit(service: CatalogService): void {
    this.editingId.set(service.id);
    this.form.setValue({
      nombre: service.nombre,
      descripcion: service.descripcion ?? '',
      precio: service.precio,
      cantidadDisponible: service.cantidadDisponible,
    });
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ nombre: '', descripcion: '', precio: 0, cantidadDisponible: 0 });
  }
}
