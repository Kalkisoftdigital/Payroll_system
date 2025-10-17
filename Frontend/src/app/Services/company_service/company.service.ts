import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Company {
  id?: number;
  name: string;
  logo?: File | string;
  address: string;
  email?: string;
  phone?: string;
  website?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  private baseUrl = 'http://localhost:3000/api/company'; // backend route

  constructor(private http: HttpClient) { }

  /**
   * Save or update company details
   * @param data FormData with company details
   */
  saveCompany(data: FormData): Observable<any> {
    return this.http.post<any>(this.baseUrl, data); // POST to /api/company
  }

  /**
   * Get company details
   */
  getCompany(): Observable<Company> {
    return this.http.get<Company>(this.baseUrl); // GET from /api/company
  }

  deleteCompany(id: number) {
  return this.http.delete(`${this.baseUrl}/${id}`);
}

}
