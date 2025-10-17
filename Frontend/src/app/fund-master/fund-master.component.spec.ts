import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundMasterComponent } from './fund-master.component';

describe('FundMasterComponent', () => {
  let component: FundMasterComponent;
  let fixture: ComponentFixture<FundMasterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FundMasterComponent]
    });
    fixture = TestBed.createComponent(FundMasterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
