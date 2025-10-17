import { Component, OnInit } from '@angular/core';
import { PermissionService, UserPermission } from '../Services/Permission-services/permission.service';
import { AuthService } from '../Services/Auth-services/auth.service';

@Component({
  selector: 'app-permission-chart',
  templateUrl: './permission-chart.component.html',
  styleUrls: ['./permission-chart.component.scss']
})
export class PermissionChartComponent implements OnInit {
  users: UserPermission[] = [];
  userRole: string = '';
  user: any;

  constructor(
    private permissionService: PermissionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    this.user = currentUser;
    this.userRole = (currentUser.roleName || '').trim();
    console.log('Logged-in user role:', this.userRole);

    this.loadUsers();
  }

  isSuperAdmin(): boolean {
    return this.userRole.replace(/\s+/g, '').toLowerCase() === 'superadmin';
  }

  loadUsers() {
    this.permissionService.getUsers().subscribe({
      next: (res) => {
        console.log('Users loaded:', res);
        this.users = res;
      },
      error: (err) => console.error('Failed to load users:', err)
    });
  }

  toggleSalaryPermission(userId: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.permissionService.updateSalaryPermission(userId, checked).subscribe({
      next: () => {
        const u = this.users.find(x => x.id === userId);
        if (u) u.can_salary_action = checked ? 1 : 0;

        if (userId === this.user.id) {
          const currentUserPerm = JSON.parse(localStorage.getItem('user') || '{}');
          currentUserPerm.can_salary_action = checked ? 1 : 0;
          localStorage.setItem('user', JSON.stringify(currentUserPerm));
          this.authService.refreshPermissions();
        }
      },
      error: (err) => console.error('Salary permission update failed:', err)
    });
  }

  toggleLeavePermission(userId: number, event: any) {
    const checked = event.target.checked;
    this.permissionService.updateLeavePermission(userId, checked).subscribe({
      next: () => {
        const u = this.users.find(x => x.id === userId);
        if (u) u.can_leave_action = checked ? 1 : 0;

        if (userId === this.user.id) {
          const currentUserPerm = JSON.parse(localStorage.getItem('userPermissions') || '{}');
          currentUserPerm.can_leave_action = checked ? 1 : 0;
          localStorage.setItem('userPermissions', JSON.stringify(currentUserPerm));
        }
      },
      error: (err) => console.error('Leave permission update failed:', err)
    });
  }

  toggleEmployeePermission(userId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.permissionService.updateEmployeePermission(userId, checked).subscribe({
      next: () => {
        console.log(`Employee permission updated for user ${userId}: ${checked}`);
        this.loadUsers();
      },
      error: (err) => console.error('Employee permission update failed:', err)
    });
  }

  toggleDepartmentPermission(userId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.permissionService.updateDepartmentPermission(userId, checked).subscribe({
      next: () => {
        console.log(`Department permission updated for user ${userId}: ${checked}`);
        this.loadUsers();
      },
      error: (err) => console.error('Department permission update failed:', err)
    });
  }

  toggleAttendancePermission(userId: number, event: any) {
    const value = event.target.checked;
    this.permissionService.updateAttendancePermission(userId, value).subscribe({
      next: () => {
        console.log('Attendance permission updated');
        this.loadUsers();
      },
      error: err => console.error(err)
    });
  }

  toggleReportPermission(userId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.permissionService.updateReportPermission(userId, checked).subscribe({
      next: () => {
        console.log(`Report permission updated for user ${userId}: ${checked}`);
        const u = this.users.find(x => x.id === userId);
        if (u) u.can_report_action = checked ? 1 : 0;

        if (userId === this.user.id) {
          const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
          currentUser.can_report_action = checked ? 1 : 0;
          localStorage.setItem('user', JSON.stringify(currentUser));
          this.authService.refreshPermissions();
        }
      },
      error: (err) => console.error('Report permission update failed:', err)
    });
  }
}
