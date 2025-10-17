import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

interface Role {
  id: number;
  roleName: string;
}

export interface User {
  employee_id?: number;
  id?: number;
  name: string;
  email: string;
  role_id: number;
  avatarUrl?: string | null;
   password: string;  
}
interface Employee {
  id: number;
  firstname: string;
  lastName: string;
  email: string;
  image?: string;
}

@Component({
  selector: 'app-add-user',
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.scss']
})
export class AddUserComponent implements OnInit {
  roles: Role[] = [];
  employees: Employee[] = [];   // <--- store employees
  user: User = { name: '', email: '', role_id: 0, avatarUrl: null ,password: ''};
  isEditMode = false;
  private api = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadRoles();
    this.loadEmployees();   // <-- load employees

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.loadUserById(+id);
    }
  }

  loadRoles(): void {
    this.http.get<Role[]>(`${this.api}/roles`).subscribe({
      next: (res) => {
        this.roles = res;
        if (!this.user.role_id && this.roles.length > 0) {
          this.user.role_id = this.roles[0].id;
        }
      },
      error: (err) => console.error('Error loading roles:', err)
    });
  }

  loadEmployees(): void {
    this.http.get<Employee[]>(`${this.api}/employees`).subscribe({
      next: (res) => (this.employees = res),
      error: (err) => console.error('Error loading employees:', err)
    });
  }

  loadUserById(id: number): void {
    this.http.get<User>(`${this.api}/users/${id}`).subscribe({
      next: (res) => {
        this.user = {
          id: res.id,
          employee_id: res.employee_id,
          name: res.name,
          email: res.email,
          role_id: res.role_id,
          avatarUrl: res.avatarUrl || null,
          password: ''  
        };
      },
      error: (err) => console.error('Error loading user:', err)
    });
  }


onSubmit(): void {
  if (!this.user.employee_id || !this.user.email || !this.user.role_id) {
    alert('All fields are required');
    return;
  }

  // ensure employee_id is number
  const payload = {
    ...this.user,
    employee_id: Number(this.user.employee_id),
    password: '1234'   // <-- default password add
  };

  // assign name from selected employee
  const emp = this.employees.find(e => e.id === payload.employee_id);
  payload.name = emp ? `${emp.firstname} ${emp.lastName}` : '';

  if (this.isEditMode && this.user.id) {
    this.http.put(`${this.api}/users/${this.user.id}`, payload).subscribe({
      next: () => { alert('User updated successfully'); this.router.navigate(['/manage-admin']); },
      error: (err) => { console.error(err); alert('Error updating user'); }
    });
  } else {
    this.http.post(`${this.api}/users`, payload).subscribe({
      next: () => { alert('User added successfully'); this.router.navigate(['/manage-admin']); },
      error: (err) => { console.error(err); alert('Error saving user'); }
    });
  }
}

  onEmployeeChange(employeeId: number) {
    const emp = this.employees.find(e => e.id === +employeeId);
    if (emp) {
      this.user.employee_id = emp.id;
      this.user.name = emp.firstname + ' ' + emp.lastName;
      this.user.email = emp.email;

      if (emp.image) {
        this.user.avatarUrl = `http://localhost:3000/uploads/${emp.image}`;
      } else {
        this.user.avatarUrl = '';
      }
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.user.avatarUrl = e.target.result; // preview uploaded image
      };
      reader.readAsDataURL(file);
    }
  }

  
}
