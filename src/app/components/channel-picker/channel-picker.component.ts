import {
  Component,
  ElementRef,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { StreamstatService } from '../../streamstat.service';

@Component({
  selector: 'app-channel-picker',
  templateUrl: './channel-picker.component.html',
  styleUrls: ['./channel-picker.component.scss'],
})
export class ChannelPickerComponent implements OnInit {
  online: string[];
  offline: string[];

  qualityLive: string[];
  qualityOffline: string[];

  isLoading = true;

  @ViewChild('toggleButton') toggleButton: ElementRef;
  @ViewChild('toggleButtonQuality') toggleButtonQuality: ElementRef;

  @ViewChild('menu') menu: ElementRef;
  @ViewChild('menuQuality') menuQuality: ElementRef;

  isMenuOpen = false;
  isMenuOpenQuality = false;

  constructor(private stats: StreamstatService, private renderer: Renderer2) {
    this.renderer.listen('window', 'click', (e: Event) => {
      /**
       * Only run when toggleButton is not clicked
       * If we don't check this, all clicks (even on the toggle button) gets into this
       * section which in the result we might never see the menu open!
       * And the menu itself is checked here, and it's where we check just outside of
       * the menu and button the condition above must close the menu
       */
      if (
        !this.toggleButton.nativeElement.contains(e.target) &&
        !this.menu.nativeElement.contains(e.target)
      ) {
        this.isMenuOpen = false;
      }
    });

    this.renderer.listen('window', 'click', (e: Event) => {
      /**
       * Only run when toggleButton is not clicked
       * If we don't check this, all clicks (even on the toggle button) gets into this
       * section which in the result we might never see the menu open!
       * And the menu itself is checked here, and it's where we check just outside of
       * the menu and button the condition above must close the menu
       */
      if (
        !this.toggleButtonQuality.nativeElement.contains(e.target) &&
        !this.menuQuality.nativeElement.contains(e.target)
      ) {
        this.isMenuOpenQuality = false;
      }
    });
  }

  ngOnInit() {
    this.stats.onlineChannels.subscribe((channels) => {
      this.online = channels.online;
      this.offline = channels.offline;

      this.qualityLive = channels.qualityLive;
      this.qualityOffline = channels.qualityOffline;

      this.isLoading = false;
    });
  }

  ngOnDestroy() {
    this.isMenuOpen = false;
    this.isMenuOpenQuality = false;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleMenuQuality() {
    this.isMenuOpenQuality = !this.isMenuOpenQuality;
  }
}
