import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('amazonaws.com/') && !req.url.includes('execute-api')) {
    return next(req);
  }
  const auth = inject(AuthService);
  return from(auth.getToken()).pipe(
    switchMap(token => {
      if (!token) return next(req);
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
    })
  );
};
