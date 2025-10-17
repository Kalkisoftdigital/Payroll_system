import { Component } from '@angular/core';
import { LeavesService } from '../Services/Leaves-services/leaves.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmployeesService } from '../Services/Employees-serives/employees.service';
import { Leave } from '../models/leave.model';
import { Router } from '@angular/router';
import { LeaveTypesService } from '../Services/leaves-type/leave-type.service';
import { LeaveType } from '../leave-types/leave-types.component';
import { AuthService } from '../Services/Auth-services/auth.service';


declare var bootstrap: any;

@Component({
  selector: 'app-leaves',
  templateUrl: './leaves.component.html',
  styleUrls: ['./leaves.component.scss']
})
export class LeavesComponent {
  // leaves: Leave[] = [];
  leaveForm!: FormGroup;
  employees: any[] = [];
  selectedLeaveIdToDelete: number | null = null;
  isEditMode: boolean = false;
  totalLeaves: number = 12;
  usedLeaves: number = 0;
  remainingLeaves: number = this.totalLeaves;
  selectedEmployeeId!: number;
  appliedDays: number = 0; // from "Number of Days Leave" input
  leaves: Array<any> = []; // your list of leaves (must be loaded before calc)
  canLeaveAction: boolean = false;
  userRole: string = '';
  user: any;
  leaveTypes: LeaveType[] = [];
  isSuperAdmin: boolean = false;
  currentUserId: number = 0;
allEmployees: any[] = []; // all employees for name resolution

  constructor(
    private fb: FormBuilder,
    private leavesService: LeavesService,
    private employeesService: EmployeesService,
    private router: Router,
    private leaveTypesService: LeaveTypesService,
    private authService: AuthService
  ) { }

ngOnInit(): void {
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  this.user = storedUser;

  this.currentUserId = this.user?.employee_id || 0;   // ← important
  this.selectedEmployeeId = this.currentUserId;

  this.canLeaveAction = this.authService.canLeaveAction();
  this.isSuperAdmin = this.authService.isSuperAdmin();

  this.initForm();
  this.loadEmployees();
  this.loadLeaves();
  this.loadLeaveTypes();
  this.watchLeaveForm();
}
  loadLeaveTypes(): void {
    this.leaveTypesService.getLeaveTypes().subscribe({
      next: (data) => {
        // Active leave types only
        this.leaveTypes = data.filter(l => l.status === 'Active');
        console.log('Loaded Leave Types:', this.leaveTypes);
      },
      error: (err) => console.error('Error loading leave types:', err)
    });
  }

  /** wire live updates */
  private setupLiveCalc(): void {
    // When any relevant field changes, recompute
    this.leaveForm.valueChanges.subscribe(() => this.recompute());
  }

  /** safe number helper */
  private toNum(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  /** main calculation: show already used (excluding current) + remaining */
  private recompute(): void {
    if (!Array.isArray(this.leaves) || this.leaves.length === 0) {
      // leaves not loaded yet; show base
      this.usedLeaves = 0;
      this.remainingLeaves = this.totalLeaves;
      return;
    }

    const employeeId = this.toNum(this.leaveForm.get('employee_id')?.value);
    const excludeId = this.toNum(this.leaveForm.get('id')?.value);

    if (!employeeId) {
      this.usedLeaves = 0;
      this.remainingLeaves = this.totalLeaves;
      return;
    }

    // sum approved leaves for this employee, EXCLUDING the one being edited
    const used = this.leaves
      .filter(l =>
        this.toNum(l.employee_id) === employeeId &&
        (l.status === 'approved' || l.status === 'Approved') &&
        this.toNum(l.id) !== excludeId
      )
      .reduce((sum, l) => sum + this.toNum(l.days), 0);

    this.usedLeaves = used;
    this.remainingLeaves = this.totalLeaves - used; // NOTE: not subtracting current form days
  }

loadLeaves(): void {
  this.leavesService.getAllLeaves().subscribe({
    next: (data) => {
      const normalizedLeaves = (data as any[]).map(leave => ({
        ...leave,
        id: +leave.id,
        employee_id: +leave.employee_id,
        status: leave.status ? leave.status : 'Pending',
        days: leave.days || this.calculateDays(leave.start_date, leave.end_date),
      }));

      if (this.isSuperAdmin || this.canLeaveAction) {
        // Admin/HR/Super Admin: see all leaves
        this.leaves = normalizedLeaves;
      } else {
        // Normal user: only own leaves
        const currentId = this.authService.getUser()?.employee_id;
        this.leaves = normalizedLeaves.filter(l => l.employee_id === currentId);
      }
    },
    error: (err) => console.error('Error loading leaves:', err)
  });
}

  calculateRemainingLeaves() {
    this.remainingLeaves = this.totalLeaves - this.usedLeaves;
  }
loadEmployees() {
  this.employeesService.getEmployees().subscribe({
    next: (data: any[]) => {
      // store all employees for name display
      this.allEmployees = data;

      // for dropdown/action purposes
      if (!this.canLeaveAction && !this.isSuperAdmin) {
        // Normal employee: only self for selection
        this.employees = [this.authService.getUser()];
        this.currentUserId = this.authService.getUser()?.employee_id || 0;
      } else {
        // Admin / HR / Super Admin: all employees
        this.employees = data;
      }
    },
    error: (err) => console.error(err)
  });
}



  initForm(): void {
    this.leaveForm = this.fb.group({
      id: [null],
      employee_id: ['', Validators.required],
      leave_type: ['', Validators.required],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      duration: ['Full Day', Validators.required], // ← make sure this exists      reason: ['']
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

  onSubmit(): void {
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
          alert('Salary updated successfully ✅');
          this.leaveForm.reset();
          this.isEditMode = false;
          this.loadLeaves();
          this.closeModal('addLeaveModal');
        },
        error: (err) => console.error('Update leave failed:', err)
      });
    } else {
      this.leavesService.createLeave(this.leaveForm.value).subscribe({
        next: () => {
          alert('Leave updated successfully ✅');
          this.leaveForm.reset();
          this.loadLeaves();
          this.closeModal('addLeaveModal');
          this.router.navigate(['/leaves']);  // ← Navigate to leaves list
        },
        error: (err) => console.error('Create leave failed:', err)
      });
    }
  }

