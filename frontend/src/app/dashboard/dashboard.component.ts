import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { ApiService, Inspection } from '../core/services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  loading = true;
  totalEquipments = 0;
  totalInspections = 0;
  criticalCount = 0;
  lastInspectionDate: string | null = null;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.getEquipments().pipe(
      switchMap(equipments => {
        this.totalEquipments = equipments.length;
        if (equipments.length === 0) return of([] as Inspection[][]);
        return forkJoin(
          equipments.map(eq =>
            this.api.getEquipmentHistory(eq.id).pipe(catchError(() => of([] as Inspection[])))
          )
        );
      })
    ).subscribe(histories => {
      const all = (histories as Inspection[][]).flat();
      this.totalInspections = all.length;
      this.criticalCount = all.filter(i => i.maxSeverity === 'critical').length;
      const sorted = all.map(i => i.createdAt).sort();
      this.lastInspectionDate = sorted[sorted.length - 1] ?? null;
      this.loading = false;
    });
  }

  goToEquipments(): void { this.router.navigate(['/equipments']); }
  newEquipment(): void { this.router.navigate(['/equipments/new']); }
}
