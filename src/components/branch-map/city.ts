// Geometry of the stylised Santa Cruz map. Everything is derived from real
// lat/lng so branch pins, the river and the ring roads stay in the right place.

export const MAP_SIZE = 180; // world units across (1 unit ≈ 100 m)

export const BOUNDS = {
  minLat: -17.862,
  maxLat: -17.698,
  minLng: -63.252,
  maxLng: -63.082,
};

export const CITY_CENTER = { latitude: -17.7833, longitude: -63.1821 };

// Approximate radii of the eight anillos, in kilometres.
export const RINGS_KM = [1.2, 2.4, 3.6, 4.8, 6.0, 7.2, 8.4, 9.8];

// Seven radiales, angles measured clockwise from north.
export const RADIAL_DEG = [0, 51.4, 102.9, 154.3, 205.7, 257.1, 308.6];

export const RIVER = [
  { latitude: -17.701, longitude: -63.2455 },
  { latitude: -17.722, longitude: -63.2408 },
  { latitude: -17.742, longitude: -63.2366 },
  { latitude: -17.762, longitude: -63.2338 },
  { latitude: -17.784, longitude: -63.2331 },
  { latitude: -17.806, longitude: -63.2362 },
  { latitude: -17.828, longitude: -63.2416 },
  { latitude: -17.851, longitude: -63.2468 },
];

export const PARKS = [
  { latitude: -17.7836, longitude: -63.1759, radiusKm: 0.35 }, // Parque Urbano
  { latitude: -17.7908, longitude: -63.1894, radiusKm: 0.28 }, // El Arenal
  { latitude: -17.7693, longitude: -63.1702, radiusKm: 0.32 }, // Jardín Botánico
  { latitude: -17.7952, longitude: -63.1781, radiusKm: 0.24 }, // Cultura
  { latitude: -17.7772, longitude: -63.1462, radiusKm: 0.3 }, // Parque este
];

/** Normalised [0..1] position inside the map bounds. */
export function normalize(latitude: number, longitude: number) {
  return {
    u: (longitude - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng),
    v: (BOUNDS.maxLat - latitude) / (BOUNDS.maxLat - BOUNDS.minLat),
  };
}

/** World position on the ground plane (y = 0). */
export function project(latitude: number, longitude: number) {
  const { u, v } = normalize(latitude, longitude);
  return { x: (u - 0.5) * MAP_SIZE, z: (v - 0.5) * MAP_SIZE };
}

export const CITY_CENTER_WORLD = project(CITY_CENTER.latitude, CITY_CENTER.longitude);

export const KM_TO_UNITS = MAP_SIZE / 18; // 18 km across the map

export function kmToUnits(km: number) {
  return km * KM_TO_UNITS;
}

/** Deterministic PRNG so the skyline is identical on every render. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
