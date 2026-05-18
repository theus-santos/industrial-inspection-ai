import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { ApiService, DefectAnalysis } from '../../core/services/api.service';

interface PhotoEntry {
  file: File;
  preview: string;
  photoId: string | null;
  uploading: boolean;
  analyzing: boolean;
  analysis: DefectAnalysis | null;
  error: string;
}

const SEVERITY_COLOR: Record<string, string> = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#b71c1c',
};

const SEVERITY_LABEL: Record<string, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
  critical: 'Crítico',
};

@Component({
  selector: 'app-photos',
  standalone: true,
  imports: [CommonModule, MatStepperModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule],
  templateUrl: './photos.component.html',
})
export class PhotosComponent {
  photos: PhotoEntry[] = [];
  inspectionId: string;
  severityColor = SEVERITY_COLOR;
  severityLabel = SEVERITY_LABEL;

  constructor(
    private api: ApiService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private snack: MatSnackBar,
  ) {
    this.inspectionId = this.route.snapshot.params['id'];
  }

  readonly MAX_PHOTOS = 10;

  onFileSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;
    const slots = this.MAX_PHOTOS - this.photos.length;
    if (slots <= 0) {
      this.snack.open(`Limite de ${this.MAX_PHOTOS} fotos atingido.`, 'Fechar', { duration: 3000, panelClass: 'snack-error' });
      return;
    }
    Array.from(files).slice(0, slots).forEach(file => {
      const entry: PhotoEntry = {
        file,
        preview: URL.createObjectURL(file),
        photoId: null,
        uploading: true,
        analyzing: false,
        analysis: null,
        error: '',
      };
      this.photos.push(entry);
      this.uploadAndAnalyze(entry);
    });
    (event.target as HTMLInputElement).value = '';
  }

  removePhoto(index: number): void {
    const entry = this.photos[index];
    if (entry.uploading || entry.analyzing) return;
    URL.revokeObjectURL(entry.preview);
    this.photos.splice(index, 1);
  }

  private async uploadAndAnalyze(entry: PhotoEntry): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.getPresignedUrl(this.inspectionId, entry.file.type || 'image/jpeg'));
      entry.photoId = response.photoId;
      await firstValueFrom(
        this.http.put(response.uploadUrl, entry.file, {
          headers: { 'Content-Type': entry.file.type },
        }),
      );
      entry.uploading = false;
      entry.analyzing = true;
      const analysis = await firstValueFrom(
        this.api.analyzePhoto(response.photoId, this.inspectionId),
      );
      entry.analysis = analysis;
      entry.analyzing = false;
    } catch (err) {
      entry.uploading = false;
      entry.analyzing = false;
      entry.error = 'Erro ao processar foto.';
      this.snack.open('Erro ao processar foto.', 'Fechar', {
        duration: 3000,
        panelClass: 'snack-error',
      });
    }
  }

  isProcessing(): boolean {
    return this.photos.some(p => p.uploading || p.analyzing);
  }

  onDropZoneHover(element: HTMLElement, isEnter: boolean): void {
    if (isEnter) {
      element.style.borderColor = '#2196f3';
      element.style.background = '#e3f2fd';
    } else {
      element.style.borderColor = '#90caf9';
      element.style.background = '#f8fbff';
    }
  }

  continue(): void {
    this.router.navigate(['/inspections', this.inspectionId, 'report']);
  }
}

