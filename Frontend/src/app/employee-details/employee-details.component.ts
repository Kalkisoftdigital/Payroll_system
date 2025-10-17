import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeesService, Employee } from '../Services/Employees-serives/employees.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EmployeeDetailsService } from '../Services/Employees-details/employee-details.service';
import { HttpClient } from '@angular/common/http';
import { Modal } from 'bootstrap';
import { AfterViewInit } from '@angular/core';
import flatpickr from 'flatpickr';
import * as bootstrap from 'bootstrap';
import { Validators } from '@angular/forms';
import { LeavesService } from '../Services/Leaves-services/leaves.service';
import { Leave } from '../models/leave.model';  // Import only
import { SalaryService } from '../Services/Salary-services/salary.service';
import { forkJoin } from 'rxjs';
import { DepartmentService } from '../Services/Department-serives/department.service';


import { SalaryTransaction } from '../models/salary.model'; // Import the model


export interface EmployeeDocument {
  id?: number;
  employeeId?: number;
  name: string;
  filePath: string;
  type?: string;
  date?: string;
  size?: number;
}

@Component({
  selector: 'app-employee-details',
  templateUrl: './employee-details.component.html',
  styleUrls: ['./employee-details.component.scss']
})
export class EmployeeDetailsComponent implements OnInit, AfterViewInit {

  totalLeaves: number = 12;       // Example: total leaves
  leavesTaken: number = 0;        // Initially 0
  leavesRemaining: number = 0;    // Initially 0
  workFromHome: number = 0;       // Initially 0
  basicForm!: FormGroup;
  employees: any[] = [];
  selectedEmployeeId?: number;
  employee?: Employee;
  editContactForm: FormGroup;
  selectedFile?: File;
  newDocument: any = {};
  documents: EmployeeDocument[] = [];
  backendBaseUrl = 'http://localhost:3000';
  personalForm: FormGroup;
  salaryDetails: any;
  employeeId!: number;


  // Edit document
  editDocumentForm: FormGroup;
  selectedEditFile?: File;
  editingDocument?: EmployeeDocument;
  bankDetails: any = {};        // Stores bank info
  transactions: any[] = [];     // Stores salary transactions
  departments: { id?: number; name: string }[] = [];

  // Leave management
  selectedEmployeeIdForLeave?: number;  // Selected employee in the modal
  numberOfDays: number = 0;
  leaveForm: FormGroup;
  lineManagerName: string = '';
  lineManagerImage: string = 'assets/img/default-avatar.png';


  // Salary variables
  totalAnnual: number = 0;
  totalMonthly: number = 0;

  basicPercent: number = 50;
  basicMonthly: number = 0;
  basicAnnual: number = 0;

  hraPercent: number = 50;
  hraMonthly: number = 0;
  hraAnnual: number = 0;

  fixedMonthly: number = 0;
  fixedAnnual: number = 0;

  conveyance: number = 0;
  conveyance_annual: number = 0;


  leaves: Leave[] = [];
  selectedLeaveIdToDelete: number | null = null;
  isEditMode: boolean = false;
  remainingLeaves: number = 0;

  totalSalary: number = 0;
  salaryPaid: number = 0;
  salaryPending: number = 0;

