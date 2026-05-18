import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-equipment-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatProgressSpinnerModule, MatSnackBarModule, MatIconModule],
  templateUrl: './equipment-form.component.html',
})
export class EquipmentFormComponent {
  name = '';
  type = '';
  location = '';
  loading = false;

  readonly types = [
    { value: 'maintenance', label: 'Manutenção' },
    { value: 'welding', label: 'Solda' },
    { value: 'structures', label: 'Estruturas' },
    { value: 'equipment', label: 'Equipamento Geral' },
  ];

  constructor(private api: ApiService, private router: Router, private snack: MatSnackBar) {}

  onSubmit(): void {
    if (!this.name || !this.type || !this.location) return;
    this.loading = true;
    this.api.createEquipment({ name: this.name, type: this.type, location: this.location }).subscribe({
      next: () => {
        this.snack.open('Equipamento cadastrado!', '', { duration: 3000, panelClass: 'snack-success' });
        this.router.navigate(['/equipments']);
      },
      error: () => {
        this.snack.open('Erro ao criar equipamento.', 'Fechar', { duration: 3000, panelClass: 'snack-error' });
        this.loading = false;
      },
    });
  }

  cancel(): void { this.router.navigate(['/equipments']); }
}
