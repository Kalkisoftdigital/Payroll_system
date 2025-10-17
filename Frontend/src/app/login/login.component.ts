import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../Services/Auth-services/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit{
  email: string = '';
  password: string = '';
  showPassword: boolean = false;

  constructor(private http: HttpClient, private router: Router, private auth: AuthService) { }


    ngOnInit(): void {
    // ✅ Redirect if already logged in
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

onLogin() {
  this.auth.login(this.email, this.password).subscribe({
    next: res => {
      if (res.success && res.user) {
        // Fetch permissions from backend
        this.http.get<any>(`http://localhost:3000/api/permissions/${res.user.id}`).subscribe({
          next: perm => {
            this.auth.setUser(res.user, res.token);       // Store user + token
            this.auth.setPermissions(perm);              // Store permissions
            this.router.navigate(['/dashboard']);        // Navigate to dashboard
          },
          error: err => {
            console.error('Permission fetch failed:', err);
            this.auth.setUser(res.user, res.token);      // Store user anyway
            this.router.navigate(['/dashboard']);        // Navigate anyway
          }
        });
      } else {
        alert('Invalid email or password');
      }
    },
    error: err => console.error('Login error:', err)
  });
}
}
