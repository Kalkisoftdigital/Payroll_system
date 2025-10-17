// src/app/departments/department.component.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Department, DepartmentService } from '../Services/Department-serives/department.service';
import { AuthService } from '../Services/Auth-services/auth.service';

declare var bootstrap: any;

@Component({
  selector: 'app-department',
  templateUrl: './department.component.html',
  styleUrls: ['./department.component.scss'] // optional
})
export class DepartmentComponent implements OnInit {
  departments: Department[] = [];
  selectedDepartmentId: number | null = null;
  user: any;
  userRole: string = '';
  canDepartmentAction: boolean = false;

  constructor(private departmentService: DepartmentService,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.userRole = this.user?.roleName || '';

    // ✅ AuthService मधील permissions वापर
    const perm = this.authService.getPermissions();
    this.canDepartmentAction =
      this.userRole === 'Super Admin' || perm?.can_department_action === 1;

    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as { message?: string };

    if (state?.message === 'added') {
      alert('✅ Department successfully added!');
    } else if (state?.message === 'updated') {
      alert('✅ Department successfully updated!');
    }

    this.getAllDepartments();
  }

  getAllDepartments(): void {
    if (!this.canDepartmentAction) {
      // ✅ Permission नसेल तर departments load होणार नाहीत
      this.departments = [];
      return;
    }

    this.departmentService.getDepartments().subscribe({
      next: (data) => {
        this.departments = data;
      },
      error: (err) => {
        console.error('Error loading departments:', err);
      }
    });
  }

  loadDepartments() {
    this.departmentService.getDepartments().subscribe({
      next: (data) => {
        // ✅ जर परवानगी असेल तरच list दाखव
        if (this.canDepartmentAction) {
          this.departments = data;
        } else {
          this.departments = []; // परवानगी नसेल तर काहीच दाखवू नका
        }
      },
      error: (err) => console.error('Error loading departments:', err)
    });
  }
  confirmDelete(id: number): void {
    this.selectedDepartmentId = id;
  }

  deleteDepartment(): void {
    if (this.selectedDepartmentId === null) return;

    this.departmentService.deleteDepartment(this.selectedDepartmentId).subscribe({
      next: () => {
        this.departments = this.departments.filter(d => d.id !== this.selectedDepartmentId);
        this.selectedDepartmentId = null;

        const modalCloseBtn = document.getElementById('closeDeleteModalBtn');
        modalCloseBtn?.click();

        alert('✅ Department deleted successfully!');
      },
      error: (err) => {
        alert('❌ Failed to delete department: ' + err.message);
      }
    });
  }
}