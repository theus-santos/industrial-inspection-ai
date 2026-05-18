import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  const authenticated = await auth.checkSession();
  if (!authenticated) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};
