import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogApiService, CatalogService } from '../../core/catalog/catalog-api.service';

@Component({
  selector: 'app-catalog-page',
  imports: [CommonModule, CurrencyPipe, ReactiveFormsModule],
  templateUrl: './catalog-page.component.html',
  styleUrl: './catalog-page.component.scss',
})
export class CatalogPageComponent implements OnInit {
  protected readonly services = signal<CatalogService[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
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
    this.loading.set(true);
    this.error.set('');
    this.api.list().subscribe({
      next: (services) => {
        this.services.set(services);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el catálogo. Inicia PostgreSQL, Catálogo y el BFF.');
        this.loading.set(false);
      },
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.form.getRawValue();
    const currentId = this.editingId();
    const operation = currentId === null
      ? this.api.create(request)
      : this.api.update(currentId, request);

    operation.subscribe({
      next: () => {
        this.cancelEdit();
        this.load();
      },
      error: () => this.error.set('No fue posible guardar el servicio. Revisa tu sesión Admin y los datos ingresados.'),
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
