#!/bin/bash -e

tippecanoe \
  --force -o output_points.mbtiles -l dem1a \
  --read-parallel \
  -z17 -Z17 \
  ./output_points.ndgeojson

tippecanoe \
  --force -o output_meshpolys.mbtiles -l dem1a_mesh \
  --read-parallel \
  --detect-shared-borders \
  -z17 -Z0 \
  ./output_meshpolys.ndgeojson

tile-join \
  --force -o output.mbtiles \
  output_points.mbtiles \
  output_meshpolys.mbtiles
