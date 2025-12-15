import { TestBed } from '@angular/core/testing';

import { StreamStatService } from './streamstat.service';

describe('StreamStatService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: StreamStatService = TestBed.get(StreamStatService);
    expect(service).toBeTruthy();
  });
});
