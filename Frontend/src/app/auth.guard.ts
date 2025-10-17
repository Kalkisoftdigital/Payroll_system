import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './Services/Auth-services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    const user = this.auth.getUser();
    const token = user?.token;

    console.log('🔐 AuthGuard Check → user:', user);
    console.log('🔐 Token valid:', !!token);

    if (user && token && !this.auth.isTokenExpired()) {
      return true; // ✅ allow access
    } else {
      console.warn('⛔ Redirecting to login – not authenticated');
      this.auth.logout(); // clear any stale data
      this.router.navigate(['/login']);
      return false;
    }
  }
}
