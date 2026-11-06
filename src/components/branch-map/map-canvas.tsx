"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { Coords } from "@/lib/geo";
import {
  BOUNDS,
  CITY_CENTER,
  CITY_CENTER_WORLD,
  MAP_SIZE,
  PARKS,
  RADIAL_DEG,
  RINGS_KM,
  RIVER,
  kmToUnits,
  mulberry32,
  normalize,
  project,
} from "./city";

export type MapBranch = {
  slug: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
};

export type MapHandle = {
  focusBranch: (slug: string) => void;
  resetView: () => void;
  zoomBy: (factor: number) => void;
};

type Props = {
  branches: MapBranch[];
  selectedSlug: string | null;
  nearestSlug: string | null;
  userLocation: Coords | null;
  onSelect: (slug: string) => void;
};

const COLORS = {
  background: 0x051a2f,
  accent: 0xffc72c,
  accentSoft: 0xffe08a,
  brand: 0x0d5aa7,
  brandLight: 0x6fb4ef,
  light: 0xf7f9fc,
  building: 0x0c3357,
};

type PinVisual = {
  group: THREE.Group;
  head: THREE.MeshStandardMaterial;
  cone: THREE.MeshStandardMaterial;
  halo: THREE.MeshBasicMaterial;
  labelEl: HTMLDivElement;
};

function pinPosition(branch: MapBranch) {
  if (branch.latitude == null || branch.longitude == null) return null;
  return project(branch.latitude, branch.longitude);
}

/* ------------------------------------------------------------------ */
/* Stylised city texture                                               */
/* ------------------------------------------------------------------ */

