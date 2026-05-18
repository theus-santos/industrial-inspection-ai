import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService, Equipment } from '../../core/services/api.service';

@Component({
  selector: 'app-inspection-create',
  standalone: true,
  imports: [CommonModule, FormsModule, MatStepperModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule, MatIconModule, MatSnackBarModule],
  templateUrl: './inspection-create.component.html',
})
export class InspectionCreateComponent implements OnInit {
  equipment: Equipment | null = null;
  inspector = '';
  notes = '';
  loading = false;
  private equipmentId = '';

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.equipmentId = this.route.snapshot.params['id'];
    this.api.getEquipments().subscribe(equipments => {
      this.equipment = equipments.find(e => e.id === this.equipmentId) ?? null;
    });
  }

  onSubmit(): void {
    if (!this.inspector || !this.equipment) return;
    this.loading = true;
    this.api.createInspection({
      equipmentId: this.equipmentId,
      equipmentType: this.equipment.type,
      inspector: this.inspector,
      notes: this.notes,
    }).subscribe({
      next: ({ inspection }) => this.router.navigate(['/inspections', inspection.id, 'checklist']),
      error: () => {
        this.snack.open('Erro ao criar inspeção.', 'Fechar', { duration: 3000, panelClass: 'snack-error' });
        this.loading = false;
      },
    });
  }

  cancel(): void { this.router.navigate(['/equipments']); }
}