  confirmDelete(leaveId?: number, employeeId?: number): void {
    if (!leaveId || !this.canManageLeave(employeeId!)) return;

    if (confirm('Are you sure you want to delete this leave?')) {
      this.leavesService.deleteLeave(leaveId).subscribe({
        next: () => this.loadLeaves(),
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

getEmployeeName(empId: number): string {
  const emp = this.allEmployees.find(e => e.employee_id === empId || e.id === empId);
  if (!emp) return 'Unknown';
  return `${emp.firstname || ''} ${emp.lastName || ''}`.trim();
}



  calculateLeaves(employeeId: number, excludeLeaveId?: number): void {
    const used = this.leaves
      .filter(l =>
        l.employee_id === employeeId &&
        l.status === 'approved' &&
        l.id !== excludeLeaveId
      )
      .reduce((sum, l) => sum + (l.days || 0), 0);

    this.usedLeaves = used;
    this.remainingLeaves = this.totalLeaves - used;
  }



  getRemainingLeaves(employeeId: number, excludeLeaveId?: number): number {
    const usedDays = this.leaves
      .filter(
        l =>
          l.employee_id === employeeId &&
          l.status === 'approved' &&
          l.id !== excludeLeaveId   // ✅ edit करताना तो leave exclude करतो
      )
      .reduce((sum, l) => sum + (l.days || 0), 0);

    return this.totalLeaves - usedDays;
  }

  onEmployeeSelect(employeeId: number) {
    const empLeaves = this.leaves.filter(
      l => l.employee_id === employeeId && l.status === 'approved'
    );

    this.usedLeaves = empLeaves.reduce((sum, l) => sum + Number(l.days || 0), 0);

    this.remainingLeaves = this.totalLeaves - this.usedLeaves;
  }

  updateLeavesForEmployee(employeeId: number, excludeLeaveId?: number) {
    if (!employeeId) {
      this.usedLeaves = 0;
      this.remainingLeaves = this.totalLeaves;
      return;
    }

    // approved leaves, exclude current if editing
    const used = this.leaves
      .filter(l => l.employee_id === employeeId && l.status === 'approved' && l.id !== excludeLeaveId)
      .reduce((sum, l) => sum + (l.days || 0), 0);

    this.usedLeaves = used;
    this.remainingLeaves = this.totalLeaves - used;
  }


  formatDateToInput(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const yyyy = date.getFullYear();
    const mm = ('0' + (date.getMonth() + 1)).slice(-2);
    const dd = ('0' + date.getDate()).slice(-2);
    return `${yyyy}-${mm}-${dd}`;
  }


  onSelectEmployee(employeeId: number) {
    this.getRemainingLeaves(employeeId);
  }
  updateRemainingLeaves() {
    if (!this.selectedEmployeeId) {
      this.remainingLeaves = this.totalLeaves;
      return;
    }

    const usedDays = this.leaves
      .filter(l => l.employee_id === this.selectedEmployeeId && l.status === 'approved')
      .reduce((sum, l) => sum + (l.days || 0), 0);

    this.remainingLeaves = this.totalLeaves - usedDays;
  }


  getAlreadyUsedLeaves(employeeId: number): number {
    if (!employeeId) return 0;

    return this.leaves
      .filter(l => l.employee_id === +employeeId && l.status === 'approved')
      .reduce((sum, l) => sum + (l.days || 0), 0);
  }

  openEditModal(leave: Leave) {
    if (!this.canLeaveAction && !this.isSuperAdmin) return;
    this.isEditMode = true;
    this.leaveForm.patchValue({
      id: leave.id,
      employee_id: leave.employee_id,
      leave_type: leave.leave_type,
      start_date: this.formatDateToInput(leave.start_date),
      end_date: this.formatDateToInput(leave.end_date),
      reason: leave.reason,
      status: leave.status,
      duration: leave.duration || 'Full Day',
      days: leave.days || this.calculateDays(leave.start_date, leave.end_date)
    });

    this.updateUsedAndRemainingLeaves(leave.employee_id);

    const modalEl = document.getElementById('addLeaveModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }
  onEmployeeChange(event: any) {

    const employeeId = +event.target.value;
    const excludeId = this.isEditMode ? +this.leaveForm.get('id')?.value : undefined;
    this.updateUsedAndRemainingLeaves(employeeId);

    if (!employeeId) {
      this.usedLeaves = 0;
      this.remainingLeaves = this.totalLeaves;
      return;
    }

    const usedDays = this.getUsedLeaves(employeeId, excludeId);

    this.usedLeaves = usedDays;
    this.remainingLeaves = this.totalLeaves - usedDays;
  }

  // 🔹 Get approved leaves for employee excluding current (edit)
  getUsedLeaves(employeeId: number, excludeLeaveId?: number): number {
    return this.leaves
      .filter(l => l.employee_id === employeeId && l.status === 'approved' && l.id !== excludeLeaveId)
      .reduce((sum, l) => sum + (l.days || 0), 0);
  }


openAddModal(): void {
  this.isEditMode = false;
  if (!this.canLeaveAction && !this.isSuperAdmin) {
    this.employees = [this.authService.getUser()];
  } else {
    this.loadEmployees();
  }

  this.leaveForm.reset({
    employee_id: this.currentUserId, // important
    leave_type: '',
    start_date: '',
    end_date: '',
    duration: 'Full Day',
    reason: '',
    status: 'pending',
    days: 0
  });

  const modalEl = document.getElementById('addLeaveModal');
  if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

  onStatusChange(leave: Leave) {
    if (!leave.id) return;

    // API call to update leave status
    this.leavesService.updateLeave(leave.id, { ...leave }).subscribe({
      next: () => {
        console.log('Leave status updated successfully');
        // Optional: show success toast/alert
      },
      error: (err) => console.error('Failed to update leave status:', err)
    });
  }



  calculateDays(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;

    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  updateUsedAndRemainingLeaves(employeeId: number): void {
    if (!employeeId) {
      this.usedLeaves = 0;
      this.remainingLeaves = this.totalLeaves;
      return;
    }

    const excludeId = this.isEditMode ? +this.leaveForm.get('id')?.value : undefined;

    const usedDays = this.leaves
      .filter(l => l.employee_id === employeeId && l.status.toLowerCase() === 'approved' && l.id !== excludeId)
      .reduce((sum, l) => sum + (l.days || 0), 0);

    this.usedLeaves = usedDays;
    this.remainingLeaves = this.totalLeaves - usedDays;
  }

  watchLeaveForm(): void {
    this.leaveForm.valueChanges.subscribe(val => {
      const appliedDays = (val.start_date && val.end_date)
        ? this.calculateDays(val.start_date, val.end_date)
        : 0;

      this.leaveForm.patchValue({ days: appliedDays }, { emitEvent: false });

      if (val.employee_id) {
        this.updateUsedAndRemainingLeaves(val.employee_id);
        this.remainingLeaves -= appliedDays; // current applied days
      }
    });
  }
  canManageLeave(employeeId: number): boolean {
    if (this.isSuperAdmin) return true;
    return this.canLeaveAction && employeeId === this.currentUserId;
  }

  canViewLeave(employeeId: number): boolean {
    if (this.isSuperAdmin) return true;
    return employeeId === this.currentUserId;
  }


}