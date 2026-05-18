import { Component, Inject, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './qr-dialog.component.html',
})
export class QrDialogComponent implements AfterViewInit {
  @ViewChild('qrCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { equipmentId: string; name: string },
  ) {}

  async ngAfterViewInit(): Promise<void> {
    const url = `${window.location.origin}/equipments/${this.data.equipmentId}/inspect`;
    await QRCode.toCanvas(this.canvasRef.nativeElement, url, { width: 240, margin: 2 });
  }

  download(): void {
    const dataUrl = this.canvasRef.nativeElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${this.data.name.replace(/\s/g, '-')}.png`;
    a.click();
  }
}
