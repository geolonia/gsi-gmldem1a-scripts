#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { XMLParser } from "fast-xml-parser";
import jismesh from 'jismesh-js';
import { PNG } from "pngjs";
import { 
  pointToTile, 
  pointToTileFraction,
} from "@mapbox/tilebelt";
import tileCover from "@mapbox/tile-cover";
import turfUnion from "@turf/union";
import turfBbox from "@turf/bbox";
import { Geometry, MultiPolygon, Polygon } from "geojson";

// import type geojson from "geojson";

const TILE_RES = 256;
const TGT_ZOOM = 17;

async function *walkDirectory(dir: string, extname?: string): AsyncGenerator<string> {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) {
      yield* walkDirectory(entry);
    } else if (d.isFile() && (!extname || path.extname(entry) === extname)) {
      yield entry;
    }
  }
}

const main = async () => {
  const xmlDir = process.argv[2];

  const meshMap: { [key: string]: string[] } = {};

  for await (const xmlPath of walkDirectory(xmlDir, '.xml')) {
    console.log(`Reading ${path.basename(xmlPath)}...`);
    const xml = await fs.promises.readFile(xmlPath);
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: false,
      parseTagValue: false,
    });
    const json = parser.parse(xml.toString());
    const fileMesh = json['Dataset']['DEM']['mesh'];
    const coverage = json['Dataset']['DEM']['coverage'];
    const values: string[] = coverage['gml:rangeSet']['gml:DataBlock']['gml:tupleList'].split("\n");
    meshMap[fileMesh] = values;
  }

  console.log(`Read ${Object.keys(meshMap).length} input files.`);

  const allMeshesPolygon: Geometry = Object.keys(meshMap).reduce<Polygon | MultiPolygon>((acc, mesh) => {
    const [latSW, lonSW] = jismesh.toMeshPoint(mesh, 0, 0);
    const [latNE, lonNE] = jismesh.toMeshPoint(mesh, 1, 1);

    const meshGeom: Geometry = { type: "Polygon", coordinates: [[
      [lonSW, latSW],
      [lonNE, latSW],
      [lonNE, latNE],
      [lonSW, latNE],
      [lonSW, latSW],
    ]] };
    
    return turfUnion(acc, meshGeom)?.geometry ?? acc;
  }, { type: "Polygon", coordinates: [] });

  await fs.promises.writeFile(
    "./all-meshes.geojson", 
    JSON.stringify({
      "type": "Feature",
      "properties": {},
      "geometry": allMeshesPolygon,
    }),
  );

  console.log(`Saved full extent to all-meshes.geojson`);

  // tupleLimitsLow is x=0, y=0
  // tupleLimitsHigh is x=1124, y=749
  // because 0,0 is inclusive, we have 1125 x 750 = 843750 values
  // length of values is 1125 * 750 = 843750

  const tiles: { [key: string]: PNG } = {};

  for (const coveringTile of tileCover.tiles(
    allMeshesPolygon,
    { 
      min_zoom: TGT_ZOOM, 
      max_zoom: TGT_ZOOM, 
    },
  )) {
    const tileIdx = coveringTile.join("/");
    if (!tiles[tileIdx]) {
      const img = new PNG({ 
        width: TILE_RES, 
        height: TILE_RES,
      });
      img.data.fill(0);
      tiles[tileIdx] = img;
    }
  }

  console.log(
    `Current export covers ${Object.keys(tiles).length} tiles:\n`,
    Object.keys(tiles).join("\n"),
  );

  for (const [fileMesh, values] of Object.entries(meshMap)) {
    values.forEach((value, index) => {
      const x = index % 1125;

      // the scan direction is +x,-y, but we want +x,+y, so we flip the y axis
      const y = 750 - Math.floor(index / 1125);

      // Y = latitude, X = longitude
      const relativeX = (x / 1125); // + ((1 / 1125) / 2);
      const relativeY = (y / 750); // + ((1 / 750) / 2);
      const [lat, lon] = jismesh.toMeshPoint(fileMesh, relativeY, relativeX)
      const [_type, valueString] = value.split(",");
      const valueFloat = parseFloat(valueString);

      const tile = pointToTile(lon, lat, TGT_ZOOM);
      const tileIdx = tile.join("/");

      const img = tiles[tileIdx];
      if (!img) {
        return;
      }

      if (valueFloat === -9999) {
        return;
      }

      let box = Math.round(10 * (valueFloat + 10000)).toString(16)
      let boxr = parseInt(box.slice(-6, -4), 16)
      let boxg = parseInt(box.slice(-4, -2), 16)
      let boxb = parseInt(box.slice(-2), 16)

      const tileFraction = pointToTileFraction(lon, lat, TGT_ZOOM);
      const xPixel = Math.floor((tileFraction[0] % 1) * TILE_RES);
      const yPixel = Math.floor((tileFraction[1] % 1) * TILE_RES);

      const pixelIdx = (yPixel * TILE_RES + xPixel) << 2;
      img.data[pixelIdx] = boxr;
      img.data[pixelIdx + 1] = boxg;
      img.data[pixelIdx + 2] = boxb;
      img.data[pixelIdx + 3] = 255;

      // process.stdout.write(JSON.stringify({
      //   type: "Feature",
      //   properties: {
      //     type,
      //     value: valueFloat,
      //   },
      //   geometry: {
      //     type: "Point",
      //     coordinates: [lon, lat],
      //   }
      // }) + "\n");
    });
  }

  await fs.promises.rm("./tiles", { recursive: true });
  for (const [tileIdx, img] of Object.entries(tiles)) {
    const [x, y, z] = tileIdx.split("/").map((s) => parseInt(s));
    const dir = `./tiles/${z}/${x}`;
    await fs.promises.mkdir(dir, { recursive: true });
    const file = `${dir}/${y}.png`;
    await fs.promises.writeFile(file, PNG.sync.write(img));
  }
  await fs.promises.writeFile(
    "./tiles/metadata.json",
    JSON.stringify({
      "name": "GSI DEM",
      "description": "GSI DEM",
      "attribution": "GSI",
      "format": "png",
      "type": "overlay",
      "version": "3",
      "minzoom": `${TGT_ZOOM}`,
      "maxzoom": `${TGT_ZOOM}`,
      "bounds": turfBbox(allMeshesPolygon).join(','),
    }),
  );
};

main();
