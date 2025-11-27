import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import environment from '../../environments/environment';

@Component({
  selector: 'app-redirect-page',
  templateUrl: './redirect-page.component.html',
  styleUrls: ['./redirect-page.component.scss'],
})
export class RedirectComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {
    window.location.href = `${
      environment.STREAM_PAGE_REDIRECT_URL
    }${this.router.url.replace('/stream', '')}`;
  }
}
