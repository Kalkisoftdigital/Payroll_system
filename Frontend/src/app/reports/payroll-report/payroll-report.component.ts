import { Component, OnInit } from '@angular/core';
import { Salary, SalaryService } from '../../Services/Salary-services/salary.service';
import { Employee, EmployeesService } from '../../Services/Employees-serives/employees.service';

@Component({
  selector: 'app-payroll-report',
  templateUrl: './payroll-report.component.html',
  styleUrls: ['./payroll-report.component.scss']
})
export class PayrollReportComponent implements OnInit {
  backendUrl = 'http://localhost:3000';
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  salaries: Salary[] = [];

  activeReport: string = 'payroll';
  filter = { from: '', to: '' };
  searchText: string = '';

  reports = [
    { key: 'team', label: 'Team Report', link: '/reports/team-report' },
    { key: 'attendance', label: 'Attendance Report', link: '/reports/attendance-report' },
    { key: 'leave', label: 'Leave Report', link: '/reports/leave-report' },
    { key: 'payroll', label: 'Payroll Report', link: '/reports/payroll-report' },
    { key: 'contact', label: 'Contact Report', link: '/reports/contact-report' },
  ];

  constructor(
    private employeesService: EmployeesService,
    private salaryService: SalaryService
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.employeesService.getEmployees().subscribe({
      next: (data) => {
        this.employees = data;
        this.loadSalaries();
      },
      error: (err) => console.error('Failed to load employees', err)
    });
  }

  loadSalaries(): void {
    this.salaryService.getSalaries().subscribe({
      next: (data: Salary[]) => {
        this.salaries = data;
        this.applyFilters();
      },
      error: (err) => console.error('Failed to load salaries', err)
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

  trackById(index: number, emp: Employee): number {
    return emp.id ?? index;
  }

  getSalaryByEmployee(empId?: number): Salary | undefined {
    return this.salaries.find(s => s.employee_id === empId);
  }

getFundAmountByEmployee(empId: number, fundName: string): number {
  const salary = this.getSalaryByEmployee(empId);
  if (!salary) return 0;

  switch (fundName.toLowerCase()) {
    case 'hra':
      return salary.hra ?? 0;
    case 'da':
      return salary.da ?? 0;
    case 'conveyance':
      return salary.conveyance ?? 0;
    case 'pf':
      return salary.pf ?? 0;
    case 'bonus':
      return salary.bonus ?? 0;
    default:
      // If not a direct field, check appliedFunds array
      if (!salary.appliedFunds) return 0;
      const funds: any[] = Array.isArray(salary.appliedFunds) ? salary.appliedFunds : JSON.parse(salary.appliedFunds);
      const fund = funds.find(f => f.name.toLowerCase() === fundName.toLowerCase());
      return fund?.calculatedAmount ?? 0;
  }
}

  getSalaryTotalByEmployee(empId: number): number {
    return this.getSalaryByEmployee(empId)?.total ?? 0;
  }

  getEmployeeImage(emp: Employee): string {
    return emp.image ? `${this.backendUrl}${emp.image}` : 'assets/default-user.png';
  }

  onImageError(event: any) {
    event.target.src = 'assets/default-user.png';
  }

  getStatusClass(status: string): string {
    if (!status) return '';
    const s = status.toLowerCase();
    return s === 'active' ? 'bg-success' :
           s === 'inactive' ? 'bg-warning text-dark' :
           s === 'on_leave' ? 'bg-info text-dark' : '';
  }

  exportToCSV(): void {
    if (!this.filteredEmployees.length) return;

    const headers = ['Name', 'Office', 'Email', 'Employment Type', 'Position', 'Joining Date', 'Team', 'Status', 'Basic', 'HRA', 'DA', 'Conveyance', 'PF', 'Bonus', 'Total'];
    const rows = this.filteredEmployees.map(emp => [
      emp.name,
      emp.office,
      emp.email,
      emp.employmentType,
      emp.position,
      emp.joiningDate,
      emp.team,
      emp.status,
      this.getSalaryByEmployee(emp.id)?.basic ?? 0,
      this.getFundAmountByEmployee(emp.id!, 'HRA'),
      this.getFundAmountByEmployee(emp.id!, 'DA'),
      this.getFundAmountByEmployee(emp.id!, 'Conveyance'),
      this.getFundAmountByEmployee(emp.id!, 'PF'),
      this.getFundAmountByEmployee(emp.id!, 'Bonus'),
      this.getSalaryTotalByEmployee(emp.id!)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers, ...rows].map(e => e.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'payroll-report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}