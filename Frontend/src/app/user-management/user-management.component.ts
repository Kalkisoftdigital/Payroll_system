import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';


declare var bootstrap: any;
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
  roleName?: string;
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

interface RoleSummary {
  roleName: string;
  total: number;
  members: { id?: number; name: string; avatarUrl?: string }[];
  color: string;
}

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {

  // Add User form
  user: User = { name: '', email: '', role_id: 0, avatarUrl: null, password: '' };
  employees: Employee[] = [];
  roles: Role[] = [];
  isEditMode = false;
  showAddUser = false;
  selectedFile: File | null = null;
  // Role Summary table
  users: User[] = [];
  roleSummary: RoleSummary[] = [];
selectedMember: { id?: number; name: string; avatarUrl?: string } | null = null;

  private api = 'http://localhost:3000/api';
  private palette = ['#0d6efd', '#198754', '#fd7e14', '#6f42c1', '#d63384', '#0dcaf0', '#ffc107', '#6c757d'];

  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {
    this.loadRoles();
    this.loadEmployees();
    this.loadUsers();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.loadUserById(+id);
      this.toggleAddUser(true);
    }
  }

  // ------------------- Load Data -------------------
  loadRoles(): void {
    this.http.get<Role[]>(`${this.api}/roles`).subscribe({
      next: (res) => this.roles = res,
      error: (err) => console.error('Error loading roles:', err)
    });
  }

  loadEmployees(): void {
    this.http.get<Employee[]>(`${this.api}/employees`).subscribe({
      next: (res) => this.employees = res,
      error: (err) => console.error('Error loading employees:', err)
    });
  }

  loadUsers(): void {
    this.http.get<User[]>(`${this.api}/users`).subscribe({
      next: (res) => {
        this.users = res;
        this.buildRoleSummary();
      },
      error: (err) => console.error('Error loading users:', err)
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

  // ------------------- Add / Edit User -------------------
onSubmit() {
  const formData = new FormData();
  formData.append('name', this.user.name);
  formData.append('email', this.user.email);
  formData.append('password', this.user.password || '1234');
  formData.append('role_id', this.user.role_id.toString());
  formData.append('employee_id', this.user.employee_id?.toString() || '0');

  if (this.selectedFile) {
    formData.append('avatar', this.selectedFile);
  }

  this.http.post('http://localhost:3000/api/users', formData).subscribe({
    next: res => {
      console.log('✅ User added', res);
      alert('User added successfully');
      this.loadUsers();
      this.resetForm();
    },
    error: err => {
      console.error('❌ Error:', err);
      alert('Failed to add user. Check backend logs.');
    }
  });
}


  resetForm() {
    this.user = { name: '', email: '', role_id: 0, avatarUrl: null, password: '' };
    this.isEditMode = false;
    this.showAddUser = false;
    document.body.classList.remove('modal-open');
  }

  // ------------------- Employee Change -------------------
onEmployeeChange(employeeId: number) {
  const emp = this.employees.find(e => e.id === +employeeId);
  if (emp) {
    this.user.employee_id = emp.id;
    this.user.name = `${emp.firstname} ${emp.lastName}`;
    this.user.email = emp.email;
    
    // Avatar preview
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
    this.selectedFile = file;   
    const reader = new FileReader();
    reader.onload = (e: any) => this.user.avatarUrl = e.target.result; // preview
    reader.readAsDataURL(file);
  }
}






  // ------------------- Role Summary -------------------
  private colorForRole(roleName: string): string {
    let sum = 0;
    for (let i = 0; i < roleName.length; i++) sum += roleName.charCodeAt(i);
    return this.palette[sum % this.palette.length];
  }

  private buildRoleSummary() {
    const groups: { [role: string]: { id?: number; name: string; avatarUrl?: string }[] } = {};
    this.users.forEach(u => {
      const role = u.roleName || this.roles.find(r => r.id === u.role_id)?.roleName || 'No Role';
      if (!groups[role]) groups[role] = [];
      groups[role].push({ id: u.id, name: u.name, avatarUrl: u.avatarUrl || undefined });
    });
    this.roleSummary = Object.keys(groups).map(role => ({
      roleName: role,
      total: groups[role].length,
      members: groups[role],
      color: this.colorForRole(role)
    }));
  }

  onAvatarClick(member: { id?: number; name: string }) {
    alert(member.name);
  }

  // ------------------- Modal Toggle -------------------
  toggleAddUser(show: boolean) {
    this.showAddUser = show;
    if (show) {
      document.body.classList.add('modal-open');
    } else {
      this.resetForm();
    }
  }

// openMemberAction(user: any) {
//   Swal.fire({
//     title: user.name,
//     text: "What do you want to do?",
//     imageUrl: user.avatarUrl || 'assets/default-avatar.png',
//     imageWidth: 100,
//     imageHeight: 100,
//     showCancelButton: true,
//     confirmButtonText: 'Edit',
//     cancelButtonText: 'Delete',
//     reverseButtons: true
//   }).then((result) => {
//     if (result.isConfirmed) {
//       console.log("Edit clicked:", user);
//       Swal.fire("Edit option selected", "", "info");
//       // Here you can open the edit form
//     } else if (result.dismiss === Swal.DismissReason.cancel) {
//       console.log("Delete clicked:", user);
//       Swal.fire("Delete option selected", "", "warning");
//       // Here you can call the delete API
//     }
//   });
// }

popupMembers: { id?: number; name: string; avatarUrl?: string }[] = [];
currentRoleName: string = '';
selectedMemberIds: number[] = [];

openMembersPopup(role: RoleSummary) {
  this.popupMembers = role.members;
  this.currentRoleName = role.roleName;
  this.selectedMemberIds = [];

  const modalEl: any = document.getElementById('membersPopup');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

toggleMember(id: number, event: any) {
  if (event.target.checked) {
    this.selectedMemberIds.push(id);
  } else {
    this.selectedMemberIds = this.selectedMemberIds.filter(x => x !== id);
  }
}

toggleAll(event: any) {
  if (event.target.checked) {
    this.selectedMemberIds = this.popupMembers.map(m => m.id!) as number[];
  } else {
    this.selectedMemberIds = [];
  }
}

removeSelectedMembers() {
  if (!this.selectedMemberIds || this.selectedMemberIds.length === 0) {
    return alert('No members selected');
  }

  if (confirm('Remove selected members?')) {
    this.http.post(`${this.api}/users/remove-role`, { ids: this.selectedMemberIds })
      .subscribe({
        next: (res: any) => {
          alert(res.message || 'Selected members updated');
          this.loadUsers(); // refresh role summary

          // Reset selection
          this.selectedMemberIds = [];

          // Hide modal safely
          const modalEl: any = document.getElementById('membersPopup');
          if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
          }
        },
        error: (err) => {
          console.error('Remove error:', err);
          alert('Failed to remove roles. Check console for details.');
        }
      });
  }
}


editMember() {
  if (this.selectedMember?.id) {
    this.router.navigate(['/users', this.selectedMember.id]); // Edit page कडे redirect
  }
}

deleteMember() {
  if (this.selectedMember?.id) {
    if (confirm(`Delete ${this.selectedMember.name}?`)) {
      this.http.delete(`${this.api}/users/${this.selectedMember.id}`).subscribe({
        next: () => {
          alert('User deleted!');
          this.loadUsers(); // Refresh users list
        },
        error: (err) => console.error('Delete error:', err)
      });
    }
  }
}
}