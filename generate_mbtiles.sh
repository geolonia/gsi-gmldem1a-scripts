#!/bin/bash -e

tippecanoe \
  --force -o output_points.mbtiles -l dem1a \
  --read-parallel \
  -Z19 -z19 \
  ./output_points.ndgeojson

tippecanoe \
  --force -o output_meshpolys.mbtiles -l dem1a_mesh \
  --read-parallel \
  --detect-shared-borders \
  -Z0 -z19 \
  ./output_meshpolys.ndgeojson

tile-join \
  --force -o output.mbtiles \
  output_points.mbtiles \
  output_meshpolys.mbtiles

pmtiles convert output.mbtiles output_all.pmtiles
