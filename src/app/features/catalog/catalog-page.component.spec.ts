import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { CatalogApiService } from '../../core/catalog/catalog-api.service';
import { CatalogPageComponent } from './catalog-page.component';

describe('Estado de carga del catálogo', () => {
  it('distingue un 503 de un catálogo vacío y permite reintentar la carga', () => {
    const api = { list: vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 }))), create: vi.fn() };
    TestBed.configureTestingModule({ imports: [CatalogPageComponent], providers: [{ provide: CatalogApiService, useValue: api }] });
    const fixture = TestBed.createComponent(CatalogPageComponent); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('servicio no está disponible');
    expect(root.querySelector('.services-card')?.textContent).not.toContain('0 registros');
    expect(root.querySelector<HTMLButtonElement>('button.primary')!.disabled).toBe(true);
    api.list.mockReturnValue(of([])); root.querySelector<HTMLButtonElement>('.catalog-header > button')!.click(); fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.textContent).toContain('0 registros');
    expect(root.textContent).toContain('Crea el primero');
    expect(root.querySelector<HTMLButtonElement>('button.primary')!.disabled).toBe(false);
    fixture.destroy();
  });
});
