"use client";

import type { RefObject } from "react";
import { MapCanvas, type MapBranch, type MapHandle } from "./map-canvas";
import type { Coords } from "@/lib/geo";

// Tiny wrapper so the Three.js bundle can be loaded with next/dynamic while the
// imperative handle still flows through normally.
export default function MapStage({
  handle,
  branches,
  selectedSlug,
  nearestSlug,
  userLocation,
  onSelect,
}: {
  handle: RefObject<MapHandle | null>;
  branches: MapBranch[];
  selectedSlug: string | null;
  nearestSlug: string | null;
  userLocation: Coords | null;
  onSelect: (slug: string) => void;
}) {
  return (
    <MapCanvas
      ref={handle}
      branches={branches}
      selectedSlug={selectedSlug}
      nearestSlug={nearestSlug}
      userLocation={userLocation}
      onSelect={onSelect}
    />
  );
}
