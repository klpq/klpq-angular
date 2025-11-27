import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Route, Router } from '@angular/router';
import { EngineService } from './engine.service';

@Component({
  selector: 'app-index-page',
  templateUrl: './index-page.component.html',
  styleUrls: ['./index-page.component.scss'],
})
export class IndexPageComponent implements OnInit {
  composer = null;
  renderer = null;
  @ViewChild('rendererCanvas', { static: true })
  public rendererCanvas: ElementRef<HTMLCanvasElement>;

  public constructor(private engServ: EngineService, private router: Router) {}

  public ngOnInit(): void {
    this.engServ.createScene(this.rendererCanvas);
    this.engServ.animate();
  }

  public playSound() {
    this.engServ.playAudio();
  }
}
