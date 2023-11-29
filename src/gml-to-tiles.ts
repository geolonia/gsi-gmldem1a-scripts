#!/usr/bin/env node

import fs from "fs";
import { XMLParser } from "fast-xml-parser";
import jismesh from 'jismesh-js';
import { PNG } from "pngjs";
import { bboxToTile, pointToTile, getChildren } from "@mapbox/tilebelt";

// import type geojson from "geojson";

const TILE_RES = 256;

const main = async () => {
  const xmlPath = process.argv[2];
  const tgtZoom = parseInt(process.argv[3]);
  const xml = await fs.promises.readFile(xmlPath);
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: false,
    parseTagValue: false,
  });
  const json = parser.parse(xml.toString());

  const fileMesh = json['Dataset']['DEM']['mesh'];

  const [latSW, lonSW] = jismesh.toMeshPoint(fileMesh, 0, 0);
  const [latNE, lonNE] = jismesh.toMeshPoint(fileMesh, 1, 1);
  const meshBbox = [lonSW, latSW, lonNE, latNE];
  const parentTile = bboxToTile(meshBbox);
 
  console.log(`parent tile: ${parentTile.join("/")}`);

  const coverage = json['Dataset']['DEM']['coverage'];

  // const tupleLimitsLow = coverage['gml:gridDomain']['gml:Grid']['gml:limits']['gml:GridEnvelope']['gml:low'];
  // const tupleLimitsHigh = coverage['gml:gridDomain']['gml:Grid']['gml:limits']['gml:GridEnvelope']['gml:high'];
  const values: string[] = coverage['gml:rangeSet']['gml:DataBlock']['gml:tupleList'].split("\n");

  // tupleLimitsLow is x=0, y=0
  // tupleLimitsHigh is x=1124, y=749
  // because 0,0 is inclusive, we have 1125 x 750 = 843750 values
  // length of values is 1125 * 750 = 843750

  const tiles: { [key: string]: PNG } = {};
  const insertTileTemplate = (tile: number[]) => {
    if (tile[2] === tgtZoom) {
      const tileIdx = tile.join("/");
      // A 3-channel image, with the resolution of TILE_RES x TILE_RES
      tiles[tileIdx] = new PNG({ 
        width: TILE_RES, 
        height: TILE_RES,
        colorType: 2, // RGB
      });
    } else {
      for (const child of getChildren(tile)) {
        insertTileTemplate(child);
      }
    }
  };
  insertTileTemplate(parentTile);

  console.log(
    `Current export covers ${Object.keys(tiles).length} tiles:`,
    Object.keys(tiles).join("\n"),
  );

  values.forEach((value, index) => {
    const x = index % 1125;
    const y = Math.floor(index / 1125);
    // Y = latitude, X = longitude
    const relativeX = x / 1125 + 1 / 1125 / 2;
    const relativeY = y / 750 + 1 / 750 / 2;
    const [lat, lon] = jismesh.toMeshPoint(fileMesh, relativeY, relativeX)
    const [type, valueString] = value.split(",");
    const valueFloat = parseFloat(valueString);

    const tile = pointToTile(lon, lat, tgtZoom);
    const tileIdx = tile.join("/");



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
};

main();
