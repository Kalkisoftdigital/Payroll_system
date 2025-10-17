import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Company, CompanyService } from '../Services/company_service/company.service';

@Component({
  selector: 'app-company',
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.scss']
})
export class CompanyComponent implements OnInit {

  companies: Company[] = [];
  loading: boolean = false;
  errorMsg: string = '';
  selectedCompanyId: number | null = null;
  showCompanyForm: boolean = false;
  submitting: boolean = false;
  logoPreview: string | ArrayBuffer | null = null;

  companyForm: FormGroup;

  // Permission variable
  canCompanyAction: boolean = true;

  constructor(private companyService: CompanyService, private fb: FormBuilder) {
    this.companyForm = this.fb.group({
      name: ['', Validators.required],
      logo: [null],
      address: ['', Validators.required],
      email: [''],
      phone: [''],
      website: ['']
    });
  }

  ngOnInit(): void {
    this.fetchCompanies();
  }

  // Fetch companies from backend
  fetchCompanies(): void {
    this.loading = true;
    this.companyService.getCompany().subscribe({
      next: (res) => {
        this.companies = Array.isArray(res) ? res : [res];
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = 'Failed to load companies';
        console.error(err);
        this.loading = false;
      }
    });
  }

  // Open modal for adding new company
  openCompanyModal(): void {
    this.selectedCompanyId = null;
    this.companyForm.reset();
    this.logoPreview = null;
    this.showCompanyForm = true;
  }

  // Open modal for editing company
  editCompany(company: Company): void {
    this.selectedCompanyId = company.id || null;
    this.companyForm.patchValue({
      name: company.name,
      address: company.address,
      email: company.email,
      phone: company.phone,
      website: company.website
    });
    this.logoPreview = typeof company.logo === 'string' ? company.logo : null;
    this.showCompanyForm = true;
  }

  // Toggle modal visibility
  toggleCompanyForm(): void {
    this.showCompanyForm = !this.showCompanyForm;
    this.logoPreview = null;
    this.companyForm.reset();
  }

  // File upload
  onLogoChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.companyForm.patchValue({ logo: file });
      const reader = new FileReader();
      reader.onload = e => this.logoPreview = reader.result;
      reader.readAsDataURL(file);
    }
  }

  submitCompanyForm(): void {
    if (this.companyForm.invalid) return;

    this.submitting = true;

    const formData = new FormData();
    Object.entries(this.companyForm.value).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value as string | Blob);
      }
    });

    if (this.selectedCompanyId) {
      formData.append('id', this.selectedCompanyId.toString());
    }

    this.companyService.saveCompany(formData).subscribe({
      next: (res) => {
        this.fetchCompanies();
        this.toggleCompanyForm();
        this.submitting = false;
      },
      error: (err: any) => {
        console.error(err);
        this.submitting = false;
      }
    });
  }

  // Delete company
  confirmDelete(id: number): void {
    this.selectedCompanyId = id;
  }

  deleteCompany(): void {
    if (this.selectedCompanyId != null) {
      this.companyService.deleteCompany(this.selectedCompanyId).subscribe({
        next: () => {
          this.fetchCompanies();
          this.selectedCompanyId = null;
          const btn = document.getElementById('closeDeleteModalBtn') as HTMLButtonElement;
          btn?.click();
        },
        error: (err) => console.error(err)
      });
    }
  }

  // Convenience getter for form controls
  get f() {
    return this.companyForm.controls;
  }
}
