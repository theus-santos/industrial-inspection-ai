import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService, Inspection } from '../../core/services/api.service';

const STATUS_LABEL: Record<string, string> = { open: 'Em andamento', completed: 'Concluída' };
const STATUS_DOT: Record<string, string> = { open: '#ff9800', completed: '#4caf50' };

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './history.component.html',
})
export class HistoryComponent implements OnInit {
  inspections: Inspection[] = [];
  loading = true;
  statusLabel = STATUS_LABEL;
  statusDot = STATUS_DOT;
  private equipmentId = '';

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.equipmentId = this.route.snapshot.params['id'];
    this.api.getEquipmentHistory(this.equipmentId).subscribe({
      next: data => { this.inspections = data; this.loading = false; },
      error: () => {
        this.loading = false;
        this.snack.open('Erro ao carregar histórico.', 'Fechar', { duration: 3000, panelClass: 'snack-error' });
      },
    });
  }

  viewReport(id: string): void { this.router.navigate(['/inspections', id, 'report']); }
  back(): void { this.router.navigate(['/equipments']); }
}
