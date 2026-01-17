
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { ThemeId, AnimationStyle } from '../types';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
import FloatingLines from './FloatingLines';
import Aurora from './Aurora';
import GridScan from './GridScan';

// --- THREE.JS IMPORTS FOR NEW BALLPIT ---
const {
  Clock, PerspectiveCamera, Scene, WebGLRenderer, SRGBColorSpace, MathUtils,
  Vector2, Vector3, MeshPhysicalMaterial, ShaderChunk, Color: ThreeColor, Object3D,
  InstancedMesh, PMREMGenerator, SphereGeometry, AmbientLight, PointLight,
  ACESFilmicToneMapping, Raycaster, Plane
} = THREE;

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_XLINK = "http://www.w3.org/1999/xlink";

const THEME_DATA: Record<ThemeId | 'mix', { bg: string, colors: string[], blend: string }> = {
  default: { bg: '#f55702', colors: [], blend: 'normal' },
  nordic: { bg: '#1e90ff', colors: [], blend: 'normal' },
  minimal: { bg: '#05050a', colors: [], blend: 'normal' },
  chroma: { bg: '#0a0a12', colors: [], blend: 'normal' }, 
  waves: { bg: '#00adef', colors: [], blend: 'normal' },
  fresh: { bg: '#100c18', colors: [], blend: 'normal' }, 
  retro: { bg: '#050505', colors: [], blend: 'normal' },
  holo: { bg: '#000000', colors: [], blend: 'normal' },
  book: { bg: '#000000', colors: [], blend: 'normal' }, 
  liquid: { bg: '#000000', colors: ['#4338ca', '#3b82f6', '#ec4899', '#8b5cf6'], blend: 'hard-light' },
  mix: { bg: '#000', colors: [], blend: 'screen' },
  weather: { bg: '#000', colors: [], blend: 'screen' }
};

