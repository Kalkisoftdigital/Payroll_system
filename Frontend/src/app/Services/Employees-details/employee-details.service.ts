import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EmployeeDocument } from '../../models/employee-details.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeDetailsService {
  private baseUrl = 'http://localhost:3000/api/employees';

  constructor(private http: HttpClient) { }

  // Get employee documents
  getEmployeeDocuments(employeeId: number): Observable<EmployeeDocument[]> {
    return this.http.get<EmployeeDocument[]>(`${this.baseUrl}/${employeeId}/documents`);
  }

  // Upload new document
  uploadEmployeeDocument(employeeId: number, file: File): Observable<EmployeeDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    formData.append('date', new Date().toISOString());
    return this.http.post<EmployeeDocument>(`${this.baseUrl}/${employeeId}/documents`, formData);
  }

  // Delete a document
  deleteEmployeeDocument(docId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/documents/${docId}`);
  }

  // Update employee contact info
  updateEmployeeContact(employeeId: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${employeeId}/contact`, data);
  }

  // EmployeeDetailsService
getAllDocuments(): Observable<EmployeeDocument[]> {
  return this.http.get<EmployeeDocument[]>('http://localhost:3000/employees/documents');
}

}
