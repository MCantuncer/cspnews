import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import type { Place } from '@cspnews/core';
import { geoAzimuthalEqualArea, geoContains, geoPath } from 'd3-geo';
import type { FeatureCollection } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

/**
 * Locator maps, drawn at build time from Natural Earth country shapes (world-atlas, public
 * domain). The page gets a small inline SVG: no tiles, no third-party requests.
 */
const EARTH_RADIUS_KM = 6371;

let countries: FeatureCollection | undefined;

function loadCountries(): FeatureCollection {
  if (!countries) {
    const require = createRequire(import.meta.url);
    const topology = JSON.parse(
      readFileSync(require.resolve('world-atlas/countries-50m.json'), 'utf8'),
    ) as Topology<{ countries: GeometryCollection }>;
    countries = feature(topology, topology.objects.countries);
  }
  return countries;
}

export interface LocatorMap {
  readonly width: number;
  readonly height: number;
  /** Country outlines; `home` is the country the place is in. */
  readonly land: readonly { d: string; home: boolean }[];
  /** The place, in SVG coordinates. */
  readonly x: number;
  readonly y: number;
}

/** A map centred on the place, showing about `radiusKm` around it. */
export function locatorMap(
  place: Place,
  width: number,
  height: number,
  radiusKm = 900,
): LocatorMap {
  const point: [number, number] = [place.lon, place.lat];
  const projection = geoAzimuthalEqualArea()
    .rotate([-place.lon, -place.lat])
    .scale(Math.min(width, height) / 2 / (radiusKm / EARTH_RADIUS_KM))
    .translate([width / 2, height / 2])
    .clipExtent([
      [0, 0],
      [width, height],
    ]);
  const path = geoPath(projection);
  const land = loadCountries()
    .features.map((country) => ({
      d: path(country) ?? '',
      home: geoContains(country, point),
    }))
    .filter((shape) => shape.d !== '')
    .map((shape) => ({ ...shape, d: roundPath(shape.d) }));
  const [x, y] = projection(point) ?? [width / 2, height / 2];
  return { width, height, land, x, y };
}

/** One decimal is plenty at these sizes and keeps the inline SVG small. */
function roundPath(d: string): string {
  return d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10));
}
