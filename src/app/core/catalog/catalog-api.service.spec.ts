import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { CatalogApiService, CatalogServiceRequest } from './catalog-api.service';

describe('CatalogApiService', () => {
  function setup(): { api: CatalogApiService; controller: HttpTestingController } {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
      api: TestBed.inject(CatalogApiService),
      controller: TestBed.inject(HttpTestingController),
    };
  }

  const request: CatalogServiceRequest = {
    nombre: 'Express',
    descripcion: 'Entrega prioritaria',
    precio: 4990,
    cantidadDisponible: 2,
  };

  it('lists services through the BFF catalog route', async () => {
    const { api, controller } = setup();
    const response = firstValueFrom(api.list());
    const httpRequest = controller.expectOne('/api/catalog/services');
    expect(httpRequest.request.method).toBe('GET');
    httpRequest.flush([{ id: 1, ...request }]);
    await expect(response).resolves.toEqual([{ id: 1, ...request }]);
    controller.verify();
  });

  it('creates and updates services through protected BFF routes', async () => {
    const { api, controller } = setup();
    const created = firstValueFrom(api.create(request));
    const createRequest = controller.expectOne('/api/catalog/services');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(request);
    createRequest.flush({ id: 1, ...request });
    await expect(created).resolves.toEqual({ id: 1, ...request });

    const updatedRequest = { ...request, cantidadDisponible: 5 };
    const updated = firstValueFrom(api.update(1, updatedRequest));
    const updateRequest = controller.expectOne('/api/catalog/services/1');
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual(updatedRequest);
    updateRequest.flush({ id: 1, ...updatedRequest });
    await expect(updated).resolves.toEqual({ id: 1, ...updatedRequest });
    controller.verify();
  });
});
