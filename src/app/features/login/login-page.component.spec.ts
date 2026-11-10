import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService, type CognitoProfile } from '../../core/auth/auth-session.service';
import { AzureSessionService } from '../../core/auth/azure-session.service';
import { LoginPageComponent } from './login-page.component';

function setup(configured = true) {
  const admin = { isAuthenticated: signal(false), isAdmin: signal(true),
    displayName: signal('Administración de prueba'), isConfigured: () => configured, error: signal(''),
    profileConflict: signal<CognitoProfile | null>(null),
    signIn: vi.fn().mockResolvedValue(undefined), signOut: vi.fn().mockResolvedValue(undefined),
    registerCustomer: vi.fn().mockResolvedValue(undefined) };
  const operator = { isAuthenticated: signal(false), displayName: signal('Operador de prueba'),
    isConfigured: () => configured, error: signal(''),
    signIn: vi.fn().mockResolvedValue(undefined), signOut: vi.fn().mockResolvedValue(undefined) };
  TestBed.configureTestingModule({ imports: [LoginPageComponent], providers: [provideRouter([]),
    { provide: AuthSessionService, useValue: admin }, { provide: AzureSessionService, useValue: operator },
  ] });
  const fixture = TestBed.createComponent(LoginPageComponent); fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const button = (name: string) => root.querySelector(`[data-testid="${name}"]`) as HTMLButtonElement;
  return { fixture, root, admin, operator, button };
}

describe('Acceso centralizado por perfil', () => {
  it('explica los tres perfiles y ofrece seguimiento público sin autenticación', () => {
    const { root } = setup();
    expect(root.textContent).toContain('Soy operador · Cuenta Duoc');
    expect(root.textContent).toContain('Soy administrador · Cognito');
    expect(root.textContent).toContain('Ingresar como cliente');
    expect(root.textContent).toContain('Crear cuenta de cliente');
    expect(root.querySelectorAll('button')).toHaveLength(4);
    expect(root.querySelector('.public-access a')?.getAttribute('href')).toBe('/#tracking');
  });

  it('envía el acceso de operador solamente a Microsoft', async () => {
    const { fixture, operator, admin, button } = setup();
    button('operator-sign-in').click(); await fixture.whenStable();
    expect(operator.signIn).toHaveBeenCalledTimes(1);
    expect(admin.signIn).not.toHaveBeenCalled();
  });

  it('envía el acceso administrativo solamente a Cognito', async () => {
    const { fixture, operator, admin, button } = setup();
    button('admin-sign-in').click(); await fixture.whenStable();
    expect(admin.signIn).toHaveBeenCalledExactlyOnceWith('admin');
    expect(operator.signIn).not.toHaveBeenCalled();
  });

  it('abre Cognito indicando que se eligió el acceso de cliente', async () => {
    const { fixture, admin, button } = setup();
    button('customer-sign-in').click(); await fixture.whenStable();
    expect(admin.signIn).toHaveBeenCalledExactlyOnceWith('customer');
  });

  it('permite crear una cuenta de cliente directamente desde el aviso de cuenta incorrecta', async () => {
    const { fixture, root, admin, operator, button } = setup();
    admin.profileConflict.set('customer'); fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Cognito abrió una cuenta de administrador');
    expect(button('customer-sign-in').disabled).toBe(false);
    expect(button('customer-sign-up').disabled).toBe(false);
    expect(button('admin-sign-in').disabled).toBe(true);
    expect(button('operator-sign-in').disabled).toBe(false);
    button('customer-sign-up').click(); await fixture.whenStable();
    expect(admin.registerCustomer).toHaveBeenCalledTimes(1);
    expect(admin.signOut).not.toHaveBeenCalled();
    expect(operator.signIn).not.toHaveBeenCalled();
  });

  it('muestra la identidad y cierra solamente la sesión de operador seleccionada', async () => {
    const { fixture, root, operator, admin, button } = setup();
    operator.isAuthenticated.set(true); fixture.detectChanges();
    expect(root.textContent).toContain('Operador de prueba');
    expect(root.querySelector('[data-testid="operator-sign-in"]')).toBeNull();
    expect(root.querySelector('a[href="/operador"]')).not.toBeNull();
    button('operator-sign-out').click(); await fixture.whenStable();
    expect(operator.signOut).toHaveBeenCalledTimes(1);
    expect(admin.signOut).not.toHaveBeenCalled();
  });

  it('mantiene identificadas ambas sesiones y no cierra Microsoft al salir de Cognito', async () => {
    const { fixture, root, operator, admin, button } = setup();
    operator.isAuthenticated.set(true); admin.isAuthenticated.set(true); fixture.detectChanges();
    expect(root.textContent).toContain('Tienes dos sesiones abiertas');
    expect(root.querySelectorAll('.session-info')).toHaveLength(2);
    button('admin-sign-out').click(); await fixture.whenStable();
    expect(admin.signOut).toHaveBeenCalledTimes(1);
    expect(operator.signOut).not.toHaveBeenCalled();
  });

  it('ofrece sus pedidos a una cuenta de cliente', () => {
    const { fixture, root, admin } = setup();
    admin.isAuthenticated.set(true); admin.isAdmin.set(false); fixture.detectChanges();
    expect(root.textContent).toContain('Sesión de cliente');
    expect(root.querySelector('a[href="/cliente"]')).not.toBeNull();
    expect(root.querySelector('a[href="/admin"]')).toBeNull();
  });

  it('deshabilita proveedores sin configuración en lugar de simular accesos', () => {
    const { root, button } = setup(false);
    expect(button('operator-sign-in').disabled).toBe(true);
    expect(button('admin-sign-in').disabled).toBe(true);
    expect(button('customer-sign-up').disabled).toBe(true);
    expect(root.textContent).toContain('Falta completar la configuración de Azure');
    expect(root.textContent).toContain('Falta completar la configuración de Cognito');
  });

  it('impide iniciar dos proveedores mientras está abriendo el acceso seleccionado', async () => {
    const { fixture, operator, admin, button } = setup();
    let finish!: () => void;
    operator.signIn.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    button('operator-sign-in').click();
    button('admin-sign-in').click(); fixture.detectChanges();
    expect(operator.signIn).toHaveBeenCalledTimes(1);
    expect(admin.signIn).not.toHaveBeenCalled();
    expect(button('admin-sign-in').disabled).toBe(true);
    finish(); await Promise.resolve(); fixture.detectChanges(); await fixture.whenStable();
    expect(button('admin-sign-in').disabled).toBe(false);
  });
});
