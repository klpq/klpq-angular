import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ChannelPickerComponent } from './channel-picker.component';

describe('ChannelPickerComponent', () => {
  let component: ChannelPickerComponent;
  let fixture: ComponentFixture<ChannelPickerComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [ChannelPickerComponent],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(ChannelPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
