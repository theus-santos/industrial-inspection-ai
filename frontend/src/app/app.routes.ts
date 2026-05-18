import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'signup', loadComponent: () => import('./auth/signup/signup.component').then(m => m.SignupComponent) },
  { path: 'signup/confirm', loadComponent: () => import('./auth/confirm/confirm.component').then(m => m.ConfirmComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'equipments', canActivate: [authGuard], loadComponent: () => import('./equipments/equipment-list/equipment-list.component').then(m => m.EquipmentListComponent) },
  { path: 'equipments/new', canActivate: [authGuard], loadComponent: () => import('./equipments/equipment-form/equipment-form.component').then(m => m.EquipmentFormComponent) },
  { path: 'equipments/:id/history', canActivate: [authGuard], loadComponent: () => import('./history/history.component').then(m => m.HistoryComponent) },
  { path: 'equipments/:id/inspect', canActivate: [authGuard], loadComponent: () => import('./inspection/inspection-create/inspection-create.component').then(m => m.InspectionCreateComponent) },
  { path: 'inspections/:id/checklist', canActivate: [authGuard], loadComponent: () => import('./inspection/checklist/checklist.component').then(m => m.ChecklistComponent) },
  { path: 'inspections/:id/photos', canActivate: [authGuard], loadComponent: () => import('./inspection/photos/photos.component').then(m => m.PhotosComponent) },
  { path: 'inspections/:id/report', canActivate: [authGuard], loadComponent: () => import('./inspection/report/report.component').then(m => m.ReportComponent) },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];
