import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Attendance {
  id?: number;
  empId: number;
  empName: string;
  department: string;
  shift?: string;
  lateMark?: boolean;
  date: string;
  checkIn?: string;
  checkOut?: string;
  lopDays?: number;
  paidDays?: number;
  halfDay?: number;
  absent?: number;
  employeeId?: number;  // optional for backend compatibility
  inTime?: string;
  outTime?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  // ✅ Correct API URL pointing to backend attendance route
  private apiUrl = 'http://localhost:3000/api/attendance';

  constructor(private http: HttpClient) { }

 getAttendance(): Observable<Attendance[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(data =>
        data.map(a => ({
          ...a,
          empId: a.empId ?? a.emp_id,      // 🔄 convert snake_case to camelCase
          employeeId: a.employeeId ?? a.emp_id
        }))
      )
    );
  }
  getAttendanceById(id: number): Observable<Attendance> {
    return this.http.get<Attendance>(`${this.apiUrl}/${id}`);
  }

  addAttendance(record: Attendance): Observable<{ message: string; id: number }> {
    // Ensure empId is a number
    const payload = { ...record, empId: Number(record.empId) };
    return this.http.post<{ message: string; id: number }>(this.apiUrl, payload);
  }

  // updateAttendance(id: number, record: Attendance): Observable<{ message: string }> {
  //   return this.http.put<{ message: string }>(`${this.apiUrl}/${id}`, record);
  // }

  updateAttendanceStatus(id: number, status: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/status`, { status });
  }

  deleteAttendance(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  // 📥 Import Attendance (CSV/Excel)
  importAttendance(file: File): Observable<{ message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ message: string }>(`${this.apiUrl}/import`, formData);
  }

  updateAttendanceShift(id: number, shift: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/shift`, { shift });
  }

  updateLateMark(id: number, lateMark: boolean): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/latemark`, { lateMark: !!lateMark });
  }
updateAttendance(id: number, attendance: Partial<Attendance>): Observable<any> {
  return this.http.put(`${this.apiUrl}/${id}`, attendance);
}
getAttendanceByEmployeeId(empId: number) {
  return this.http.get(`${this.apiUrl}/attendance/employee/${empId}`);
}


}