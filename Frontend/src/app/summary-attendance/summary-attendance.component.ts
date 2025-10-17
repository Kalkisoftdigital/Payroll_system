import { Component, OnInit } from '@angular/core';
import { AttendanceService, Attendance } from '../Services/Attendance-services/attendance.service';

@Component({
  selector: 'app-attendance-summary',
  templateUrl: './summary-attendance.component.html'
})
export class SummaryAttendanceComponent implements OnInit {

  attendance: Attendance[] = [];
  summaryData: any[] = [];

  constructor(private attendanceService: AttendanceService) { }

  ngOnInit() {
    this.loadAllAttendance();
  }

  loadAllAttendance() {
    this.attendanceService.getAttendance().subscribe(data => {
      this.attendance = data;
      this.computeSummary();
    });
  }

  computeSummary() {
    const map = new Map<string, any>();

    this.attendance.forEach(att => {
      const key = att.empName;

      if (!map.has(key)) {
        map.set(key, {
          empName: att.empName,
          totalDays: 0,
          absent: 0,
          half: 0,
          paid: 0,
          lop: 0
        });
      }

      const emp = map.get(key);
      emp.totalDays += 1;

      if (!att.checkIn || att.checkIn === '') {
        emp.absent += 1;
        emp.lop += 1;
      } else {
        const hour = parseInt(att.checkIn.split(':')[0], 10);
        if (!isNaN(hour) && hour >= 12) {
          emp.half += 1;
          emp.paid += 0.5;
          emp.lop += 0.5;
        } else {
          emp.paid += 1;
        }
      }
    });

    this.summaryData = Array.from(map.values());
  }

  // Helper function to display fractions
  displayFraction(value: number): string {
    const whole = Math.floor(value);
    const hasHalf = value % 1 !== 0;

    if (whole === 0 && hasHalf) return '1/2'; // special case for 0.5
    if (!hasHalf) return whole.toString();

    return whole + ' (1/2)';
  }

}