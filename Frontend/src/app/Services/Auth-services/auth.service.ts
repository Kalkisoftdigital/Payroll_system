import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private permissionsSubject = new BehaviorSubject<any>({});
  permissions$ = this.permissionsSubject.asObservable();

  private loggedInSubject = new BehaviorSubject<boolean>(false);
  loggedIn$ = this.loggedInSubject.asObservable();

  // 🔹 Emits event when permissions are updated globally
private permissionsUpdatedSubject = new BehaviorSubject<boolean>(false);
permissionsUpdated$ = this.permissionsUpdatedSubject.asObservable();


  constructor(private http: HttpClient, private router: Router) {
    // Restore user & permissions from sessionStorage (current session only)
    const user = sessionStorage.getItem('user');
    const perm = sessionStorage.getItem('userPermissions');

    if (user) this.currentUserSubject.next(JSON.parse(user));
    if (perm) this.permissionsSubject.next(JSON.parse(perm));
  }

  // 🔹 LOGIN API
  login(email: string, password: string) {
    return this.http.post<any>('http://localhost:3000/login', { email, password });
  }

  // 🔹 STORE USER IN SESSION
  setUser(user: any, token?: string) {
    if (token) user.token = token;
    sessionStorage.setItem('user', JSON.stringify(user)); // sessionStorage now
    this.currentUserSubject.next(user);
    this.loggedInSubject.next(true);
  }

  // 🔹 STORE PERMISSIONS
  setPermissions(perm: any) {
    sessionStorage.setItem('userPermissions', JSON.stringify(perm)); // sessionStorage now
    this.permissionsSubject.next(perm);
  }

  getUser() {
    return this.currentUserSubject.value;
  }

  get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  getPermissions() {
    return this.permissionsSubject.value;
  }

  // 🔹 ACTION PERMISSIONS
  canLeaveAction(): boolean { const perm = this.getPermissions(); return perm?.can_leave_action === 1; }
  canEmployeeAction(): boolean { const perm = this.getPermissions(); return perm?.can_employee_action === 1; }
  canDepartmentAction(): boolean { const perm = this.getPermissions(); return perm?.can_department_action === 1; }

  // 🔹 LOGOUT
  logout() {
    sessionStorage.removeItem('user');                // sessionStorage
    sessionStorage.removeItem('userPermissions');     // sessionStorage
    this.currentUserSubject.next(null);
    this.permissionsSubject.next({});
    this.loggedInSubject.next(false);

    // Navigate to login page and reload to reset state
    this.router.navigate(['/login'], { replaceUrl: true }).then(() => {
      window.location.reload();
    });
  }

refreshPermissions() {
  const user = this.getUser();
  if (!user) return;

  this.http.get<any>(`http://localhost:3000/api/permissions/${user.id}`).subscribe({
    next: perm => {
      this.setPermissions(perm);
      // 🔹 Notify all components that permissions changed
      this.permissionsUpdatedSubject.next(true);
    },
    error: err => console.error('Failed to refresh permissions', err)
  });
}

  hasPermission(key: string): boolean {
    const user = this.getUser();
    const permissions = this.getPermissions();

    if (!user) return false;

    // Super admin sees everything
    if (user.role === 'super-admin' || user.role === 'super admin') return true;

    return Array.isArray(permissions)
      ? permissions.includes(key)
      : permissions?.[key] === 1;
  }

  getUserRole(): string { const user = this.getUser(); return user?.role || ''; }
  canEditCalendar(): boolean { const user = this.getUser(); const role = user?.roleName?.toLowerCase() || ''; return role === 'admin' || role === 'super admin' || role === 'super-admin'; }
  isSuperAdmin(): boolean {
    const role = (this.getUser()?.roleName || this.getUser()?.role || '').toLowerCase().replace(/\s+/g, '');
    return role === 'superadmin'; // spaces removed, lowercase
  }
  isAdmin(): boolean { return this.getUserRole().toLowerCase() === 'admin'; }
  hasPayrollAccess(): boolean { const role = this.getUserRole().toLowerCase(); return role === 'super admin' || role === 'admin'; }

  // ✅ Check actual login state
  isLoggedIn(): boolean {
    const user = this.getUser();
    if (!user || !user.token) return false;
    return !this.isTokenExpired();
  }

  startSessionTimeout() {
    setTimeout(() => {
      this.logout();
      alert('Session expired! Please log in again.');
    }, 30 * 60 * 1000); // 30 minutes
  }

  isTokenExpired(): boolean {
    const user = this.getUser();
    if (!user?.token) return true;

    try {
      const payload = JSON.parse(atob(user.token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return now >= payload.exp;
    } catch {
      return true;
    }
  }

  restoreUser(user: any) {
    this.currentUserSubject.next(user);
  }

  restorePermissions(perm: any) {
    this.permissionsSubject.next(perm);
  }

  // 🔹 Check if user can manage attendance
  canManageAttendance(): boolean {
    const perms = this.getPermissions();
    return perms?.can_attendance_action === 1 || this.isSuperAdmin();
  }

}
