import { Component } from '@angular/core';
import { StreamPageComponent } from '../stream-page.component';

@Component({
  selector: 'app-minimal',
  templateUrl: '../stream-page.component.html',
  styleUrls: ['../stream-page.component.scss'],
})
export class MinimalComponent extends StreamPageComponent {
  override showNavigation = false;
}
