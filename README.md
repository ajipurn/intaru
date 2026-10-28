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
- 29 layer: 17 pola ruang, 7 ketentuan khusus, jaringan transportasi, LSD, LP2B, dan 2 batas administrasi.
- Checkbox kategori memilih atau menonaktifkan seluruh layer di dalamnya. Tanda minus menunjukkan sebagian terpilih; pengaturan kategori lain tetap dipertahankan dan pilihan tersimpan saat refresh.
- Panel filter memakai jumlah aktif dan tombol **Hapus filter** yang tetap terjangkau saat daftar digulir. Daftar chip aktif dihapus; pemilihan layer dan indikator loading tidak mengubah tinggi daftar di atasnya.
- Pengaturan opasitas, legenda, peta jalan, satelit, dan topografi.
- Tampilan awal menyesuaikan seluruh batas Kebumen dengan ukuran peta, termasuk saat ukuran layar berubah sebelum peta digeser atau diperbesar. Tombol bidik mengembalikan tampilan ke seluruh Kebumen tanpa mengubah layer aktif.
- Layer aktif (termasuk pilihan kosong), peta dasar, opasitas, identifikasi, legenda, posisi, dan zoom tersimpan di `localStorage` dengan key `intaru.map.v1`. Refresh dan perpindahan halaman mempertahankan pengaturan. Data simpanan divalidasi; jika penyimpanan browser tidak tersedia, peta tetap dapat dipakai selama sesi berjalan.
- Area di luar Kebumen diredupkan mengikuti gabungan batas kecamatan, termasuk pesisir dan pulau kecil. Lapisan fokus ini tetap aktif saat layer lain dimatikan dan tidak menangkap klik peta.
- Mask luar Kebumen memakai renderer SVG tersendiri, poligon tanpa clipping, dan overflow yang tetap terlihat selama drag. Layer data tetap memakai Canvas. Fixture regresi browser tersedia di `/tests/region-mask.html` saat menjalankan `pnpm dev`; tekan **Fit Kebumen**, lalu drag horizontal/vertikal melewati 10% ukuran layar. Hasil harus menunjukkan `PASS` dengan nol celah sebelum mouse dilepas. Fixture tidak masuk build produksi.
- Pada citra satelit, batas kecamatan berwarna putih dan batas desa kuning putus-putus dengan tepi gelap. Batas administrasi berada di atas layer kawasan; hasil pencarian diberi sorotan kuning. Warna kembali ke palet semula saat memilih peta jalan atau topografi.
- Peta, sidebar, legenda, dan informasi lokasi memakai definisi simbol yang sama di `src/lib/map-symbols.ts`. Layer multikategori memiliki indikator beragam warna dan rincian kategori dari fitur yang dimuat; sampel mengikuti jenis garis/area, peta dasar, dan opasitas.
- Identifikasi kawasan pada layer aktif melalui indeks spasial PostGIS; mode snapshot memeriksa geometri asli di worker. Untuk jalan, klik garisnya untuk melihat atribut.
- Informasi lokasi menampilkan nama kawasan sekali, menormalkan awalan kecamatan, dan menggabungkan hasil yang identik. Setiap hasil memiliki simbol sesuai layer dan klasifikasinya, termasuk garis transportasi; klasifikasi atau kecamatan yang berbeda tetap ditampilkan terpisah.
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

`data/source/manifest.json` mencatat sumber, waktu pengambilan, checksum SHA-256, jumlah fitur, atribut, jenis geometri, dan bounds setiap layer. Seluruh folder `data/` dan `public/data/`, termasuk metadata, GeoJSON mentah, gzip, salinan tampilan, dan mask, diabaikan Git. `data:prepare` juga dapat memakai aset gzip lokal yang sudah tersedia.

`data:prepare` membuat salinan tampilan pada `public/data/display/` dengan toleransi simplifikasi 0,000005 derajat (sekitar 0,55 m di Kebumen), koordinat tujuh desimal, dan atribut untuk label/warna. Jumlah fitur dan ring dipertahankan. Salinan ini hanya untuk menggambar peta; file asli dan geometri PostGIS tidak diubah. Nama aset memuat hash isi dan versi resep. Importer Supabase mengunggah salinan ini ke Storage dan mencatatnya di kolom `display_asset_path`; kegagalan aset tampilan kembali ke aset asli.

