import {
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
} from '@angular/core';
import { StreamStatService } from '../../streamstat.service';

@Component({
  selector: 'app-channel-picker',
  templateUrl: './channel-picker.component.html',
  styleUrls: ['./channel-picker.component.scss'],
})
export class ChannelPickerComponent {
  @Input() channel = '';
  @Input() selectedQuality = '';
  @ViewChild('channelButton')
  private channelButton: ElementRef<HTMLButtonElement>;
  @ViewChild('qualityButton')
  private qualityButton: ElementRef<HTMLButtonElement>;

  openMenu: 'channels' | 'quality' | null = null;
  readonly channels$ = this.stats.onlineChannels;

  constructor(
    private stats: StreamStatService,
    private host: ElementRef<HTMLElement>,
  ) {}

  toggleMenu(menu: 'channels' | 'quality') {
    this.openMenu = this.openMenu === menu ? null : menu;
  }

  @HostListener('document:click', ['$event'])
  closeOutside(event: MouseEvent) {
    if (
      this.openMenu &&
      !this.host.nativeElement.contains(event.target as Node)
    ) {
      this.openMenu = null;
    }
  }

  @HostListener('keydown.escape', ['$event'])
  closeWithEscape(event: KeyboardEvent) {
    if (this.openMenu) {
      const button =
        this.openMenu === 'channels' ? this.channelButton : this.qualityButton;
      this.openMenu = null;
      button.nativeElement.focus();
      event.preventDefault();
    }
  }
}
