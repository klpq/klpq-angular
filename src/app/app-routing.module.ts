import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { IndexPageComponent } from './index-page/index-page.component';
import { StreamPageComponent } from './stream-page/stream-page.component';
import { MinimalComponent } from './stream-page/minimal/minimal.component';
import { RedirectComponent } from './redirect-page/redirect-page.component';
import environment from 'src/environments/environment';

const routesWww: Routes = [
  {
    path: '',
    component: IndexPageComponent,
  },
  {
    path: 'stream',
    component: RedirectComponent,
    children: [
      {
        path: '**',
        component: RedirectComponent,
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/',
    pathMatch: 'full',
  },
];

const routesStream: Routes = [
  {
    path: '',
    component: IndexPageComponent,
  },
  {
    path: ':app/:stream/:protocol',
    component: StreamPageComponent,
  },
  {
    path: ':app/:stream',
    component: StreamPageComponent,
  },
  {
    path: ':stream',
    component: StreamPageComponent,
  },
  {
    path: '**',
    redirectTo: '/',
    pathMatch: 'full',
  },
];

const routesDefault: Routes = [
  {
    path: '',
    component: IndexPageComponent,
  },
  {
    path: 'stream/:app/:stream/:protocol',
    component: StreamPageComponent,
  },
  {
    path: 'stream/:app/:stream',
    component: StreamPageComponent,
  },
  {
    path: 'stream/:stream',
    component: StreamPageComponent,
  },
  {
    path: 'stream',
    component: StreamPageComponent,
  },
  {
    path: 'minimal/:stream',
    component: MinimalComponent,
  },
  {
    path: 'minimal',
    component: MinimalComponent,
  },
  {
    path: '**',
    redirectTo: '/',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(
      environment.CURRENT_PAGE === 'www' ? routesWww : routesStream,
      {},
    ),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
