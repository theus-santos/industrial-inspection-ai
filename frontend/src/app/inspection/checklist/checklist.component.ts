import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService, ChecklistItem, Inspection } from '../../core/services/api.service';

@Component({
  selector: 'app-checklist',
  standalone: true,
  imports: [CommonModule, FormsModule, MatStepperModule, MatCardModule, MatCheckboxModule, MatButtonModule, MatProgressSpinnerModule, MatDividerModule, MatSnackBarModule],
  templateUrl: './checklist.component.html',
})
export class ChecklistComponent implements OnInit {
  inspection: Inspection | null = null;
  checklist: ChecklistItem[] = [];
  categories: string[] = [];
  loading = true;
  saving = false;
  private inspectionId = '';

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.inspectionId = this.route.snapshot.params['id'];
    this.api.getInspection(this.inspectionId).subscribe({
      next: ({ inspection, checklist }) => {
        this.inspection = inspection;
        this.checklist = checklist;
        this.categories = [...new Set(checklist.map(i => i.category))];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Erro ao carregar checklist.', 'Fechar', { duration: 3000, panelClass: 'snack-error' });
      },
    });
  }

  get checkedCount(): number { return this.checklist.filter(i => i.checked).length; }
  itemsByCategory(cat: string): ChecklistItem[] { return this.checklist.filter(i => i.category === cat); }

  saveAndContinue(): void {
    this.saving = true;
    this.api.saveChecklist(this.inspectionId, this.checklist).subscribe({
      next: () => {
        this.snack.open('Checklist salvo ✓', '', { duration: 2000, panelClass: 'snack-success' });
        this.router.navigate(['/inspections', this.inspectionId, 'photos']);
      },
      error: () => {
        this.snack.open('Erro ao salvar checklist.', 'Fechar', { duration: 3000, panelClass: 'snack-error' });
        this.saving = false;
      },
    });
  }
}
