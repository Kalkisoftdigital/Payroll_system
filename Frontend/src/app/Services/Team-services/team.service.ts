import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';


export interface Employee {
  id: number;
  firstname: string;
  lastName: string;
  image?: string;
  team?: string;
  status?: string;
}

export interface Team {
  id?: number;
  name: string;       
  status: string;
  members: Employee[];
  
}

@Injectable({
  providedIn: 'root'
})
export class TeamService {

  private baseUrl = 'http://localhost:3000'; // Backend URL

  constructor(private http: HttpClient) { }

  // Employees
  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.baseUrl}/employees`);
  }

  updateEmployeeStatus(empId: number, status: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/employees/${empId}/status`, { status });
  }

// Teams
getTeams(): Observable<any> {
    return this.http.get(`${this.baseUrl}/teams`);
  }  
  
getAllTeams(): Observable<Team[]> {
  return this.http.get<Team[]>(`${this.baseUrl}/teams`);
}
  

addTeam(employeeId: number, teamName: string) {
  const url = `http://localhost:3000/api/employees/${employeeId}/team`;
  const body = { teamName };
  console.log('PUT body:', body);  // 🔹 Debugging log
  return this.http.put(url, body);
}

updateEmployeeTeam(empId: number, teamName: string): Observable<any> {
  console.log('PUT body:', { teamName }); // Debug log
  return this.http.put(`${this.baseUrl}/api/employees/${empId}/team`, { teamName });
}

// team.service.ts
updateTeamStatus(teamId: number, status: string) {
  return this.http.put(`${this.baseUrl}/teams/${teamId}/status`, { status });
}

deleteTeam(id: number) {
  return this.http.delete(`http://localhost:3000/teams/${id}`);
}


updateTeam(teamId: number, payload: any) {
  return this.http.put(`http://localhost:3000/teams/${teamId}`, payload);
}


// team.service.ts
getEmployeeTeams(employeeId: number): Observable<Team[]> {
  return this.http.get<Team[]>(`${this.baseUrl}/api/employees/${employeeId}/teams`);
}

}
