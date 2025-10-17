import { Component, OnInit } from '@angular/core';
import { AttendanceService, Attendance } from '../Services/Attendance-services/attendance.service';
import { EmployeesService } from '../Services/Employees-serives/employees.service';
import { PermissionService } from '../Services/Permission-services/permission.service';
import { AuthService } from '../Services/Auth-services/auth.service';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.scss']
})
export class AttendanceComponent implements OnInit {
  user: any;
  employees: any[] = [];
  selectedEmployee: any | null = null;
  attendance: Attendance[] = [];
  displayedAttendance: Attendance[] = [];
  newAttendance: Partial<Attendance> = {};
  showAllAttendance: boolean = false;
  canViewAttendance: boolean = false;
  canManageAttendance: boolean = false;
  currentUserId: number = 0;
  isSuperAdmin: boolean = false;
  showAddForm: boolean = false;
  filteredAttendance: Attendance[] = [];
  loading: boolean = false;

  constructor(
    private attendanceService: AttendanceService,
    private employeesService: EmployeesService,
    private permissionService: PermissionService,
    public authService: AuthService
  ) {}

ngOnInit() {
  this.user = this.authService.getUser();
  if (!this.user) return;

  this.currentUserId = this.user.employee_id;
  this.isSuperAdmin = this.authService.isSuperAdmin();
  this.canManageAttendance = this.authService.canManageAttendance();
  this.canViewAttendance = this.canManageAttendance;

  this.loadEmployees();

  // 🔹 Add this:
  if (!this.isSuperAdmin && !this.canManageAttendance) {
    // For normal employee, set themselves as selected
    this.selectedEmployee = { id: this.currentUserId, firstname: this.user.name };
    this.loadEmployeeAttendance(this.currentUserId);
  } else {
    this.loadAllAttendance();
  }
}

  loadUserPermissions() {
    const userId = this.currentUserId;
    this.permissionService.getUserPermissions(userId).subscribe({
      next: (perms) => {
        console.log('Permissions fetched:', perms);
        this.canViewAttendance = perms.can_attendance_action === 1;
        this.canManageAttendance = perms.can_attendance_action === 1;
        this.loadAllAttendance();
      },
      error: (err) => {
        console.error('Error loading permissions:', err);
        this.loadAllAttendance(); // fallback to own attendance
      }
    });
  }

