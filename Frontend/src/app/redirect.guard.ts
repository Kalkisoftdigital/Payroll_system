import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './Services/Auth-services/auth.service';

export const redirectGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    // User is logged in → redirect to dashboard
    router.navigate(['/dashboard']);
  } else {
    // User is not logged in → redirect to login
    router.navigate(['/login']);
  }

  return false; // always redirect
};
