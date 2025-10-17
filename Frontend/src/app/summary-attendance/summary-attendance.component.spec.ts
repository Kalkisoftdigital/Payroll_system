import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SummaryAttendanceComponent } from './summary-attendance.component';

describe('SummaryAttendanceComponent', () => {
  let component: SummaryAttendanceComponent;
  let fixture: ComponentFixture<SummaryAttendanceComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SummaryAttendanceComponent]
    });
    fixture = TestBed.createComponent(SummaryAttendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
