
import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EmployeesService, Employee } from '../Services/Employees-serives/employees.service';
import { LeavesService } from '../Services/Leaves-services/leaves.service';
import { SalaryService, Salary } from '../Services/Salary-services/salary.service';
import { TeamService, Team } from '../Services/Team-services/team.service';
import { Leave } from '../models/leave.model';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexTitleSubtitle,
  ApexDataLabels,
  ApexResponsive,
  ApexStroke
} from "ng-apexcharts";
import { AuthService } from '../Services/Auth-services/auth.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CompanyService } from '../Services/company_service/company.service';
import { DepartmentService } from '../Services/Department-serives/department.service';

// ✅ Attendance import
import { AttendanceService, Attendance } from '../Services/Attendance-services/attendance.service';

export type ChartOptions = {
  series: ApexAxisChartSeries | number[];
  chart: ApexChart;
  xaxis?: ApexXAxis;
  title?: ApexTitleSubtitle;
  dataLabels?: ApexDataLabels;
  labels?: string[];
  responsive?: ApexResponsive[];
  stroke?: ApexStroke;
  tooltip?: any;
  colors?: string[];
};

export interface StatCard {
  title: string;
  value: number | string;
  route: string;
  subCards?: { title: string; value: number; color?: string }[];
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {

  // ================== Variables ==================
  totalEmployees = 0;
  totalLeaves = 0;
  approvedLeaves = 0;
  pendingLeaves = 0;
  rejectedLeaves = 0;
  upcomingLeaves: (Leave & { employee?: Partial<Employee> })[] = [];
  totalDepartments = 0;
  totalTeams = 0;
  totalSalary = 0;
  loading = false;
  errorMsg = '';
  statCards: StatCard[] = [];
  activeSubCardTitle: string | null = null;
  leaveSearchTerm: string = '';

  lineChartOptions: ChartOptions;
  pieChartOptions: ChartOptions;
  teamPieChartOptions: ChartOptions;
  genderDonutChartOptions: {
    series: number[];
    chart: ApexChart;
    labels: string[];
    responsive: ApexResponsive[];
    colors: string[];
    legend: any;
  } = {
      series: [0, 0],
      chart: { type: "donut", height: 280 },
      labels: ["Male", "Female"],
      responsive: [{ breakpoint: 480, options: { chart: { width: 220 }, legend: { position: "bottom" } } }],
      colors: ["#749ac0ff", "#d378a5ff"],
      legend: { position: "bottom" }
    };

  showCompanyForm = false;
  companyForm!: FormGroup;
  logoPreview: string | ArrayBuffer | null = null;
  submitting = false;

  showAddForm = false;

  // ✅ Attendance form object
  attendance: Partial<Attendance> = {
    employeeId: 0,
    empId: 0,
    empName: '',
    department: '',
    date: new Date().toISOString().split('T')[0],
    inTime: this.getCurrentTime(),
    outTime: '',
    shift: 'Morning',
    lateMark: false
  };
  employees: any[] = [];

  constructor(
    private employeeService: EmployeesService,
    private leaveService: LeavesService,
    private salaryService: SalaryService,
    private departmentService: DepartmentService,
    private teamService: TeamService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public authService: AuthService,
    private fb: FormBuilder,
    private companyService: CompanyService,
    private attendanceService: AttendanceService // ✅ Inject service
  ) {

    // Line Chart
    this.lineChartOptions = {
      series: [{ name: 'Salary Records', data: Array(12).fill(0) }],
      chart: { type: 'line', height: 350, toolbar: { show: true } },
      xaxis: { categories: this.getMonthNames() },
      title: { text: 'Salary Trends' },
      dataLabels: { enabled: false },
      labels: [],
      responsive: [],
      stroke: { curve: 'smooth' },
      tooltip: { y: { formatter: (val: number) => this.formatSalary(val) } }
    };

    // Pie Charts
    this.pieChartOptions = this.createPieChartOptions('Employees / Departments / Teams', ['#75e8f0ff', '#9b75beff', '#8bf0a1ff']);
    this.teamPieChartOptions = this.createPieChartOptions('Team Distribution', ['#f35959ff', '#fcb448ff', '#c2b759ff', '#72db7dff', '#36a0b6ff', '#2a4c9cff']);
  }

  ngOnInit(): void {
    this.loadStats();
    this.getEmployees();

    // Company Form
    this.companyForm = this.fb.group({
      name: ['', Validators.required],
      logo: [null],
      address: ['', Validators.required],
      email: ['', [Validators.email]],
      phone: [''],
      website: ['']
    });
  }

  ngAfterViewInit(): void { this.cdr.detectChanges(); }

  get isSuperAdmin(): boolean {
    return this.authService?.currentUserValue?.roleName === 'Super Admin';
  }

  private createPieChartOptions(title: string, colors: string[]): ChartOptions {
    return {
      series: [],
      chart: { type: 'pie', height: 250 },
      labels: [],
      title: { text: title },
      dataLabels: { enabled: true },
      responsive: [{ breakpoint: 480, options: { chart: { width: 200 }, legend: { position: 'bottom' } } }],
      stroke: { curve: 'smooth' },
      xaxis: { categories: [] },
      colors: colors
    };
  }

  loadStats() {
    this.loading = true;
    forkJoin({
      employees: this.employeeService.getEmployees(),
      leaves: this.leaveService.getAllLeaves(),
      salaries: this.salaryService.getSalaries(),
      departments: this.departmentService.getDepartments(),
      teams: this.teamService.getTeams()
    }).subscribe({
      next: ({ employees, leaves, salaries, departments, teams }) => {
        const employeeMap = new Map<number, Employee>(employees.map(emp => [emp.id!, emp]));
        this.totalEmployees = employees.length;
        this.processLeaves(leaves, employeeMap);
        this.totalSalary = salaries.reduce((sum, s) => sum + Number(s.total || 0), 0);
        this.updateLineChart(salaries);
        this.totalDepartments = departments.length;
        this.totalTeams = teams.length;

        this.pieChartOptions.series = [this.totalEmployees, this.totalDepartments, this.totalTeams];
        this.pieChartOptions.labels = ['Employees', 'Departments', 'Teams'];

        const teamEmployeeCount = (teams as Team[]).map(team => employees.filter(emp => emp.team === team.name).length);
        this.teamPieChartOptions.labels = (teams as Team[]).map(t => t.name);
        this.teamPieChartOptions.series = teamEmployeeCount;

        const maleCount = employees.filter(emp => emp.gender?.toLowerCase() === 'male').length;
        const femaleCount = employees.filter(emp => emp.gender?.toLowerCase() === 'female').length;
        this.genderDonutChartOptions.series = [maleCount, femaleCount];

        this.updateCards();
        setTimeout(() => this.cdr.detectChanges(), 100);
        this.loading = false;
      },
      error: () => { this.errorMsg = 'Error fetching dashboard data'; this.loading = false; }
    });
  }

  private processLeaves(leaves: Leave[], employeeMap: Map<number, Employee>) {
    this.totalLeaves = leaves.length;
    this.approvedLeaves = leaves.filter(l => l.status.toLowerCase() === 'approved').length;
    this.pendingLeaves = leaves.filter(l => l.status.toLowerCase() === 'pending').length;
    this.rejectedLeaves = leaves.filter(l => l.status.toLowerCase() === 'rejected').length;

    this.upcomingLeaves = leaves
      .filter(l => new Date(l.start_date) > new Date())
      .map(l => ({ ...l, employee: employeeMap.get(l.employee_id) ?? { firstname: 'Unknown', lastName: '', team: '', role: '' } }))
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }

  toggleSubCards(card: StatCard) { this.activeSubCardTitle = this.activeSubCardTitle === card.title ? null : card.title; }

  navigateToCard(card: StatCard) {
    if (!card.subCards || card.subCards.length === 0) this.router.navigate([card.route]);
    else this.toggleSubCards(card);
  }

  navigateToSubCard(card: any, sub: { title: string }) {
    const routesMap: { [key: string]: string } = {
      'Approved': '/leaves', 'Pending': '/leaves', 'Rejected': '/leaves',
      'Fund Master': '/fund-master', 'Salary Payroll': '/salary'
    };
    const route = routesMap[sub.title] || card.route;
    this.router.navigate([route]);
  }

updateCards() {
  this.statCards = [
    { title: 'Employees', value: this.totalEmployees, route: '/employees' },
    {
      title: 'Leaves',
      value: this.totalLeaves,
      route: '/leaves',
      subCards: [
        { title: 'Approved', value: this.approvedLeaves, color: '#55f179ff' },
        { title: 'Pending', value: this.pendingLeaves, color: '#f5ca4bff' },
        { title: 'Rejected', value: this.rejectedLeaves, color: '#f8606fff' }
      ]
    },
    {
      title: 'Salary Records',
      value: this.formatSalary(this.totalSalary),
      route: '/salary',
      subCards: [
        ...(this.isSuperAdmin ? [{ title: 'Fund Master', value: 1, color: '#007bff' }] : []),
        { title: 'Salary Payroll', value: 1, color: '#4cec71ff' }
      ]
    },
    ...(this.isSuperAdmin ? [{ title: 'Departments', value: this.totalDepartments, route: '/departments' }] : []),
    ...(this.isSuperAdmin ? [{ title: 'Teams', value: this.totalTeams, route: '/employee-team' }] : []),
    ...(this.canViewReports ? [{ title: 'Reports', value: 0, route: '/reports' }] : [])
  ];
}

  formatSalary(amount: number): string {
    if (!amount) return '0';
    amount = Math.round(amount * 100) / 100;
    if (amount >= 1_00_00_000) return (amount / 1_00_00_000).toFixed(2) + 'M';
    if (amount >= 1_00_000) return (amount / 1_00_000).toFixed(2) + 'L';
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  filteredLeaves(): (Leave & { employee?: Partial<Employee> })[] {
    if (!this.leaveSearchTerm) return this.upcomingLeaves;
    const term = this.leaveSearchTerm.toLowerCase();
    return this.upcomingLeaves.filter(l =>
      (l.employee?.firstname?.toLowerCase().includes(term) ?? false) ||
      (l.employee?.lastName?.toLowerCase().includes(term) ?? false) ||
      (l.leave_type?.toLowerCase().includes(term) ?? false)
    );
  }

  private updateLineChart(salaries: Salary[]) {
    const monthNames = this.getMonthNames();
    const salaryByMonth: { [key: number]: number } = {};
    salaries.forEach(s => {
      const month = new Date(s.date).getMonth();
      salaryByMonth[month] = (salaryByMonth[month] || 0) + (s.total || 0);
    });
    this.lineChartOptions.series = [{ name: 'Salary Records', data: monthNames.map((_, idx) => salaryByMonth[idx] || 0) }];
    this.lineChartOptions.xaxis = { categories: monthNames };
  }

  private getMonthNames(): string[] {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }

  // ================= Company Form Methods =================
  toggleCompanyForm() { this.showCompanyForm = !this.showCompanyForm; if (!this.showCompanyForm) this.resetForm(); }

  onLogoChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPG or PNG files are allowed!');
      this.companyForm.patchValue({ logo: null });
      this.logoPreview = null;
      return;
    }

    this.companyForm.patchValue({ logo: file });
    this.companyForm.get('logo')?.updateValueAndValidity();

    const reader = new FileReader();
    reader.onload = () => this.logoPreview = reader.result;
    reader.readAsDataURL(file);
  }

