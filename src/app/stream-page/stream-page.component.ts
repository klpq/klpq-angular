import { Component, OnInit } from "@angular/core";
import flv from "flv.js";
import { html5 } from "../utils/channels";
import { StreamstatService } from "../streamstat.service";
@Component({
  selector: "app-stream-page",
  templateUrl: "./stream-page.component.html",
  styleUrls: ["./stream-page.component.scss"]
})
export class StreamPageComponent implements OnInit {
  stats = {
    main: {},
    kino: {},
    dev: {}
  };

  subscription = null;

  constructor(private stream: StreamstatService) {
    this.stats = stream.stats;
    this.subscription = stream.statsSubject.subscribe(stats => {
      this.stats = stats;
    });
  }

  ngOnInit() {
    if (flv.isSupported()) {
      const videoElement = <HTMLMediaElement>document.getElementById("player");
      const flvPlayer = flv.createPlayer(
        {
          type: "flv",
          url: html5.main.link,
          cors: true,
          isLive: true
        },
        {
          isLive: true,
          enableWorker: false,
          enableStashBuffer: false,
          fixAudioTimestampGap: false
        }
      );
      flvPlayer.attachMediaElement(videoElement);
      flvPlayer.load();
      flvPlayer.play();
    }
  }
}