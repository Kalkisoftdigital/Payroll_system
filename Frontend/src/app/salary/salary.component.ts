import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Salary, SalaryService } from '../Services/Salary-services/salary.service';
import { EmployeesService, Employee } from '../Services/Employees-serives/employees.service';
import { HttpClient } from '@angular/common/http';
import * as bootstrap from 'bootstrap';
import { Fund } from '../Services/fund-services/fund.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { AuthService } from '../Services/Auth-services/auth.service';
import { Company, CompanyService } from '../Services/company_service/company.service';

@Component({
  selector: 'app-salary',
  templateUrl: './salary.component.html',
  styleUrls: ['./salary.component.scss']
})
export class SalaryComponent implements OnInit {
  salaries: Salary[] = [];
  salaryForm: FormGroup;
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  selectedEmployee: Employee | null = null;
  funds: Fund[] = [];
  isEditMode = false;
  editSalaryId?: number;
  confirmDeleteSalaryId: number | null = null;
  userRole: string = '';
  canSalaryAction: boolean = false;
  user: any;
  searchTerm: string = '';
  currentMonth: Date = new Date();
  selectedEmployeeSalary?: Salary;



  // Salary variables
  totalAnnual: number = 0;
  totalMonthly: number = 0;

  basicPercent: number = 50;
  basicMonthly: number = 0;
  basicAnnual: number = 0;

  hraPercent: number = 50;
  hraMonthly: number = 0;
  hraAnnual: number = 0;

  // allowances: number = 0;
  conveyance: number = 0;
  conveyance_annual: number = 0;
  allowancesAnnual: number = 0;


  fixedMonthly: number = 0;
  fixedAnnual: number = 0;
  company: Company | null = null;


  private fundApiUrl = 'http://localhost:3000/api/funds';

  constructor(
    private salaryService: SalaryService,
    private employeeService: EmployeesService,
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private companyService: CompanyService
  ) {
    this.salaryForm = this.fb.group({
      id: [null],
      employee_id: ['', Validators.required],
      basic: [0, Validators.required],
      hraMonthly: [0],
      allowancesMonthly: [0],
      fixedAllowanceMonthly: [0],

      // Annual fields
      basicAnnual: [0],
      hraAnnual: [0],
      allowancesAnnual: [0],
      fixedAllowanceAnnual: [0],

      // Existing fields
      hra: [0],
      da: [0],
      conveyance: [0],
      pf: [0],
      bonus: [0],
      travel: [0],
      total: [0],

      // Totals
      totalMonthly: [0],
      totalAnnual: [0],

      date: ['', Validators.required],
      status: ['Pending', Validators.required],
      appliedFunds: [[]]
    });
  }

  ngOnInit(): void {
    this.user = this.authService.getUser();

    this.loadEmployees(() => this.loadSalaries());
    this.loadFunds();

    // 🔹 Subscribe to permissions updates
    this.authService.permissions$.subscribe(perm => {
      this.canSalaryAction = this.authService.isSuperAdmin() || perm?.can_salary_action === 1;
      this.cdr.detectChanges(); // ✅ template refresh
    });

    // 🔹 Initial setup (in case permissions already loaded)
    const perm = this.authService.getPermissions();
    this.canSalaryAction = this.authService.isSuperAdmin() || perm?.can_salary_action === 1;


    this.companyService.getCompany().subscribe({
      next: (res) => {
        this.company = res;
      },
      error: (err) => console.error('Failed to fetch company info:', err)
    });
  }

  canPerformSalaryAction(): boolean {
    return this.authService.isSuperAdmin() || this.canSalaryAction;
  }

  // ---------- LOAD DATA ----------
  loadSalaries() {
    this.salaryService.getSalaries().subscribe({
      next: (salariesData) => {
        const salariesWithEmployee = salariesData.map(s => {
          const emp = this.employees.find(e => e.id === s.employee_id);
          return {
            ...s,
            employeeName: emp ? `${emp.firstname} ${emp.lastName}` : '',
            employeeEmail: emp ? emp.email : ''
          };
        });

        // 🔹 FILTER based on permission
        if (this.canSalaryAction) {
          this.salaries = salariesWithEmployee; // super-admin or permissioned user sees all
        } else {
          // only show logged-in user's salary
          this.salaries = salariesWithEmployee.filter(s => s.employee_id === this.user.employee_id);
        }

        // Reset selected employee if current selection not allowed
        if (this.selectedEmployee && !this.salaries.some(s => s.employee_id === this.selectedEmployee?.id)) {
          this.selectedEmployee = null;
        }
      },
      error: (err) => console.error('Error loading salaries:', err)
    });
  }

