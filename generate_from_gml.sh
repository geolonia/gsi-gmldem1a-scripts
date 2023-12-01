#!/bin/bash -e

# First, convert each GML file to a GeoTIFF file in parallel
# then, merge all GeoTIFF files into a single GeoTIFF file
# finally, split the GeoTIFF file in to tiles
# Note: this script requires GNU Parallel

# usage: ./generate_from_gml.sh <input_dir> <output_dir>

npm run build

mkdir -p "$2"
mkdir -p "$2"/meshtiffs

TILE_SIZE=256

# Convert GML files to GeoTIFF files
find "$1" -name '*.xml' | parallel --progress node ./dist/gml-to-terrainrgb.js {} "$2"/meshtiffs/{/.}.tif

# Merge GeoTIFF files into a single GeoTIFF file
find "$2"/meshtiffs/ -name '*.tif' > "$2"/filelist.txt

# gdal_merge.py -o ./out.tif -co COMPRESS=DEFLATE --optfile ./filelist.txt

