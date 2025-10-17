import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeesService, Employee } from '../Services/Employees-serives/employees.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import flatpickr from 'flatpickr';
import { DepartmentService } from '../Services/Department-serives/department.service';
import { Team, TeamService } from '../Services/Team-services/team.service';
import { LineManager, LineManagerService } from '../Services/LineManagerServices/line-manager.service';
import { AuthService } from '../Services/Auth-services/auth.service';
import { PermissionService } from '../Services/Permission-services/permission.service';

enum FormStatus {
  Pending = 'Pending',
  Success = 'Success',
  Error = 'Error'
}

@Component({
  selector: 'app-add-employee',
  templateUrl: './add-employee.component.html',
  styleUrls: ['./add-employee.component.scss']
})
export class AddEmployeeComponent implements OnInit, AfterViewInit {

  @ViewChild('joiningDateInput') joiningDateInput!: ElementRef;
  employeeForm: FormGroup;
  employeeId?: number;
  formStatus: FormStatus = FormStatus.Pending;
  imageFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  departments: any[] = [];
  teams: Team[] = [];
  lineManagers: LineManager[] = [];
  completedSteps: number[] = [];
  joiningDateInit: boolean = false;

  basicPercent: number = 0;
  hraPercent: number = 0;
  allowances: number = 0;
  fixedAllowance: number = 0;