 loadAllAttendance() {
    this.attendanceService.getAttendance().subscribe({
      next: (data) => {
        if (this.isSuperAdmin) {
          this.attendance = data;
        } else {
          const allowedEmpIds = this.authService.getPermissions()?.allowedEmployees || [];
          const allowedIds = Array.from(new Set([...allowedEmpIds, this.currentUserId]));
          this.attendance = data.filter(a => allowedIds.includes(a.empId));
        }
        this.displayedAttendance = [...this.attendance];
      },
      error: (err) => console.error('Error loading attendance:', err)
    });
  }
  
loadEmployees() {
  this.employeesService.getEmployees().subscribe({
    next: (res) => {
      if (this.isSuperAdmin || this.canManageAttendance) {
        // ✅ Super Admin or manager can see all employees
        this.employees = res;
      } else {
        // 🚫 Regular employee sees only their own record
        const currentEmpId = this.user?.employee_id;
        this.employees = res.filter(emp => emp.id === currentEmpId);
      }

      console.log('Employees loaded:', this.employees.length, this.employees);
    },
    error: (err) => console.error('Error loading employees:', err)
  });
}

selectEmployee(emp: any) {
  if (!this.isSuperAdmin) {
    const allowedIds = (this.authService.getPermissions()?.allowedEmployees || []).map(Number);
    if (emp.id !== this.currentUserId && !allowedIds.includes(emp.id)) {
      alert("You don't have permission to view this employee's attendance.");
      return;
    }
  }

  this.selectedEmployee = emp;
  this.loadEmployeeAttendance(emp.id);
}

loadEmployeeAttendance(empId: number) {
  this.attendanceService.getAttendance().subscribe({
    next: (data) => {
      const allowedIds = (this.authService.getPermissions()?.allowedEmployees || []).map(Number);
      if (this.isSuperAdmin || empId === this.currentUserId || allowedIds.includes(empId)) {
        this.attendance = data.filter(a => a.empId === empId);
      } else {
        this.attendance = [];
      }
      this.displayedAttendance = [...this.attendance];
      this.filteredAttendance = [...this.attendance];
      console.log('📘 Displayed Attendance:', this.displayedAttendance);
    },
    error: (err) => console.error(err)
  });
}
 
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.attendanceService.importAttendance(file).subscribe({
      next: () => {
        console.log('Attendance import successful.');
        this.loadAllAttendance();
      },
      error: (err) => console.error('Import failed:', err)
    });
  }

  viewAllAttendance() {
    this.selectedEmployee = null;
    this.showAllAttendance = true;

    this.attendanceService.getAttendance().subscribe({
      next: (data) => {
        if (this.isSuperAdmin || this.canViewAttendance) {
          this.attendance = data;
        } else {
          this.attendance = data.filter(a => a.empId === this.currentUserId);
        }
        this.displayedAttendance = [...this.attendance];
      },
      error: (err) => console.error('Error loading attendance:', err)
    });
  }

  backToEmployees() {
    this.showAllAttendance = false;
    this.selectedEmployee = null;
    this.displayedAttendance = [];
  }

  toggleAddForm() {
    if (!this.selectedEmployee) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const alreadyAdded = this.displayedAttendance.some(att => att.date === todayStr);

    if (alreadyAdded) {
      alert('Attendance for today is already added for this employee.');
      return;
    }

    this.showAddForm = true;
    this.newAttendance.date = todayStr;
  }

  cancelAddForm() {
    this.showAddForm = false;
    this.newAttendance = {};
  }

  addAttendance() {
    if (!this.isSuperAdmin && !this.canManageAttendance) {
      alert("You don't have permission to add attendance!");
      return;
    }

    if (!this.selectedEmployee) return;

    const allowedEmpIds = this.isSuperAdmin
      ? this.employees.map(e => e.id)
      : this.authService.getPermissions()?.allowedEmployees || [this.currentUserId];

    if (!allowedEmpIds.includes(this.selectedEmployee.id)) {
      alert("You don't have permission to add attendance for this employee!");
      return;
    }

    if (!this.newAttendance.checkIn || !this.newAttendance.checkOut) {
      alert('Please fill check-in and check-out time.');
      return;
    }

    const checkInHour = parseInt(this.newAttendance.checkIn!.split(':')[0], 10);
    const halfDay = checkInHour >= 12 ? 1 : 0;

    const payload: Attendance = {
      empId: this.selectedEmployee.id,
      empName: `${this.selectedEmployee.firstname} ${this.selectedEmployee.lastName}`,
      department: this.selectedEmployee.department,
      date: this.newAttendance.date!,
      checkIn: this.newAttendance.checkIn!,
      checkOut: this.newAttendance.checkOut!,
      shift: this.newAttendance.shift || 'General',
      halfDay,
      absent: 0,
      employeeId: 0
    };

    this.attendanceService.addAttendance(payload).subscribe({
      next: () => {
        this.newAttendance = {};
        this.showAddForm = false;
        this.loadEmployeeAttendance(this.selectedEmployee!.id);
        this.loadAllAttendance();
      },
      error: (err) => console.error('Error adding attendance:', err)
    });
  }


canViewEmployeeAttendance(emp?: any): boolean {
  if (this.isSuperAdmin) return true;
  if (!emp) return false;
  const allowedIds = (this.authService.getPermissions()?.allowedEmployees || []).map(Number);
  return emp.id === this.currentUserId || allowedIds.includes(emp.id);
}

canManageEmployeeAttendance(emp?: any): boolean {
  if (this.isSuperAdmin) return true;
  if (!emp) return false;
  const allowedIds = (this.authService.getPermissions()?.allowedEmployees || []).map(Number);
  return this.canManageAttendance && (emp.id === this.currentUserId || allowedIds.includes(emp.id));
}

}
