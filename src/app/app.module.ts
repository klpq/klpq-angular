import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { IndexPageComponent } from './index-page/index-page.component';
import { StreamPageComponent } from './stream-page/stream-page.component';
import { StreamstatService } from './streamstat.service';
import { ChannelPickerComponent } from './components/channel-picker/channel-picker.component';
import { MinimalComponent } from './stream-page/minimal/minimal.component';
import { RedirectComponent } from './redirect-page/redirect-page.component';
@NgModule({
  declarations: [
    AppComponent,
    IndexPageComponent,
    StreamPageComponent,
    ChannelPickerComponent,
    MinimalComponent,
    RedirectComponent,
  ],
  providers: [StreamstatService],
  imports: [BrowserModule, HttpClientModule, AppRoutingModule],
  bootstrap: [AppComponent],
})
export class AppModule {}
