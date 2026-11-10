import { Routes } from '@angular/router';
import { authGuard, customerGuard, operatorGuard } from './core/auth/auth.guard';
import { AdminPageComponent } from './features/admin/admin-page.component';
import { CatalogPageComponent } from './features/catalog/catalog-page.component';
import { HomePageComponent } from './features/home/home-page.component';
import { LoginPageComponent } from './features/login/login-page.component';
import { ReportsPageComponent } from './features/reports/reports-page.component';
import { OperatorPageComponent } from './features/operator/operator-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent, title: 'RutaExpress | Logística visible' },
  { path: 'login', component: LoginPageComponent, title: 'RutaExpress | Acceso' },
  { path: 'operador', component: OperatorPageComponent, canActivate: [operatorGuard],
    data: { workspace: 'operator' }, title: 'RutaExpress | Operador' },
  { path: 'auth/azure', redirectTo: 'operador' },
  { path: 'cliente', canActivate: [customerGuard], data: { workspace: 'customer' }, title: 'RutaExpress | Mis pedidos',
    loadComponent: () => import('./features/customer/customer-page.component').then(module => module.CustomerPageComponent) },
  { path: 'admin', component: AdminPageComponent, canActivate: [authGuard], data: { workspace: 'admin' }, title: 'RutaExpress | Operación' },
  { path: 'catalogo', component: CatalogPageComponent, canActivate: [authGuard], data: { workspace: 'admin' }, title: 'RutaExpress | Catálogo' },
  { path: 'reportes', component: ReportsPageComponent, canActivate: [authGuard], data: { workspace: 'admin' }, title: 'RutaExpress | Reportes' },
  { path: '**', redirectTo: '' },
];
