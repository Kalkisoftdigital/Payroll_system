import { TestBed } from '@angular/core/testing';

import { LineManagerService } from './line-manager.service';

describe('LineManagerService', () => {
  let service: LineManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LineManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