  loadEmployees(callback?: () => void) {
    this.employeeService.getEmployees().subscribe({
      next: (data) => {
        if (this.canSalaryAction) {
          this.employees = data;
        } else {
          this.employees = data.filter(emp => emp.id === this.user.employee_id);
        }
        this.filteredEmployees = [...this.employees];

        if (callback) callback();
      },
      error: (err) => console.error('Error loading employees:', err)
    });
  }

  loadFunds() {
    this.http.get<Fund[]>(this.fundApiUrl).subscribe(data => {
      this.funds = data
        .filter(f => f.status === 'Active')
        .map(f => ({
          ...f,
          isDeduction: !!(f as any).is_deduction,
          type: f.type || 'Percentage'
        }));
    });
  }


  // ---------- EMPLOYEE ----------
  onEmployeeChange(event: any) {
    const empId = +event.target.value;
    const selectedEmp = this.employees.find(e => e.id === empId);

    if (selectedEmp) {
      // Fetch salary from DB
      this.employeeService.getSalary(empId).subscribe({
        next: (salary: any) => {
          if (!salary) return;

          this.salaryForm.patchValue({
            basic: salary.basic_monthly || 0,
            hraMonthly: salary.hra_monthly || 0,
            allowancesMonthly: salary.conveyance || 0,
            fixedAllowanceMonthly: salary.fixed_allowance_monthly || 0,
            basicAnnual: salary.basic_annual || 0,
            hraAnnual: salary.hra_annual || 0,
            allowancesAnnual: salary.conveyance_annual || 0,
            fixedAllowanceAnnual: salary.fixed_allowance || 0,
            totalMonthly: salary.total_monthly || 0,
            totalAnnual: salary.total_annual || 0
          });
        },
        error: (err) => console.error('Salary fetch error:', err)
      });
    }
  }

  selectEmployee(emp: Employee) {
    this.selectedEmployee = { ...emp };
    if (emp.id) {
      this.loadEmployeeSalary(emp.id);
    }
  }

  filterEmployees() {
    const term = this.searchTerm.toLowerCase();
    this.filteredEmployees = this.employees.filter(emp =>
      `${emp.firstname} ${emp.lastName}`.toLowerCase().includes(term)
    );
  }

  // ---------- FUNDS ----------
  toggleFund(fund: Fund, isChecked: boolean) {
    let appliedFunds: Fund[] = this.salaryForm.value.appliedFunds || [];

    if (isChecked) {
      if (!appliedFunds.some(f => f.id === fund.id)) {
        appliedFunds.push({ ...fund, isDeduction: !!fund.isDeduction });
      }
    } else {
      appliedFunds = appliedFunds.filter(f => f.id !== fund.id);
    }

    this.salaryForm.patchValue({ appliedFunds });
    this.calculateSalary();
  }

  isFundApplied(fund: Fund): boolean {
    const appliedFunds: Fund[] = this.salaryForm.value.appliedFunds || [];
    return appliedFunds.some((f: Fund) => f.id === fund.id);
  }

  onFundChange(event: Event, fund: Fund) {
    const target = event.target as HTMLInputElement;
    this.toggleFund(fund, target.checked);
  }

