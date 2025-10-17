import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  user = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };
  showPassword = false;

  constructor(private http: HttpClient) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onRegister() {
    // ✅ Check for empty fields
    if (!this.user.name.trim() || !this.user.email.trim() || !this.user.password || !this.user.confirmPassword) {
      alert("All fields are required!");
      return;
    }

    // ✅ Check valid email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(this.user.email)) {
      alert("Please enter a valid email address!");
      return;
    }

    // ✅ Check password match
    if (this.user.password !== this.user.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    // Optional: Check password strength
    if (this.user.password.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }

    // Send registration request
    this.http.post('http://localhost:3000/register', this.user).subscribe({
      next: (res) => {
        console.log('User registered:', res);
        alert("Registration successful!");
        // Optional: Clear form
        this.user = { name: '', email: '', password: '', confirmPassword: '' };
      },
      error: (err) => {
        console.error('Registration error:', err);
        alert("Something went wrong! Please try again.");
      }
    });
  }
}