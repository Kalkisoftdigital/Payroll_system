import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermissionChartComponent } from './permission-chart.component';

describe('PermissionChartComponent', () => {
  let component: PermissionChartComponent;
  let fixture: ComponentFixture<PermissionChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PermissionChartComponent]
    });
    fixture = TestBed.createComponent(PermissionChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
