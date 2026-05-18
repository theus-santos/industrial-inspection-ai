import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, MatStepperModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './report.component.html',
})
export class ReportComponent {
  loading = false;
  downloadUrl = '';
  inspectionId: string;

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router, private snack: MatSnackBar) {
    this.inspectionId = this.route.snapshot.params['id'];
  }

  generate(): void {
    this.loading = true;
    this.api.generateReport(this.inspectionId).subscribe({
      next: ({ downloadUrl }) => {
        this.downloadUrl = downloadUrl;
        this.loading = false;
        this.snack.open('Relatório gerado ✓', '', { duration: 3000, panelClass: 'snack-success' });
      },
      error: () => {
        this.snack.open('Erro ao gerar relatório.', 'Fechar', { duration: 3000, panelClass: 'snack-error' });
        this.loading = false;
      },
    });
  }

  download(): void { window.open(this.downloadUrl, '_blank'); }
  goHome(): void { this.router.navigate(['/equipments']); }
}
