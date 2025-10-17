import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Fund {
  id?: number;
  name: string;
  percentage: number;
  fixed_amount?: number;
  type: 'Percentage' | 'Fixed';  // Calculation type
  status: string;
  isDeduction?: boolean;         // 👈 Fund nature (Allowance/Deduction)
}

@Component({
  selector: 'app-fund-master',
  templateUrl: './fund-master.component.html',
  styleUrls: ['./fund-master.component.scss']
})
export class FundMasterComponent implements OnInit {
  funds: Fund[] = [];
  fundForm!: FormGroup;
  isEditMode: boolean = false;
  selectedFundId: number | null = null;

  private apiUrl = 'http://localhost:3000/api/funds';

  constructor(private fb: FormBuilder, private http: HttpClient) { }

  ngOnInit(): void {
    this.loadFunds();

    this.fundForm = this.fb.group({
      id: [null],
      name: ['', Validators.required],
      percentage: [0, Validators.required],
      fixed_amount: [0],
      type: ['Percentage', Validators.required],  // 👈 default
      isDeduction: [false, Validators.required],  // 👈 Allowance by default
      status: ['Active', Validators.required]
    });
  }

  // Load all funds
// Load all funds
loadFunds() {
  console.log('Loading funds...');
  this.http.get<Fund[]>(this.apiUrl).subscribe({
    next: (data: any[]) => {
      console.log('Funds loaded:', data);
      this.funds = data.map(f => ({
        ...f,
        isDeduction: f.is_deduction === 1  // 👈 number to boolean conversion
      }));
    },
    error: (err) => console.error('Error loading funds:', err)
  });
}

  // Open Add Fund Modal
  openAddModal() {
    console.log('Opening Add Fund modal...');
    this.isEditMode = false;
    this.selectedFundId = null;
    this.fundForm.reset({
      status: 'Active',
      percentage: 0,
      type: 'Percentage',
      isDeduction: false,   // 👈 Default: Allowance
      fixed_amount: 0
    });
    const modal = new (window as any).bootstrap.Modal(document.getElementById('addFundModal'));
    modal.show();
  }

openEditModal(fund: Fund) {
  console.log('Opening Edit Fund modal for:', fund);
  this.isEditMode = true;
  this.selectedFundId = fund.id || null;

  this.fundForm.patchValue({
    ...fund,
    type: fund.type || 'Percentage',   // ✅ default if empty
    isDeduction: fund.isDeduction ?? false
  });

  console.log('Form after patchValue:', this.fundForm.value);
  const modal = new (window as any).bootstrap.Modal(document.getElementById('addFundModal'));
  modal.show();
}

  // Add / Update Fund
onSubmit() {
  if (this.fundForm.invalid) {
    console.warn('Form is invalid:', this.fundForm.value);
    return;
  }

  // Convert isDeduction boolean to 0/1 for backend
  const fundData = {
    ...this.fundForm.value,
    isDeduction: this.fundForm.value.isDeduction ? 1 : 0
  };

  console.log('Submitting fund data:', fundData);

  if (this.isEditMode && this.selectedFundId) {
    this.http.put(`${this.apiUrl}/${this.selectedFundId}`, fundData).subscribe({
      next: (res) => {
        console.log('Update response:', res);
        this.loadFunds();
        this.closeModal('addFundModal');
        alert('Fund updated successfully ✏️');
      },
      error: (err) => console.error('Error updating fund:', err)
    });
  } else {
    this.http.post(this.apiUrl, fundData).subscribe({
      next: (res) => {
        console.log('Add response:', res);
        this.loadFunds();
        this.closeModal('addFundModal');
        alert('Fund added successfully ✅');
      },
      error: (err) => console.error('Error adding fund:', err)
    });
  }
}

  // Close modal by ID
  closeModal(modalId: string) {
    console.log('Closing modal:', modalId);
    const modalEl = document.getElementById(modalId);
    const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
    modal?.hide();
  }

  // Confirm Delete
  confirmDelete(id: number) {
    console.log('Confirm delete fund ID:', id);
    this.selectedFundId = id;
    const modal = new (window as any).bootstrap.Modal(document.getElementById('delete_modal'));
    modal.show();
  }

  // Delete Fund
  deleteFund() {
    if (!this.selectedFundId) {
      console.warn('No fund selected for deletion!');
      return;
    }
    console.log('Deleting fund ID:', this.selectedFundId);
    this.http.delete(`${this.apiUrl}/${this.selectedFundId}`).subscribe({
      next: () => {
        alert('Fund deleted successfully!');
        this.loadFunds();  // refresh table
        this.closeModal('delete_modal');
      },
      error: (err) => {
        console.error('Delete error:', err);
        alert('Error deleting fund! Check console for details.');
      }
    });
  }

  // Optional: Handle type change if needed
  onTypeChange() {
    console.log('Type changed to:', this.fundForm.value.type);
  }
}
