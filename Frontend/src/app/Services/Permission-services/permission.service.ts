import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserPermission {
  id: number;
  name: string;
  roleName: string;
  can_salary_action: number;
  can_leave_action: number;
  can_employee_action: number;
  can_department_action: number;
  can_attendance_action: number;
  can_report_action: number;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private apiUrl = 'http://localhost:3000/api/permissions';

  constructor(private http: HttpClient) { }

  // GET all users + salary permissions
  getUsers(): Observable<UserPermission[]> {
    return this.http.get<UserPermission[]>(this.apiUrl);
  }
  // Fetch permissions for a single user
  getUserPermissions(userId: number): Observable<Partial<UserPermission>> {
    return this.http.get<Partial<UserPermission>>(`${this.apiUrl}/${userId}`);
  }


  // POST to update salary permission
  updatePermission(userId: number, canSalaryAction: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/update`, { userId, can_salary_action: canSalaryAction });
  }

  updateSalaryPermission(userId: number, can_salary_action: boolean) {
    return this.http.post('http://localhost:3000/api/permissions/update/salary', {
      userId,
      can_salary_action
    });
  }

  updateLeavePermission(userId: number, can_leave_action: boolean) {
    return this.http.post('http://localhost:3000/api/permissions/update/leave', {
      userId,
      can_leave_action
    });
  }

  // ✅ Employee update
  updateEmployeePermission(userId: number, can_employee_action: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/update/employee`, {
      userId,
      can_employee_action
    });
  }

  // ✅ Department update
  updateDepartmentPermission(userId: number, can_department_action: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/update/department`, {
      userId,
      can_department_action
    });
  }
updateAttendancePermission(userId: number, can_attendance_action: boolean): Observable<any> {
  return this.http.post(`${this.apiUrl}/update/attendance`, { userId, can_attendance_action });
}

getAttendancePermission(userId: number): Observable<Partial<UserPermission>> {
  return this.http.get<Partial<UserPermission>>(`${this.apiUrl}/${userId}/attendance`);
}

updateReportPermission(userId: number, can_report_action: boolean): Observable<any> {
  return this.http.post(`${this.apiUrl}/update/report`, {
    userId,
    can_report_action
  });
}


}


