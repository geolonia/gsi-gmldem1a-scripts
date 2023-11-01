#!/usr/bin/env node

import fs from "fs";
import { XMLParser } from "fast-xml-parser";
import jismesh from 'jismesh-js';

import type geojson from "geojson";

const main = async () => {
  const xmlPath = process.argv[2];
  const xml = await fs.promises.readFile(xmlPath);
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: false,
    parseTagValue: false,
  });
  const json = parser.parse(xml.toString());

  const fileMesh = json['Dataset']['DEM']['mesh'];

  const features: geojson.Feature[] = [];

  const [latSW, lonSW] = jismesh.toMeshPoint(fileMesh, 0, 0);
  const [latNE, lonNE] = jismesh.toMeshPoint(fileMesh, 1, 1);
  features.push({
    type: "Feature",
    properties: {
      type: "mesh",
      mesh: fileMesh,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [lonSW, latSW],
          [lonNE, latSW],
          [lonNE, latNE],
          [lonSW, latNE],
          [lonSW, latSW],
        ]
      ]
    }
  });

  const coverage = json['Dataset']['DEM']['coverage'];

  const tupleLimitsLow = coverage['gml:gridDomain']['gml:Grid']['gml:limits']['gml:GridEnvelope']['gml:low'];
  const tupleLimitsHigh = coverage['gml:gridDomain']['gml:Grid']['gml:limits']['gml:GridEnvelope']['gml:high'];
  const values: string[] = coverage['gml:rangeSet']['gml:DataBlock']['gml:tupleList'].split("\n");

  // tupleLimitsLow is x=0, y=0
  // tupleLimitsHigh is x=1124, y=749
  // because 0,0 is inclusive, we have 1125 x 750 = 843750 values
  // length of values is 1125 * 750 = 843750

  // 
  console.log(`${tupleLimitsLow} -> ${tupleLimitsHigh}`);
  console.log(values.length);

  values.forEach((value, index) => {
    const x = index % 1125;
    const y = Math.floor(index / 1125);
    const relativeX = x / 1125 + 1 / 1125 / 2;
    const relativeY = y / 750 + 1 / 750 / 2;
    const [lat, lon] = jismesh.toMeshPoint(fileMesh, relativeX, relativeY)
    const [type, valueString] = value.split(",");
    const valueFloat = parseFloat(valueString);
    
    features.push({
      type: "Feature",
      properties: {
        type,
        value: valueFloat,
      },
      geometry: {
        type: "Point",
        coordinates: [lon, lat],
      }
    });
  });

  await fs.promises.writeFile("output.ndgeojson", 
    features.map((feature) => JSON.stringify(feature)).join("\n") + "\n", 
    {
      encoding: "utf-8",
    }
  );
};

main();
