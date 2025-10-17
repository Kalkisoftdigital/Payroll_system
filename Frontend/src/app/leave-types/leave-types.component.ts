import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LeaveTypesService } from '../Services/leaves-type/leave-type.service';
import * as bootstrap from 'bootstrap';

export interface LeaveType {
  id?: number;
  name: string;
  status?: 'Active' | 'Inactive';
  created_at?: string;
}

@Component({
  selector: 'app-leave-types',
  templateUrl: './leave-types.component.html',
  styleUrls: ['./leave-types.component.scss']
})
export class LeaveTypesComponent implements OnInit {
  leaveTypes: LeaveType[] = [];
  addForm!: FormGroup;
  editForm!: FormGroup;
  selectedLeave: LeaveType | null = null;

  @ViewChild('deleteModal') deleteModal!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private leaveTypeService: LeaveTypesService
  ) { }

  ngOnInit(): void {
    this.addForm = this.fb.group({
      name: ['', Validators.required]
    });

    this.editForm = this.fb.group({
      id: [null],
      name: ['', Validators.required]
    });

    this.loadLeaveTypes();
  }

  // Load leave types from backend
  loadLeaveTypes() {
    this.leaveTypeService.getLeaveTypes().subscribe({
      next: data => {
        this.leaveTypes = data.map(l => ({
          ...l,
          status: l.status === 'Inactive' ? 'Inactive' : 'Active'
        }));
      },
      error: err => console.error('Error loading leave types', err)
    });
  }

  // Add leave type
  addLeave(modalRef: any) {
    if (this.addForm.invalid) return;

    this.leaveTypeService.addLeaveType({
      ...this.addForm.value,
      status: 'Active'
    }).subscribe({
      next: () => {
        this.loadLeaveTypes();
        this.addForm.reset();
        bootstrap.Modal.getInstance(modalRef)?.hide();
        alert('Leave type added successfully ✅');   // <-- Alert
      },
      error: err => {
        console.error('Error adding leave type', err);
        alert('Error adding leave type ❌');         // <-- Alert
      }
    });
  }

  // Open edit modal
  openEditModal(leave: LeaveType, modalRef: any) {
    this.selectedLeave = leave;
    this.editForm.patchValue(leave);
    new bootstrap.Modal(modalRef).show();
  }

  // Save edit
  saveEdit(modalRef: any) {
    if (!this.selectedLeave || this.editForm.invalid) return;

    this.leaveTypeService.updateLeaveType(this.selectedLeave.id!, this.editForm.value).subscribe({
      next: () => {
        this.loadLeaveTypes();
        bootstrap.Modal.getInstance(modalRef)?.hide();
        alert('Leave type updated successfully ✏️'); // <-- Alert
        this.selectedLeave = null;
      },
      error: err => {
        console.error('Error editing leave type', err);
        alert('Error updating leave type ❌');        // <-- Alert
      }
    });
  }

  // Open delete modal
  openDeleteModal(leave: LeaveType) {
    this.selectedLeave = leave;
    new bootstrap.Modal(this.deleteModal.nativeElement).show();
  }

  // Confirm delete
  confirmDelete() {
    if (!this.selectedLeave) return;

    this.leaveTypeService.deleteLeaveType(this.selectedLeave.id!).subscribe({
      next: () => {
        this.loadLeaveTypes();
        bootstrap.Modal.getInstance(this.deleteModal.nativeElement)?.hide();
        alert('Leave type deleted successfully 🗑️'); // <-- Alert
        this.selectedLeave = null;
      },
      error: err => {
        console.error('Error deleting leave type', err);
        alert('Error deleting leave type ❌');        // <-- Alert
      }
    });
  }

  // Optional: close modal manually if needed
  closeModal(modalId: string) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      bootstrap.Modal.getInstance(modalElement)?.hide();
    }
  }
}
