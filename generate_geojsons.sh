#!/bin/bash -e

find "$1" -name "*.xml" -print0 | parallel -0 --eta --bar --line-buffer node ./dist/gml-to-geojson.js '{}' > "./output_points.ndgeojson"
find "$1" -name "*.xml" -print0 | parallel -0 --eta --bar --line-buffer node ./dist/gml-to-geojson.js '{}' --mesh-only > "./output_meshpolys.ndgeojson"