function createCityTexture(): THREE.CanvasTexture {
  const size = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const pxPerUnit = size / MAP_SIZE;
  const pxPerKm = pxPerUnit * kmToUnits(1);

  const px = (latitude: number, longitude: number) => {
    const { u, v } = normalize(latitude, longitude);
    return { x: u * size, y: v * size };
  };
  const cx = px(CITY_CENTER.latitude, CITY_CENTER.longitude);

  // Ground wash
  ctx.fillStyle = "#061e36";
  ctx.fillRect(0, 0, size, size);
  const glow = ctx.createRadialGradient(cx.x, cx.y, size * 0.04, cx.x, cx.y, size * 0.72);
  glow.addColorStop(0, "rgba(23, 82, 132, 0.55)");
  glow.addColorStop(0.55, "rgba(12, 52, 88, 0.35)");
  glow.addColorStop(1, "rgba(4, 18, 32, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Street grid — light minor streets, brighter avenues
  ctx.lineWidth = 1;
  for (let lat = BOUNDS.minLat; lat <= BOUNDS.maxLat; lat += 0.0018) {
    ctx.strokeStyle = "rgba(111, 180, 239, 0.07)";
    const y = px(lat, BOUNDS.minLng).y;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  for (let lng = BOUNDS.minLng; lng <= BOUNDS.maxLng; lng += 0.0018) {
    ctx.strokeStyle = "rgba(111, 180, 239, 0.07)";
    const x = px(BOUNDS.minLat, lng).x;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  for (let lat = BOUNDS.minLat; lat <= BOUNDS.maxLat; lat += 0.009) {
    ctx.strokeStyle = "rgba(111, 180, 239, 0.16)";
    const y = px(lat, BOUNDS.minLng).y;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  for (let lng = BOUNDS.minLng; lng <= BOUNDS.maxLng; lng += 0.009) {
    ctx.strokeStyle = "rgba(111, 180, 239, 0.16)";
    const x = px(BOUNDS.minLat, lng).x;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  // Parks
  for (const park of PARKS) {
    const p = px(park.latitude, park.longitude);
    const r = park.radiusKm * pxPerKm;
    const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r);
    g.addColorStop(0, "rgba(78, 168, 132, 0.4)");
    g.addColorStop(1, "rgba(78, 168, 132, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Río Piraí
  const riverPoints = RIVER.map((point) => px(point.latitude, point.longitude));
  const strokeRiver = (width: number, color: string) => {
    ctx.beginPath();
    ctx.moveTo(riverPoints[0].x, riverPoints[0].y);
    for (let i = 1; i < riverPoints.length - 1; i += 1) {
      const current = riverPoints[i];
      const next = riverPoints[i + 1];
      ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
    }
    const last = riverPoints[riverPoints.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.stroke();
  };
  strokeRiver(120, "rgba(26, 110, 165, 0.12)");
  strokeRiver(64, "rgba(30, 118, 174, 0.45)");
  strokeRiver(30, "rgba(49, 145, 199, 0.75)");
  strokeRiver(8, "rgba(150, 213, 245, 0.5)");

  // Anillos
  for (let i = 0; i < RINGS_KM.length; i += 1) {
    const r = RINGS_KM[i] * pxPerKm;
    const major = i === 1 || i === 3 || i === 5 || i === 7;
    ctx.beginPath();
    ctx.ellipse(cx.x, cx.y, r, r * 0.97, 0, 0, Math.PI * 2);
    ctx.lineWidth = major ? 7 : 4;
    ctx.strokeStyle = major ? "rgba(232,190,26,0.55)" : "rgba(232,190,26,0.28)";
    ctx.stroke();
    if (major) {
      ctx.beginPath();
      ctx.ellipse(cx.x, cx.y, r, r * 0.97, 0, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 224, 138, 0.65)";
      ctx.stroke();
    }
  }

  // Radial avenues
  for (const deg of RADIAL_DEG) {
    const angle = (deg * Math.PI) / 180;
    const reach = size;
    ctx.beginPath();
    ctx.moveTo(cx.x, cx.y);
    ctx.lineTo(cx.x + Math.sin(angle) * reach, cx.y - Math.cos(angle) * reach);
    ctx.lineWidth = 7;
    ctx.strokeStyle = "rgba(111, 180, 239, 0.2)";
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(141, 196, 255, 0.32)";
    ctx.stroke();
  }

  // Plaza 24 de Septiembre
  ctx.fillStyle = "rgba(232,190,26,0.22)";
  ctx.beginPath();
  ctx.arc(cx.x, cx.y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 224, 138, 0.8)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Labels
  ctx.fillStyle = "rgba(199, 224, 247, 0.6)";
  ctx.font = "600 34px Outfit, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("SANTA CRUZ DE LA SIERRA", 56, size - 64);
  ctx.font = "500 24px Outfit, ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(255, 224, 138, 0.55)";
  ctx.fillText("ANILLO 2", cx.x + RINGS_KM[1] * pxPerKm * 0.55, cx.y - RINGS_KM[1] * pxPerKm * 0.8);
  ctx.fillText("ANILLO 4", cx.x + RINGS_KM[3] * pxPerKm * 0.45, cx.y - RINGS_KM[3] * pxPerKm * 0.85);
  ctx.fillStyle = "rgba(150, 213, 245, 0.7)";
  ctx.save();
  ctx.translate(cx.x - 300, cx.y + 190);
  ctx.rotate(-0.22);
  ctx.fillText("RÍO PIRAÍ", 0, 0);
  ctx.restore();
  ctx.fillStyle = "rgba(255, 224, 138, 0.75)";
  ctx.font = "600 22px Outfit, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("CENTRO", cx.x + 26, cx.y - 26);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/* ------------------------------------------------------------------ */
/* Motorcycle courier                                                  */
/* ------------------------------------------------------------------ */

function createCourier() {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const dark = new THREE.MeshStandardMaterial({ color: 0x0b1a29, roughness: 0.6, metalness: 0.3 });
  const blue = new THREE.MeshStandardMaterial({ color: COLORS.brand, roughness: 0.45, metalness: 0.15 });
  const yellow = new THREE.MeshStandardMaterial({
    color: COLORS.accent,
    roughness: 0.5,
    emissive: COLORS.accent,
    emissiveIntensity: 0.12,
  });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdce9f7, roughness: 0.3, metalness: 0.8 });
  const apron = new THREE.MeshStandardMaterial({ color: 0xf7f9fc, roughness: 0.7 });

  const addWheel = (x: number) => {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.17, 10, 22), dark);
    wheel.position.set(x, 0.66, 0);
    group.add(wheel);
    wheels.push(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.18, 12), chrome);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(x, 0.66, 0);
    group.add(hub);
  };
  addWheel(0.95);
  addWheel(-0.95);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.18, 0.26), blue);
  frame.position.set(0, 1.02, 0);
  group.add(frame);

  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.34, 0.38), blue);
  tank.position.set(0.3, 1.32, 0);
  group.add(tank);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.32), dark);
  seat.position.set(-0.36, 1.36, 0);
  group.add(seat);

  const fork = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.12), chrome);
  fork.position.set(0.86, 1.06, 0);
  fork.rotation.z = -0.32;
  group.add(fork);

  const handlebar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.76), dark);
  handlebar.position.set(0.71, 1.58, 0);
  group.add(handlebar);

  // Delivery box with a Toby ¡Mi Hamburguesa! yellow band
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.64, 0.66), yellow);
  box.position.set(-0.98, 1.86, 0);
  group.add(box);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.13, 0.7), blue);
  band.position.set(-0.98, 2.02, 0);
  group.add(band);

  // Rider
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.5, 6, 12), blue);
  torso.position.set(-0.12, 1.96, 0);
  torso.rotation.z = -0.28;
  group.add(torso);

  const bib = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.52, 0.44), apron);
  bib.position.set(0.15, 1.98, 0);
  bib.rotation.z = -0.28;
  group.add(bib);

  for (const z of [-0.22, 0.22]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.52, 4, 10), apron);
    arm.position.set(0.4, 1.86, z);
    arm.rotation.z = 0.72;
    group.add(arm);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.46, 4, 10), dark);
    leg.position.set(-0.18, 1.3, z);
    leg.rotation.z = 1.0;
    group.add(leg);
  }

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), yellow);
  helmet.position.set(0.06, 2.4, 0);
  group.add(helmet);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 0.34), dark);
  visor.position.set(0.28, 2.4, 0);
  group.add(visor);

  const headlight = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffe08a, emissiveIntensity: 1.4 })
  );
  headlight.position.set(0.94, 1.46, 0);
  group.add(headlight);

  const tag = document.createElement("div");
  tag.className =
    "pointer-events-none rounded-full bg-accent px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-brand-deep shadow-[0_4px_12px_rgba(0,0,0,0.35)]";
  tag.textContent = "Delivery";
  const tagObject = new CSS2DObject(tag);
  tagObject.position.set(0, 3.5, 0);
  group.add(tagObject);

  group.scale.setScalar(1.8);
  return { group, wheels };
}

