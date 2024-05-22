# 地理院DEMデータから Terrain RGB 作成

## 事前準備

* 地理院「基盤地図情報ダウンロードサービス」の「数値標高モデル」から該当地域のDEM1Aをダウンロードする。
* GNU Parallel をインストールする `brew install parallel`
* GDAL をインストールする `brew install gdal`

## 手順

1. GMLデータを `input` ディレクトリに入れる (https://fgd.gsi.go.jp/download/ から入手)
1. CABファイルで来てる場合は cabextract を使う
    1. `cabextract *.cab`
1. zip ファイル（cab内は全部zip）も解凍します
    1. `find . -name "*.zip" | parallel unzip`
1. それぞれのGMLのTerrain RGBを GeoTIFF 型で作る
    1. `./generate_from_gml.sh ./input ./output`
1. filelist.txt にすべての GeoTIFF ファイル名が入っています。こちらを一つの GeoTIFF ファイルに統合します。
    1. `gdal_merge.py -o ./output/output.tif -of GTiff -co COMPRESS=DEFLATE --optfile ./output/filelist.txt`
    1. 途中で止まった場合は、一旦 `output/output.tif` を削除してから再実行してください。
    1. 20−30分ぐらいかかります。
1. (直接MBTiles生成したい場合はスキップ) 統合された GeoTIFF をタイルに分割する
    1. `gdal2tiles.py --xyz --processes=$(nproc) -x --zoom='14-17' ./output/output.tif ./output/tiles`
    1. 途中で止まった場合は、一旦 `output/tiles` を削除してから再実行してください。 `rm -r ./output/tiles`
1. 分割したタイルをmbtilesに入れる
    1. `gdal_translate -co "ZLEVEL=9" -co "TILE_FORMAT=PNG" -co "ZOOM_LEVEL_STRATEGY=UPPER" -co "RESAMPLING=NEAREST" -of mbtiles ./output/output.tif ./output/output.mbtiles`
    1. メモ: resampling周りがまだ怪しい
