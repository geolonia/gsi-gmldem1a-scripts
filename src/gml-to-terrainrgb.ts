#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { exec as _exec } from "node:child_process";
import { promisify } from "node:util";

import { XMLParser } from "fast-xml-parser";
import jismesh from 'jismesh-js';
import { PNG } from "pngjs";

const exec = promisify(_exec);

const X_WIDTH = 1125;
const Y_HEIGHT = 750;

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
  const coverage = json['Dataset']['DEM']['coverage'];
  const values: string[] = coverage['gml:rangeSet']['gml:DataBlock']['gml:tupleList'].split("\n");
  const startPoint = coverage['gml:coverageFunction']['gml:GridFunction']['gml:startPoint'].split(" ").map((s: string) => parseInt(s));
  const startPointX = startPoint[0];
  const startPointY = startPoint[1];

  const [latSW, lonSW] = jismesh.toMeshPoint(fileMesh, 0, 0);
  const [latNE, lonNE] = jismesh.toMeshPoint(fileMesh, 1, 1);

  const img = new PNG({
    width: X_WIDTH,
    height: Y_HEIGHT,
  });
  img.data.fill(0);

  let pixelsWithValues = 0;
  for (let i = 0; i < values.length; i++) {
    const offsetI = i + startPointX + (startPointY * X_WIDTH);
    const x = offsetI % X_WIDTH;
    const y = Math.floor(offsetI / X_WIDTH);

    const [_type, valueString] = values[i].split(",");
    const valueFloat = parseFloat(valueString);

    if (valueFloat === -9999) {
      continue;
    }

    let box = Math.round(10 * (valueFloat + 10000)).toString(16)
    let boxr = parseInt(box.slice(-6, -4), 16)
    let boxg = parseInt(box.slice(-4, -2), 16)
    let boxb = parseInt(box.slice(-2), 16)

    const pixelIdx = (y * X_WIDTH + x) << 2;
    img.data[pixelIdx] = boxr;
    img.data[pixelIdx + 1] = boxg;
    img.data[pixelIdx + 2] = boxb;
    img.data[pixelIdx + 3] = 255;

    pixelsWithValues++;
  }

  const outPath = path.join(path.dirname(xmlPath), `${fileMesh}.png`);
  await fs.promises.writeFile(outPath, PNG.sync.write(img));
  // console.log(`Wrote ${outPath}, ${pixelsWithValues} pixels with values`);

  const outGeoTIFFPath = process.argv[3] || path.join(path.dirname(xmlPath), `${fileMesh}.tif`);
  await exec(
    `gdal_translate -of GTiff -a_srs EPSG:4326 -a_ullr ${lonSW} ${latNE} ${lonNE} ${latSW} ${outPath} ${outGeoTIFFPath}`
  );

  await fs.promises.rm(outPath);
};

main().catch((e) => {
  console.error(e);
  process.exit(0);
});
