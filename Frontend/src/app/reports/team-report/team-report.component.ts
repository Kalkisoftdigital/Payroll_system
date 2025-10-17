import { Component, OnInit } from '@angular/core';
import { Employee, EmployeesService } from '../../Services/Employees-serives/employees.service';
import { AuthService } from 'src/app/Services/Auth-services/auth.service';

@Component({
  selector: 'app-team-report',
  templateUrl: './team-report.component.html',
  styleUrls: ['./team-report.component.scss']
})
export class TeamReportComponent implements OnInit {
  backendUrl = 'http://localhost:3000';
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];

  activeReport: string = 'team';   // Default active tab/report
  activeType: 'official' | 'personal' = 'official';

  filter = { from: '', to: '' };
  searchText: string = '';

   user: any;           // Logged-in user
  canViewReport = false; // Permission flag

  // Reports tabs
  reports = [
    { key: 'team', label: 'Team Report', link: '/reports/team-report' },
    { key: 'attendance', label: 'Attendance Report', link: '/reports/attendance-report' },
    { key: 'leave', label: 'Leave Report', link: '/reports/leave-report' },
    { key: 'payroll', label: 'Payroll Report', link: '/reports/payroll-report' },
    { key: 'contact', label: 'Contact Report', link: '/reports/contact-report' },

  ];

  constructor(private employeesService: EmployeesService,
    private authService: AuthService
  ) { }

ngOnInit(): void {
  // Subscribe to reactive permissions
  this.authService.permissions$.subscribe(perm => {
    this.canViewReport = this.authService.hasPermission('can_report_action');
  });

  this.loadEmployees();
}
  loadEmployees(): void {
    this.employeesService.getEmployees().subscribe({
      next: (data) => {
        this.employees = data;
        this.applyFilters();
      },
      error: (err) => console.error('Failed to load employees', err)
    });
  }

  applyFilters(): void {
    let filtered = this.employees;

    if (this.filter.from) {
      const fromDate = new Date(this.filter.from);
      filtered = filtered.filter(emp => new Date(emp.joiningDate) >= fromDate);
    }

    if (this.filter.to) {
      const toDate = new Date(this.filter.to);
      filtered = filtered.filter(emp => new Date(emp.joiningDate) <= toDate);
    }

    this.filteredEmployees = filtered.filter(emp =>
      emp.name.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  applySearch(): void {
    this.applyFilters();
  }

  setType(type: 'official' | 'personal'): void {
    this.activeType = type;
    this.applyFilters();
  }

  trackById(index: number, emp: Employee): number {
    return emp.id ?? index;
  }

  getStatusClass(status: string): string {
    if (!status) return '';
    status = status.toLowerCase();
    return status === 'active' ? 'bg-success' :
      status === 'inactive' ? 'bg-warning text-dark' :
        status === 'on_leave' ? 'bg-info text-dark' : '';
  }

  // ---------------- CSV Export ----------------
  exportToCSV(): void {
    if (!this.filteredEmployees.length) return;

    const headers = ['Name', 'Office', 'Email', 'Employment Type', 'Position', 'Joining Date', 'Team', 'Status', 'Leaves'];
    const rows = this.filteredEmployees.map(emp => [
      emp.name,
      emp.office,
      emp.email,
      emp.employmentType,
      emp.position,
      emp.joiningDate,
      emp.team,
      emp.status,
      emp.leaveCount || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers, ...rows].map(e => e.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'team-report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getEmployeeImage(emp: any): string {
    return emp.image ? `${this.backendUrl}${emp.image}` : 'assets/default-user.png';
  }

  onImageError(event: any) {
    event.target.src = 'assets/default-user.png';
  }

}