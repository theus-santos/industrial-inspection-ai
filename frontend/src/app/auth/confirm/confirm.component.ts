import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';

@Component({
  selector: 'app-confirm',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './confirm.component.html',
})
export class ConfirmComponent implements OnInit {
  form = this.fb.group({ code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });
  loading = false;
  resending = false;
  error = '';
  success = '';
  email = '';

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParams['email'] || '';
  }

  async submit(): Promise<void> {
    if (this.form.invalid || !this.email) return;
    this.loading = true;
    this.error = '';
    try {
      await confirmSignUp({ username: this.email, confirmationCode: this.form.value.code! });
      this.router.navigate(['/login']);
    } catch (e: any) {
      this.error = e.message || 'Código inválido.';
    } finally {
      this.loading = false;
    }
  }

  async resend(): Promise<void> {
    if (!this.email) return;
    this.resending = true;
    this.error = '';
    try {
      await resendSignUpCode({ username: this.email });
      this.success = 'Código reenviado para ' + this.email;
    } catch (e: any) {
      this.error = e.message || 'Erro ao reenviar.';
    } finally {
      this.resending = false;
    }
  }
}
