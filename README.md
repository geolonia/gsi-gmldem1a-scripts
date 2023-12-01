# 地理院DEMデータから Terrain RGB 作成

1. GMLデータを `input` ディレクトリに入れる (https://fgd.gsi.go.jp/download/ から入手)
1. CABファイルで来てる場合は cabextract を使う
  1. `cabextract *.cab`
1. zip ファイル（cab内は全部zip）も解凍します
  1. `find . -name "*.zip" | parallel unzip`
1. それぞれのGMLのTerrain RGBをGeoTIFF型で作る
  1. `./generate_from_gml.sh ./input ./output`
1. filelist.txt にすべての GeoTIFF ファイル名が入っています。こちらを、一つの大きい GeoTIFF に統合しましょう
  1. `gdal_merge.py -o ./output.tif -co COMPRESS=DEFLATE --optfile ./filelist.txt`
1. GeoTIFFをタイルに分割する
  1. ...TODO...