// --- SPLINE BACKGROUND WITH LOADER ---
const SplineBackground: React.FC<{ url: string }> = ({ url }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="w-full h-full absolute inset-0 z-[-10] bg-[#050505]">
        <iframe 
          src={url}
          frameBorder="0" 
          width="100%" 
          height="100%" 
          id="spline-frame"
          title="Spline 3D"
          className={`w-full h-full border-none transition-opacity duration-1000 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
        />
        <div style={{
            position: 'absolute', 
            bottom: '10px', 
            right: '15px', 
            opacity: 0.5, 
            fontSize: '10px', 
            fontFamily: 'monospace',
            color: 'rgba(255,255,255,0.5)',
            pointerEvents: 'none',
            textAlign: 'right',
            zIndex: 20
        }}>
            Built by <span style={{fontWeight: 'bold'}}>Flávio Aquila</span>
        </div>
    </div>
  );
};

// --- UNICORN STUDIO BACKGROUND ---
const UnicornStudioBackground: React.FC<{ projectId: string }> = ({ projectId }) => {
  useEffect(() => {
    const scriptId = 'unicorn-studio-script';
    
    const initUnicorn = () => {
        // @ts-ignore
        if (window.UnicornStudio) {
            // @ts-ignore
            window.UnicornStudio.init();
        }
    };

    if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js";
        script.onload = initUnicorn;
        document.head.appendChild(script);
    } else {
        setTimeout(initUnicorn, 100);
    }
  }, [projectId]);

  return (
    <div className="w-full h-full relative bg-black">
       <div data-us-project={projectId} className="absolute inset-0 w-full h-full z-0"></div>
       <div style={{
            position: 'absolute', 
            bottom: '10px', 
            right: '15px', 
            opacity: 0.5, 
            fontSize: '10px', 
            fontFamily: 'monospace',
            color: 'rgba(255,255,255,0.5)',
            pointerEvents: 'none',
            textAlign: 'right',
            zIndex: 20
        }}>
            Built by <span style={{fontWeight: 'bold'}}>Flávio Aquila</span>
        </div>
    </div>
  );
};

// --- UNIVERSE THEME (OGL WEBGL SHADER) ---
const UniverseTheme: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const ctnDom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctn = ctnDom.current;
    if (!ctn) return;

    const renderer = new Renderer({
      alpha: true,
      dpr: Math.min(window.devicePixelRatio, 2)
    });
    const gl = renderer.gl;
    // Always black background for space theme
    gl.clearColor(0, 0, 0, 1);

    const geometry = new Triangle(gl);

    const program = new Program(gl, {
      vertex: `
        attribute vec2 uv;
        attribute vec2 position;
        void main() {
          gl_Position = vec4(position, 0, 1);
        }
      `,
      fragment: `
        precision highp float;

        uniform vec2 iResolution;
        uniform float iTime;

        vec3 hash( vec3 p ) {
          p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
                    dot(p,vec3(269.5,183.3,246.1)),
                    dot(p,vec3(113.5,271.9,124.6)));
          return -1.0 + 2.0*fract(sin(p)*43758.5453123);
        }

        float noise( in vec3 p ) {
          vec3 i = floor( p );
          vec3 f = fract( p );
          vec3 u = f*f*(3.0-2.0*f);
          return mix( mix( mix( dot( hash( i + vec3(0.0,0.0,0.0) ), f - vec3(0.0,0.0,0.0) ),
                              dot( hash( i + vec3(1.0,0.0,0.0) ), f - vec3(1.0,0.0,0.0) ), u.x),
                         mix( dot( hash( i + vec3(0.0,1.0,0.0) ), f - vec3(0.0,1.0,0.0) ),
                              dot( hash( i + vec3(1.0,1.0,0.0) ), f - vec3(1.0,1.0,0.0) ), u.x), u.y),
                    mix( mix( dot( hash( i + vec3(0.0,0.0,1.0) ), f - vec3(0.0,0.0,1.0) ),
                              dot( hash( i + vec3(1.0,0.0,1.0) ), f - vec3(1.0,0.0,1.0) ), u.x),
                         mix( dot( hash( i + vec3(0.0,1.0,1.0) ), f - vec3(0.0,1.0,1.0) ),
                              dot( hash( i + vec3(1.0,1.0,1.0) ), f - vec3(1.0,1.0,1.0) ), u.x), u.y), u.z );
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / iResolution.xy;
          vec3 stars_direction = normalize(vec3(uv * 2.0 - 1.0, 1.0));
          float stars_threshold = 8.0;
          float stars_exposure = 200.0;
          float stars = pow(clamp(noise(stars_direction * 200.0), 0.0, 1.0), stars_threshold) * stars_exposure;
          stars *= mix(0.4, 1.4, noise(stars_direction * 100.0 + vec3(iTime)));
          gl_FragColor = vec4(vec3(stars), 1.0);
        }
      `,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: [gl.canvas.width, gl.canvas.height] },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      if (!ctn) return;
      const width = ctn.offsetWidth;
      const height = ctn.offsetHeight;
      renderer.setSize(width, height);
      program.uniforms.iResolution.value = [gl.canvas.width, gl.canvas.height];
    }
    window.addEventListener('resize', resize);
    resize();

    ctn.appendChild(gl.canvas);

    let animationId: number;
    const update = (t: number) => {
      animationId = requestAnimationFrame(update);
      program.uniforms.iTime.value = t * 0.002; // Increased speed from 0.001
      renderer.render({ scene: mesh });
    };
    animationId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      if (ctn && gl.canvas.parentNode === ctn) {
        ctn.removeChild(gl.canvas);
      }
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    };
  }, []);

  return (
    <div className="w-full h-full relative" style={{ background: '#000' }}>
      <div ref={ctnDom} className="w-full h-full" />
      <div style={{
            position: 'absolute', 
            bottom: '10px', 
            right: '15px', 
            opacity: 0.5, 
            fontSize: '10px', 
            fontFamily: 'monospace',
            color: 'rgba(255,255,255,0.5)',
            pointerEvents: 'none',
            textAlign: 'right',
            zIndex: 20
        }}>
            Built by <span style={{fontWeight: 'bold'}}>Flávio Aquila</span>
      </div>
    </div>
  );
};

// --- NEW BALLPIT THEME START ---

class BallpitScene {
  config: any;
  canvas: HTMLElement | null = null;
  camera: THREE.PerspectiveCamera | any;
  cameraMinAspect: any;
  cameraMaxAspect: any;
  cameraFov: any;
  maxPixelRatio: any;
  minPixelRatio: any;
  scene: THREE.Scene | any;
  renderer: THREE.WebGLRenderer | any;
  postprocessing: any;
  size = { width: 0, height: 0, wWidth: 0, wHeight: 0, ratio: 0, pixelRatio: 0 };
  render = this.internalRender;
  onBeforeRender = (e: any) => {};
  onAfterRender = (e: any) => {};
  onAfterResize = (e: any) => {};
  isIntersecting = false;
  isAnimating = false;
  isDisposed = false;
  observer: IntersectionObserver | null = null;
  resizeObserver: ResizeObserver | null = null;
  resizeTimeout: any;
  clock = new Clock();
  time = { elapsed: 0, delta: 0 };
  rafId: number | null = null;

  constructor(config: any) {
    this.config = { ...config };
    this.initCamera();
    this.initScene();
    this.initRenderer();
    this.handleResize();
    this.initObservers();
  }

  initCamera() {
    this.camera = new PerspectiveCamera();
    this.cameraFov = this.camera.fov;
  }

  initScene() {
    this.scene = new Scene();
  }

  initRenderer() {
    if (this.config.canvas) {
      this.canvas = this.config.canvas;
    } else if (this.config.id) {
      this.canvas = document.getElementById(this.config.id);
    } else {
      console.error('Three: Missing canvas or id parameter');
    }
    if (this.canvas) {
      this.canvas.style.display = 'block';
      const options = {
        canvas: this.canvas,
        powerPreference: 'high-performance',
        ...(this.config.rendererOptions ?? {})
      };
      this.renderer = new WebGLRenderer(options);
      this.renderer.outputColorSpace = SRGBColorSpace;
    }
  }

  initObservers() {
    if (!(this.config.size instanceof Object)) {
      window.addEventListener('resize', this.onResizeThrottled.bind(this));
      if (this.config.size === 'parent' && this.canvas && this.canvas.parentNode) {
        this.resizeObserver = new ResizeObserver(this.onResizeThrottled.bind(this));
        this.resizeObserver.observe(this.canvas.parentNode as Element);
      }
    }
    if (this.canvas) {
      this.observer = new IntersectionObserver(this.onIntersection.bind(this), {
        root: null,
        rootMargin: '0px',
        threshold: 0
      });
      this.observer.observe(this.canvas);
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));
  }

  removeObservers() {
    window.removeEventListener('resize', this.onResizeThrottled.bind(this));
    this.resizeObserver?.disconnect();
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibilityChange.bind(this));
  }

  onIntersection(entries: any) {
    this.isIntersecting = entries[0].isIntersecting;
    this.isIntersecting ? this.startAnimation() : this.stopAnimation();
  }

  onVisibilityChange() {
    if (this.isIntersecting) {
      document.hidden ? this.stopAnimation() : this.startAnimation();
    }
  }

  onResizeThrottled() {
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(this.handleResize.bind(this), 100);
  }

  handleResize() {
    let width, height;
    if (this.config.size instanceof Object) {
      width = this.config.size.width;
      height = this.config.size.height;
    } else if (this.config.size === 'parent' && this.canvas && this.canvas.parentNode) {
      width = (this.canvas.parentNode as HTMLElement).offsetWidth;
      height = (this.canvas.parentNode as HTMLElement).offsetHeight;
    } else {
      width = window.innerWidth;
      height = window.innerHeight;
    }
    this.size.width = width;
    this.size.height = height;
    this.size.ratio = width / height;
    this.updateCamera();
    this.updateRenderer();
    this.onAfterResize(this.size);
  }

  updateCamera() {
    this.camera.aspect = this.size.width / this.size.height;
    if (this.camera.isPerspectiveCamera && this.cameraFov) {
      if (this.cameraMinAspect && this.camera.aspect < this.cameraMinAspect) {
        this.adjustFov(this.cameraMinAspect);
      } else if (this.cameraMaxAspect && this.camera.aspect > this.cameraMaxAspect) {
        this.adjustFov(this.cameraMaxAspect);
      } else {
        this.camera.fov = this.cameraFov;
      }
    }
    this.camera.updateProjectionMatrix();
    this.updateWorldSize();
  }

  adjustFov(aspect: number) {
    const t = Math.tan(MathUtils.degToRad(this.cameraFov / 2)) / (this.camera.aspect / aspect);
    this.camera.fov = 2 * MathUtils.radToDeg(Math.atan(t));
  }

  updateWorldSize() {
    if (this.camera.isPerspectiveCamera) {
      const e = (this.camera.fov * Math.PI) / 180;
      this.size.wHeight = 2 * Math.tan(e / 2) * this.camera.position.length();
      this.size.wWidth = this.size.wHeight * this.camera.aspect;
    } else if (this.camera.isOrthographicCamera) {
      this.size.wHeight = this.camera.top - this.camera.bottom;
      this.size.wWidth = this.camera.right - this.camera.left;
    }
  }

  updateRenderer() {
    this.renderer.setSize(this.size.width, this.size.height);
    this.postprocessing?.setSize(this.size.width, this.size.height);
    let pixelRatio = window.devicePixelRatio;
    if (this.maxPixelRatio && pixelRatio > this.maxPixelRatio) {
      pixelRatio = this.maxPixelRatio;
    } else if (this.minPixelRatio && pixelRatio < this.minPixelRatio) {
      pixelRatio = this.minPixelRatio;
    }
    this.renderer.setPixelRatio(pixelRatio);
    this.size.pixelRatio = pixelRatio;
  }

  setPostProcessing(pp: any) {
    this.postprocessing = pp;
    this.render = pp.render.bind(pp);
  }

  startAnimation() {
    if (this.isAnimating) return;
    const animate = () => {
      this.rafId = requestAnimationFrame(animate);
      this.time.delta = this.clock.getDelta();
      this.time.elapsed += this.time.delta;
      this.onBeforeRender(this.time);
      this.render();
      this.onAfterRender(this.time);
    };
    this.isAnimating = true;
    this.clock.start();
    animate();
  }

  stopAnimation() {
    if (this.isAnimating && this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.isAnimating = false;
      this.clock.stop();
    }
  }

  internalRender() {
    this.renderer.render(this.scene, this.camera);
  }

  clear() {
    this.scene.traverse((e: any) => {
      if (e.isMesh && typeof e.material === 'object' && e.material !== null) {
        Object.keys(e.material).forEach(t => {
          const i = e.material[t];
          if (i !== null && typeof i === 'object' && typeof i.dispose === 'function') {
            i.dispose();
          }
        });
        e.material.dispose();
        e.geometry.dispose();
      }
    });
    this.scene.clear();
  }

  dispose() {
    this.removeObservers();
    this.stopAnimation();
    this.clear();
    this.postprocessing?.dispose();
    this.renderer.dispose();
    this.isDisposed = true;
  }
}

const interactionMap = new Map();
const mouseVector = new Vector2();
let isInteractionInit = false;

function Interaction(e: any) {
  const t = {
    position: new Vector2(),
    nPosition: new Vector2(),
    hover: false,
    touching: false,
    onEnter(t: any) {},
    onMove(t: any) {},
    onClick(t: any) {},
    onLeave(t: any) {},
    ...e
  };
  (function (e, t) {
    if (!interactionMap.has(e)) {
      interactionMap.set(e, t);
      if (!isInteractionInit) {
        document.body.addEventListener('pointermove', onPointerMove);
        document.body.addEventListener('pointerleave', onPointerLeave);
        document.body.addEventListener('click', onClick);

        document.body.addEventListener('touchstart', onTouchStart, { passive: false });
        document.body.addEventListener('touchmove', onTouchMove, { passive: false });
        document.body.addEventListener('touchend', onTouchEnd, { passive: false });
        document.body.addEventListener('touchcancel', onTouchEnd, { passive: false });

        isInteractionInit = true;
      }
    }
  })(e.domElement, t);
  t.dispose = () => {
    const el = e.domElement;
    interactionMap.delete(el);
    if (interactionMap.size === 0) {
      document.body.removeEventListener('pointermove', onPointerMove);
      document.body.removeEventListener('pointerleave', onPointerLeave);
      document.body.removeEventListener('click', onClick);

      document.body.removeEventListener('touchstart', onTouchStart);
      document.body.removeEventListener('touchmove', onTouchMove);
      document.body.removeEventListener('touchend', onTouchEnd);
      document.body.removeEventListener('touchcancel', onTouchEnd);

      isInteractionInit = false;
    }
  };
  return t;
}

function onPointerMove(e: any) {
  mouseVector.x = e.clientX;
  mouseVector.y = e.clientY;
  processInteractions();
}

function processInteractions() {
  for (const [elem, t] of interactionMap) {
    const i = elem.getBoundingClientRect();
    if (isInside(i)) {
      updatePosition(t, i);
      if (!t.hover) {
        t.hover = true;
        t.onEnter(t);
      }
      t.onMove(t);
    } else if (t.hover && !t.touching) {
      t.hover = false;
      t.onLeave(t);
    }
  }
}

function onClick(e: any) {
  mouseVector.x = e.clientX;
  mouseVector.y = e.clientY;
  for (const [elem, t] of interactionMap) {
    const i = elem.getBoundingClientRect();
    updatePosition(t, i);
    if (isInside(i)) t.onClick(t);
  }
}

function onPointerLeave() {
  for (const t of interactionMap.values()) {
    if (t.hover) {
      t.hover = false;
      t.onLeave(t);
    }
  }
}

function onTouchStart(e: any) {
  if (e.touches.length > 0) {
    e.preventDefault();
    mouseVector.x = e.touches[0].clientX;
    mouseVector.y = e.touches[0].clientY;

    for (const [elem, t] of interactionMap) {
      const rect = elem.getBoundingClientRect();
      if (isInside(rect)) {
        t.touching = true;
        updatePosition(t, rect);
        if (!t.hover) {
          t.hover = true;
          t.onEnter(t);
        }
        t.onMove(t);
      }
    }
  }
}

function onTouchMove(e: any) {
  if (e.touches.length > 0) {
    e.preventDefault();
    mouseVector.x = e.touches[0].clientX;
    mouseVector.y = e.touches[0].clientY;

    for (const [elem, t] of interactionMap) {
      const rect = elem.getBoundingClientRect();
      updatePosition(t, rect);

      if (isInside(rect)) {
        if (!t.hover) {
          t.hover = true;
          t.touching = true;
          t.onEnter(t);
        }
        t.onMove(t);
      } else if (t.hover && t.touching) {
        t.onMove(t);
      }
    }
  }
}

function onTouchEnd() {
  for (const [, t] of interactionMap) {
    if (t.touching) {
      t.touching = false;
      if (t.hover) {
        t.hover = false;
        t.onLeave(t);
      }
    }
  }
}

function updatePosition(e: any, t: any) {
  const { position: i, nPosition: s } = e;
  i.x = mouseVector.x - t.left;
  i.y = mouseVector.y - t.top;
  s.x = (i.x / t.width) * 2 - 1;
  s.y = (-i.y / t.height) * 2 + 1;
}
function isInside(e: any) {
  const { x: t, y: i } = mouseVector;
  const { left: s, top: n, width: o, height: r } = e;
  return t >= s && t <= s + o && i >= n && i <= n + r;
}

const { randFloat: k, randFloatSpread: E } = MathUtils;
const F = new Vector3();
const I = new Vector3();
const O = new Vector3();
const V = new Vector3();
const B = new Vector3();
const N = new Vector3();
const _ = new Vector3();
const j = new Vector3();
const H = new Vector3();
const T = new Vector3();

class PhysicsWorld {
  config: any;
  positionData: Float32Array;
  velocityData: Float32Array;
  sizeData: Float32Array;
  center: THREE.Vector3;

  constructor(e: any) {
    this.config = e;
    this.positionData = new Float32Array(3 * e.count).fill(0);
    this.velocityData = new Float32Array(3 * e.count).fill(0);
    this.sizeData = new Float32Array(e.count).fill(1);
    this.center = new Vector3();
    this.initPositions();
    this.setSizes();
  }
  initPositions() {
    const { config: e, positionData: t } = this;
    this.center.toArray(t, 0);
    for (let i = 1; i < e.count; i++) {
      const s = 3 * i;
      t[s] = E(2 * e.maxX);
      t[s + 1] = E(2 * e.maxY);
      t[s + 2] = E(2 * e.maxZ);
    }
  }
  setSizes() {
    const { config: e, sizeData: t } = this;
    t[0] = e.size0;
    for (let i = 1; i < e.count; i++) {
      t[i] = k(e.minSize, e.maxSize);
    }
  }
  update(e: any) {
    const { config: t, center: i, positionData: s, sizeData: n, velocityData: o } = this;
    let r = 0;
    if (t.controlSphere0) {
      r = 1;
      F.fromArray(s, 0);
      F.lerp(i, 0.1).toArray(s, 0);
      V.set(0, 0, 0).toArray(o, 0);
    }
    for (let idx = r; idx < t.count; idx++) {
      const base = 3 * idx;
      I.fromArray(s, base);
      B.fromArray(o, base);
      B.y -= e.delta * t.gravity * n[idx];
      B.multiplyScalar(t.friction);
      B.clampLength(0, t.maxVelocity);
      I.add(B);
      I.toArray(s, base);
      B.toArray(o, base);
    }
    for (let idx = r; idx < t.count; idx++) {
      const base = 3 * idx;
      I.fromArray(s, base);
      B.fromArray(o, base);
      const radius = n[idx];
      for (let jdx = idx + 1; jdx < t.count; jdx++) {
        const otherBase = 3 * jdx;
        O.fromArray(s, otherBase);
        N.fromArray(o, otherBase);
        const otherRadius = n[jdx];
        _.copy(O).sub(I);
        const dist = _.length();
        const sumRadius = radius + otherRadius;
        if (dist < sumRadius) {
          const overlap = sumRadius - dist;
          j.copy(_)
            .normalize()
            .multiplyScalar(0.5 * overlap);
          H.copy(j).multiplyScalar(Math.max(B.length(), 1));
          T.copy(j).multiplyScalar(Math.max(N.length(), 1));
          I.sub(j);
          B.sub(H);
          I.toArray(s, base);
          B.toArray(o, base);
          O.add(j);
          N.add(T);
          O.toArray(s, otherBase);
          N.toArray(o, otherBase);
        }
      }
      if (t.controlSphere0) {
        _.copy(F).sub(I);
        const dist = _.length();
        const sumRadius0 = radius + n[0];
        if (dist < sumRadius0) {
          const diff = sumRadius0 - dist;
          j.copy(_.normalize()).multiplyScalar(diff);
          H.copy(j).multiplyScalar(Math.max(B.length(), 2));
          I.sub(j);
          B.sub(H);
        }
      }
      if (Math.abs(I.x) + radius > t.maxX) {
        I.x = Math.sign(I.x) * (t.maxX - radius);
        B.x = -B.x * t.wallBounce;
      }
      if (t.gravity === 0) {
        if (Math.abs(I.y) + radius > t.maxY) {
          I.y = Math.sign(I.y) * (t.maxY - radius);
          B.y = -B.y * t.wallBounce;
        }
      } else if (I.y - radius < -t.maxY) {
        I.y = -t.maxY + radius;
        B.y = -B.y * t.wallBounce;
      }
      const maxBoundary = Math.max(t.maxZ, t.maxSize);
      if (Math.abs(I.z) + radius > maxBoundary) {
        I.z = Math.sign(I.z) * (t.maxZ - radius);
        B.z = -B.z * t.wallBounce;
      }
      I.toArray(s, base);
      B.toArray(o, base);
    }
  }
}

class CustomMaterial extends THREE.MeshPhysicalMaterial {
  uniforms: any;
  onBeforeCompile2?: (shader: any) => void;
  // @ts-ignore
  onBeforeCompile: (shader: any) => void;

  constructor(e: any) {
    super(e);
    this.uniforms = {
      thicknessDistortion: { value: 0.1 },
      thicknessAmbient: { value: 0 },
      thicknessAttenuation: { value: 0.1 },
      thicknessPower: { value: 2 },
      thicknessScale: { value: 10 }
    };
    // @ts-ignore
    this.defines.USE_UV = '';
    
    this.onBeforeCompile = e => {
      Object.assign(e.uniforms, this.uniforms);
      e.fragmentShader =
        '\n        uniform float thicknessPower;\n        uniform float thicknessScale;\n        uniform float thicknessDistortion;\n        uniform float thicknessAmbient;\n        uniform float thicknessAttenuation;\n      ' +
        e.fragmentShader;
      e.fragmentShader = e.fragmentShader.replace(
        'void main() {',
        '\n        void RE_Direct_Scattering(const in IncidentLight directLight, const in vec2 uv, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, inout ReflectedLight reflectedLight) {\n          vec3 scatteringHalf = normalize(directLight.direction + (geometryNormal * thicknessDistortion));\n          float scatteringDot = pow(saturate(dot(geometryViewDir, -scatteringHalf)), thicknessPower) * thicknessScale;\n          #ifdef USE_COLOR\n            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * vColor;\n          #else\n            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * diffuse;\n          #endif\n          reflectedLight.directDiffuse += scatteringIllu * thicknessAttenuation * directLight.color;\n        }\n\n        void main() {\n      '
      );
      const t = ShaderChunk.lights_fragment_begin.replaceAll(
        'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
        '\n          RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n          RE_Direct_Scattering(directLight, vUv, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, reflectedLight);\n        '
      );
      e.fragmentShader = e.fragmentShader.replace('#include <lights_fragment_begin>', t);
      if (this.onBeforeCompile2) this.onBeforeCompile2(e);
    };
  }
}

const X = {
  count: 200,
  colors: [0, 0, 0],
  ambientColor: 16777215,
  ambientIntensity: 1,
  lightIntensity: 200,
  materialParams: {
    metalness: 0.5,
    roughness: 0.5,
    clearcoat: 1,
    clearcoatRoughness: 0.15
  },
  minSize: 0.5,
  maxSize: 1,
  size0: 1,
  gravity: 0.5,
  friction: 0.9975,
  wallBounce: 0.95,
  maxVelocity: 0.15,
  maxX: 5,
  maxY: 5,
  maxZ: 2,
  controlSphere0: false,
  followCursor: true
};

const U = new Object3D();

class BallpitMesh extends THREE.InstancedMesh {
  config: any;
  physics: PhysicsWorld;
  ambientLight: any;
  light: any;

  constructor(e: any, t = {}) {
    const i = { ...X, ...t };
    const s = new RoomEnvironment();
    const n = new PMREMGenerator(e).fromScene(s).texture;
    const o = new SphereGeometry();
    const r = new CustomMaterial({ envMap: n, ...i.materialParams });
    // @ts-ignore
    r.envMapRotation.x = -Math.PI / 2;
    super(o, r, i.count);
    this.config = i;
    this.physics = new PhysicsWorld(i);
    this.setupLights();
    this.setColors(i.colors);
  }
  setupLights() {
    this.ambientLight = new AmbientLight(this.config.ambientColor, this.config.ambientIntensity);
    // @ts-ignore
    this.add(this.ambientLight);
    this.light = new PointLight(this.config.colors[0], this.config.lightIntensity);
    // @ts-ignore
    this.add(this.light);
  }
  setColors(e: any) {
    if (Array.isArray(e) && e.length > 1) {
      const t = (function (e) {
        let t: any, i: any;
        function setColors(e: any) {
          t = e;
          i = [];
          t.forEach((col: any) => {
            i.push(new ThreeColor(col));
          });
        }
        setColors(e);
        return {
          setColors,
          getColorAt: function (ratio: number, out = new ThreeColor()) {
            const scaled = Math.max(0, Math.min(1, ratio)) * (t.length - 1);
            const idx = Math.floor(scaled);
            const start = i[idx];
            if (idx >= t.length - 1) return start.clone();
            const alpha = scaled - idx;
            const end = i[idx + 1];
            out.r = start.r + alpha * (end.r - start.r);
            out.g = start.g + alpha * (end.g - start.g);
            out.b = start.b + alpha * (end.b - start.b);
            return out;
          }
        };
      })(e);
      // @ts-ignore
      for (let idx = 0; idx < this.count; idx++) {
        // @ts-ignore
        this.setColorAt(idx, t.getColorAt(idx / this.count));
        if (idx === 0) {
          // @ts-ignore
          this.light.color.copy(t.getColorAt(idx / this.count));
        }
      }
      // @ts-ignore
      if (this.instanceColor) this.instanceColor.needsUpdate = true;
    }
  }
  update(e: any) {
    this.physics.update(e);
    // @ts-ignore
    for (let idx = 0; idx < this.count; idx++) {
      U.position.fromArray(this.physics.positionData, 3 * idx);
      if (idx === 0 && this.config.followCursor === false) {
        U.scale.setScalar(0);
      } else {
        U.scale.setScalar(this.physics.sizeData[idx]);
      }
      U.updateMatrix();
      // @ts-ignore
      this.setMatrixAt(idx, U.matrix);
      if (idx === 0) this.light.position.copy(U.position);
    }
    // @ts-ignore
    this.instanceMatrix.needsUpdate = true;
  }
}

function createBallpit(e: any, t = {}) {
  const i = new BallpitScene({
    canvas: e,
    size: 'parent',
    rendererOptions: { antialias: true, alpha: true }
  });
  let s: BallpitMesh;
  i.renderer.toneMapping = ACESFilmicToneMapping;
  i.camera.position.set(0, 0, 20);
  i.camera.lookAt(0, 0, 0);
  i.cameraMaxAspect = 1.5;
  i.handleResize();
  initialize(t);
  const n = new Raycaster();
  const o = new Plane(new Vector3(0, 0, 1), 0);
  const r = new Vector3();
  let c = false;

  e.style.touchAction = 'none';
  e.style.userSelect = 'none';
  e.style.webkitUserSelect = 'none';

  const h = Interaction({
    domElement: e,
    onMove() {
      n.setFromCamera(h.nPosition, i.camera);
      i.camera.getWorldDirection(o.normal);
      n.ray.intersectPlane(o, r);
      s.physics.center.copy(r);
      s.config.controlSphere0 = true;
    },
    onLeave() {
      s.config.controlSphere0 = false;
    }
  });
  function initialize(e: any) {
    if (s) {
      i.clear();
      i.scene.remove(s);
    }
    s = new BallpitMesh(i.renderer, e);
    i.scene.add(s);
  }
  i.onBeforeRender = (e: any) => {
    if (!c) s.update(e);
  };
  i.onAfterResize = (e: any) => {
    s.config.maxX = e.wWidth / 2;
    s.config.maxY = e.wHeight / 2;
  };
  return {
    three: i,
    get spheres() {
      return s;
    },
    setCount(e: any) {
      initialize({ ...s.config, count: e });
    },
    togglePause() {
      c = !c;
    },
    dispose() {
      h.dispose();
      i.dispose();
    }
  };
}

const Ballpit: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spheresInstanceRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Configuração do Ballpit (Optimized Speed)
    const props = {
        count: 150, // Reduced count for better performance
        gravity: 2.0, // Increased gravity for faster fall
        friction: 0.9, // Reduced friction for faster movement
        wallBounce: 0.95,
        maxVelocity: 0.5, // Increased max speed
        followCursor: true,
        colors: [0xef4444, 0xf97316, 0xeab308, 0x22c55e, 0x3b82f6, 0xa855f7, 0xec4899] // Vibrant colors
    };

    spheresInstanceRef.current = createBallpit(canvas, props);

    return () => {
      if (spheresInstanceRef.current) {
        spheresInstanceRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className={`absolute inset-0 ${isDarkMode ? 'bg-[#050505]' : 'bg-gray-100'} transition-colors duration-1000`}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        {/* Credits Legend */}
        <div style={{
            position: 'absolute', 
            bottom: '10px', 
            right: '15px', 
            opacity: 0.5, 
            fontSize: '10px', 
            fontFamily: 'monospace',
            color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            textAlign: 'right',
            zIndex: 20
        }}>
            Created with <span style={{color: 'red'}}>♥</span> by <a href="https://reactbits.dev/backgrounds/ballpit#:~:text=by-,davidhdev" target="_blank" rel="noreferrer" style={{pointerEvents: 'auto', textDecoration: 'none', fontWeight: 'bold'}}>davidhdev</a>
        </div>
    </div>
  );
};
// --- NEW BALLPIT THEME END ---

const AnimatedBackgroundBase: React.FC<{
  theme: ThemeId;
  isDarkMode: boolean;
  animationOverride: AnimationStyle;
}> = ({ theme, isDarkMode }) => {
  // === RENDERIZADORES JAVASCRIPT ===
  if (theme === 'default') return <UnicornStudioBackground projectId="yaha7Bz5f3cRBAa5js9K" />;
  if (theme === 'retro') return <Ballpit isDarkMode={isDarkMode} />;
  if (theme === 'book') return <UniverseTheme isDarkMode={isDarkMode} />;
  if (theme === 'holo') {
    return (
      <div className="w-full h-full relative" style={{ background: isDarkMode ? '#000' : '#e0e7ff' }}>
        <Aurora
          colorStops={isDarkMode ? ["#3A29FF", "#FF94B4", "#FF3232"] : ["#00d8ff", "#00ff94", "#0066ff"]}
          blend={0.5}
          amplitude={1.0}
          speed={1.5} // Increased Speed
        />
        <div style={{
            position: 'absolute', 
            bottom: '10px', 
            right: '15px', 
            opacity: 0.5, 
            fontSize: '10px', 
            fontFamily: 'monospace',
            color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            textAlign: 'right',
            zIndex: 20
        }}>
            Created with <span style={{color: 'red'}}>♥</span> by <a href="https://reactbits.dev/backgrounds/aurora#:~:text=by-,davidhdev" target="_blank" rel="noreferrer" style={{pointerEvents: 'auto', textDecoration: 'none', fontWeight: 'bold'}}>davidhdev</a>
        </div>
      </div>
    );
  }
  if (theme === 'liquid') {
    return (
      <div className="w-full h-full relative" style={{ background: isDarkMode ? '#000' : '#fff' }}>
        <FloatingLines
            enabledWaves={['top', 'middle', 'bottom']}
            lineCount={[10, 15, 20]}
            lineDistance={[8, 6, 4]}
            bendRadius={5.0}
            bendStrength={-0.5}
            interactive={true}
            parallax={true}
            animationSpeed={2.0} // Increased Speed
            linesGradient={['#4338ca', '#3b82f6', '#ec4899', '#8b5cf6']} // Matching existing liquid theme colors
            mixBlendMode={isDarkMode ? 'screen' : 'multiply'} // Adjust for light mode
        />
      </div>
    );
  }

  if (theme === 'fresh') {
    return <SplineBackground url="https://my.spline.design/3dgradient-AcpgG6LxFkpnJSoowRHPfcbO" />;
  }

  // --- REPLACED: CHROMA/PRISM WITH GRID SCAN ---
  if (theme === 'chroma') {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <GridScan
          enableWebcam={false} // Disabled for background performance
          sensitivity={0.55}
          lineThickness={1}
          linesColor="#392e4e"
          gridScale={0.1}
          scanColor="#FF9FFC"
          scanOpacity={0.4}
          enablePost
          bloomIntensity={0.6}
          chromaticAberration={0.002}
          noiseIntensity={0.01}
        />
      </div>
    );
  }

  if (theme === 'waves') {
    return <SplineBackground url="https://my.spline.design/animatedbackgroundgradientforweb-jvJDeBWjMvShkjPKxPRUswLq" />;
  }

  if (theme === 'nordic') {
    return <UnicornStudioBackground projectId="qF3qXhdiOxdUeQYH8wCK" />;
  }

  // --- REPLACED: MINIMAL RIPPLE THEME WITH SPLINE ---
  if (theme === 'minimal') {
    return <SplineBackground url="https://my.spline.design/glasswave-6HLEnvJfCRsq1aKT2xqlgme7" />;
  }

  // === RENDERIZADORES GENÉRICO (BLOBS) ===
  const themeConfig = THEME_DATA[theme] || THEME_DATA['default'];

  return (
    <div className="w-full h-full relative overflow-hidden transition-colors duration-1000" style={{ background: themeConfig.bg }}>
      {themeConfig.colors.length > 0 && (
        <>
           <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-[pulse_8s_infinite] transform-gpu will-change-transform" style={{ backgroundColor: themeConfig.colors[0] }}></div>
           <div className="absolute top-[20%] right-[-20%] w-[60%] h-[60%] rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-[pulse_8s_infinite_2s] transform-gpu will-change-transform" style={{ backgroundColor: themeConfig.colors[1] || themeConfig.colors[0] }}></div>
           <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-[pulse_8s_infinite_4s] transform-gpu will-change-transform" style={{ backgroundColor: themeConfig.colors[2] || themeConfig.colors[0] }}></div>
        </>
      )}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
    </div>
  );
};

export const AnimatedBackground = React.memo(AnimatedBackgroundBase);