  constructor(
    private route: ActivatedRoute,
    private employeeDetailsService: EmployeeDetailsService,
    private employeesService: EmployeesService,
    private fb: FormBuilder,
    private http: HttpClient,
    private leavesService: LeavesService,
    private salaryService: SalaryService,
    private router: Router,
    private departmentService: DepartmentService
  ) {
    this.editContactForm = this.fb.group({
      phone: [''],
      website: [''],
      linkedin: ['']
    });

    this.editDocumentForm = this.fb.group({
      id: [''],
      name: [''],
      file: [null]
    });

    this.leaveForm = this.fb.group({
      id: [null],
      employee_id: ['', Validators.required],
      leave_type: ['', Validators.required],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      duration: ['', Validators.required],
      reason: ['']
    });

    this.basicForm = this.fb.group({
      email: [''],
      phone: [''],
      position: [''],
      departmentId: [''],
      fathersName: [''],
      aadharNo: [''],
      panCard: [''],
      gender: [''],
      dateOfJoining: [''],
      firstname: [''],
      lastName: ['']
    });

    this.personalForm = this.fb.group({
      fathersName: [''],
      aadharNo: [''],
      panCard: [''],
      dob: [''],
      email: [''],
      address: [''],
      id: ['']
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadEmployeeDetails(id);
      this.loadDocuments(id);
      this.loadSalaryDetails(id);


      this.loadLeaves();
      this.loadEmployees();

      this.loadSalaryTransactions();
      this.loadDepartments();

    }
  }

  ngAfterViewInit(): void {
    // Initialize Flatpickr for date inputs
    flatpickr('.flatpickr-input', { dateFormat: 'd M, Y' });
  }

  // Load employee info
  loadEmployeeDetails(id: number) {
    this.employeesService.getEmployee(id).subscribe({
      next: (data: Employee & { transactions?: any[] }) => {
        console.log('Employee data received:', data);
        this.employee = data;

        this.personalForm.patchValue({ id: data.id });
        // Contact info
        this.editContactForm.patchValue({
          phone: data.phone || '',
          website: data.website || '',
          linkedin: data.linkedin || ''
        });

        // Bank details
        this.bankDetails = {
          salary: data.salary,
          bankName: data.bankName,
          bankAccountNo: data.bankAccountNo,
          ifscCode: data.ifscCode
        };

        // Now we can safely load salary transactions
        this.loadSalaryTransactions();

        // Load leaves here too if needed
        this.loadLeaves();
        this.lineManagerName = this.employee.lineManager || 'Not Assigned';
        this.lineManagerImage = this.employee.profileImage || '';

      },
      error: (err) => console.error('Error loading employee', err)
    });
  }

  loadDepartments() {
    this.departmentService.getDepartments().subscribe({
      next: (data) => {
        this.departments = data;
        console.log('Departments loaded:', this.departments);
      },
      error: (err) => console.error('Error loading departments:', err)
    });
  }

  // Load documents
  loadDocuments(employeeId: number) {
    this.employeeDetailsService.getEmployeeDocuments(employeeId).subscribe({
      next: (docs) => {
        console.log('Documents received from backend:', docs);
        this.documents = docs.map(doc => ({
          ...doc,
          filePath: doc.filePath.startsWith('http') ? doc.filePath : `${this.backendBaseUrl}${doc.filePath}`
        }));
      },
      error: (err) => console.error('Error loading documents:', err)
    });
  }

  // Delete document
  deleteDocument(doc: EmployeeDocument) {
    if (!doc.id) return;
    if (!confirm('Are you sure you want to delete this document?')) return;

    this.employeeDetailsService.deleteEmployeeDocument(doc.id).subscribe({
      next: () => {
        this.documents = this.documents.filter(d => d.id !== doc.id);
      },
      error: (err) => console.error('Error deleting document', err)
    });
  }

  // Save contact info
  saveContact() {
    if (!this.employee?.id) return;

    const updatedContact = this.editContactForm.value;
    this.employeeDetailsService.updateEmployeeContact(this.employee.id, updatedContact).subscribe({
      next: () => {
        console.log('Contact updated successfully');
        this.employee = { ...this.employee!, ...updatedContact };
      },
      error: (err) => console.error('Error updating contact:', err)
    });
  }

  // File selection for new document
  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
      console.log('Selected file:', this.selectedFile);
    }
  }
  // Upload new document
  uploadDocument() {
    if (!this.selectedFile || !this.employee?.id) {
      alert('Please select a file!');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('name', this.newDocument.name || this.selectedFile.name);
    formData.append('date', new Date().toISOString());

    this.http.post<EmployeeDocument>(
      `${this.backendBaseUrl}/api/employees/${this.employee.id}/documents`,
      formData
    ).subscribe({
      next: (res) => {
        const docWithUrl = {
          ...res,
          filePath: res.filePath.startsWith('http') ? res.filePath : `${this.backendBaseUrl}${res.filePath}`
        };
        this.documents.push(docWithUrl);
        this.selectedFile = undefined;
        this.newDocument = {}; // reset form
      },
      error: (err) => console.error('Upload error', err)
    });
  }
  // ---------------- Edit document ----------------

  loadEmployees() {
    this.employeesService.getEmployees().subscribe({
      next: (data: Employee[]) => {
        this.employees = data;
        console.log('Employees loaded:', this.employees);
      },
      error: (err) => console.error('Error loading employees', err)
    });
  }
  // Open edit modal
  openEditDocumentModal(doc: EmployeeDocument) {
    this.editingDocument = doc;
    this.editDocumentForm.patchValue({
      id: doc.id,
      name: doc.name,
      file: null
    });
    const modalEl = document.getElementById('edit_document');
    if (modalEl) {
      const modal = new Modal(modalEl);
      modal.show();
    }
  }

  // File selection for editing
  onEditFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.selectedEditFile = event.target.files[0];
    }
  }

  // Save edited document
  updateDocument() {
    if (!this.editingDocument || !this.editingDocument.id) return;

    const docId = this.editingDocument.id;
    const updatedName = this.editDocumentForm.value.name;

    const formData = new FormData();
    formData.append('name', updatedName);
    formData.append('date', new Date().toISOString());

    if (this.selectedEditFile) {
      formData.append('file', this.selectedEditFile);
    }

    this.http.put<EmployeeDocument>(
      `${this.backendBaseUrl}/api/employees/documents/${docId}`,
      formData
    ).subscribe({
      next: (res) => {
        const index = this.documents.findIndex(d => d.id === docId);
        if (index !== -1) {
          this.documents[index] = {
            ...this.documents[index],
            ...res,
            filePath: res.filePath?.startsWith('http') ? res.filePath : `${this.backendBaseUrl}/${res.filePath}`
          };
        }

        // Close modal
        const modalEl = document.getElementById('edit_document');
        if (modalEl) {
          const modal = Modal.getInstance(modalEl);
          modal?.hide();
        }

        this.selectedEditFile = undefined;
        this.editingDocument = undefined;
      },
      error: (err) => console.error('Error updating document:', err)
    });
  }
  // ---------------- Leave management ----------------

  // Calculate leave days
  calculateDays(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 3600 * 24)) + 1;
  }


  onSubmit(): void {
    // Make sure employee_id is set before validation
    this.leaveForm.patchValue({
      employee_id: this.employee?.id ?? null
    });

    console.log('Submitting leave with values:', this.leaveForm.value);

    if (this.leaveForm.invalid) {
      this.leaveForm.markAllAsTouched();
      console.warn('Form is invalid', this.leaveForm.value);
      console.error('Invalid Controls:', this.findInvalidControls());
      return;
    }

    if (this.isEditMode) {
      const leaveId = this.leaveForm.get('id')?.value;
      this.leavesService.updateLeave(leaveId, this.leaveForm.value).subscribe({
        next: () => {
          this.leaveForm.reset();
          this.isEditMode = false;
          this.loadLeaves();
          this.closeModal('add_leave');
        },
        error: (err) => console.error('Update leave failed:', err)
      });
    } else {
      this.leavesService.createLeave(this.leaveForm.value).subscribe({
        next: () => {
          this.leaveForm.reset();
          this.loadLeaves();
          this.closeModal('add_leave');
          this.router.navigate(['/employee-details']);
        },
        error: (err) => console.error('Create leave failed:', err)
      });
    }
  }

  loadLeaves(): void {
    if (!this.employee?.id) return;

    this.leavesService.getAllLeaves().subscribe({
      next: (data) => {
        this.leaves = data.filter(l => l.employee_id === this.employee?.id);

        this.totalLeaves = 12; // or fetch from backend if dynamic

        this.leavesTaken = this.leaves
          .filter(l => l.status?.toLowerCase() === 'approved' && l.leave_type !== 'Work From Home')
          .reduce((sum, l) => sum + Number(l.duration ?? 1), 0);

        // Work from home count
        this.workFromHome = this.leaves
          .filter(l => l.status?.toLowerCase() === 'approved' && l.leave_type === 'Work From Home')
          .reduce((sum, l) => sum + Number(l.duration ?? 1), 0);

        // Remaining leaves
        this.leavesRemaining = this.totalLeaves - this.leavesTaken;
      },
      error: (err) => console.error('Error loading leaves:', err)
    });
  }

  findInvalidControls(): string[] {
    const invalid: string[] = [];
    const controls = this.leaveForm.controls;
    for (const name in controls) {
      if (controls[name].invalid) {
        invalid.push(name);
      }
    }
    return invalid;
  }

  confirmDelete(leaveId?: number): void {
    if (leaveId === undefined) return;
    if (confirm('Are you sure you want to delete this leave?')) {
      this.leavesService.deleteLeave(leaveId).subscribe({
        next: () => {
          this.loadLeaves();
          alert('Leave deleted successfully');
        },
        error: (err) => console.error('Failed to delete leave:', err)
      });
    }
  }
  closeModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      }
    }
  }
  getEmployeeName(employeeId: number): string {
    const employee = this.employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstname} ${employee.lastName}` : 'Unknown';
  }


  openAddModal(): void {
    this.isEditMode = false;

    this.leaveForm.reset({
      employee_id: this.employee?.id ?? null,  // <- sets the hidden control
      leave_type: '',
      start_date: '',
      end_date: '',
      duration: 'Full Day',
      reason: ''
    });

    this.leaveForm.patchValue({
      status: 'pending'
    });

    const modalEl = document.getElementById('add_leave');
    if (modalEl) {
      bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
  }

  openEditModal(leave: Leave): void {
    this.isEditMode = true;
    this.leaveForm.patchValue({
      id: leave.id,
      employee_id: this.employee?.id || '',
      leave_type: leave.leave_type || '',
      start_date: this.formatDateToInput(leave.start_date),
      end_date: this.formatDateToInput(leave.end_date),
      reason: leave.reason,
      status: leave.status || 'pending',
      duration: leave['duration'] || 'Full Day'
    });

    const modalEl = document.getElementById('addLeaveModal');
    if (modalEl) {
      const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
      modalInstance.show();
    }
  }

  formatDateToInput(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const yyyy = date.getFullYear();
    const mm = ('0' + (date.getMonth() + 1)).slice(-2);
    const dd = ('0' + date.getDate()).slice(-2);
    return `${yyyy}-${mm}-${dd}`;
  }

  loadSalaryTransactions(): void {
    if (!this.employee?.id) return;

    this.salaryService.getSalaryByEmployee(this.employee.id).subscribe({
      next: (rows: any[]) => {
        const currentId = Number(this.employee!.id);

        // Normalize rows
        this.transactions = (rows || []).map(r => ({
          id: Number(r.id),
          employeeId: Number(r.employee_id ?? 0),
          basic: Number(r.basic ?? 0),
          hra: Number(r.hra ?? 0),
          total: Number(r.total ?? 0),
          status: r.status ?? '',
          created_at: r.created_at
            ? new Date(r.created_at)
            : r.date
              ? new Date(r.date)   // fallback to Salary For date
              : null,
          date: r.date ? new Date(r.date) : null                     // Salary For
        }))
          .filter(t => t.employeeId === currentId);

        // Totals
        this.totalSalary = this.transactions.reduce((sum, t) => sum + (t.total || 0), 0);
        this.salaryPaid = this.transactions
          .filter(t => (t.status || '').toLowerCase() === 'paid')
          .reduce((sum, t) => sum + (t.total || 0), 0);
        this.salaryPending = this.totalSalary - this.salaryPaid;

        console.log('Salary transactions:', this.transactions);
      },
      error: (err) => console.error('Error loading salary transactions:', err)
    });
  }
  // 🔹 Open edit modal when clicking edit
  editSection(section: string) {
    if (section === 'basic' && this.employee) {
      this.basicForm.patchValue({
        email: this.employee.email,
        phone: this.employee.phone,
        position: this.employee.position,
        departmentId: this.employee.departmentId,
        fathersName: this.employee.fathersName,
        aadharNo: this.employee.aadharNo,
        panCard: this.employee.panCard,
        gender: this.employee.gender,
        firstname: this.employee.firstname,
        lastName: this.employee.lastName,
        id: this.employee.id,
        dateOfJoining: this.employee.joiningDate
          ? this.formatDateToInput(this.employee.joiningDate)
          : ''
      });

      const modalEl = document.getElementById('editBasicModal');
      if (modalEl) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
      }
    } else if (section === 'personal' && this.employee) {
      this.personalForm.patchValue({
        fathersName: this.employee.fathersName,
        aadharNo: this.employee.aadharNo,
        panCard: this.employee.panCard,
        dob: this.formatDateToInput(this.employee.dob ?? ''),
        email: this.employee.email,
        address: this.employee.address
      });
      const modalEl = document.getElementById('editPersonalModal');
      if (modalEl) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
      }
    }
  }



  saveBasicInfo() {
    if (this.basicForm.invalid) return;

    const updated = { ...this.employee, ...this.basicForm.value };

    // Make sure ID exists
    if (!updated.id) {
      console.error('Cannot update employee: ID is missing!', updated);
      return;
    }

    this.employeesService.updateEmployee(updated.id, updated).subscribe({
      next: (res: any) => {
        if (res.employee) {
          // Update local employee object
          this.employee = res.employee;

          // Patch the updated data back into the form
          this.basicForm.patchValue({
            email: res.employee.email,
            phone: res.employee.phone,
            position: res.employee.position,
            departmentId: res.employee.departmentId,
            fathersName: res.employee.fathersName,
            aadharNo: res.employee.aadharNo,
            panCard: res.employee.panCard,
            gender: res.employee.gender,
            firstname: res.employee.firstname,
            lastName: res.employee.lastName,
            dateOfJoining: res.employee.joiningDate
              ? this.formatDateToInput(res.employee.joiningDate)
              : ''
          });

          alert(res.message);

          // Close modal
          const modalEl = document.getElementById('editBasicModal');
          if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance?.hide();
          }

          // Reload employee details to refresh all bindings
          this.loadEmployeeDetails(res.employee.id);
        } else {
          console.error('No employee returned in response', res);
        }
      },
      error: (err) => {
        console.error('Update failed', err);
        alert('Update failed. Check console for details.');
      }
    });
  }

  savePersonalInfo() {
    if (this.personalForm.invalid) return;

    const updated = { ...this.employee, ...this.personalForm.value };

    // Check for valid ID
    if (!updated.id) {
      console.error('Cannot update employee: ID is missing!', updated);
      return;
    }

    this.employeesService.updateEmployee(updated.id, updated).subscribe({
      next: (res: any) => {
        if (res.employee) {
          this.employee = res.employee; // Update local object
          alert(res.message);

          // 🔹 Refresh the employee details from backend
          this.loadEmployeeDetails(res.employee.id);

          // 🔹 Optional: close modal after save
          const modalEl = document.getElementById('editPersonalModal');
          if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance?.hide();
          }
        } else {
          console.error('No employee returned in response', res);
        }
      },
      error: (err) => {
        console.error('Update failed', err);
        alert('Update failed. Check console for details.');
      }
    });
  }

loadSalaryDetails(employeeId: number) {
  this.employeesService.getSalary(employeeId).subscribe({
    next: (salary: any) => {
      if (!salary) return;

      // Use values from database directly
      this.basicMonthly = salary.basic_monthly ?? 0;
      this.basicAnnual = salary.basic_annual ?? 0;
      this.hraMonthly = salary.hra_monthly ?? 0;
      this.hraAnnual = salary.hra_annual ?? 0;

      this.fixedMonthly = salary.fixed_allowance_monthly ?? 0;
      this.fixedAnnual = salary.fixed_allowance ?? 0;

      // 🔹 Corrected conveyance mapping
      this.conveyance = salary.conveyance ?? 0;           // monthly
      this.conveyance_annual = salary.conveyance_annual ?? 0;

      this.totalMonthly = salary.total_monthly ?? 0;
      this.totalAnnual = salary.total_annual ?? 0;

      this.basicPercent = salary.basic_percent ?? 0;
      this.hraPercent = salary.hra_percent ?? 0;
    },
    error: (err) => console.error('Salary fetch error:', err)
  });
}

sendSalaryCertificateMail(event: Event) {
  event.preventDefault();
  if (!this.employee?.id) {
    alert('Employee not loaded!');
    return;
  }

  this.salaryService.sendSalaryCertificate(this.employee.id).subscribe({
    next: (res: any) => {
      alert(res.message || 'Salary certificate sent successfully!');
    },
    error: (err: any) => {
      console.error('Error sending salary certificate:', err);
      alert('Failed to send salary certificate. Check console for details.');
    }
  });
}

  printSalaryCertificate(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.employee) {
      alert('Employee not loaded!');
      return;
    }

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Popup blocked! Please allow popups for this site.');
      return;
    }

    printWindow.document.write(`
    <html>
      <head>
        <title>Salary Certificate</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 5px; }
          .date { text-align: right; font-size: 15px; margin-bottom: 20px; }
          p { font-size: 14px; margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: center; }
          th { background: #f2f2f2; }
          .footer-text { margin-top: 20px; font-size: 14px; text-align: justify; }
        </style>
      </head>
      <body>
        <div class="date">Date: ${formattedDate}</div>
        <h1>Salary Certificate</h1>
        <p><strong>Employee Name:</strong> ${this.employee.firstname} ${this.employee.lastName}</p>
        <p><strong>Employee ID:</strong> ${this.employee.id}</p>
        <p><strong>Annual CTC:</strong> ₹${this.totalAnnual}</p>
        <p><strong>Monthly CTC:</strong> ₹${this.totalMonthly}</p>

        <table>
          <thead>
            <tr>
              <th>SALARY COMPONENT</th>
              <th>MONTHLY</th>
              <th>ANNUAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic (${this.basicPercent}%)</td>
              <td>₹${this.basicMonthly}</td>
              <td>₹${this.basicAnnual}</td>
            </tr>
            <tr>
              <td>House Rent Allowance (${this.hraPercent}%)</td>
              <td>₹${this.hraMonthly}</td>
              <td>₹${this.hraAnnual}</td>
            </tr>
            <tr>
              <td>Fixed Allowance</td>
              <td>₹${this.fixedMonthly}</td>
              <td>₹${this.fixedAnnual}</td>
            </tr>
            <tr>
              <td><strong>Total</strong></td>
              <td>₹${this.totalMonthly}</td>
              <td>₹${this.totalAnnual}</td>
            </tr>
          </tbody>
        </table>

        <p class="footer-text">
          We hereby confirm that all the above details provided are as per our records. This certificate is being issued upon the
          request of the above employee for whatever legal purpose it may serve them best.
        </p>
      </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }



}