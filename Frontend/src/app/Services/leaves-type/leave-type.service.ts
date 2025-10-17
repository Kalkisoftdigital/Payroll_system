import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LeaveType {
  id?: number;
  name: string;
  status?: 'Active' | 'Inactive';
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LeaveTypesService {
  private apiUrl = 'http://localhost:3000/api/leave-types';

  constructor(private http: HttpClient) {}

  getLeaveTypes(): Observable<LeaveType[]> {
    return this.http.get<LeaveType[]>(this.apiUrl);
  }

  addLeaveType(leave: LeaveType): Observable<LeaveType> {
    return this.http.post<LeaveType>(this.apiUrl, leave);
  }

  updateLeaveType(id: number, leave: LeaveType): Observable<LeaveType> {
    return this.http.put<LeaveType>(`${this.apiUrl}/${id}`, leave);
  }

  deleteLeaveType(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
  
}
