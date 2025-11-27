import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import * as THREE from 'three';
import { ElementRef, Injectable, NgZone, OnDestroy } from '@angular/core';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const videos = [
  { id: 1, position: { x: 3.5, y: -1, z: 0 }, rotation: 5.7, size: [2, 2] },
  { id: 2, position: { x: 4, y: 2, z: 0 }, rotation: 5.5, size: [3, 2] },
  { id: 7, position: { x: 0, y: 1.5, z: 2 }, rotation: 0, size: [3, 2] },
  { id: 8, position: { x: 4, y: 5, z: -2 }, rotation: 5.4, size: [3, 2] },
  { id: 4, position: { x: 8, y: 1, z: -2 }, rotation: 5.2, size: [3, 2] },

  { id: 3, position: { x: -4, y: 4, z: -2 }, rotation: -5.4, size: [3, 2] },
  { id: 5, position: { x: -4, y: 0, z: -2 }, rotation: -5.8, size: [3, 2] },
  { id: 6, position: { x: -5, y: 2, z: 0 }, rotation: -5.2, size: [3, 2] },
  { id: 9, position: { x: -6, y: -1, z: -1 }, rotation: -5.8, size: [3, 2] },
  {
    id: 10,
    position: { x: 0, y: 0, z: 2 },
    rotation: 0,
    color: 'white',
    size: [3, 2],
  },
];

@Injectable({ providedIn: 'root' })
export class EngineService implements OnDestroy {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  public sound: THREE.PositionalAudio;
  private composer: EffectComposer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private light: THREE.AmbientLight;
  public isStarted = false;
  public hasAudioLoaded = false;

  private frameId: number = null;

  public constructor(private ngZone: NgZone) {}

  public ngOnDestroy(): void {
    if (this.frameId != null) {
      cancelAnimationFrame(this.frameId);
    }
    if (this.renderer != null) {
      this.renderer.dispose();
      this.renderer = null;
      this.canvas = null;
    }
  }

  public async playAudio() {
    if (this.isStarted || !this.hasAudioLoaded) {
      return;
    }
    console.log(this.sound);
    this.sound.play();
    this.isStarted = true;
  }

  public async createScene(
    canvas: ElementRef<HTMLCanvasElement>,
  ): Promise<void> {
    // The first step is to get the reference of the canvas element from our HTML document
    this.canvas = canvas.nativeElement;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true, // transparent background
      antialias: true, // smooth edges
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // create the scene
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.z = 5;
    this.scene.add(this.camera);

    const listener = new THREE.AudioListener();
    this.camera.add(listener);
    this.sound = new THREE.PositionalAudio(listener);

    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('/assets/images/index/audio.mp3', (buffer) => {
      this.sound.setBuffer(buffer);
      this.sound.setRefDistance(20);
      this.sound.setLoop(true);
      this.hasAudioLoaded = true;
    });

    this.composer = new EffectComposer(this.renderer);
    const glitchPass = new GlitchPass();
    glitchPass.curF = 0.1;
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(glitchPass);

    const boarGeo = new THREE.PlaneGeometry(3, 2);
    const boarTexture = await new THREE.TextureLoader().loadAsync(
      '/assets/images/index/boar.png',
    );

    const boarMat = new THREE.MeshStandardMaterial({
      map: boarTexture,
      opacity: 0.5,
      transparent: true,
      color: 'white',
      emissive: 'gray',
      emissiveMap: boarTexture,
    });
    const boarMesh = new THREE.Mesh(boarGeo, boarMat);

    boarMesh.scale.x = 0.2;
    boarMesh.scale.y = 0.3;

    boarMesh.position.z = 3;
    boarMesh.position.y = -1;

    this.scene.add(boarMesh);

    boarMesh.add(this.sound);

    // soft white light
    this.light = new THREE.AmbientLight('black');
    this.light.position.z = 10;

    const pointLight = new THREE.PointLight('red');
    pointLight.intensity = 4;

    pointLight.rotation.x = 0;
    pointLight.rotation.y = 2;
    pointLight.rotation.z = 3;

    this.scene.add(pointLight);

    this.scene.background = new THREE.Color('black');

    this.scene.fog = new THREE.FogExp2('black', 0.1);

    this.scene.add(this.light);

    const floorGeom = new THREE.PlaneGeometry(100, 100, 1);
    const floorMat = new THREE.MeshStandardMaterial({ color: 'red' });
    const floorPlane = new THREE.Mesh(floorGeom, floorMat);

    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.rotation.y = 0;
    floorPlane.rotation.z = 0;

    floorPlane.position.x = -2;
    floorPlane.position.y = -2;
    floorPlane.position.z = 0;

    this.scene.add(floorPlane);
    videos.forEach((video) => {
      this.createVideoTexturePlane(video);
    });
  }

  public createVideoTexturePlane({
    id,
    position,
    size = [5, 4],
    color = 'red',
    rotation = 0,
  }: {
    id: number;
    size?: number[];
    position?: { x; y; z };
    color?: string;
    rotation?: number;
  }) {
    const video = document.getElementById(`video${id}`) as HTMLMediaElement;
    video.play();

    const planeGeometry = new THREE.PlaneGeometry(...size);

    const videoTexture = new THREE.VideoTexture(video as HTMLVideoElement);

    const videoMaterial = new THREE.MeshStandardMaterial({
      map: videoTexture,
      emissiveMap: videoTexture,
      emissive: color,
      side: THREE.FrontSide,
      toneMapped: false,
    });

    const plane = new THREE.Mesh(planeGeometry, videoMaterial);

    if (position.x || position.y || position.z) {
      plane.position.x = position.x;
      plane.position.y = position.y;
      plane.position.z = position.z;
    }

    if (rotation) {
      plane.rotation.y = rotation;
    }

    this.scene.add(plane);
  }

  public animate(): void {
    // We have to run this outside angular zones,
    // because it could trigger heavy changeDetection cycles.
    this.ngZone.runOutsideAngular(() => {
      if (document.readyState !== 'loading') {
        this.render();
      } else {
        window.addEventListener('DOMContentLoaded', () => {
          this.render();
        });
      }

      window.addEventListener('resize', () => {
        this.resize();
      });
    });
  }

  public render(): void {
    this.frameId = requestAnimationFrame(() => {
      this.render();
    });

    this.composer.render();
  }

  public resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }
}
