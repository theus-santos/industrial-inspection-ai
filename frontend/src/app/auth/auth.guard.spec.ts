import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../core/services/auth.service';

describe('authGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['checkSession']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('allows navigation when authenticated', async () => {
    authService.checkSession.and.returnValue(Promise.resolve(true));
    const result = await TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(result).toBeTrue();
  });

  it('redirects to /login when not authenticated', async () => {
    authService.checkSession.and.returnValue(Promise.resolve(false));
    const result = await TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(result).toBeFalse();
  });
});
