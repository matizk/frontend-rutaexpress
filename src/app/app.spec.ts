import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { authGuard, customerGuard, operatorGuard } from './core/auth/auth.guard';
import { AuthSessionService } from './core/auth/auth-session.service';
import { AzureSessionService } from './core/auth/azure-session.service';

@Component({ template: '' })
class EmptyPage {}

function menu(root: HTMLElement): string[] {
  return [...root.querySelectorAll('nav a')].map(link => link.textContent.trim());
}

describe('App', () => {
  let admin: { isAuthenticated: ReturnType<typeof signal<boolean>>; isAdmin: ReturnType<typeof signal<boolean>>;
    displayName: ReturnType<typeof signal<string>>; initialize: () => Promise<void>; showAdminRequired: () => void };
  let operator: { isAuthenticated: ReturnType<typeof signal<boolean>>; displayName: ReturnType<typeof signal<string>> };
  beforeEach(async () => {
    admin = { isAuthenticated: signal(false), isAdmin: signal(true), displayName: signal('Administración de prueba'),
      initialize: async () => {}, showAdminRequired: () => {} };
    operator = { isAuthenticated: signal(false), displayName: signal('Operador de prueba') };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([
        { path: '', component: EmptyPage },
        { path: 'login', component: EmptyPage },
        { path: 'admin', component: EmptyPage, canActivate: [authGuard], data: { workspace: 'admin' } },
        { path: 'catalogo', component: EmptyPage, canActivate: [authGuard], data: { workspace: 'admin' } },
        { path: 'reportes', component: EmptyPage, canActivate: [authGuard], data: { workspace: 'admin' } },
        { path: 'cliente', component: EmptyPage, canActivate: [customerGuard], data: { workspace: 'customer' } },
        { path: 'operador', component: EmptyPage, canActivate: [operatorGuard], data: { workspace: 'operator' } },
      ]),
        { provide: AuthSessionService, useValue: admin },
        { provide: AzureSessionService, useValue: operator },
      ],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the RutaExpress application shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain('RutaExpress');
  });

  it('ofrece un único enlace de acceso para una visita anónima', () => {
    const fixture = TestBed.createComponent(App); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('a[href="/login"]')).toHaveLength(1);
    expect(root.querySelector('.login-link')?.textContent?.trim()).toBe('Acceder');
    expect(root.querySelector('button')).toBeNull();
    expect(menu(root)).toEqual(['Inicio', 'Seguimiento']);
  });

  it('identifica Microsoft aunque no exista una sesión Cognito', () => {
    operator.isAuthenticated.set(true);
    const fixture = TestBed.createComponent(App); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Operador · Microsoft');
    expect(root.textContent).toContain('Operador de prueba');
    expect(root.querySelector('.login-link')?.textContent?.trim()).toBe('Mi acceso');
    expect(root.textContent).not.toContain('Administración de prueba');
    expect(menu(root)).toEqual(['Solicitudes']);
  });

  it('ofrece la navegación administrativa solo a una sesión con permiso Admin', () => {
    const fixture = TestBed.createComponent(App); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('nav a[href="/admin"]')).toBeNull();
    expect(root.querySelector('nav a[href="/catalogo"]')).toBeNull();
    admin.isAuthenticated.set(true); fixture.detectChanges();
    expect(menu(root)).toEqual(['Envíos', 'Servicios', 'Reportes']);
    admin.isAdmin.set(false); fixture.detectChanges();
    expect(root.querySelector('nav a[href="/admin"]')).toBeNull();
    expect(menu(root)).toEqual(['Mis pedidos', 'Seguimiento']);
  });

  it('cambia el menú y la identidad cuando la persona cambia de espacio', async () => {
    admin.isAuthenticated.set(true); operator.isAuthenticated.set(true);
    const fixture = TestBed.createComponent(App); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/operador');
    fixture.detectChanges();
    expect(root.querySelectorAll('.session-label')).toHaveLength(1);
    expect(root.querySelector('.session-label')?.textContent).toContain('Operador · Microsoft');
    expect(menu(root)).toEqual(['Solicitudes']);
    expect(root.querySelector('.login-link')?.textContent?.trim()).toBe('Cambiar perfil');

    await router.navigateByUrl('/login');
    fixture.detectChanges();
    expect(menu(root)).toEqual(['Solicitudes']);
    await router.navigateByUrl('/admin');
    fixture.detectChanges();
    expect(root.querySelector('.session-label')?.textContent).toContain('Administrador · Cognito');
    expect(menu(root)).toEqual(['Envíos', 'Servicios', 'Reportes']);
  });

  it('lleva a Acceder si alguien abre la bandeja sin una sesión de operador', async () => {
    admin.isAuthenticated.set(true);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/operador');
    expect(router.url).toBe('/login#operator-title');
  });

  it('bloquea las rutas administrativas directas de una cuenta de cliente', async () => {
    admin.isAuthenticated.set(true);
    admin.isAdmin.set(false);
    const router = TestBed.inject(Router);
    for (const path of ['/admin', '/catalogo', '/reportes']) {
      await router.navigateByUrl(path);
      expect(router.url).toBe('/login#admin-title');
    }
    await router.navigateByUrl('/cliente');
    expect(router.url).toBe('/cliente');
  });

  it('lleva a Acceder si una cuenta Admin intenta abrir Mis pedidos', async () => {
    admin.isAuthenticated.set(true);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/cliente');
    expect(router.url).toBe('/login#customer-title');
  });
});
