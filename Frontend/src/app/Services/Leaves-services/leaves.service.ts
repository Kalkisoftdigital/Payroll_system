import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Leave } from '../../models/leave.model';  // Import only
import { EmployeesService } from '../Employees-serives/employees.service';

@Injectable({
  providedIn: 'root'
})
export class LeavesService {
  private apiUrl = 'http://localhost:3000/api/leaves';
    private employeeApiUrl = 'http://localhost:3000/api/employees';


  constructor(private http: HttpClient
  ) {}

  getAllLeaves(): Observable<Leave[]> {
    return this.http.get<Leave[]>(this.apiUrl);  // Fix URL here
  }

  createLeave(leave: Leave): Observable<any> {
    return this.http.post(this.apiUrl, leave);
  }

  deleteLeave(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  updateLeave(id: number, leave: Leave): Observable<Leave> {
    return this.http.put<Leave>(`${this.apiUrl}/${id}`, leave);
  }

  getLeavesByEmployeeId(employeeId: number): Observable<Leave[]> {
  return this.http.get<Leave[]>(`${this.apiUrl}/employee/${employeeId}`);
}


getApprovedLeavesByEmployeeId(employeeId: number): Observable<Leave[]> {
  return this.http.get<Leave[]>(`${this.apiUrl}/employee/${employeeId}?status=approved`);
}

getLeaveStats(employeeId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/employee/${employeeId}/stats`);
  }


 getEmployeeNameById(id: number): Observable<{ name: string }> {
    return this.http.get<{ name: string }>(`${this.employeeApiUrl}/${id}`);
  }
}