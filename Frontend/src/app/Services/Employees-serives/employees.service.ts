import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Employee {
  id?: number;
  firstname: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string;
  office: string;
  role: string;
  position: string;
  team: string;
  departmentId?: number;
  salary: number;
  currency?: string;
  frequency?: string;
  joiningDate: string;  // Format: 'YYYY-MM-DD'
  status: string;
  address?: string;
  inviteEmail?: boolean;
  employmentType?: string;
  countryOfEmployment?: string;
  lineManager?: string;
  leaveCount?: number;
  gender?: string;
  lineManager_id?: number;
  // 🔹 Image fields
  image?: string | null;
  profileImage?: string | null;
  aadharNo?: string;
  panCard?: string;
  fathersName?: string;

  personalEmail?: string;
  fatherName?: string;
  pan?: string;
  residential?: string;

  // 🔹 Employee details
  dob?: string;
  bloodGroup?: string;
  website?: string;
  linkedin?: string;

  // 🔹 Employment info
  // ✅ Bank Details
  bankName?: string;
  bankAccountNo?: string;
  ifscCode?: string;
  bankAddress?: string;


 basicAnnual?: number;
  basicMonthly?: number;
  hraAnnual?: number;
  hraMonthly?: number;
  allowancesAnnual?: number;
  allowancesMonthly?: number;
  fixedAllowanceAnnual?: number;
  fixedAllowanceMonthly?: number;
  totalAnnual?: number;
  totalMonthly?: number;
  basicPercent?: number;
  hraPercent?: number;
  allowances?: number;
   appliedFunds?: any[]; 
  
}

@Injectable({
  providedIn: 'root'
})
export class EmployeesService {
  private apiUrl = 'http://localhost:3000/api/employees';

  constructor(private http: HttpClient) { }

  // getEmployees(): Observable<Employee[]> {
  //   return this.http.get<Employee[]>(this.apiUrl);
  // }

  // // Get single employee by id
  // getEmployee(id: number): Observable<Employee> {
  //   return this.http.get<Employee>(`${this.apiUrl}/${id}`);
  // }

  // Get all employees
  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.apiUrl).pipe(
      map((employees: Employee[]) =>
        employees.map(emp => ({
          ...emp,
          profileImage: emp.image
            ? `http://localhost:3000/${emp.image}`
            : 'assets/default-avatar.png'
        }))
      )
    );
  }

  // Get single employee by id
  getEmployee(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/${id}`).pipe(
      map(emp => ({
        ...emp,
        profileImage: emp.image
          ? `http://localhost:3000${emp.image.replace(/\\/g, "/")}` // normalize slashes
          : 'assets/default-avatar.png'
      }))
    );
  }


  // Add new employee
  // Add new employee
  addEmployee(employee: Employee | FormData): Observable<{ message: string; id: number }> {
    return this.http.post<{ message: string; id: number }>(this.apiUrl, employee);
  }

  // Update employee by id
// Update employee by id
updateEmployee(id: number, employee: any): Observable<{ message: string; employee: Employee }> {
  return this.http.put<{ message: string; employee: Employee }>(`${this.apiUrl}/${id}`, employee);
}
  // Delete employee by id
  deleteEmployee(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }


  updateEmployeeStatus(id: number, status: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/status`, { status });
  }


  // employees.service.ts
  updateEmployeeTeam(id: number, team: string) {
    return this.http.put(`${this.apiUrl}/${id}/team`, { team });
  }


  getEmployeeImage(employeeId: number): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}/${employeeId}/image`);
  }

saveSalary(employeeId: number, data: any) {
  return this.http.post(`http://localhost:3000/api/employees/${employeeId}/salary`, data);
}

getSalary(employeeId: number) {
  return this.http.get(`http://localhost:3000/api/employees/${employeeId}/salary`);
}
  getEmployeeWithSalary(id: number) {
  return this.http.get<any>(`${this.apiUrl}/employees/${id}/details`);
}

getEmployeeSalary(employeeId: number) {
  return this.http.get<any>(`${this.apiUrl}/employee-salary/${employeeId}`);
}

updateSalary(employeeId: number, salaryData: any) {
  return this.http.put(`http://localhost:3000/api/employees/${employeeId}/salary`, salaryData);
}


}