/* ------------------------------------------------------------------ */

function createPin(branch: MapBranch) {
  const group = new THREE.Group();
  const haloMat = new THREE.MeshBasicMaterial({
    color: COLORS.accent,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.9, 48), haloMat);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.3;
  group.add(halo);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.3, 0.4, 24),
    new THREE.MeshStandardMaterial({ color: COLORS.brand, roughness: 0.55, metalness: 0.25 })
  );
  base.position.y = 0.2;
  group.add(base);

  const coneMat = new THREE.MeshStandardMaterial({
    color: COLORS.accent,
    roughness: 0.4,
    emissive: COLORS.accent,
    emissiveIntensity: 0.24,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.2, 24), coneMat);
  cone.rotation.x = Math.PI;
  cone.position.y = 4.0;
  group.add(cone);

  const headMat = new THREE.MeshStandardMaterial({
    color: COLORS.accent,
    roughness: 0.32,
    metalness: 0.1,
    emissive: COLORS.accent,
    emissiveIntensity: 0.35,
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.24, 24, 18), headMat);
  head.position.y = 6.0;
  group.add(head);

  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(3.4, 10, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.y = 4;
  hit.userData.slug = branch.slug;
  group.add(hit);

  const labelEl = document.createElement("div");
  labelEl.className =
    "pointer-events-none rounded-full border border-[rgba(232,190,26,0.45)] bg-[rgba(110,10,6,0.92)] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-light shadow-[0_6px_18px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-opacity duration-200";
  labelEl.style.opacity = "0";
  const label = new CSS2DObject(labelEl);
  label.position.set(0, 7.9, 0);
  group.add(label);

  return { group, head: headMat, cone: coneMat, halo: haloMat, labelEl, hit };
}

