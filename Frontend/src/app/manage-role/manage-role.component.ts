import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Role } from '../models/role.model';
import { RoleService } from '../Services/Role-serivces/role.service';

@Component({
  selector: 'app-manage-role',
  templateUrl: './manage-role.component.html',
  styleUrls: ['./manage-role.component.scss']
})

export class ManageRoleComponent implements OnInit {
  roles: Role[] = [];
  roleForm!: FormGroup;
  editMode = false;
  editRoleId: number | null = null;
  showForm = false; // <-- form hidden by default

  constructor(private roleService: RoleService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.loadRoles();

    this.roleForm = this.fb.group({
      roleName: ['', Validators.required],
      description: [''],
      status: ['active', Validators.required]
    });
  }

  loadRoles() {
    this.roleService.getRoles().subscribe(res => {
      this.roles = res;
    });
  }

  // Open form for add
  openForm() {
    this.showForm = true;
    this.editMode = false;
    this.resetForm();
  }
// Show/hide form


cancelForm() {
  this.resetForm();
  this.showForm = false; // hide form, list will show
}

  submit() {
    if (this.roleForm.invalid) return;

    const roleData: Role = this.roleForm.value;

    if (this.editMode && this.editRoleId) {
      roleData.id = this.editRoleId;
      this.roleService.updateRole(roleData).subscribe(() => {
        this.loadRoles();
        this.resetForm();
        this.showForm = false; // hide after submit
      });
    } else {
      this.roleService.addRole(roleData).subscribe(() => {
        this.loadRoles();
        this.resetForm();
        this.showForm = false; // hide after submit
      });
    }
  }

  editRole(role: Role) {
    this.editMode = true;
    this.editRoleId = role.id || null;
    this.roleForm.patchValue(role);
    this.showForm = true; // show form on edit
  }

  deleteRole(id: number) {
    if (confirm('Are you sure you want to delete this role?')) {
      this.roleService.deleteRole(id).subscribe(() => {
        this.loadRoles();
      });
    }
  }

  resetForm() {
    this.editMode = false;
    this.editRoleId = null;
    this.roleForm.reset({ status: 'active' });
    // this.showForm = false; // optionally hide on cancel
  }
}