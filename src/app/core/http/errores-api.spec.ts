import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { mensajeErrorApi } from './errores-api';

describe('Avisos de la API', () => {
  it.each([500, 502, 503, 504])('informa indisponibilidad con HTTP %s sin culpar a la sesión', status => {
    const aviso = mensajeErrorApi(new HttpErrorResponse({ status, error: '<html>Service unavailable</html>' }), 'cargar los envíos');
    expect(aviso).toContain('servicio no está disponible');
    expect(aviso).not.toContain('sesión');
    expect(aviso).not.toContain('<html>');
  });
  it('distingue la sesión administrativa de la sesión de operador', () => {
    const error = new HttpErrorResponse({ status: 401 });
    expect(mensajeErrorApi(error, 'cargar datos')).toContain('iniciar sesión con Cognito');
    expect(mensajeErrorApi(error, 'cargar datos', 'operador')).toContain('cuenta Duoc');
  });
  it('explica falta de permisos sin recomendar reiniciar bases o servicios', () => {
    const aviso = mensajeErrorApi(new HttpErrorResponse({ status: 403 }), 'cargar datos');
    expect(aviso).toContain('acceso de administrador');
    expect(aviso).not.toContain('Inicia PostgreSQL');
  });
  it('distingue un fallo de conexión de un rechazo de autenticación', () => {
    expect(mensajeErrorApi(new HttpErrorResponse({ status: 0 }), 'cargar datos')).toContain('Revisa tu conexión');
  });
  it('conserva una explicación de negocio en un conflicto', () => {
    expect(mensajeErrorApi(new HttpErrorResponse({ status: 409,
      error: { message: 'La solicitud ya fue aceptada por otro operador' },
    }), 'aceptar la solicitud', 'operador')).toBe('La solicitud ya fue aceptada por otro operador');
  });
  it('da un aviso legible si la respuesta no contiene un mensaje de texto', () => {
    expect(mensajeErrorApi(new HttpErrorResponse({ status: 400, error: { message: { detalle: 'interno' } } }), 'guardar el servicio'))
      .toBe('No pudimos guardar el servicio. Revisa los datos e inténtalo nuevamente.');
  });
});
