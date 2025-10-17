import { Component, OnInit } from '@angular/core';
import { LeavesService } from '../../Services/Leaves-services/leaves.service';
import { Employee, EmployeesService } from '../../Services/Employees-serives/employees.service';
import { Leave } from '../../models/leave.model';

@Component({
  selector: 'app-leave-report',
  templateUrl: './leave-report.component.html',
  styleUrls: ['./leave-report.component.scss']
})
export class LeaveReportComponent implements OnInit {
  backendUrl = 'http://localhost:3000';
  totalLeaves: number = 12; // Total leaves allowed per year
  leaves: Leave[] = [];
  filteredLeaves: Leave[] = [];
  employees: any[] = [];
  filter = { from: '', to: '' };
  searchText: string = '';
  employeeMap: { [id: number]: Employee } = {};

  // Reports tabs for buttons
  reports = [
    { key: 'team', label: 'Team Report', link: '/reports/team-report' },
    { key: 'attendance', label: 'Attendance Report', link: '/reports/attendance-report' },
    { key: 'leave', label: 'Leave Report', link: '/reports/leave-report' },
    { key: 'payroll', label: 'Payroll Report', link: '/reports/payroll-report' },
    { key: 'contact', label: 'Contact Report', link: '/reports/contact-report' },

  ];

  activeReport: string = 'leave'; // Default active tab

  constructor(
    private leavesService: LeavesService,
    private employeesService: EmployeesService
  ) { }

  ngOnInit(): void {
    this.loadEmployees();
    this.loadLeaves();
  }

  loadEmployees(): void {
    this.employeesService.getEmployees().subscribe({
      next: (data) => {
        this.employees = data;

        // Build employeeMap for quick lookup
        this.employeeMap = this.employees.reduce((map, emp) => {
          map[emp.id!] = emp; // ensure emp.id exists
          return map;
        }, {} as { [id: number]: Employee });

      },
      error: (err) => console.error('Error loading employees:', err)
    });
  }

  loadLeaves(): void {
    this.leavesService.getAllLeaves().subscribe({
      next: (data) => {
        const leavesArray = data as any[];
        this.leaves = leavesArray.map(leave => {
          const days = (leave.days != null && Number.isFinite(+leave.days) && +leave.days > 0)
            ? +leave.days
            : this.calculateDays(leave.start_date, leave.end_date);

          // compute remaining days for this employee
          const used = this.leaves
            ?.filter(l => l.employee_id === leave.employee_id && (l.status || '').toLowerCase() === 'approved' && l.id !== leave.id)
            .reduce((sum, l) => sum + (l.days || 0), 0) || 0;

          const remaining = this.totalLeaves - used - days;

          return {
            ...leave,
            id: +leave.id,
            employee_id: +leave.employee_id,
            status: (leave.status || 'pending').toLowerCase() === 'approved' ? 'Approved' : 'Pending',
            days,
            remaining_days: remaining > 0 ? remaining : 0
          };
        });

        // Update filteredLeaves as well
        this.filteredLeaves = [...this.leaves];
      },
      error: (err) => console.error('Error loading leaves:', err)
    });
  }

  calculateDays(start: string, end: string): number {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = endDate.getTime() - startDate.getTime();
    return diffTime >= 0 ? Math.floor(diffTime / (1000 * 3600 * 24)) + 1 : 0;
  }

  getEmployeeName(employeeId: number): string {
    const emp = this.employees.find(e => e.id === employeeId);
    return emp ? `${emp.firstname} ${emp.lastName}` : 'Unknown';
  }

  getEmployeeEmail(employeeId: number): string {
    const emp = this.employees.find(e => e.id === employeeId);
    return emp ? emp.email : 'Unknown';
  }

  getEmployeeProfile(employeeId: number): string {
    const emp = this.employees.find(e => e.id === employeeId);
    return emp ? emp.profileImage || 'assets/default-profile.png' : 'assets/default-profile.png';
  }

  applyFilters(): void {
    this.filteredLeaves = this.leaves.filter(leave => {
      const fromDate = this.filter.from ? new Date(this.filter.from) : null;
      const toDate = this.filter.to ? new Date(this.filter.to) : null;
      const leaveStart = new Date(leave.start_date);
      const leaveEnd = new Date(leave.end_date);

      let dateMatch = true;
      if (fromDate && leaveEnd < fromDate) dateMatch = false;
      if (toDate && leaveStart > toDate) dateMatch = false;
      return dateMatch;
    });

    this.applySearch();
  }

  applySearch(): void {
    const search = this.searchText.trim().toLowerCase();
    if (!search) return;

    this.filteredLeaves = this.filteredLeaves.filter(leave => {
      const employee = this.employees.find(e => e.id === leave.employee_id);
      const fullName = employee ? `${employee.firstname} ${employee.lastName}`.toLowerCase() : '';
      const email = employee ? employee.email.toLowerCase() : '';
      return fullName.includes(search) || email.includes(search);
    });
  }

  trackById(index: number, item: Leave): number {
    return item.id;
  }

  exportToCSV(): void {
    const headers = ['Name', 'Status', 'Email', 'From Date', 'To Date', 'Days Allowed', 'Leave Type', 'Days Remaining'];
    const rows = this.filteredLeaves.map(l => [
      this.getEmployeeName(l.employee_id),
      l.status,
      this.getEmployeeEmail(l.employee_id),
      l.start_date,
      l.end_date,
      l.days || 0,
      l.leave_type,
      l.remaining_days || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers, ...rows].map(e => e.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'leave-report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getEmployeeImage(employeeId: number): string {
    const emp = this.employeeMap[employeeId];
    return emp?.image ? `http://localhost:3000${emp.image}` : 'assets/default-user.png';
  }

  onImageError(event: any) {
    event.target.src = 'assets/default-user.png';
  }

  getRemainingDays(leave: any): number {
    const used = this.leaves
      .filter(l => l.employee_id === leave.employee_id && (l.status || '').toLowerCase() === 'approved' && l.id !== leave.id)
      .reduce((sum, l) => sum + (l.days || 0), 0);
    const remaining = this.totalLeaves - used - (leave.days || 0);
    return remaining > 0 ? remaining : 0;
  }

}