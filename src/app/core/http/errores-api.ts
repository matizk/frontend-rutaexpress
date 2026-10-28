import { HttpErrorResponse } from '@angular/common/http';

export function mensajeErrorApi(error: unknown, accion: string, perfil: 'admin' | 'operador' = 'admin'): string {
  if (!(error instanceof HttpErrorResponse)) return `No pudimos ${accion}. Inténtalo nuevamente.`;
  if (error.status === 401) {
    return perfil === 'operador'
      ? 'Tu sesión de operador venció o no es válida. Vuelve a ingresar con tu cuenta Duoc.'
      : 'Tu sesión de administrador venció o no es válida. Vuelve a iniciar sesión con Cognito.';
  }
  if (error.status === 403) {
    return perfil === 'operador'
      ? 'Tu cuenta no tiene permiso para esta acción. Necesitas acceso de operador.'
      : 'Tu cuenta no tiene permiso para esta acción. Necesitas acceso de administrador.';
  }
  if (error.status === 0) {
    return `No pudimos ${accion}. No se pudo contactar con el servicio. Revisa tu conexión e inténtalo nuevamente.`;
  }
  if (error.status >= 500) {
    return `No pudimos ${accion}. El servicio no está disponible en este momento. Inténtalo de nuevo en unos minutos.`;
  }
  if (error.status === 404) return `No pudimos ${accion}. No se encontró el registro solicitado.`;
  const detalle = error.error?.message;
  if (typeof detalle === 'string' && detalle.trim()) return detalle.slice(0, 500);
  return `No pudimos ${accion}. Revisa los datos e inténtalo nuevamente.`;
}
