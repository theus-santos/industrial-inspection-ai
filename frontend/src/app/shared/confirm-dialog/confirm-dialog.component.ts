import { Component, Inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title style="font-size:16px;font-weight:700;color:#0d1b2a;margin:0 0 8px">{{ data.title }}</h2>
    <mat-dialog-content style="color:#78909c;font-size:14px;margin:0 0 4px">{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end" style="gap:8px;padding-top:16px">
      <button mat-button mat-dialog-close style="color:#78909c">Cancelar</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Excluir</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; message: string }
  ) {}
}
