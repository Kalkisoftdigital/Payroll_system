import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LineManager {
  id: number;
  name: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class LineManagerService {
  private managersSubject = new BehaviorSubject<LineManager[]>([]);
  managers$ = this.managersSubject.asObservable();

  private baseUrl = 'http://localhost:3000'; // your backend URL

  constructor(private http: HttpClient) { }

getLineManagers(): Observable<LineManager[]> {
  return this.http.get<LineManager[]>(`${this.baseUrl}/api/line-managers`);
}
}