Resep `v3` mempertahankan atribut klasifikasi seperti `KRB_03`, `KKOP_1`, dan `KSMPDN`. Bencana dibedakan berdasarkan jenis dan tingkat kerawanan. Sesuai renderer sumber, fitur dengan beberapa bencana memakai warna bencana pertama; informasi lokasi tetap menampilkan seluruh keterangannya. Nilai yang tidak dikenali diberi label klasifikasi belum tersedia, bukan dianggap sebagai gempa. `symbol_ids` pada katalog mencatat kategori yang benar-benar ada dalam ekspor.

Exporter hanya mengizinkan fungsi baca publik yang diamati. Tidak memanggil verifikasi PIN atau fungsi administrasi. Endpoint callback adalah protokol internal Apps Script; jika Google atau pemilik aplikasi mengubahnya, exporter mungkin perlu diperbarui. Aplikasi hasil build tetap memakai snapshot dan tidak bergantung pada callback tersebut.

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
3. Jalankan `pnpm data:import`. Importer mengunggah gzip asli, salinan tampilan, dan mask Kebumen ke Storage, mengimpor desa, dan memasukkan fitur PostGIS dalam batch. Upsert menggunakan ID sumber dan indeks fitur sehingga pengulangan tidak membuat duplikat. Untuk memperbarui aset Storage dan katalog saja tanpa mengimpor ulang fitur, jalankan `pnpm data:import:assets`.
4. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` dengan URL dan publishable/anon key project yang sama. Restart Vite atau build ulang. Kedua variabel wajib diisi bersama; kegagalan Supabase ditampilkan sebagai error.

**Jangan beri prefiks `VITE_` pada service role key.** Key itu hanya dipakai importer dan tidak dimasukkan ke bundle browser. File `.env` diabaikan Git.

Frontend membaca katalog, desa, dan URL Storage dari Supabase. Identifikasi memakai `identify_location(p_lat, p_lng, p_layers)` pada geometri asli PostGIS dan menghormati RLS. Tampilan peta dasar berjalan sambil katalog dimuat. GeoJSON diurai dalam worker, ditambahkan ke Leaflet dalam batch dengan anggaran sekitar 8 ms, dan disimpan dalam cache TanStack Query tanpa perbandingan mendalam geometri. Perubahan opasitas diterapkan saat slider dilepas; perubahan panel tidak membuat ulang geometri. Kode peta dan sidebar dimuat terpisah sesuai ukuran layar.

Build menggunakan dua variabel `VITE_SUPABASE_*` dari konfigurasi project. Service role key hanya digunakan importer lokal. Jangan menyimpannya dalam kode atau konfigurasi hosting frontend.

## Deploy ke Vercel

`vercel.json` menjalankan `pnpm build:app` (TypeScript dan Vite saja), karena dataset lokal tidak ada di Git dan mode Supabase tidak membutuhkannya. `pnpm build` tetap menyiapkan data lokal terlebih dahulu untuk mode snapshot.

1. Pastikan seluruh migration sudah diterapkan dan `pnpm data:import` (atau `pnpm data:import:assets`) serta `pnpm data:import:enrichment` sudah dijalankan.
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
- Audit regresi setiap fitur pada seluruh 29 layer: simbol dan label asli cocok dengan salinan tampilan; simbol peta, sampel sidebar, dan legenda cocok pada peta jalan, satelit, dan topografi. Mencakup seluruh 54.886 fitur, 12 kombinasi bencana yang tergambar, dan 5 kategori transportasi. Audit ini memerlukan dataset lokal dan dilewati dengan pesan eksplisit jika snapshot belum tersedia; tes unit lain tetap berjalan.
- TypeScript dan build Vite.
- Semua 29 layer berhasil diekspor: **54.886 fitur**, sekitar **182,9 MB JSON** / **57,4 MB gzip**.
- Verifikasi browser desktop serta lebar 390 dan 320 piksel mencakup pencarian Adiluhur, pencarian koordinat, layer/legenda, serta Escape/pengembalian fokus.

## Referensi

- [Aplikasi sumber](https://script.google.com/macros/s/AKfycbxTNBb_lzPMLlIqEMPue0QPFcXyjRTcLhJZTt0rmB_yqCn87Ihtn_Qv197eeZ_sgbKx/exec)
- [React Aria](https://react-aria.adobe.com/getting-started)
- [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview)
- [PostGIS di Supabase](https://supabase.com/docs/guides/database/extensions/postgis)