export const MapCanvas = forwardRef<MapHandle, Props>(function MapCanvas(
  { branches, selectedSlug, nearestSlug, userLocation, onSelect },
  ref
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ selectedSlug, nearestSlug, onSelect });
  propsRef.current = { selectedSlug, nearestSlug, onSelect };

  const apiRef = useRef<{
    focus: (slug: string) => void;
    reset: () => void;
    zoom: (factor: number) => void;
    setSelection: (slug: string | null, nearest: string | null) => void;
    setUser: (coords: Coords | null) => void;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    focusBranch: (slug: string) => apiRef.current?.focus(slug),
    resetView: () => apiRef.current?.reset(),
    zoomBy: (factor: number) => apiRef.current?.zoom(factor),
  }), []);

  useEffect(() => {
    apiRef.current?.setSelection(selectedSlug, nearestSlug);
  }, [selectedSlug, nearestSlug]);

  useEffect(() => {
    apiRef.current?.setUser(userLocation);
  }, [userLocation]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.background);

    const camera = new THREE.PerspectiveCamera(42, 1, 1, 2200);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    mount.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.inset = "0";
    labelRenderer.domElement.style.pointerEvents = "none";
    mount.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    const dampingFactor = 0.075;
    controls.enableDamping = true;
    controls.dampingFactor = dampingFactor;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.85;
    controls.minDistance = 42;
    controls.maxDistance = 560;
    controls.minPolarAngle = 0.24;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controls.screenSpacePanning = false;
    const cityTarget = new THREE.Vector3(CITY_CENTER_WORLD.x, 0, CITY_CENTER_WORLD.z);
    controls.target.copy(cityTarget);

    // Lights
    scene.add(new THREE.HemisphereLight(0xc7e2ff, 0x061626, 1.15));
    const sun = new THREE.DirectionalLight(0xfff1cf, 1.75);
    sun.position.set(110, 165, 70);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x3d8fd8, 0.9);
    rim.position.set(-120, 60, -90);
    scene.add(rim);

    // Map slab + ground
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(MAP_SIZE + 6, 1.4, MAP_SIZE + 6),
      new THREE.MeshStandardMaterial({ color: 0x041423, roughness: 0.95, metalness: 0.05 })
    );
    slab.position.y = -0.72;
    scene.add(slab);

    const cityTexture = createCityTexture();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE),
      new THREE.MeshStandardMaterial({ map: cityTexture, roughness: 0.9, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.01;
    scene.add(ground);

    // Skyline blocks — deterministic, kept clear of the ring roads, radials,
    // parks and the river so the city still reads as a map.
    const rand = mulberry32(20261105);
    const ringUnits = RINGS_KM.map((km) => kmToUnits(km));
    const riverWorld = RIVER.map((point) => project(point.latitude, point.longitude));
    const parkWorld = PARKS.map((park) => ({
      ...project(park.latitude, park.longitude),
      radiusKm: park.radiusKm,
    }));
    const insidePark = (x: number, z: number) =>
      parkWorld.some((park) => Math.hypot(x - park.x, z - park.z) < kmToUnits(park.radiusKm) + 3);
    const nearRiver = (x: number, z: number) => {
      for (let i = 0; i < riverWorld.length - 1; i += 1) {
        const a = riverWorld[i];
        const b = riverWorld[i + 1];
        const lengthSq = (b.x - a.x) ** 2 + (b.z - a.z) ** 2;
        const t = Math.max(0, Math.min(1, ((x - a.x) * (b.x - a.x) + (z - a.z) * (b.z - a.z)) / lengthSq));
        if (Math.hypot(x - (a.x + (b.x - a.x) * t), z - (a.z + (b.z - a.z) * t)) < 4.5) return true;
      }
      return false;
    };
    const onRing = (x: number, z: number) => {
      const r = Math.hypot(x - CITY_CENTER_WORLD.x, z - CITY_CENTER_WORLD.z);
      return ringUnits.some((ring) => Math.abs(r - ring) < 2.6);
    };
    const onRadial = (x: number, z: number) => {
      const dx = x - CITY_CENTER_WORLD.x;
      const dz = z - CITY_CENTER_WORLD.z;
      const radius = Math.hypot(dx, dz);
      const angle = (Math.atan2(dx, -dz) * 180) / Math.PI;
      const halfWidth = (Math.atan2(2.6, Math.max(radius, 9)) * 180) / Math.PI;
      return RADIAL_DEG.some((deg) => {
        const delta = Math.abs(((angle - deg + 540) % 360) - 180);
        return delta < halfWidth;
      });
    };

    const count = 780;
    const blocks = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0.08 }),
      count
    );
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    let placed = 0;
    let guard = 0;
    while (placed < count && guard < count * 40) {
      guard += 1;
      const x = (rand() * 2 - 1) * 84;
      const z = (rand() * 2 - 1) * 84;
      const radius = Math.hypot(x - CITY_CENTER_WORLD.x, z - CITY_CENTER_WORLD.z);
      if (radius > 82) continue;
      if (insidePark(x, z) || nearRiver(x, z) || onRing(x, z) || onRadial(x, z)) continue;
      const density = 1 - radius / 170;
      if (rand() > 0.32 + density * 0.68) continue;

      const width = 0.9 + rand() * 1.7;
      const depth = 0.9 + rand() * 1.7;
      const height = 0.28 + rand() ** 2 * (2.2 + density * 3.4);
      matrix.compose(
        new THREE.Vector3(x, height / 2, z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 0.16 - 0.08),
        new THREE.Vector3(width, height, depth)
      );
      blocks.setMatrixAt(placed, matrix);
      color.setHex(COLORS.building).multiplyScalar(0.55 + rand() * 0.75);
      blocks.setColorAt(placed, color);
      placed += 1;
    }
    blocks.count = placed;
    blocks.frustumCulled = false;
    if (blocks.instanceColor) blocks.instanceColor.needsUpdate = true;
    scene.add(blocks);

    // 3D anillos + radiales on top of the painted texture
    const ringGroup = new THREE.Group();
    ringGroup.position.copy(cityTarget);
    for (let i = 0; i < ringUnits.length; i += 1) {
      const radius = ringUnits[i];
      const points: THREE.Vector3[] = [];
      for (let step = 0; step < 180; step += 1) {
        const angle = (step / 180) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.sin(angle) * radius, 0.14, Math.cos(angle) * radius * 0.97));
      }
      const curve = new THREE.CatmullRomCurve3(points, true);
      const major = i === 1 || i === 3 || i === 5 || i === 7;
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 128, major ? 0.2 : 0.12, 6, true),
        new THREE.MeshBasicMaterial({
          color: COLORS.accent,
          transparent: true,
          opacity: major ? 0.5 : 0.24,
        })
      );
      ringGroup.add(tube);
    }
    for (const deg of RADIAL_DEG) {
      const angle = (deg * Math.PI) / 180;
      const points = Array.from({ length: 10 }, (_, index) => {
        const r = (index / 9) * 95;
        return new THREE.Vector3(Math.sin(angle) * r, 0.12, -Math.cos(angle) * r);
      });
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 1, 0.07, 4, false),
        new THREE.MeshBasicMaterial({ color: COLORS.brandLight, transparent: true, opacity: 0.25 })
      );
      ringGroup.add(tube);
    }
    scene.add(ringGroup);

    // Branch pins
    const pins = new Map<string, PinVisual>();
    const hits: THREE.Mesh[] = [];
    for (const branch of branches) {
      const position = pinPosition(branch);
      if (!position) continue;
      const pin = createPin(branch);
      pin.group.position.set(position.x, 0, position.z);
      scene.add(pin.group);
      pins.set(branch.slug, pin);
      hits.push(pin.hit);
    }

    const updateLabels = () => {
      const { selectedSlug: selected, nearestSlug: nearest } = propsRef.current;
      for (const [slug, pin] of pins) {
        const branch = branches.find((b) => b.slug === slug);
        if (!branch) continue;
        const isNearest = slug === nearest && slug !== selected;
        pin.labelEl.textContent = branch.name;
        if (isNearest) {
          const tag = document.createElement("span");
          tag.textContent = " · más cercana";
          tag.style.color = "#f5d85b";
          pin.labelEl.appendChild(tag);
        }
      }
    };
    updateLabels();

    const setSelection = (selected: string | null, nearest: string | null) => {
      propsRef.current.selectedSlug = selected;
      propsRef.current.nearestSlug = nearest;
      for (const [slug, pin] of pins) {
        const isSelected = slug === selected;
        const isNearest = slug === nearest && !isSelected;
        pin.head.color.setHex(isSelected ? 0xffffff : COLORS.accent);
        pin.head.emissive.setHex(COLORS.accent);
        pin.head.emissiveIntensity = isSelected ? 0.85 : isNearest ? 0.55 : 0.3;
        pin.cone.color.setHex(isSelected ? 0xffe08a : COLORS.accent);
        pin.halo.opacity = isSelected ? 0.7 : isNearest ? 0.48 : 0.26;
        const scale = isSelected ? 1.95 : isNearest ? 1.72 : 1.55;
        pin.group.scale.setScalar(scale);
        pin.labelEl.style.background = isSelected ? "#e8be1a" : "rgba(110,10,6,0.92)";
        pin.labelEl.style.color = isSelected ? "#6e0a06" : "#fff8f2";
        pin.labelEl.style.borderColor = isSelected || isNearest ? "rgba(232,190,26,0.85)" : "rgba(232,190,26,0.35)";
      }
      updateLabels();
    };
    setSelection(propsRef.current.selectedSlug, propsRef.current.nearestSlug);

    // Courier + route
    const courier = createCourier();
    scene.add(courier.group);
    let routeLine: THREE.Line | null = null;
    let routeCurve: THREE.QuadraticBezierCurve3 | null = null;
    let routeEndpoints: { from: THREE.Vector3; to: THREE.Vector3 } | null = null;

    const clearRoute = () => {
      if (routeLine) {
        scene.remove(routeLine);
        routeLine.geometry.dispose();
        (routeLine.material as THREE.Material).dispose();
        routeLine = null;
      }
      routeCurve = null;
      routeEndpoints = null;
    };

    // Hover / tap picking
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered: string | null = null;
    let pendingHover: { x: number; y: number } | null = null;
    let pointerDown: { x: number; y: number; time: number; id: number; dragged: boolean } | null = null;

    const pick = (x: number, y: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      pointer.x = ((x - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((y - rect.top) / rect.height) * 2 + 1;
      camera.updateMatrixWorld();
      for (const hit of hits) hit.updateWorldMatrix(true, false);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(hits, false)[0];
      return hit ? (hit.object.userData.slug as string) : null;
    };

    const setHovered = (slug: string | null) => {
      if (slug !== hovered) {
        hovered = slug;
        renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
        for (const [key, pin] of pins) {
          const base =
            key === propsRef.current.selectedSlug
              ? 1.95
              : key === propsRef.current.nearestSlug
                ? 1.72
                : 1.55;
          pin.group.scale.setScalar(key === hovered ? base * 1.12 : base);
        }
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (pointerDown?.id === event.pointerId) {
        pointerDown.dragged ||= Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 8;
      }
      if (event.pointerType === "mouse") pendingHover = { x: event.clientX, y: event.clientY };
    };
    const onPointerLeave = () => {
      pendingHover = null;
      setHovered(null);
    };
    const onPointerCancel = () => {
      pointerDown = null;
      onPointerLeave();
    };
    const onPointerDown = (event: PointerEvent) => {
      pointerDown = event.isPrimary
        ? { x: event.clientX, y: event.clientY, time: performance.now(), id: event.pointerId, dragged: false }
        : null;
    };
    const onPointerUp = (event: PointerEvent) => {
      const down = pointerDown;
      pointerDown = null;
      if (!down || down.id !== event.pointerId || down.dragged) return;
      const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
      if (moved > 8 || performance.now() - down.time > 900) return;
      const slug = pick(event.clientX, event.clientY);
      if (slug) propsRef.current.onSelect(slug);
    };
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("pointercancel", onPointerCancel);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    // User marker (rebuilt when coordinates arrive)
    let userGroup: THREE.Group | null = null;
    let userPulse: THREE.Mesh | null = null;
    const setUser = (coords: Coords | null) => {
      if (userGroup) {
        scene.remove(userGroup);
        userGroup.traverse((object) => {
          if (object instanceof CSS2DObject) object.element.remove();
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            (object.material as THREE.Material).dispose();
          }
        });
        userGroup = null;
        userPulse = null;
      }
      clearRoute();
      if (!coords) return;

      const position = project(coords.latitude, coords.longitude);
      const group = new THREE.Group();
      group.position.set(position.x, 0, position.z);

      const pulseMat = new THREE.MeshBasicMaterial({
        color: COLORS.accent,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const pulse = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.9, 48), pulseMat);
      pulse.rotation.x = -Math.PI / 2;
      pulse.position.y = 0.22;
      group.add(pulse);
      userPulse = pulse;

      const accuracy = coords.accuracy ? Math.min(Math.max(coords.accuracy / 100, 1), 30) : 0;
      if (accuracy > 1.5) {
        const accuracyRing = new THREE.Mesh(
          new THREE.RingGeometry(accuracy - 0.3, accuracy, 64),
          new THREE.MeshBasicMaterial({
            color: 0x6fb4ef,
            transparent: true,
            opacity: 0.16,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        accuracyRing.rotation.x = -Math.PI / 2;
        accuracyRing.position.y = 0.18;
        group.add(accuracyRing);
      }

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 22, 18),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: COLORS.accent,
          emissiveIntensity: 1.1,
          roughness: 0.25,
        })
      );
      dot.position.y = 0.75;
      group.add(dot);

      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 3.4, 10, 1, true),
        new THREE.MeshBasicMaterial({ color: COLORS.accent, transparent: true, opacity: 0.4 })
      );
      beam.position.y = 2.3;
      group.add(beam);

      const el = document.createElement("div");
      el.className =
        "pointer-events-none rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-deep shadow-[0_8px_20px_rgba(0,0,0,0.35)]";
      el.textContent = "Estás aquí";
      const label = new CSS2DObject(el);
      label.position.set(0, 4.2, 0);
      group.add(label);

      scene.add(group);
      userGroup = group;

      // Delivery route: nearest branch → you
      let nearest: { slug: string; distance: number; position: { x: number; z: number } } | null = null;
      for (const branch of branches) {
        const pin = pinPosition(branch);
        if (!pin) continue;
        const distance = Math.hypot(pin.x - position.x, pin.z - position.z);
        if (!nearest || distance < nearest.distance) {
          nearest = { slug: branch.slug, distance, position: pin };
        }
      }
      if (nearest) {
        const from = new THREE.Vector3(nearest.position.x, 0.05, nearest.position.z);
        const to = new THREE.Vector3(position.x, 0.05, position.z);
        const mid = from.clone().add(to).multiplyScalar(0.5);
        mid.y = Math.max(3.5, from.distanceTo(to) * 0.16);
        routeCurve = new THREE.QuadraticBezierCurve3(from, mid, to);
        routeEndpoints = { from, to };
        const points = routeCurve.getPoints(48);
        points.forEach((point) => (point.y = 0.16));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({
          color: COLORS.accent,
          transparent: true,
          opacity: 0.45,
          dashSize: 1.4,
          gapSize: 1.1,
        });
        routeLine = new THREE.Line(geometry, material);
        routeLine.computeLineDistances();
        scene.add(routeLine);
      }
    };

    // Camera helpers
    const direction = new THREE.Vector3(0.52, 0.9, 0.66).normalize();
    let cameraGoal: THREE.Vector3 | null = null;
    let targetGoal: THREE.Vector3 | null = null;
    const cancelFocus = () => {
      cameraGoal = null;
      targetGoal = null;
    };
    controls.addEventListener("start", cancelFocus);

    const fitDistance = () => {
      const width = renderer.domElement.clientWidth || 1;
      const height = renderer.domElement.clientHeight || 1;
      const aspect = width / height;
      const tan = Math.tan((camera.fov * Math.PI) / 360);
      const fitHeight = 88 / tan;
      const fitWidth = 86 / (aspect * tan);
      return Math.min(Math.max(Math.max(fitHeight, fitWidth) * 1.02, 90), 540);
    };

    const reset = () => {
      cancelFocus();
      controls.target.copy(cityTarget);
      camera.position.copy(controls.target).addScaledVector(direction, fitDistance());
      controls.update();
    };
    reset();

    const focus = (slug: string) => {
      const pin = pins.get(slug);
      if (!pin) return;
      const target = pin.group.position.clone();
      target.y = 0;
      targetGoal = target;
      const offset = camera.position.clone().sub(controls.target);
      const distance = Math.min(offset.length(), 118);
      cameraGoal = target.clone().addScaledVector(offset.normalize(), distance);
    };

    const zoom = (factor: number) => {
      cancelFocus();
      const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor);
      const distance = THREE.MathUtils.clamp(offset.length(), controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).addScaledVector(offset.normalize(), distance);
      controls.update();
    };

    apiRef.current = {
      focus,
      reset,
      zoom,
      setSelection,
      setUser,
    };
    setUser(userLocation);

    // Resize
    const resize = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      labelRenderer.setSize(width, height);
    };
    resize();
    const observer = new ResizeObserver(() => resize());
    observer.observe(mount);

    // Animation
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
    };
    motionQuery.addEventListener("change", onMotionChange);
    const frameInterval = 1000 / 60;
    let nextFrameTime: number | null = null;
    let lastFrameTime: number | null = null;
    let inView = typeof IntersectionObserver === "undefined";
    let running = false;
    let disposed = false;
    let elapsed = 0;
    const circleCenter = cityTarget.clone();
    const circleRadius = kmToUnits(3.6);

    const animate = (time: number) => {
      if (!running || disposed) return;
      if (nextFrameTime !== null && time + 0.1 < nextFrameTime) return;
      const delta = lastFrameTime === null ? 0 : Math.min((time - lastFrameTime) / 1000, 0.05);
      nextFrameTime = nextFrameTime === null
        ? time + frameInterval
        : nextFrameTime + Math.max(1, Math.floor((time - nextFrameTime) / frameInterval) + 1) * frameInterval;
      lastFrameTime = time;
      const decorativeDelta = reducedMotion ? 0 : delta;
      elapsed += decorativeDelta;

      if (targetGoal) {
        controls.target.lerp(targetGoal, 1 - Math.pow(0.91, delta * 60));
        if (controls.target.distanceTo(targetGoal) < 0.15) targetGoal = null;
      }
      if (cameraGoal) {
        camera.position.lerp(cameraGoal, 1 - Math.pow(0.92, delta * 60));
        if (camera.position.distanceTo(cameraGoal) < 0.4) cameraGoal = null;
      }
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -96, 96);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -96, 96);
      controls.target.y = 0;
      controls.dampingFactor = 1 - Math.pow(1 - dampingFactor, delta * 60);
      controls.update();
      // OrbitControls also updates directly on input events.
      controls.dampingFactor = dampingFactor;

      if (pendingHover) {
        if (!pointerDown?.dragged) setHovered(pick(pendingHover.x, pendingHover.y));
        pendingHover = null;
      }

      // Courier
      if (routeCurve && routeEndpoints) {
        const progress = (Math.sin(elapsed * 0.22 - Math.PI / 2) + 1) / 2;
        const point = routeCurve.getPoint(progress);
        const tangent = routeCurve.getTangent(progress);
        const backwards = Math.cos(elapsed * 0.22 - Math.PI / 2) < 0;
        courier.group.position.set(point.x, 0.06 + Math.abs(Math.sin(elapsed * 5)) * 0.05, point.z);
        const heading = Math.atan2(-tangent.z, tangent.x) + (backwards ? Math.PI : 0);
        courier.group.rotation.y = heading;
      } else {
        const angle = elapsed * 0.075 + 1.2;
        const x = circleCenter.x + Math.cos(angle) * circleRadius;
        const z = circleCenter.z + Math.sin(angle) * circleRadius;
        courier.group.position.set(x, 0.06 + Math.abs(Math.sin(elapsed * 5)) * 0.05, z);
        courier.group.rotation.y = Math.atan2(-Math.cos(angle), -Math.sin(angle));
      }
      courier.group.rotation.z = Math.sin(elapsed * 1.6) * 0.035;
      for (const wheel of courier.wheels) wheel.rotation.z -= decorativeDelta * 7.5;

      if (userPulse) {
        const scale = 1 + Math.sin(elapsed * 2.4) * 0.18;
        userPulse.scale.setScalar(scale);
        const material = userPulse.material as THREE.MeshBasicMaterial;
        material.opacity = 0.34 + (1 - (scale - 0.82) / 0.36) * 0.2;
      }

      // Gentle idle: nearest pin breathes
      const nearest = propsRef.current.nearestSlug;
      if (nearest && nearest !== propsRef.current.selectedSlug) {
        const pin = pins.get(nearest);
        if (pin) pin.halo.opacity = 0.42 + Math.sin(elapsed * 2.1) * 0.12;
      }

      // Show every name once the camera is close enough to keep them readable;
      // at map scale only the chosen/nearest/hovered labels are shown.
      const zoomedIn = camera.position.distanceTo(controls.target) < 170;
      const selected = propsRef.current.selectedSlug;
      for (const [slug, pin] of pins) {
        const visible = zoomedIn || slug === selected || slug === nearest || slug === hovered;
        const value = visible ? "1" : "0";
        if (pin.labelEl.style.opacity !== value) pin.labelEl.style.opacity = value;
      }

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    const updateAnimationState = () => {
      if (disposed) return;
      const shouldRun = inView && !document.hidden;
      if (shouldRun === running) return;
      running = shouldRun;
      nextFrameTime = null;
      lastFrameTime = null;
      if (!running) onPointerCancel();
      renderer.setAnimationLoop(running ? animate : null);
    };
    const visibilityObserver = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
      if (disposed) return;
      const entry = entries.find((item) => item.target === mount);
      if (!entry) return;
      inView = entry.isIntersecting;
      updateAnimationState();
    });
    visibilityObserver?.observe(mount);
    document.addEventListener("visibilitychange", updateAnimationState);
    updateAnimationState();

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      document.removeEventListener("visibilitychange", updateAnimationState);
      visibilityObserver?.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("pointercancel", onPointerCancel);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.removeEventListener("start", cancelFocus);
      controls.dispose();
      scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.Line ||
          object instanceof THREE.InstancedMesh
        ) {
          object.geometry?.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else if (material) (material as THREE.Material).dispose();
        }
      });
      cityTexture.dispose();
      renderer.dispose();
      labelRenderer.domElement.remove();
      renderer.domElement.remove();
      apiRef.current = null;
    };
    // The scene is built once; props are pushed in through apiRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
});
