import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { ApiService, Equipment } from '../../core/services/api.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

const TYPE_LABEL: Record<string, string> = {
  maintenance: 'Manutenção', welding: 'Solda',
  structures: 'Estruturas', equipment: 'Equipamento',
};
const TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  maintenance: { bg: '#e3f2fd', text: '#1565c0' },
  welding:     { bg: '#fff3e0', text: '#e65100' },
  structures:  { bg: '#f3e5f5', text: '#6a1b9a' },
  equipment:   { bg: '#e8f5e9', text: '#2e7d32' },
};

@Component({
  selector: 'app-equipment-list',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule, MatDialogModule, MatMenuModule],
  templateUrl: './equipment-list.component.html',
})
export class EquipmentListComponent implements OnInit {
  equipments: Equipment[] = [];
  loading = true;
  typeLabel = TYPE_LABEL;
  typeColor = TYPE_COLOR;
  hoveredEquipmentId: string | null = null;

  constructor(private api: ApiService, private router: Router, private snack: MatSnackBar, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.api.getEquipments().subscribe({
      next: (data: Equipment[]) => { this.equipments = data; this.loading = false; },
      error: () => {
        this.loading = false;
        this.snack.open('Erro ao carregar equipamentos.', 'Fechar', { duration: 3000, panelClass: 'snack-error' });
      },
    });
  }

  onMouseEnter(id: string): void { this.hoveredEquipmentId = id; }
  onMouseLeave(): void { this.hoveredEquipmentId = null; }
  newEquipment(): void { this.router.navigate(['/equipments/new']); }
  inspect(id: string): void { this.router.navigate(['/equipments', id, 'inspect']); }
  history(id: string): void { this.router.navigate(['/equipments', id, 'history']); }

  deleteEquipment(id: string, name: string): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { title: `Excluir "${name}"?`, message: 'Esta ação não pode ser desfeita.' },
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.api.deleteEquipment(id).subscribe({
        next: () => {
          this.equipments = this.equipments.filter(e => e.id !== id);
          this.snack.open('Equipamento excluído.', '', { duration: 3000, panelClass: 'snack-success' });
        },
        error: () => this.snack.open('Erro ao excluir equipamento.', 'Fechar', { duration: 3000, panelClass: 'snack-error' }),
      });
    });
  }
}
