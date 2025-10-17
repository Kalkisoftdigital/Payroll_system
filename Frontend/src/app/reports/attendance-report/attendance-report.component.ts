import { Component, OnInit } from '@angular/core';
import { AttendanceService } from '../../Services/Attendance-services/attendance.service';

interface AttendanceRecord {
  id?: number;
  empName: string;
  department?: string;
  date: string;
  shift?: string;
  lateMark?: boolean;
  checkIn?: string;
  checkOut?: string;
}

@Component({
  selector: 'app-attendance-report',
  templateUrl: './attendance-report.component.html',
  styleUrls: ['./attendance-report.component.scss']
})
export class AttendanceReportComponent implements OnInit {
  backendUrl = 'http://localhost:3000'; 

  attendance: AttendanceRecord[] = [];
  filteredRecords: AttendanceRecord[] = [];

filters = { from: '', to: '', name: '', shift: '', lateMark: '' };

  activeReport: string = 'attendance';
  reports = [
    { key: 'team', label: 'Team Report', link: '/reports/team-report' },
    { key: 'attendance', label: 'Attendance Report', link: '/reports/attendance-report' },
    { key: 'leave', label: 'Leave Report', link: '/reports/leave-report' },
    { key: 'payroll', label: 'Payroll Report', link: '/reports/payroll-report' },
    { key: 'contact', label: 'Contact Report', link: '/reports/contact-report' },
  ];

  constructor(private employeesService: AttendanceService) {}

  ngOnInit(): void {
    this.loadAttendance();
  }

  loadAttendance(): void {
    this.employeesService.getAttendance().subscribe(
      (data: AttendanceRecord[]) => {
        this.attendance = data;
        this.filteredRecords = [...this.attendance];
      },
      (err) => console.error('Error loading attendance:', err)
    );
  }

  applyFilters(): void {
    let filtered = [...this.attendance];

    if (this.filters.from) {
      const fromDate = new Date(this.filters.from);
      filtered = filtered.filter(rec => new Date(rec.date) >= fromDate);
    }

    if (this.filters.to) {
      const toDate = new Date(this.filters.to);
      filtered = filtered.filter(rec => new Date(rec.date) <= toDate);
    }

    if (this.filters.name.trim()) {
      const searchLower = this.filters.name.toLowerCase();
      filtered = filtered.filter(rec =>
        rec.empName.toLowerCase().includes(searchLower) ||
        rec.department?.toLowerCase().includes(searchLower)
      );
    }

    this.filteredRecords = filtered;
  }

  trackById(index: number, rec: AttendanceRecord): number {
    return rec.id || index;
  }

  exportToCSV(): void {
    if (!this.filteredRecords.length) return;

const headers = ['Employee', 'Department', 'Date', 'Shift', 'Late Mark', 'Check-in', 'Check-out'];
const rows = this.filteredRecords.map(rec => [
  rec.empName,
  rec.department || 'N/A',
  rec.date,
  rec.shift || 'N/A',
  rec.lateMark ? 'Yes' : 'No',
  rec.checkIn || 'N/A',
  rec.checkOut || 'N/A'
]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers, ...rows].map(e => e.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'attendance-report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