  basicMonthly: number = 0;
  basicAnnual: number = 0;
  hraMonthly: number = 0;
  hraAnnual: number = 0;
  allowancesAnnual: number = 0;
  allowancesMonthly: number = 0;
  totalAnnual: number = 0;
  totalMonthly: number = 0;
  fixedAllowanceMonthly: number = 0;  // new
  fixedAllowanceAnnual: number = 0;   // new

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private employeesService: EmployeesService,
    private departmentService: DepartmentService,
    private router: Router,
    private teamService: TeamService,
    private lineManagerService: LineManagerService,
    private authService: AuthService,
    private permissionService: PermissionService
  ) {
    this.employeeForm = this.fb.group({
      // Basic Details
      firstname: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      dob: ['', Validators.required],
      address: ['', [Validators.required, Validators.minLength(5)]],
      inviteEmail: [false],
      image: [null],
      gender: ['', Validators.required],
      aadharNo: ['', [Validators.required, Validators.pattern(/^\d{12}$/)]],
      panCard: ['', [Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)]],
      fathersName: ['', [Validators.required, Validators.minLength(2)]],

      // Employment Details
      office: ['', Validators.required],
      joiningDate: [''],
      position: [''],
      team: [''],
      employmentType: [''],
      countryOfEmployment: [''],
      lineManager: [''],
      currency: [''],
      departmentId: [1, [Validators.required, Validators.min(1)]],
      status: [''],
      name: [''],

      // Bank Details
      salary: [0, [Validators.min(0)]],
      bankName: ['', Validators.required],
      bankAccountNo: ['', [Validators.required, Validators.pattern(/^\d{9,18}$/)]],
      ifscCode: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)]],
      bankAddress: ['', Validators.required],

      basicPercent: [50, [Validators.min(0), Validators.max(100)]],  // ✅ default 50
      hraPercent: [50, [Validators.min(0), Validators.max(100)]],    // ✅ default 50    
      allowancesAnnual: [{ value: 0, disabled: true }],
      allowances: [0, [Validators.min(0)]],
      basicMonthly: [{ value: 0, disabled: true }],
      basicAnnual: [{ value: 0, disabled: true }],
      hraMonthly: [{ value: 0, disabled: true }],
      hraAnnual: [{ value: 0, disabled: true }],
      totalMonthly: [{ value: 0, disabled: true }],
      totalAnnual: [{ value: 0, disabled: true }],
      fixedAllowanceMonthly: [{ value: 0, disabled: true }],   // ✅ monthly
      fixedAllowanceAnnual: [{ value: 0, disabled: true }],    // ✅ annual
    });
  }
  steps: string[] = ['Basic Details', ' Salary Details', 'Teams and office', 'Payment information'];
  currentStep: number = 1;


  ngOnInit(): void {
    console.log('--- AddEmployeeComponent ngOnInit ---');
    this.route.paramMap.subscribe(params => {

      const id = params.get('id');
      console.log('[DEBUG] Route param "id":', id);

      if (id) {
        this.employeeId = +id;
        console.log('Employee ID on init (Edit Mode):', this.employeeId);
        this.loadEmployeeData(this.employeeId);
      } else {
        console.log('No employee ID in route → Add Mode');
      }
    });

    this.lineManagerService.getLineManagers().subscribe({
      next: (managers) => {
        console.log('Line managers from API:', managers); // 👈 debug
        this.lineManagers = managers;
      },
      error: (err) => console.error('Failed to fetch line managers', err)
    });

    // Load departments list
    this.loadDepartments();
    this.loadTeams();

    this.employeeForm.get('salary')?.valueChanges.subscribe(() => this.calculateSalary());
    this.employeeForm.get('basicPercent')?.valueChanges.subscribe(() => this.calculateSalary());
    this.employeeForm.get('hraPercent')?.valueChanges.subscribe(() => this.calculateSalary());
    this.employeeForm.get('allowances')?.valueChanges.subscribe(() => this.calculateSalary());

  }

  nextStep(): void {
    if (!this.isStepValid(this.currentStep)) {
      this.markStepFieldsTouched(this.currentStep);
      alert(`Please complete all required fields in Step ${this.currentStep}`);
      return;
    }

    if (this.currentStep < this.steps.length) {
      this.currentStep++;

      // Flatpickr for Joining Date 
      if (this.currentStep === 3) {
        setTimeout(() => {
          if (this.joiningDateInput) {
            flatpickr(this.joiningDateInput.nativeElement, {
              altInput: true,
              altFormat: "d M, Y",
              dateFormat: "Y-m-d",
              defaultDate: this.employeeForm.get('joiningDate')?.value || null
            });
          }
        }, 0);
      }
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }


  loadDepartments(): void {
    this.departmentService.getDepartments().subscribe({
      next: (data) => {
        this.departments = data;
      },
      error: (err) => {
        console.error('Failed to load departments', err);
      }
    });


  }

  loadTeams() {
    this.teamService.getAllTeams().subscribe({
      next: (data) => {
        this.teams = data;
        console.log('Teams loaded for dropdown:', this.teams);
      },
      error: (err) => console.error('Failed to load teams', err)
    });
  }

  formatDateOnly(dateString?: string): string | null {
    if (!dateString) return null;
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`; // "12-08-2025"
  }


  loadEmployeeData(id: number): void {
    const backendBaseUrl = 'http://localhost:3000'; // <-- Your backend URL

    this.employeesService.getEmployee(id).subscribe({
      next: (employee: Employee) => {
        console.log('[DEBUG] Fetching employee data for ID:', id);
        console.log('[DEBUG] Employee received from API:', employee);
        console.log('[DEBUG] Patching form with employee data...');

        // Patch form values
        this.employeeForm.patchValue({
          firstname: employee.firstname,
          lastName: employee.lastName,
          email: employee.email,
          inviteEmail: employee.inviteEmail ?? false,
          office: employee.office,
          position: employee.position,
          status: employee.status,
          team: employee.team,
          employmentType: employee.employmentType,
          countryOfEmployment: employee.countryOfEmployment,
          lineManager: employee.lineManager,
          currency: employee.currency,
          salary: employee.salary,
          departmentId: employee.departmentId ?? 1,
          name: employee.name,
          phone: employee.phone || '',
          joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : '',
          dob: employee.dob ? employee.dob.split('T')[0] : '',
          address: employee.address || '',
          bankName: employee.bankName || '',
          bankAccountNo: employee.bankAccountNo || '',
          ifscCode: employee.ifscCode || '',
          bankAddress: employee.bankAddress || '',
          gender: employee.gender || '',
          aadharNo: employee.aadharNo || '',
          panCard: employee.panCard || '',
          fathersName: employee.fathersName || ''
        });



        // Set image preview correctly
        if (employee.image) {
          this.imagePreview = employee.image.startsWith('http')
            ? employee.image + `?t=${new Date().getTime()}`
            : backendBaseUrl + employee.image + `?t=${new Date().getTime()}`;
          this.imageFile = null; // no new file selected yet
        } else {
          this.imagePreview = null;
        }
      },
      error: err => {
        console.error('Failed to load employee data', err);
      }
    });

  }

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      alert('Only JPG and PNG formats are allowed.');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('Image must be less than 5MB.');
      return;
    }

    this.imageFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result;
      this.employeeForm.patchValue({ image: reader.result }); // ✅ Set Base64 string to form
    };
    reader.readAsDataURL(file);
  }

  onSubmit(): void {
    console.log('--- onSubmit triggered ---');
    console.log('[DEBUG] Current employeeId:', this.employeeId);

    // 🔹 Trim all string fields before validation
    Object.keys(this.employeeForm.controls).forEach(key => {
      const control = this.employeeForm.get(key);
      if (control && typeof control.value === 'string') {
        control.setValue(control.value.trim());
      }
    });

    this.formStatus = FormStatus.Pending;

    if (this.employeeForm.valid) {

      const formData = new FormData();
      const getValue = (field: string, defaultValue: any = '') => this.employeeForm.get(field)?.value ?? defaultValue;

      const formatDateForDB = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split(/[-\/]/);
        if (parts.length === 3) {
          if (parseInt(parts[0]) > 31) return dateStr;
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return dateStr;
      };

      // Trim IFSC
      const ifscControl = this.employeeForm.get('ifscCode');
      if (ifscControl && ifscControl.value) {
        ifscControl.setValue(ifscControl.value.trim());
      }

      // Append employee fields
      formData.append('firstname', getValue('firstname'));
      formData.append('lastName', getValue('lastName'));
      formData.append('email', getValue('email'));
      formData.append('phone', getValue('phone'));
      formData.append('dob', getValue('dob'));
      formData.append('joiningDate', getValue('joiningDate'));
      formData.append('address', getValue('address'));
      formData.append('inviteEmail', getValue('inviteEmail', 'false'));
      formData.append('office', getValue('office'));
      formData.append('position', getValue('position'));
      formData.append('team', getValue('team'));
      formData.append('employmentType', getValue('employmentType'));
      formData.append('countryOfEmployment', getValue('countryOfEmployment'));
      formData.append('lineManager', getValue('lineManager'));
      formData.append('currency', getValue('currency'));
      formData.append('salary', getValue('salary', '0'));
      formData.append('departmentId', getValue('departmentId', '1'));
      formData.append('aadharNo', getValue('aadharNo'));
      formData.append('panCard', getValue('panCard'));
      formData.append('fathersName', getValue('fathersName'));
      formData.append('status', getValue('status', 'Active'));
      formData.append('gender', getValue('gender', 'Other'));
      formData.append('name', `${getValue('firstname')} ${getValue('lastName')}`);
      formData.append('bankName', getValue('bankName'));
      formData.append('bankAccountNo', getValue('bankAccountNo'));
      formData.append('ifscCode', getValue('ifscCode'));
      formData.append('bankAddress', getValue('bankAddress'));

      if (this.imageFile) {
        formData.append('image', this.imageFile, this.imageFile.name);
      } else if (this.imagePreview) {
        formData.append('image', getValue('image', ''));
      }

      // 🔹 Function to save salary
      const saveSalary = (employeeId: number) => {
        const salaryData = {
          ctc: getValue('salary', 0),
          basic_percent: getValue('basicPercent', 0),
          basic_annual: getValue('basicAnnual', 0),
          basic_monthly: getValue('basicMonthly', 0),
          hra_percent: getValue('hraPercent', 0),
          hra_annual: getValue('hraAnnual', 0),
          hra_monthly: getValue('hraMonthly', 0),
          conveyance: getValue('allowancesMonthly', 0),
          conveyance_annual: getValue('allowancesAnnual', 0),
          total_annual: getValue('totalAnnual', 0),
          total_monthly: getValue('totalMonthly', 0),
          fixed_allowance: this.fixedAllowanceAnnual,          // use component property
          fixed_allowance_monthly: this.fixedAllowanceMonthly, // use component property
        };
        this.employeesService.saveSalary(employeeId, salaryData).subscribe({
          next: () => console.log('Salary saved successfully'),
          error: err => console.error('Salary save failed', err)
        });
      };

      // Send request
      if (this.employeeId) {
        this.employeesService.updateEmployee(this.employeeId, formData).subscribe({
          next: (res: any) => {
            this.employeeForm.patchValue({ ...res.employee });
            this.imagePreview = res.employee.image
              ? `http://localhost:3000${res.employee.image}?t=${new Date().getTime()}`
              : null;

            this.saveSalary(this.employeeId!); // ✅ works for existing employee
            alert(res.message);
            this.router.navigate(['/employees']);
          },
          error: err => {
            console.error(err);
            alert('Failed to update employee');
          }
        });
      }
      else {
        // Add employee
        this.employeesService.addEmployee(formData).subscribe({
          next: (res: any) => {
            this.formStatus = FormStatus.Success;

            // 🔹 Save salary using the correct ID
            if (res.id) {
              console.log('[DEBUG] Saving salary for employee ID:', res.id);
              this.saveSalary(res.id);
            }

            alert('Employee added successfully!');
            this.router.navigate(['/employees'], { queryParams: { reload: new Date().getTime() } });
          },
          error: err => {
            this.formStatus = FormStatus.Error;
            console.error('Add failed', err);
            alert('Could not connect to the backend.');
          }
        });
      }
    } else {
      this.formStatus = FormStatus.Error;
      this.employeeForm.markAllAsTouched();
    }
  }


  formatJoiningDate(): void {
    const control = this.employeeForm.get('joiningDate');
    if (control && control.value) {
      const parts = control.value.split(/[\/\-]/); // Supports dd/mm/yyyy or dd-mm-yyyy
      if (parts.length === 3) {
        const formatted = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        control.setValue(formatted);
      }
    }
  }


  onCancel(): void {
    this.employeeForm.reset({
      firstname: '',
      lastName: '',
      fathersName: '',
      email: '',
      phone: '',
      dob: '',
      address: '',
      gender: '',
      aadharNo: '',
      panCard: '',
      inviteEmail: false,
      office: '',
      joiningDate: '',
      position: '',
      team: '',
      employmentType: '',
      countryOfEmployment: '',
      lineManager: '',
      currency: '',
      salary: 0,
      basicPercent: 50,
      hraPercent: 50,
      allowances: 0,
      basicMonthly: 0,
      basicAnnual: 0,
      hraMonthly: 0,
      hraAnnual: 0,
      allowancesAnnual: 0,
      totalMonthly: 0,
      totalAnnual: 0,
      departmentId: 1,
      status: 'Active',
      name: '',
      bankName: '',
      bankAccountNo: '',
      ifscCode: '',
      bankAddress: '',
      image: null
    });
    this.router.navigate(['/employees']);
  }

  ngAfterViewInit(): void {
    flatpickr("#dobPicker", {
      altInput: true,
      altFormat: "d M, Y",
      dateFormat: "Y-m-d",
      maxDate: "today",
      defaultDate: this.employeeForm.get('dob')?.value || null
    });
  }

  saveStep(stepNumber: number) {
    if (this.isStepValid(stepNumber)) {
      if (!this.completedSteps.includes(stepNumber)) {
        this.completedSteps.push(stepNumber);
      }
      if (this.currentStep < this.steps.length) {
        this.currentStep++;
      }
    } else {
      this.markStepFieldsTouched(stepNumber);
      alert(`Please complete all required fields in Step ${stepNumber}`);
    }
  }

  isStepValid(stepNumber: number): boolean {
    let fields: string[] = [];

    switch (stepNumber) {
      case 1:
        fields = ['firstname', 'fathersName', 'lastName', 'email', 'dob', 'phone', 'address', 'aadharNo', 'panCard', 'gender'];
        break;
      case 2:
        fields = ['salary'];
        break;
      case 3:
        fields = ['countryOfEmployment', 'joiningDate', 'position', 'employmentType', 'team', 'lineManager', 'office'];
        break;
      case 4:
        fields = ['currency', 'bankName', 'bankAccountNo', 'ifscCode', 'bankAddress'];
        break;
    }

    return fields.every(field => {
      const control = this.employeeForm.get(field);
      return !!(control && control.valid);
    });
  }

  markStepFieldsTouched(stepNumber: number) {
    let fields: string[] = [];

    switch (stepNumber) {
      case 1:
        fields = ['firstname', 'fathersName', 'lastName', 'email', 'dob', 'phone', 'address', 'aadharNo', 'panCard', 'gender'];
        break;
      case 2:
        fields = ['salary'];
        break;
      case 3:
        fields = ['countryOfEmployment', 'joiningDate', 'position', 'employmentType', 'team', 'lineManager', 'office'];
        break;
      case 4:
        fields = ['currency', 'bankName', 'bankAccountNo', 'ifscCode', 'bankAddress'];
        break;
    }

    fields.forEach(field => {
      const control = this.employeeForm.get(field);
      if (control) {
        control.markAsTouched();
        control.updateValueAndValidity();
      }
    });
  }

  trimIfsc(): void {
    const control = this.employeeForm.get('ifscCode');
    if (control && control.value) {
      control.setValue(control.value.trim());
    }
  }

  saveSalary(employeeId: number) {
    const salaryData = {
      ctc: this.employeeForm.value.salary,
      basic_percent: this.employeeForm.value.basicPercent,
      basic_annual: this.basicAnnual,
      basic_monthly: this.basicMonthly,
      hra_percent: this.employeeForm.value.hraPercent,
      hra_annual: this.hraAnnual,
      hra_monthly: this.hraMonthly,
      conveyance: this.employeeForm.value.allowances,
      conveyance_annual: this.allowancesAnnual,
      fixed_allowance: this.fixedAllowanceAnnual,         // ✅ now assigned
      fixed_allowance_monthly: this.fixedAllowanceMonthly, // ✅ now assigned
      total_annual: this.totalAnnual,
      total_monthly: this.totalMonthly
    };

    console.log('[DEBUG] Salary payload:', salaryData);

    this.employeesService.saveSalary(employeeId, salaryData).subscribe({
      next: (res) => console.log('[DEBUG] Salary saved response:', res),
      error: (err) => console.error('[DEBUG] Salary save error:', err)
    });
  }

  calculateSalary() {
    const ctc = this.employeeForm.get('salary')?.value || 0;
    const basicPercent = this.employeeForm.get('basicPercent')?.value || 50;
    const hraPercent = this.employeeForm.get('hraPercent')?.value || 50;
    const conveyanceMonthly = this.employeeForm.get('allowances')?.value || 0;

    // Basic
    this.basicAnnual = (ctc * basicPercent) / 100;
    this.basicMonthly = this.basicAnnual / 12;

    // HRA
    this.hraAnnual = (this.basicAnnual * hraPercent) / 100;
    this.hraMonthly = this.hraAnnual / 12;

    // Conveyance
    this.allowancesMonthly = conveyanceMonthly;
    this.allowancesAnnual = conveyanceMonthly * 12;

    // Fixed Allowance = Remaining CTC
    this.fixedAllowanceAnnual = ctc - (this.basicAnnual + this.hraAnnual + this.allowancesAnnual);
    this.fixedAllowanceMonthly = this.fixedAllowanceAnnual / 12;

    // Total
    this.totalMonthly = this.basicMonthly + this.hraMonthly + this.allowancesMonthly + this.fixedAllowanceMonthly;
    this.totalAnnual = this.basicAnnual + this.hraAnnual + this.allowancesAnnual + this.fixedAllowanceAnnual;

    // Patch Form
    this.employeeForm.patchValue({
      basicMonthly: this.basicMonthly,
      basicAnnual: this.basicAnnual,
      hraMonthly: this.hraMonthly,
      hraAnnual: this.hraAnnual,
      allowancesMonthly: this.allowancesMonthly,
      allowancesAnnual: this.allowancesAnnual,
      fixedAllowanceMonthly: this.fixedAllowanceMonthly,   // monthly
      fixedAllowanceAnnual: this.fixedAllowanceAnnual,     // annual
      totalMonthly: this.totalMonthly,
      totalAnnual: this.totalAnnual
    }, { emitEvent: false });
  }
}  