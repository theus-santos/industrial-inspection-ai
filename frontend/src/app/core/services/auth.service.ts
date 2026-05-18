import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { signIn, signOut, fetchAuthSession } from 'aws-amplify/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isAuthenticated = signal(false);

  constructor(private router: Router) {}

  async login(email: string, password: string): Promise<void> {
    await signIn({ username: email, password });
    this.isAuthenticated.set(true);
  }

  async logout(): Promise<void> {
    await signOut();
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  async getToken(): Promise<string> {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? '';
  }

  async checkSession(): Promise<boolean> {
    try {
      const session = await fetchAuthSession();
      const authenticated = !!session.tokens?.idToken;
      this.isAuthenticated.set(authenticated);
      return authenticated;
    } catch {
      this.isAuthenticated.set(false);
      return false;
    }
  }
}
