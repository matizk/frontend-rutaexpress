import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthSessionService } from './core/auth/auth-session.service';
import { AzureSessionService } from './core/auth/azure-session.service';

describe('App', () => {
  let admin: { isAuthenticated: ReturnType<typeof signal<boolean>>; isAdmin: ReturnType<typeof signal<boolean>>; displayName: ReturnType<typeof signal<string>> };
  let operator: { isAuthenticated: ReturnType<typeof signal<boolean>>; displayName: ReturnType<typeof signal<string>> };
  beforeEach(async () => {
    admin = { isAuthenticated: signal(false), isAdmin: signal(true), displayName: signal('Administración de prueba') };
    operator = { isAuthenticated: signal(false), displayName: signal('Operador de prueba') };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]),
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
  });

  it('identifica Microsoft aunque no exista una sesión Cognito', () => {
    operator.isAuthenticated.set(true);
    const fixture = TestBed.createComponent(App); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Operador · Microsoft');
    expect(root.textContent).toContain('Operador de prueba');
    expect(root.querySelector('.login-link')?.textContent?.trim()).toBe('Mi acceso');
    expect(root.textContent).not.toContain('Administración de prueba');
  });

  it('ofrece la navegación administrativa solo a una sesión con permiso Admin', () => {
    const fixture = TestBed.createComponent(App); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('nav a[href="/admin"]')).toBeNull();
    expect(root.querySelector('nav a[href="/catalogo"]')).toBeNull();
    admin.isAuthenticated.set(true); fixture.detectChanges();
    expect(root.querySelector('nav a[href="/admin"]')?.textContent).toBe('Envíos');
    admin.isAdmin.set(false); fixture.detectChanges();
    expect(root.querySelector('nav a[href="/admin"]')).toBeNull();
    expect(root.querySelector('nav a[href="/operador"]')).not.toBeNull();
  });

  it('identifica las dos sesiones sin presentar a Cognito como sesión Microsoft', () => {
    admin.isAuthenticated.set(true); operator.isAuthenticated.set(true);
    const fixture = TestBed.createComponent(App); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.session-label')).toHaveLength(2);
    expect(root.textContent).toContain('Administrador · Cognito');
    expect(root.textContent).toContain('Operador · Microsoft');
    expect(root.querySelector('.login-link')?.textContent?.trim()).toBe('Mis accesos');
  });
});
