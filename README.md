# 地理院DEMデータから Terrain RGB 作成

1. GMLデータを `input` ディレクトリに入れる (https://fgd.gsi.go.jp/download/ から入手)
1. CABファイルで来てる場合は cabextract を使う
  1. `cabextract *.cab`
1. zip ファイル（cab内は全部zip）も解凍します
  1. `find . -name "*.zip" | parallel unzip`
1. それぞれのGMLのTerrain RGBを GeoTIFF 型で作る
  1. `./generate_from_gml.sh ./input ./output`
1. filelist.txt にすべての GeoTIFF ファイル名が入っています。こちらを、一つの大きい GeoPackage に統合しましょう
  1. `gdal_merge.py -o ./output/output.gpkg -of GPKG -co TILE_FORMAT=PNG --optfile ./output/filelist.txt`
  1. 途中で止まった場合は、一旦 `output/output.gpkg` を削除してから再実行してください。
  1. 20−30分ぐらいかかります。
1. GeoPackage をタイルに分割する
  1. `gdal2tiles.py --xyz --processes=$(nproc) -x --zoom='14-17' ./output/output.gpkg ./output/tiles`
  1. 途中で止まった場合は、一旦 `output/tiles` を削除してから再実行してください。 `rm -r ./output/tiles`
1. 分割したタイルをmbtilesに入れる
  1. TODO...
