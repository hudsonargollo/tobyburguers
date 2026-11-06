export type Coords = { latitude: number; longitude: number; accuracy?: number };

export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `${km.toFixed(1)} km`;
}

export function sortByDistance<T extends Coords>(items: T[], from: Coords) {
  return items
    .map((item) => ({ item, distance: distanceKm(from, item) }))
    .sort((a, b) => a.distance - b.distance);
}

/** Browser geolocation with high accuracy; resolves null instead of throwing. */
export function getBrowserLocation(timeout = 12000): Promise<Coords | null> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 0 }
    );
  });
}