  // ---------- CALCULATE ----------
  calculateSalary() {
    // Get current values from form
    const basicMonthly = Number(this.salaryForm.value.basic || 0);
    const hraMonthly = Number(this.salaryForm.value.hraMonthly || 0);
    const allowancesMonthly = Number(this.salaryForm.value.allowancesMonthly || 0);
    const fixedMonthly = Number(this.salaryForm.value.fixedAllowanceMonthly || 0);

    // Initialize
    let pf = 0, bonus = 0, travel = 0;
    let otherDeductions = 0;
    let otherAdditions = 0;

    const appliedFunds: Fund[] = this.salaryForm.value.appliedFunds || [];

    // Calculate applied fund amounts
    appliedFunds.forEach((f: Fund) => {
      const value = Math.round(
        (f.type === 'Percentage' ? basicMonthly * (Number(f.percentage) / 100) : Number(f.fixed_amount)) * 100
      ) / 100;

      f.calculatedAmount = value;

      const name = f.name.toLowerCase();

      if (f.isDeduction) {
        if (name === 'pf') pf = value;
        else otherDeductions += value; // any other deduction  
      } else {
        if (name === 'bonus') bonus = value;
        else if (name === 'travel') travel = value;
        else otherAdditions += value; // any other addition
      }
    });

    // Total earnings before deductions
    const earningsMonthly = basicMonthly + hraMonthly + allowancesMonthly + fixedMonthly + bonus + travel + otherAdditions;

    // Total deductions
    const deductionsMonthly = pf + otherDeductions;

    // Final totals
    const totalMonthly = earningsMonthly - deductionsMonthly;
    const totalAnnual = totalMonthly * 12;
    const gross = earningsMonthly;
    const net = totalMonthly;

    // Patch form
    this.salaryForm.patchValue({
      pf,
      bonus,
      travel,
      total: totalMonthly,
      totalMonthly,
      totalAnnual,
      gross,
      net,
      appliedFunds
    }, { emitEvent: false });
  }

  // ---------- MODALS ----------
  openAddModal() {
    if (!this.canSalaryAction) return;

    this.isEditMode = false;
    this.editSalaryId = undefined;

    this.salaryForm.reset({
      id: null,
      employee_id: this.selectedEmployee ? this.selectedEmployee.id : '',
      totalMonthly: 0,
      conveyance: 0,
      fixedAllowanceMonthly: 0,
      pf: 0,
      bonus: 0,
      travel: 0,
      total: 0,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      appliedFunds: []
    });

    setTimeout(() => {
      const modalEl = document.getElementById('salaryModal');
      if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
      this.calculateSalary();
    }, 0);
  }

