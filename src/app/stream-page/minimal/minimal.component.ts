import { Component, OnInit, OnDestroy } from '@angular/core';
import { StreamPageComponent } from '../stream-page.component';

@Component({
  selector: 'app-minimal',
  templateUrl: './minimal.component.html',
  styleUrls: ['./minimal.component.scss'],
})
export class MinimalComponent extends StreamPageComponent {}