  submitCompanyForm() {
    if (this.companyForm.invalid) { this.companyForm.markAllAsTouched(); return; }
    this.submitting = true;
    const formData = new FormData();
    Object.keys(this.companyForm.controls).forEach(key => {
      const value = this.companyForm.get(key)?.value;
      if (value) formData.append(key, value);
    });
    this.companyService.saveCompany(formData).subscribe({
      next: res => { alert('Company details saved!'); this.toggleCompanyForm(); this.submitting = false; },
      error: err => { console.error(err); alert('Error saving company details!'); this.submitting = false; }
    });
  }

  resetForm() { this.companyForm.reset(); this.logoPreview = null; }
  get f() { return this.companyForm.controls; }

  // ================= Attendance Methods =================
  getEmployees() {
    fetch('http://localhost:3000/api/employees')
      .then(res => res.json())
      .then(data => { this.employees = data; console.log('Employees loaded:', this.employees); })
      .catch(err => console.error('Error fetching employees:', err));
  }


  saveAttendance() {
    if (!this.attendance.employeeId) {
      alert('Please select an employee!');
      return;
    }

    // ✅ Safe access with number conversion
    const selectedEmp = this.employees.find(e => e.id === Number(this.attendance.employeeId));
    if (!selectedEmp) {
      alert('Selected employee not found!');
      return;
    }
    const payload: Attendance = {
      employeeId: selectedEmp.id,
      empId: selectedEmp.id,
      empName: selectedEmp.firstname + ' ' + selectedEmp.lastName,
      department: selectedEmp.department || '',
      date: this.attendance.date || new Date().toISOString().split('T')[0],
      checkIn: this.attendance.inTime || this.getCurrentTime(),
      checkOut: this.attendance.outTime || '',
      shift: this.attendance.shift || 'Morning',
      lateMark: this.attendance.lateMark ?? false // boolean fallback
    };

    this.attendanceService.addAttendance(payload).subscribe({
      next: () => {
        alert('Attendance added successfully!');
        this.toggleAddForm();
        this.resetAttendanceForm();
        this.router.navigate(['/attendance']);
      },
      error: (err) => {
        console.error(err);
        alert('Error adding attendance!');
      }
    });
  }


  resetAttendanceForm() {
    this.attendance = {
      employeeId: 0,
      empId: 0,
      empName: '',
      department: '',
      date: new Date().toISOString().split('T')[0],
      inTime: '',
      outTime: '',
      shift: 'Morning',
      lateMark: false
    };
  }

  getCurrentTime(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.attendance = {
        employeeId: 0,
        empId: 0,
        empName: '',
        department: '',
        date: new Date().toISOString().split('T')[0],
        inTime: this.getCurrentTime(),
        outTime: '',
        shift: 'Morning',
        lateMark: false
      };
    }
  }


get canViewReports(): boolean {
  const perm = this.authService.getPermissions();
  return this.isSuperAdmin || perm?.can_report_action === 1;
}


}