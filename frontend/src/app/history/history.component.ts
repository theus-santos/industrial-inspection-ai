import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  Chart, LineController, LineElement, PointElement,
  LinearScale, CategoryScale, Tooltip, Filler,
} from 'chart.js';
import { ApiService, Inspection } from '../core/services/api.service';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

const STATUS_LABEL: Record<string, string> = { open: 'Em andamento', completed: 'Concluída' };
const STATUS_DOT: Record<string, string> = { open: '#ff9800', completed: '#4caf50' };
const SEVERITY_COLOR: Record<string, string> = {
  low: '#4caf50', medium: '#ff9800', high: '#f44336', critical: '#b71c1c', none: '#90a4ae',
};

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './history.component.html',
})
export class HistoryComponent implements OnInit, OnDestroy {
  @ViewChild('trendCanvas') trendCanvasRef?: ElementRef<HTMLCanvasElement>;
  inspections: Inspection[] = [];
  loading = true;
  statusLabel = STATUS_LABEL;
  statusDot = STATUS_DOT;
  showChart = false;
  private chart?: Chart;
  private equipmentId = '';

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.equipmentId = this.route.snapshot.params['id'];
    this.api.getEquipmentHistory(this.equipmentId).subscribe({
      next: (data: Inspection[]) => {
        this.inspections = data;
        this.loading = false;
        const withData = data.filter(i => i.defectCount !== undefined);
        if (withData.length >= 2) {
          this.showChart = true;
          setTimeout(() => this.renderChart(withData), 0);
        }
      },
      error: () => {
        this.loading = false;
        this.snack.open('Erro ao carregar histórico.', 'Fechar', { duration: 3000, panelClass: 'snack-error' });
      },
    });
  }

  ngOnDestroy(): void { this.chart?.destroy(); }

  private renderChart(data: Inspection[]): void {
    if (!this.trendCanvasRef?.nativeElement) return;
    const sorted = [...data].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    this.chart = new Chart(this.trendCanvasRef.nativeElement, {
      type: 'line',
      data: {
        labels: sorted.map(i => new Date(i.createdAt).toLocaleDateString('pt-BR')),
        datasets: [{
          label: 'Defeitos detectados',
          data: sorted.map(i => i.defectCount ?? 0),
          borderColor: '#2196f3',
          backgroundColor: 'rgba(33,150,243,.08)',
          pointBackgroundColor: sorted.map(i => SEVERITY_COLOR[i.maxSeverity ?? 'none']),
          pointRadius: 6,
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        plugins: { tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} defeito(s)` } } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Defeitos' } },
          x: { title: { display: true, text: 'Data' } },
        },
      },
    });
  }

  viewReport(id: string): void { this.router.navigate(['/inspections', id, 'report']); }
  back(): void { this.router.navigate(['/equipments']); }
}