  openEditModal(salary: Salary) {
    this.isEditMode = true;
    this.editSalaryId = salary.id;

    let appliedFunds: Fund[] = [];
    if (salary.appliedFunds) {
      const backendFunds: Fund[] = Array.isArray(salary.appliedFunds) ? salary.appliedFunds : JSON.parse(salary.appliedFunds);
      appliedFunds = backendFunds.map((f: Fund) => {
        const dbFund = this.funds.find(d => d.id === f.id);
        return { ...dbFund, ...f, isDeduction: !!f.isDeduction, type: f.type || 'Percentage' };
      });
    }

    this.salaryForm.reset({
      id: salary.id,
      employee_id: salary.employee_id,
      basic: salary.basic,
      total: salary.total,
      date: salary.date ? salary.date.split('T')[0] : '',
      status: salary.status,
      appliedFunds
    });

    this.calculateSalary();
    const modalEl = document.getElementById('salaryModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }

  saveSalary(event?: Event) {
    if (event) event.preventDefault();
    if (this.salaryForm.invalid) return;

    const formValue = this.salaryForm.value;
    const basic = Number(formValue.basic || 0);

    // 👇 Use DB values for HRA and Conveyance
    const hra = this.hraMonthly || 0;
    const conveyance = this.conveyance || 0;
    const da = Number(formValue.da || 0);
    const pf = Number(formValue.pf || 0);
    const bonus = Number(formValue.bonus || 0);
    const travel = Number(formValue.travel || 0);

    const gross = basic + hra + conveyance + da + bonus + travel;
    const net = gross - pf;

    const appliedFunds: Fund[] = (formValue.appliedFunds || []).map((f: Fund) => ({
      id: f.id,
      name: f.name,
      type: f.type || 'Percentage',
      percentage: Number(f.percentage) || 0,
      fixed_amount: Number(f.fixed_amount) || 0,
      isDeduction: f.isDeduction ? 1 : 0,
      calculatedAmount: f.calculatedAmount || 0
    }));

    const payload: Salary = {
      employee: this.getEmployeeName(Number(formValue.employee_id)),
      employee_id: Number(formValue.employee_id),
      basic,
      hra,
      conveyance,
      da,
      pf,
      bonus,
      travel,
      total: gross,
      date: formValue.date,
      status: formValue.status || 'Pending',
      appliedFunds,
      gross,
      deductions: pf,
      net,
      totalMonthly: 0
    };

    if (this.isEditMode && this.editSalaryId) {
      this.salaryService.updateSalary(this.editSalaryId, payload).subscribe({
        next: () => { this.loadSalaries(); this.closeModal('salaryModal'); alert('Salary updated successfully!'); },
        error: (err) => alert('Error updating salary: ' + err)
      });
    } else {
      this.salaryService.addSalary(payload).subscribe({
        next: () => { this.loadSalaries(); this.closeModal('salaryModal'); alert('Salary added successfully!'); },
        error: (err) => alert('Error adding salary: ' + err)
      });
    }
  }


  // ---------- DELETE ----------
  openDeleteModal(id?: number) {
    if (!this.canSalaryAction || !id) return;
    this.confirmDeleteSalaryId = id;
    const modalEl = document.getElementById('deleteSalaryModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }

  deleteSalary(id?: number | null) {
    if (id == null) return;
    this.salaryService.deleteSalary(id).subscribe({
      next: () => {
        this.loadSalaries();
        alert('Salary deleted successfully');
      },
      error: (err) => console.error('Error deleting salary:', err)
    });
    this.confirmDeleteSalaryId = null;
  }

  // ---------- HELPERS ----------
  closeModal(modalId: string) {
    const modalEl = document.getElementById(modalId);
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl) || bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.hide();
    }
  }

  trackById(index: number, item: any): number { return item.id; }

  getEmployeeName(employeeId: number): string {
    const emp = this.employees.find(e => e.id === employeeId);
    return emp ? `${emp.firstname} ${emp.lastName}` : '';
  }

  getSalaryByEmployee(empId?: number): Salary | undefined {
    if (!empId) return undefined;
    return this.salaries.find(s => s.employee_id === empId);
  }

  getFundAmountByEmployee(empId?: number, fundName?: string): number {
    if (!empId || !fundName) return 0;
    const salary = this.getSalaryByEmployee(empId);
    if (!salary || !salary.appliedFunds) return 0;

    const funds: Fund[] = Array.isArray(salary.appliedFunds) ? salary.appliedFunds : JSON.parse(salary.appliedFunds);
    const fund = funds.find(f => f.name.toLowerCase() === fundName.toLowerCase());
    return fund ? Number(fund.calculatedAmount || 0) : 0;
  }

  getSalaryTotalByEmployee(empId?: number): number {
    if (!empId) return 0;
    const salary = this.getSalaryByEmployee(empId);
    return salary ? Number(salary.total || 0) : 0;
  }

  getSalaryStatusByEmployee(empId?: number): string {
    if (!empId) return '';
    const salary = this.getSalaryByEmployee(empId);
    return salary ? salary.status || '' : '';
  }

  // ---------- EXPORT & PRINT ----------
  exportToExcel(salary: Salary) {
    // Ensure all numeric fields are defined
    const basic = Number(salary.basic ?? 0);
    const hra = Number(salary.hra ?? 0);
    const allowance = Number(salary.conveyance ?? 0);          // "Allowance" in payslip
    const fixedAllowance = Number(salary.fixedAllowanceMonthly ?? 0);
    const bonus = Number(salary.bonus ?? 0);

    const pf = Number(salary.pf ?? 0);
    const travel = Number(salary.travel ?? 0);

    // --- Calculate totals ---
    const totalEarnings = basic + hra + allowance + fixedAllowance + bonus; // Total Earnings
    const totalDeductions = pf + travel;                                     // Total Deductions
    const netPay = totalEarnings - totalDeductions;

    // --- Prepare data for Excel ---
    const data = {
      id: salary.id,
      employee_id: salary.employee_id,
      employeeName: salary.employeeName || salary.employee,
      employeeEmail: salary.employeeEmail,
      basic: basic.toFixed(2),
      hra: hra.toFixed(2),
      allowance: allowance.toFixed(2),
      fixedAllowance: fixedAllowance.toFixed(2),
      bonus: bonus.toFixed(2),
      totalEarnings: totalEarnings.toFixed(2),
      pf: pf.toFixed(2),
      travel: travel.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      totalMonthly: totalEarnings.toFixed(2),
      totalAnnual: (totalEarnings * 12).toFixed(2),
      netPay: netPay.toFixed(2),
      status: salary.status,
      date: salary.date,
    };

    // --- Create Excel file ---
    const worksheet = XLSX.utils.json_to_sheet([data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([excelBuffer], { type: 'application/octet-stream' }),
      `Salary-${salary.employeeName || salary.employee_id}.xlsx`
    );
  }
  // ---------- PRINT PAYSLIP ----------
  printSalarySlip(employee: Employee): void {
    if (!employee) return;

    const salary = this.getSalaryByEmployee(employee.id);
    if (!salary) return;

    // Use component variables that are updated when employee is selected
    const salaryForPrint: Salary = {
      ...salary,
      basic: this.basicMonthly || 0,
      hra: this.hraMonthly || 0,
      conveyance: this.conveyance || 0,
      fixedAllowanceMonthly: this.fixedMonthly || 0,
      bonus: this.getFundAmountByEmployee(employee.id, 'Bonus') || 0,
      travel: this.getFundAmountByEmployee(employee.id, 'Travel') || 0,
      pf: this.getFundAmountByEmployee(employee.id, 'PF') || 0,
      total: this.totalMonthly || 0
    };

    this.printSlip(employee, salaryForPrint);
  }


  printSlip(employee: Employee, salary: Salary): void {
    if (!employee || !salary) return;

    const monthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    const companyName = this.company?.name || 'Company Name';
    const companyAddress = this.company?.address || '-';

    // Ensure all fields are defined; default to 0 if missing
    const basic = Number(salary.basic ?? 0);
    const hra = Number(salary.hra ?? 0);
    const conveyance = Number(salary.conveyance ?? 0);
    const fixedAllowance = Number(salary.fixedAllowanceMonthly ?? 0); // updated field
    const bonus = Number(salary.bonus ?? 0);
    const travel = Number(salary.travel ?? 0);
    const pf = Number(salary.pf ?? 0);

    // Total earnings & deductions
    const totalEarnings = basic + hra + conveyance + fixedAllowance + bonus;
    const totalDeductions = pf; // Add more deductions if needed
    const netPay = totalEarnings - totalDeductions;

    const paidDays = salary.paidDays ?? 0;
    const lopDays = salary.lopDays ?? 0;

    const printContents = `
<html>
<head>
  <title>Payslip - ${employee.firstname} ${employee.lastName}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; background: #fff; margin: 20px; color: #000; }
    .payslip { max-width: 900px; margin: auto; border: 1px solid #000; padding: 20px; }
    .header { text-align: center; }
    .header h2 { margin: 0; font-size: 18px; text-transform: uppercase; }
    .header p { margin: 3px 0; font-size: 12px; }
    .section-title { background: #f1f1f1; font-weight: bold; padding: 5px; text-transform: uppercase; font-size: 12px; margin-top: 20px; border: 1px solid #ccc; }
    .flex-table { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
    .flex-table table { border: 1px solid #000; border-collapse: collapse; width: 100%; }
    .flex-table th, .flex-table td { border: 1px solid #000; padding: 6px; font-size: 12px; text-align: left; }
    .flex-table th { background: #f1f1f1; }
    .netpay { margin-top: 20px; font-weight: bold; font-size: 14px; text-align: right; }
    .footer { margin-top: 40px; font-size: 11px; }
    .footer .row { display: flex; justify-content: space-between; margin-top: 30px; }
    .declaration { margin-top: 20px; font-size: 11px; border-top: 1px solid #ccc; padding-top: 10px; }
    .summary-card { display: flex; justify-content: space-between; gap: 50px; flex-wrap: wrap; margin-top: 10px; }
    .summary-card > div { display: flex; flex-direction: column; gap: 10px; flex: 1; }
  </style>
</head>
<body>
  <div class="payslip">
    <div class="header">
    <h2>${companyName}</h2>
      <p>${companyAddress}</p>
      <h3 style="margin-top:10px; text-decoration: underline;">PAYSLIP</h3>
    </div>

    <div class="section-title">PAY SUMMARY</div>
    <div class="summary-card">
      <div>
        <div><span>Employee Name:</span> <b>${employee.firstname} ${employee.lastName}</b></div>
        <div><span>Designation:</span> <b>${employee.position || '-'}</b></div>
        <div><span>Bank Name:</span> <b>${employee.bankName || '-'}</b></div>
        <div><span>Bank Account No:</span> <b>${employee.bankAccountNo || '-'}</b></div>
        <div><span>IFSC Code:</span> <b>${employee.ifscCode || '-'}</b></div>
      </div>
      <div>
        <div><span>Employee ID:</span> <b>${employee.id}</b></div>
        <div><span>Date of Joining:</span> <b>${employee.joiningDate || '-'}</b></div>
        <div><span>Pay Period:</span> <b>${monthYear}</b></div>
        <div><span>Paid Days:</span> <b>${paidDays}</b></div>
        <div><span>LOP Days:</span> <b>${lopDays}</b></div>
      </div>
    </div>

    <div class="flex-table">
      <div>
        <table>
          <tr><th colspan="2">EARNINGS</th></tr>
          <tr><td>Basic</td><td>${basic.toFixed(2)}</td></tr>
          <tr><td>HRA</td><td>${hra.toFixed(2)}</td></tr>
          <tr><td>Allowance</td><td>${conveyance.toFixed(2)}</td></tr>
          <tr><td>Fixed Allowance</td><td>${fixedAllowance.toFixed(2)}</td></tr>
          <tr><td>Bonus</td><td>${bonus.toFixed(2)}</td></tr>
          <tr><td><b>Total Earnings</b></td><td><b>${totalEarnings.toFixed(2)}</b></td></tr>
        </table>
      </div>
      <div>
        <table>
          <tr><th colspan="2">DEDUCTIONS</th></tr>
          <tr><td>PF</td><td>${pf.toFixed(2)}</td></tr>
          <tr><td>Travel</td><td>${travel.toFixed(2)}</td></tr>
          <tr><td><b>Total Deductions</b></td><td><b>${totalDeductions.toFixed(2)}</b></td></tr>
        </table>
      </div>
    </div>

    <div class="netpay">
      Total Net Payable: ₹${netPay.toFixed(2)} <br>
      <small>(In Words: Indian Rupees ${this.convertNumberToWords(netPay)} Only)</small>
    </div>

    <div class="footer">
      <p><b>Prepared By</b> | This is a system-generated payslip and does not require signature</p>
      <div class="declaration">
        <b>Declaration by the Receiver:</b> I hereby declare that I have received the above said amount as my salary and have no grievances, disputes, or claims against the company.
      </div>
      <div class="row">
        <span>Employer's Signature</span>
        <span>Employee's Signature</span>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>
`;

    const newWin = window.open('', '_blank', 'width=900,height=700');
    if (newWin) {
      newWin.document.open();
      newWin.document.write(printContents);
      newWin.document.close();
      newWin.focus();
    }
  }

  // ✅ Helper function - Convert Number to Words
  convertNumberToWords(amount: number): string {
    const words = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
      "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
      "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen",
      "Nineteen"
    ];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    if (amount === 0) return "Zero";

    function inWords(num: number): string {
      if (num < 20) return words[num];
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + words[num % 10] : "");
      if (num < 1000) return words[Math.floor(num / 100)] + " Hundred " + inWords(num % 100);
      if (num < 100000) return inWords(Math.floor(num / 1000)) + " Thousand " + inWords(num % 1000);
      if (num < 10000000) return inWords(Math.floor(num / 100000)) + " Lakh " + inWords(num % 100000);
      return inWords(Math.floor(num / 10000000)) + " Crore " + inWords(num % 10000000);
    }

    return inWords(amount).trim();
  }

  loadEmployeeSalary(employeeId: number) {
    this.employeeService.getSalary(employeeId).subscribe({
      next: (salary: any) => {
        if (!salary) return;
        this.selectedEmployeeSalary = salary;

        // Update component variables for display & print
        this.basicMonthly = salary.basic_monthly || 0;
        this.hraMonthly = salary.hra_monthly || 0;
        this.conveyance = salary.conveyance || 0;
        this.fixedMonthly = salary.fixed_allowance_monthly || 0;

        // Patch form fields (read-only HRA/Conveyance etc.)
        this.salaryForm.patchValue({
          basic: salary.basic_monthly || 0,
          hraMonthly: salary.hra_monthly || 0,
          allowancesMonthly: salary.conveyance || 0,
          fixedAllowanceMonthly: salary.fixed_allowance_monthly || 0,
          totalMonthly: salary.total_monthly || 0,
          totalAnnual: salary.total_annual || 0
        });

        // Assign totals for card display
        this.totalMonthly = salary.total_monthly || 0;
        this.totalAnnual = salary.total_annual || 0;

        // Recalculate salary (optional, ensures dependent fields update)
        this.calculateSalary();
      },
      error: (err) => console.error('Salary fetch error:', err)
    });
  }


}