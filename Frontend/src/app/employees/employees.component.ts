import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { EmployeesService, Employee } from '../Services/Employees-serives/employees.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import * as bootstrap from 'bootstrap';
import { AuthService } from '../Services/Auth-services/auth.service';
import { Team, TeamService } from '../Services/Team-services/team.service';

interface EmployeeWithExtras extends Employee {
  fullName: string;
  teamName: string;
  lineManagerName: string;
}


@Component({
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss']
})
export class EmployeesComponent implements OnInit, OnDestroy {
  employees: EmployeeWithExtras[] = [];
  allEmployees: EmployeeWithExtras[] = [];
  loading = false;
  error: string | null = null;
  selectedEmployeeIdForDelete?: number;
  canEmployeeAction: boolean = false; // logged-in user permission
  user: any;
  userRole: string = '';
  isSuperAdmin: boolean = false;
  teams: Team[] = [];
  lineManagers: { id: number; name: string }[] = [];


  // Sorting
  selectedSort: string = 'Newest';
  sortDropdownOpen: boolean = false;


  // Filters
  filters = {
    name: '',
    status: '',
    from: '',
    to: ''
  };

  private routerSub?: Subscription;

  constructor(
    private employeesService: EmployeesService,
    private router: Router,
    private authService: AuthService,
    private teamService: TeamService,
  ) { }

ngOnInit(): void {
  // Get logged-in user
  this.user = this.authService.getUser();
  this.userRole = this.user?.roleName || '';

  // Permissions: either Super Admin or has can_employee_action = 1
  const perm = this.authService.getPermissions();
  this.canEmployeeAction =
    this.userRole === 'Super Admin' || perm?.can_employee_action === 1;

  // Load teams first, then employees
  this.teamService.getAllTeams().subscribe({
    next: (teams: Team[]) => {
      this.teams = teams;
      this.loadEmployees();
    },
    error: (err) => console.error('Failed to load teams:', err)
  });
}

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }


  canPerformEmployeeAction(): boolean {
    return this.authService.isSuperAdmin() || this.canEmployeeAction;
  }

  // Load employees from API
  loadEmployees(): void {
    this.employeesService.getEmployees().subscribe({
      next: (data: Employee[]) => {
        const employeesWithExtras: EmployeeWithExtras[] = data.map(e => ({
          ...e,
          fullName: `${e.firstname} ${e.lastName}`,
          teamName: this.getTeamName(e.team),
          lineManagerName: '' // placeholder
        }));

        // Resolve lineManagerName
        employeesWithExtras.forEach(emp => {
          emp.lineManagerName = this.getEmployeeNameById(emp.lineManager, employeesWithExtras);
        });

        // Store full list for name resolution
        this.allEmployees = employeesWithExtras;

        // Filter visible employees based on permissions
        if (this.canPerformEmployeeAction() || this.isSuperAdmin) {
          this.employees = [...this.allEmployees]; // see all
        } else {
          // normal employee: only self
          const currentUserId = this.authService.getUser()?.employee_id;
          this.employees = this.allEmployees.filter(emp => emp.id === currentUserId);
        }
      },
      error: err => console.error('Error loading employees:', err)
    });
  }


  // Delete functions
  confirmDelete(id: number): void {
    this.selectedEmployeeIdForDelete = id;
  }

  deleteEmployee(): void {
    if (!this.selectedEmployeeIdForDelete) return;

    this.employeesService.deleteEmployee(this.selectedEmployeeIdForDelete).subscribe({
      next: () => {
        this.employees = this.employees.filter(emp => emp.id !== this.selectedEmployeeIdForDelete);
        this.selectedEmployeeIdForDelete = undefined;
      },
      error: (err) => {
        alert('Error deleting employee: ' + (err.message || 'Unknown error'));
        console.error('Delete failed:', err);
      }
    });
  }

  // Edit employee
  editEmployee(id: number): void {
    this.router.navigate(['/add-employee', id]);
  }

  trackById(index: number, employee: Employee): number {
    return employee.id ?? index;
  }

  // Update status
  onStatusChange(emp: Employee): void {
    this.employeesService.updateEmployeeStatus(emp.id!, emp.status).subscribe({
      next: () => {
        console.log(`Status updated for employee ${emp.id} to ${emp.status}`);
      },
      error: (err) => {
        alert('Failed to update status: ' + (err.message || 'Unknown error'));
        console.error('Status update error:', err);
        this.loadEmployees();
      }
    });
  }

  // Sort dropdown toggle
  toggleSortDropdown() {
    this.sortDropdownOpen = !this.sortDropdownOpen;
  }

  // Sort employees
  sortBy(option: string) {
    this.selectedSort = option;
    this.sortDropdownOpen = false;

    let sorted = [...this.allEmployees];

    switch (option) {
      case 'Newest':
        sorted.sort((a, b) => new Date(b.joiningDate).getTime() - new Date(a.joiningDate).getTime());
        break;
      case 'Oldest':
        sorted.sort((a, b) => new Date(a.joiningDate).getTime() - new Date(b.joiningDate).getTime());
        break;
      case 'Descending':
        sorted.sort((a, b) => (b.salary || 0) - (a.salary || 0));
        break;
      case 'Last Month':
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        sorted = sorted.filter(emp => new Date(emp.joiningDate) >= lastMonth);
        break;
      case 'Last 7 Days':
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        sorted = sorted.filter(emp => new Date(emp.joiningDate) >= last7Days);
        break;
    }

    this.employees = sorted;
  }

  // Apply filters
  applyFilters(): void {
    let filtered = [...this.allEmployees];

    // Filter by name (case insensitive)
    if (this.filters.name?.trim()) {
      filtered = filtered.filter(emp =>
        (emp.firstname + ' ' + emp.lastName).toLowerCase().includes(this.filters.name.toLowerCase())
      );
    }

    // Filter by status
    if (this.filters.status) {
      filtered = filtered.filter(emp => emp.status === this.filters.status);
    }

    // Filter by date range
    if (this.filters.from) {
      const fromDate = new Date(this.filters.from);
      filtered = filtered.filter(emp => new Date(emp.joiningDate) >= fromDate);
    }

    if (this.filters.to) {
      const toDate = new Date(this.filters.to);
      filtered = filtered.filter(emp => new Date(emp.joiningDate) <= toDate);
    }

    this.employees = filtered;
  }

  // Clear all filters
  clearFilters(): void {
    this.filters = { name: '', status: '', from: '', to: '' };
    this.employees = [...this.allEmployees];
  }

  // Close bootstrap dropdown  
  closeFilterDropdown(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const toggleEl = document.getElementById('filterDropdownToggle');
    if (toggleEl) {
      const dropdown = (bootstrap as any).Dropdown.getInstance(toggleEl)
        || new (bootstrap as any).Dropdown(toggleEl);
      dropdown.hide();
    }
  }

  getTeamName(teamId: number | string): string {
    const team = this.teams.find(t => t.id === +teamId);
    return team ? team.name : '';
  }

  getEmployeeNameById(id: number | string | undefined, list: EmployeeWithExtras[] = this.allEmployees): string {
    if (!id) return '-';
    const manager = list.find(emp => emp.id === +id);
    return manager ? `${manager.firstname} ${manager.lastName}` : '-';
  }

}