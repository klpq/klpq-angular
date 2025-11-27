import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MinimalComponent } from './minimal.component';

describe('MinimalComponent', () => {
  let component: MinimalComponent;
  let fixture: ComponentFixture<MinimalComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [MinimalComponent],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(MinimalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
