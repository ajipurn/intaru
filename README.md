# INTARU

Clone fungsional peta publik **Intip Peta Tata Ruang Kebumen** dengan React 19, Vite, TypeScript, Tailwind CSS 4, TanStack Query, React Aria Components, React Leaflet, dan Supabase/PostGIS.

## Menjalankan

Butuh Node.js 22.12+ dan pnpm 10 (versi tercatat di `packageManager` pada `package.json`; `corepack enable` dapat mengaktifkannya).

```sh
pnpm install --frozen-lockfile
```

Salin `.env.example` ke `.env` untuk konfigurasi lokal. Dataset tidak disertakan di repository. Sebelum menjalankan aplikasi atau membuat build, sediakan folder `data/source/` dan `public/data/` dari salinan lokal yang sesuai, atau jalankan ekspor publik berikut:

```sh
pnpm data:export
pnpm data:prepare
pnpm dev
```

Tanpa konfigurasi Supabase, aplikasi memakai snapshot lokal di `public/data/`. Data tersebut berasal dari fungsi baca publik aplikasi sumber, bukan data contoh. GeoJSON dimuat per layer dan disimpan dalam cache TanStack Query. Mode Supabase tidak membaca `public/data/` sama sekali: katalog, geometri tampilan, dan mask Kebumen diambil dari Supabase.

```sh
pnpm test
pnpm build
pnpm preview
```

## Fitur

