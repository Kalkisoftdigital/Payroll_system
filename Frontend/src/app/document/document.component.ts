import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Employee, EmployeesService } from '../Services/Employees-serives/employees.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { EmployeeDetailsService } from '../Services/Employees-details/employee-details.service';
import { Modal } from 'bootstrap';
import * as bootstrap from 'bootstrap';

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
  selector: 'app-document',
  templateUrl: './document.component.html',
  styleUrls: ['./document.component.scss']
})
export class DocumentComponent {

  basicForm!: FormGroup;
  employees: any[] = [];
  selectedEmployeeId?: number;
  selectedFile?: File;
  newDocument: any = {};
  documents: EmployeeDocument[] = [];
  backendBaseUrl = 'http://localhost:3000';
  user: any = {};
  canActOnOthers: boolean = false;

  // Edit document
  editDocumentForm: FormGroup;
  selectedEditFile?: File;
  editingDocument?: EmployeeDocument;

  constructor(
    private route: ActivatedRoute,
    private employeesService: EmployeesService,
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private employeeDetailsService: EmployeeDetailsService,
  ) {
    this.editDocumentForm = this.fb.group({
      id: [''],
      name: [''],
      file: [null]
    });
  }

  ngOnInit(): void {
    // Logged-in user
    this.user = JSON.parse(localStorage.getItem('user') || '{}');

    // Permission check
    this.canActOnOthers = this.user.roleName === 'Super Admin' || this.user.can_leave_action === 1;

    // Employees load
    this.loadEmployees();

    // Load all documents (for all employees)
    this.loadDocuments();

  }

  // Load employees
  loadEmployees() {
    this.employeesService.getEmployees().subscribe({
      next: (data) => this.employees = data,
      error: (err) => console.error("Error loading employees:", err)
    });
  }

// Load all documents if no employee selected
loadDocuments(employeeId?: number) {
  console.log('Loaded documents:', this.documents);

  if (employeeId) {
    this.employeeDetailsService.getEmployeeDocuments(employeeId).subscribe({
      next: (docs) => this.processDocuments(docs),
      error: (err) => console.error('Error loading documents:', err)
    });
  } else {
    this.employeeDetailsService.getAllDocuments().subscribe({
      next: (docs) => this.processDocuments(docs),
      error: (err) => console.error('Error loading all documents:', err)
    });
  }
}

processDocuments(docs: EmployeeDocument[]) {
  this.documents = docs.map(doc => ({
    ...doc,
    filePath: doc.filePath.startsWith('http')
      ? doc.filePath
      : `${this.backendBaseUrl}${doc.filePath.startsWith('/') ? '' : '/'}${doc.filePath}`
  }));
}

  // Upload document
  onFileSelected(event: any) {
    if (event.target.files.length > 0) this.selectedFile = event.target.files[0];
  }

  uploadDocument() {
    if (!this.selectedEmployeeId) {
      alert("Please select an employee!");
      return;
    }

    if (!this.selectedFile) {
      alert("Please select a file!");
      return;
    }

    const formData = new FormData();
    formData.append("name", this.newDocument.name);
    formData.append("file", this.selectedFile, this.selectedFile.name);

    this.http.post<EmployeeDocument>(
      `${this.backendBaseUrl}/api/employees/${this.selectedEmployeeId}/documents`,
      formData
    ).subscribe({
      next: (res) => {
        console.log("Document uploaded:", res);

        // Clear selected file & form
        this.selectedFile = undefined;
        this.newDocument = {};

        // Add the new document directly to documents array
        if (res) {
          const newDoc = {
            ...res,
            filePath: res.filePath.startsWith('http') ? res.filePath : `${this.backendBaseUrl}${res.filePath.startsWith('/') ? '' : '/'}${res.filePath}`
          };
          this.documents.push(newDoc);
        }

        // Close modal
        this.closeModal('add_document');
      },
      error: (err) => console.error("Upload error:", err)
    });
  }

  // Delete document
  deleteDocument(doc: EmployeeDocument) {
    if (!doc.id) return;
    if (!confirm('Are you sure you want to delete this document?')) return;

    this.employeeDetailsService.deleteEmployeeDocument(doc.id).subscribe({
      next: () => this.documents = this.documents.filter(d => d.id !== doc.id),
      error: (err) => console.error('Error deleting document', err)
    });
  }

  // Edit document
  openEditDocumentModal(doc: EmployeeDocument) {
    this.editingDocument = doc;
    this.editDocumentForm.patchValue({ id: doc.id, name: doc.name, file: null });

    const modalEl = document.getElementById('edit_document');
    if (modalEl) new Modal(modalEl).show();
  }

  onEditFileSelected(event: any) {
    if (event.target.files.length > 0) this.selectedEditFile = event.target.files[0];
  }

  updateDocument() {
    if (!this.editingDocument || !this.editingDocument.id) return;

    const formData = new FormData();
    formData.append('name', this.editDocumentForm.value.name);
    formData.append('date', new Date().toISOString());
    if (this.selectedEditFile) formData.append('file', this.selectedEditFile);

    this.http.put<EmployeeDocument>(
      `${this.backendBaseUrl}/api/employees/documents/${this.editingDocument.id}`,
      formData
    ).subscribe({
      next: (res) => {
        const index = this.documents.findIndex(d => d.id === this.editingDocument!.id);
        if (index !== -1) {
          this.documents[index] = {
            ...this.documents[index],
            ...res,
            filePath: res.filePath?.startsWith('http') ? res.filePath : `${this.backendBaseUrl}/${res.filePath}`
          };
        }

        // Close modal
        const modalEl = document.getElementById('edit_document');
        if (modalEl) Modal.getInstance(modalEl)?.hide();

        this.selectedEditFile = undefined;
        this.editingDocument = undefined;
      },
      error: (err) => console.error('Error updating document:', err)
    });
  }

  closeModal(modalId: string) {
    const modalEl = document.getElementById(modalId);
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
  }

  getEmployeeName(empId: number) {
    const emp = this.employees.find(e => e.id === empId);
    return emp ? `${emp.firstname} ${emp.lastName}` : 'Unknown';
  }
}
