import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Fund {
  id?: number;
  name: string;
  percentage: number;
  fixed_amount: number;
  type: 'Percentage' | 'Fixed';
  status: string;
  appliedFunds?: number[];
  calculatedAmount?: number;  
  isDeduction?: boolean; 
}

@Injectable({ providedIn: 'root' })
export class FundService {
  private apiUrl = 'http://localhost:3000/api/funds';

  constructor(private http: HttpClient) {}
  
  getFunds(): Observable<Fund[]> {
    return this.http.get<Fund[]>(this.apiUrl);
  }

  addFund(fund: Fund): Observable<any> {
    return this.http.post(this.apiUrl, fund);
  }

  updateFund(id: number, fund: Fund): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, fund);
  }

  deleteFund(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}