- Pencarian 460 desa/kelurahan dan 26 kecamatan, dengan sorotan batas wilayah.
- Pencarian koordinat `latitude, longitude`, misalnya `-7.6780, 109.6600`.
- 39 layer: 17 pola ruang, 7 ketentuan khusus, 11 struktur ruang (jaringan transportasi dari aplikasi sumber dan 10 layer dari [Portal Tata Ruang Kebumen](#struktur-ruang-dari-portal-tata-ruang)), LSD, LP2B, dan 2 batas administrasi.
- Checkbox kategori memilih atau menonaktifkan seluruh layer di dalamnya. Tanda minus menunjukkan sebagian terpilih; pengaturan kategori lain tetap dipertahankan dan pilihan tersimpan saat refresh.
- Panel filter memakai jumlah aktif dan tombol **Hapus filter** yang tetap terjangkau saat daftar digulir. Daftar chip aktif dihapus; pemilihan layer dan indikator loading tidak mengubah tinggi daftar di atasnya.
- Pengaturan opasitas, legenda, peta jalan, satelit, dan topografi.
- Tampilan awal menyesuaikan seluruh batas Kebumen dengan ukuran peta, termasuk saat ukuran layar berubah sebelum peta digeser atau diperbesar. Tombol bidik mengembalikan tampilan ke seluruh Kebumen tanpa mengubah layer aktif.
- Layer aktif (termasuk pilihan kosong), peta dasar, opasitas, identifikasi, legenda, posisi, dan zoom tersimpan di `localStorage` dengan key `intaru.map.v1`. Refresh dan perpindahan halaman mempertahankan pengaturan. Data simpanan divalidasi; jika penyimpanan browser tidak tersedia, peta tetap dapat dipakai selama sesi berjalan.
- Area di luar Kebumen diredupkan mengikuti gabungan batas kecamatan, termasuk pesisir dan pulau kecil. Lapisan fokus ini tetap aktif saat layer lain dimatikan dan tidak menangkap klik peta.
- Mask luar Kebumen memakai renderer SVG tersendiri, poligon tanpa clipping, dan overflow yang tetap terlihat selama drag. Layer data tetap memakai Canvas. Fixture regresi browser tersedia di `/tests/region-mask.html` saat menjalankan `pnpm dev`; tekan **Fit Kebumen**, lalu drag horizontal/vertikal melewati 10% ukuran layar. Hasil harus menunjukkan `PASS` dengan nol celah sebelum mouse dilepas. Fixture tidak masuk build produksi.
- Pada citra satelit, batas kecamatan berwarna putih dan batas desa kuning putus-putus dengan tepi gelap. Batas administrasi berada di atas layer kawasan; hasil pencarian diberi sorotan kuning. Warna kembali ke palet semula saat memilih peta jalan atau topografi.
- Peta, sidebar, legenda, dan informasi lokasi memakai definisi simbol yang sama di `src/lib/map-symbols.ts`. Layer multikategori memiliki indikator beragam warna dan rincian kategori dari fitur yang dimuat; sampel mengikuti jenis garis/area, peta dasar, dan opasitas.
- Identifikasi kawasan pada layer aktif melalui indeks spasial PostGIS; mode snapshot memeriksa geometri asli di worker. Titik dan garis struktur ruang (jalan, jaringan, dan fasilitas) diidentifikasi dengan mengklik fiturnya. Fitur ini digambar pada canvas tersendiri di atas kawasan dan batas, dengan area klik diperlebar 5 piksel agar mudah diketuk di ponsel; garis selalu berada di bawah titik. Klik di luar fitur tetap mengidentifikasi kawasan di bawahnya.
- Informasi lokasi menampilkan nama kawasan sekali, menormalkan awalan kecamatan, dan menggabungkan hasil yang identik. Setiap hasil memiliki simbol sesuai layer dan klasifikasinya, termasuk garis dan titik struktur ruang; klasifikasi atau kecamatan yang berbeda tetap ditampilkan terpisah. Untuk struktur ruang, nama fitur dari `REMARK` (misalnya nama jalan, gardu induk, atau operator menara) ditampilkan di bawah jenisnya, kecuali bernilai "Tidak Ada".
- Legenda mengikuti urutan kelompok di sidebar. Layer titik memakai lingkaran berwarna dengan tepi putih; ukurannya mengikuti hierarki (misalnya PKW lebih besar dari PKL). Jaringan sekunder digambar putus-putus.
- Informasi lokasi juga menampilkan desa/kelurahan dan kecamatan titik beserta jumlah penduduk 2025 (Disdukcapil Kebumen), luas dan kepadatan (BPS Kebumen), prakiraan cuaca BMKG beberapa jam ke depan, dan hingga delapan fasilitas umum OpenStreetMap dalam radius 1,5 km. Pencarian kecamatan menampilkan jumlah penduduknya.
- Overlay bahaya banjir, tanah longsor, atau tsunami dari InaRISK BNPB, terpisah dari layer tata ruang, dengan legenda indeks 0–1. Tile digambar pada canvas yang dipotong mengikuti mask Kebumen, sehingga indeks berhenti di batas kabupaten.
- Sidebar desktop dan panel mobile, keyboard, serta modal React Aria dengan pengembalian fokus.

Tata letak dibuat ulang untuk React; fungsi backend Google Apps Script dan modul administrasi internal tidak disalin. Peta dasar memakai layanan tile OSM/Esri dengan atribusi.

## Ekspor ulang dari sumber

```sh
# Sampel: katalog, desa, dan satu layer GeoJSON.
node scripts/export-apps-script.mjs --out data/sample

# Seluruh data peta publik, diminta secara berurutan.
pnpm data:export

# Jika ekspor terputus, gunakan kembali file yang checksum-nya sesuai.
node scripts/export-apps-script.mjs --all --resume

# Kemas untuk frontend.
pnpm data:prepare
```

`data/source/manifest.json` mencatat sumber, waktu pengambilan, checksum SHA-256, jumlah fitur, atribut, jenis geometri, dan bounds setiap layer. `pnpm data:export` juga menjalankan `pnpm data:export:tataruang`, yang menulis layer Portal Tata Ruang ke `data/source/tataruang/` (lihat di bawah). Seluruh folder `data/` dan `public/data/`, termasuk metadata, GeoJSON mentah, gzip, salinan tampilan, dan mask, diabaikan Git. `data:prepare` juga dapat memakai aset gzip lokal yang sudah tersedia.

`data:prepare` membuat salinan tampilan pada `public/data/display/` dengan toleransi simplifikasi 0,000005 derajat (sekitar 0,55 m di Kebumen), koordinat tujuh desimal, dan atribut untuk label/warna. Jumlah fitur dan ring dipertahankan. Salinan ini hanya untuk menggambar peta; file asli dan geometri PostGIS tidak diubah. Nama aset memuat hash isi dan versi resep. Importer Supabase mengunggah salinan ini ke Storage dan mencatatnya di kolom `display_asset_path`; kegagalan aset tampilan kembali ke aset asli.

Resep `v3` mempertahankan atribut klasifikasi seperti `KRB_03`, `KKOP_1`, dan `KSMPDN`. Bencana dibedakan berdasarkan jenis dan tingkat kerawanan. Sesuai renderer sumber, fitur dengan beberapa bencana memakai warna bencana pertama; informasi lokasi tetap menampilkan seluruh keterangannya. Nilai yang tidak dikenali diberi label klasifikasi belum tersedia, bukan dianggap sebagai gempa. `symbol_ids` pada katalog mencatat kategori yang benar-benar ada dalam ekspor.

Exporter hanya mengizinkan fungsi baca publik yang diamati. Tidak memanggil verifikasi PIN atau fungsi administrasi. Endpoint callback adalah protokol internal Apps Script; jika Google atau pemilik aplikasi mengubahnya, exporter mungkin perlu diperbarui. Aplikasi hasil build tetap memakai snapshot dan tidak bergantung pada callback tersebut.

## Struktur ruang dari Portal Tata Ruang

```sh
# Unduh 10 layer struktur ruang ke data/source/tataruang/ beserta manifest.
pnpm data:export:tataruang
# Kemas bersama layer lain (juga dijalankan oleh pnpm build).
pnpm data:prepare
```

[Portal Tata Ruang Kabupaten Kebumen](https://tataruang.kebumenkab.go.id/index.php/peta) menyajikan GeoJSON anonim per layer di `index.php/peta/geojson/struktur/{id}`. Portal tidak mengirim header CORS, sehingga data diunduh saat ekspor lalu disajikan sendiri melalui Supabase Storage dan `map_features` (atau `public/data/` dalam mode snapshot). Daftar layer, nama, dan simbolnya ada di `src/lib/structure-layers.ts`; exporter dan peta memakai daftar yang sama.

Exporter mencocokkan judul layer di halaman peta portal (`strukturConfig`) dengan daftar tersebut dan berhenti jika ada yang berubah. Koordinat titik dikirim dalam 4D (`[x, y, 0, -1.797e308]`) dan dipangkas menjadi 2D. CRS diperiksa sebagai WGS84 lon/lat lewat bounds Kebumen, dan jenis geometri harus sesuai daftar. Respons asli disimpan di `raw/`, dan GeoJSON 2D di `geojson/`. `manifest.json` mencatat URL, judul portal, waktu pengambilan per layer, checksum SHA-256 respons asli dan hasil, jumlah fitur, atribut, bounds, setiap nilai `SBDATA` beserta jumlah fitur dan tahunnya, serta rentang tahun data. Atribut mengikuti skema RTRW ATR/BPN: `NAMOBJ` (jenis objek, dasar simbol), `REMARK` (nama), `ORDE01`–`ORDE04`, `JNSRSR`, dan `SBDATA` (sumber data).

| ID portal | Layer | Geometri | Fitur | Tahun `SBDATA` |
| --- | --- | --- | ---: | --- |
| 14 | Sistem Infrastruktur Transportasi | Titik | 655 | 2019–2023 |
| 3 | Sistem Jaringan Energi | Garis | 12 | 2020–2022 |
| 1 | Sistem Infrastruktur Energi | Titik | 7 | 2021–2022 |
| 11 | Sistem Jaringan Telekomunikasi | Garis | 18 | 2019 |
| 8 | Sistem Infrastruktur Telekomunikasi | Titik | 304 | 2022 |
| 10 | Sistem Jaringan Sumber Daya Air | Garis | 260 | 2022 |
| 2 | Sistem Infrastruktur Sumber Daya Air | Titik | 24 | 2022 |
| 9 | Sistem Jaringan Prasarana Lainnya | Garis | 3.475 | 2022–2023 |
| 7 | Sistem Infrastruktur Prasarana Lainnya | Titik | 359 | 2018–2022 |
| 13 | Sistem Pusat Permukiman | Titik | 17 | 2022 |

Total 5.131 fitur, 6,1 MB JSON (1,5 MB gzip; salinan tampilan 0,5 MB). Ekspor 28 Oktober 2026. Layer 12 (jaringan transportasi) tidak diambil karena geometrinya sama dengan layer transportasi dari aplikasi sumber. Layer 14 berisi jembatan, stasiun, terminal, dan pelabuhan berupa titik; layer transportasi yang ada hanya berisi 298 garis jalan dan rel, jadi tidak ada duplikasi.

**Lisensi belum jelas.** Portal tidak mencantumkan ketentuan penggunaan atau lisensi. Pemilik data adalah Bidang Tata Ruang dan Pertanahan, DPUPR Kabupaten Kebumen (dpupr.kebumenkab@gmail.com). Legenda dan informasi lokasi menyebut sumber ini setiap kali layernya aktif. Mintalah izin atau kejelasan lisensi dari DPUPR sebelum data ini dipublikasikan lebih luas.

## Data pengayaan

```sh
# Unduh sumber mentah ke data/enrichment/ beserta manifest (URL, waktu, SHA-256, lisensi).
pnpm data:enrich
# Atau hanya sebagian sumber: penduduk, fasilitas, luas.
pnpm data:enrich luas

# Olah ke public/data/enrichment/ (juga dijalankan oleh pnpm build).
pnpm data:prepare
```

| Data | Sumber | Catatan |
| --- | --- | --- |
| Penduduk per kecamatan 2025 | [Open Data Kebumen](https://opendata.kebumenkab.go.id/en/dataset/jumlah-penduduk-per-kecamatan-tahun-2025-e15fce), Disdukcapil | XLSX menyimpan pemisah ribuan sebagai desimal (69.01 = 69.010 jiwa). Nilai dipulihkan lalu wajib berjumlah sama dengan total lembar (1.453.417). Kode Kemendagri dicocokkan dengan nama kecamatan di batas desa sebelum digabung. Dataset tidak mencantumkan lisensi. |
| Luas kecamatan 2025 | [BPS Kebumen](https://kebumenkab.bps.go.id/id/statistics-table/3/VUZwV01tSlpPVlpsWlRKbmMxcFhhSGhEVjFoUFFUMDkjMw==/luas-daerah-dan-jumlah-pulau-menurut-kecamatan-di-kabupaten-kebumen--2024.html?year=2025), Podes | Tabel dibaca dari payload halaman; wajib berjumlah sama dengan total 1.281,12 km². Dicocokkan dengan nama kecamatan karena kode BPS berbeda dari Kemendagri. Boleh digunakan ulang dengan menyebut BPS. |
| Prakiraan cuaca | [BMKG](https://data.bmkg.go.id/prakiraan-cuaca/) | Dipanggil langsung dari browser per desa memakai kode `KDEPUM` batas desa; tiga hari per tiga jam, cache 30 menit. Atribusi BMKG wajib. |
| Fasilitas umum | OpenStreetMap melalui Overpass API | 577 fasilitas setelah dipotong ke batas kecamatan dan 40 duplikat (nama dan jenis sama dalam 300 m) dihapus. Kelengkapan sangat timpang: Kebumen 110 fasilitas, sementara Padureso dan Karangsambung masing-masing 1. Lisensi ODbL; atribusi tampil di panel. |
| Indeks bahaya | [InaRISK BNPB](https://gis.bnpb.go.id/server/rest/services/inarisk) | Gambar `exportImage` dimuat langsung per tile di dalam bounds Kebumen, resolusi 100 m. Layanan tidak mencantumkan tahun, lisensi, maupun kelas legenda; antarmuka menyatakan hal itu dan memakai gradasi warna layanan. |

Saat memakai Supabase, aplikasi membaca tabel `district_population` dan RPC `nearby_facilities`. Selama migration `202610280001_enrichment.sql` belum diterapkan, aplikasi memakai snapshot di `public/data/enrichment/` (satu permintaan 404 per sesi). Setelah migration diterapkan, jalankan `pnpm data:import:enrichment`.

## Mengaktifkan Supabase

1. Terapkan file SQL di `supabase/migrations/` secara berurutan melalui Supabase CLI atau SQL editor project. Migration membuat tabel, PostGIS, indeks spasial, bucket publik `map-data`, serta kebijakan RLS baca publik. Migration berikutnya membatasi pemanggilan helper event trigger RLS ke role server. Tidak ada hak tulis browser.
2. Salin `.env.example` ke `.env`, lalu isi `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` untuk importer di mesin lokal.
3. Jalankan `pnpm data:import`. Importer mengunggah gzip asli, salinan tampilan, dan mask Kebumen ke Storage, mengimpor desa, dan memasukkan fitur PostGIS dalam batch. Upsert menggunakan ID sumber dan indeks fitur sehingga pengulangan tidak membuat duplikat. Untuk memperbarui aset Storage dan katalog saja tanpa mengimpor ulang fitur, jalankan `pnpm data:import:assets`. Untuk mengimpor hanya layer Portal Tata Ruang (ID `tataruang-struktur-*`) tanpa menyentuh layer lain, desa, maupun mask, jalankan `pnpm data:import:tataruang`. Opsi `--only <awalan ID>` pada importer berlaku untuk awalan lain. Layer portal dicatat dengan waktu pengambilannya sendiri di `imported_at`.
4. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` dengan URL dan publishable/anon key project yang sama. Restart Vite atau build ulang. Kedua variabel wajib diisi bersama; kegagalan Supabase ditampilkan sebagai error.

**Jangan beri prefiks `VITE_` pada service role key.** Key itu hanya dipakai importer dan tidak dimasukkan ke bundle browser. File `.env` diabaikan Git.

Frontend membaca katalog, desa, dan URL Storage dari Supabase. Identifikasi memakai `identify_location(p_lat, p_lng, p_layers)` pada geometri asli PostGIS dan menghormati RLS. Tampilan peta dasar berjalan sambil katalog dimuat. GeoJSON diurai dalam worker, ditambahkan ke Leaflet dalam batch dengan anggaran sekitar 8 ms, dan disimpan dalam cache TanStack Query tanpa perbandingan mendalam geometri. Perubahan opasitas diterapkan saat slider dilepas; perubahan panel tidak membuat ulang geometri. Kode peta dan sidebar dimuat terpisah sesuai ukuran layar.

Build menggunakan dua variabel `VITE_SUPABASE_*` dari konfigurasi project. Service role key hanya digunakan importer lokal. Jangan menyimpannya dalam kode atau konfigurasi hosting frontend.

## Deploy ke Vercel

`vercel.json` menjalankan `pnpm build:app` (TypeScript dan Vite saja), karena dataset lokal tidak ada di Git dan mode Supabase tidak membutuhkannya. `pnpm build` tetap menyiapkan data lokal terlebih dahulu untuk mode snapshot.

1. Pastikan seluruh migration sudah diterapkan dan `pnpm data:import` (atau `pnpm data:import:assets`, ditambah `pnpm data:import:tataruang` untuk layer struktur ruang baru) serta `pnpm data:import:enrichment` sudah dijalankan. Mode Supabase hanya menampilkan layer yang ada di tabel `map_layers`.
2. Hubungkan repository GitHub ke project Vercel.
3. Isi `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, dan `INTARU_PASSWORD` pada Environment Variables project. Jangan menambahkan service role key.

Branch `main` menghasilkan deployment produksi; branch lain menghasilkan preview.

### Password situs

`middleware.ts` meminta sesi untuk setiap halaman dan aset, kecuali `/login.html`, `/api/login`, dan ikon. Form login mengirim password ke `api/login.ts`, yang membandingkannya dengan `INTARU_PASSWORD` lalu memasang cookie `HttpOnly` bertanda tangan HMAC selama 30 hari. Password menjadi kunci tanda tangan, sehingga mengganti password mengeluarkan semua sesi. Tombol **Keluar** di footer menghapus cookie. Tanpa `INTARU_PASSWORD`, deployment menjawab 503 dan tidak menampilkan apa pun.

Password tidak memakai prefiks `VITE_` agar tidak masuk ke bundle browser. Gerbang ini hanya berjalan di Vercel dan `vercel dev`; `pnpm dev` tidak meminta password. Gerbang melindungi aplikasi, bukan data Supabase: tabel dan Storage tetap dapat dibaca siapa pun yang memegang publishable key.

## Isi repository publik

Kode aplikasi, skrip ekspor/impor, migrasi SQL, lockfile, dan `.env.example` dapat dilacak Git. Konfigurasi `.env`, dataset sumber dan hasil olah, backup database, konfigurasi tooling lokal, serta laporan audit internal dikecualikan melalui `.gitignore`. Simpan salinan data dan konfigurasi lokal secara terpisah.

Pengabaian Git hanya mengatur isi repository. Vite tetap menyalin seluruh `public/` ke hasil build; dataset yang dipasang pada hosting web akan dapat diunduh pengunjung. Jangan menaruh data privat dalam folder tersebut.

File yang pernah masuk commit tetap ada dalam riwayat meskipun sudah diabaikan dan dilepas dari index. Bersihkan riwayat atau gunakan repository baru dengan riwayat bersih sebelum memublikasikan repository yang sebelumnya menyimpan dataset atau konfigurasi lokal.

## Pemeriksaan

- Tes Node untuk decoding respons Apps Script, normalisasi LSD `GeometryCollection`, koordinat, lubang dan batas poligon, pencarian desa/kecamatan, serta warna kerawanan.
- Tes informasi lokasi mencakup nama berulang, awalan kecamatan, batas desa/kecamatan, alias LP2B, keterangan bencana lengkap, simbol jalan, dan penggabungan hasil yang identik tanpa menggabungkan klasifikasi berbeda.
- Tes penyimpanan peta mencakup round trip, pilihan layer kosong, nilai boolean `false`, zoom pecahan, versi tidak didukung, data rusak, dan storage yang ditolak browser. Verifikasi refresh di browser mencakup layer, peta dasar, opasitas, identifikasi, legenda, serta posisi/zoom; fit Kebumen diperiksa pada desktop, lebar 390, dan 320 piksel.
- Audit regresi setiap fitur pada seluruh 39 layer: simbol dan label asli cocok dengan salinan tampilan; simbol peta, sampel sidebar, dan legenda cocok pada peta jalan, satelit, dan topografi. Mencakup seluruh 60.017 fitur, 12 kombinasi bencana yang tergambar, 5 kategori transportasi, dan 40 kategori struktur ruang Portal Tata Ruang; tidak ada fitur yang jatuh ke klasifikasi belum tersedia. Audit ini memerlukan dataset lokal dan dilewati dengan pesan eksplisit jika snapshot belum tersedia; tes unit lain tetap berjalan.
- TypeScript dan build Vite.
- Semua 29 layer aplikasi sumber berhasil diekspor: **54.886 fitur**, sekitar **182,9 MB JSON** / **57,4 MB gzip**. Ditambah 10 layer Portal Tata Ruang: **5.131 fitur**, 6,1 MB JSON / 1,5 MB gzip.
- Tes exporter Portal Tata Ruang mencakup pemangkasan koordinat 4D, tahun dari catatan `SBDATA`, dan pembacaan daftar layer dari halaman peta.
- Verifikasi browser desktop serta lebar 390 dan 320 piksel mencakup pencarian Adiluhur, pencarian koordinat, layer/legenda, serta Escape/pengembalian fokus. Layer struktur ruang diperiksa pada desktop dan lebar 390 piksel: klik titik dan garis, ketukan di samping titik, legenda, atribusi, serta peta jalan dan satelit.

## Referensi

- [Aplikasi sumber](https://script.google.com/macros/s/AKfycbxTNBb_lzPMLlIqEMPue0QPFcXyjRTcLhJZTt0rmB_yqCn87Ihtn_Qv197eeZ_sgbKx/exec)
- [Portal Tata Ruang Kabupaten Kebumen](https://tataruang.kebumenkab.go.id/index.php/peta)
- [React Aria](https://react-aria.adobe.com/getting-started)
- [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview)
- [PostGIS di Supabase](https://supabase.com/docs/guides/database/extensions/postgis)
