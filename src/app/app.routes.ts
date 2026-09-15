import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { AdminPageComponent } from './features/admin/admin-page.component';
import { CatalogPageComponent } from './features/catalog/catalog-page.component';
import { HomePageComponent } from './features/home/home-page.component';
import { LoginPageComponent } from './features/login/login-page.component';
import { ReportsPageComponent } from './features/reports/reports-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent, title: 'RutaExpress | Logística visible' },
  { path: 'login', component: LoginPageComponent, title: 'RutaExpress | Acceso' },
  { path: 'admin', component: AdminPageComponent, canActivate: [authGuard], title: 'RutaExpress | Operación' },
  { path: 'catalogo', component: CatalogPageComponent, canActivate: [authGuard], title: 'RutaExpress | Catálogo' },
  { path: 'reportes', component: ReportsPageComponent, canActivate: [authGuard], title: 'RutaExpress | Reportes' },
  { path: '**', redirectTo: '' },
];
