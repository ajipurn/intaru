# Rencana pengayaan data INTARU

Dicatat pada 27 Oktober 2026. Status: tahap pertama diimplementasikan pada 27 Oktober 2026; tahap kedua (luas BPS dan prakiraan cuaca BMKG) dan tahap ketiga (struktur ruang Portal Tata Ruang) pada 28 Oktober 2026. DEMNAS belum dapat diakses. Layer Portal Tata Ruang belum diimpor ke Supabase produksi, dan lisensinya masih perlu diperjelas ke DPUPR.

Pengayaan data ditujukan untuk memberi konteks tambahan pada peta tata ruang Kebumen: fasilitas sekitar lokasi, profil wilayah, dan potensi bahaya bencana. Prioritas awal yang disarankan adalah OpenStreetMap, data penduduk Kebumen, lalu InaRISK.

## Sumber data dan prioritas

| Prioritas | Sumber | Data dan manfaat | Akses dan ketentuan yang perlu diperhatikan |
| --- | --- | --- | --- |
| 1 | [OpenStreetMap melalui Geofabrik](https://download.geofabrik.de/asia/indonesia/java.html) | Jalan, bangunan, dan titik fasilitas umum untuk pencarian fasilitas sekitar lokasi. | Unduhan Jawa tersedia dalam PBF, SHP, dan GeoPackage. Potong ke wilayah Kebumen dan periksa kelengkapan tiap kategori. Ikuti [lisensi ODbL dan atribusi OSM](https://www.openstreetmap.org/copyright). |
| 2 | [Open Data Kebumen](https://opendata.kebumenkab.go.id/en/dataset/jumlah-penduduk-per-kecamatan-tahun-2025-e15fce) | Jumlah penduduk per kecamatan tahun 2025 untuk profil wilayah dan peta kepadatan. | Dataset contoh menyediakan XLSX, tetapi mencantumkan “No License Provided”. Perjelas ketentuan penggunaan ulang sebelum redistribusi. |
| 3 | [InaRISK BNPB](https://gis.bnpb.go.id/server/rest/services/inarisk) | Layer bahaya dan risiko banjir, tsunami, longsor, dan lainnya untuk dibandingkan dengan kawasan tata ruang. | Layanan GIS publik tersedia. Periksa cakupan Kebumen, tahun, legenda, skala, serta ketentuan penggunaan tiap layer. Bahaya dan risiko harus diberi label berbeda sesuai sumber. |
| Lanjutan | [BPS Kebumen](https://kebumenkab.bps.go.id/id/publication/2026/09/28/2372fd0e6b910c2ec41dacfc/kecamatan-kebumen-dalam-angka-2026.html) | Statistik penduduk, pertanian, sosial, pariwisata, dan transportasi untuk melengkapi profil wilayah. | Pilih tabel dan tahun yang tersedia dalam publikasi. Tingkat rincian mengikuti masing-masing tabel; jangan menganggap semua indikator tersedia sampai desa. |
| Lanjutan | [DEMNAS BIG](https://geoservices.big.go.id/raster/rest/services/DEMNAS/DEM_Indonesia/ImageServer) | Elevasi yang dapat diolah menjadi kontur, kemiringan lereng, dan relief. | Layanan raster tersedia. Pengolahan turunan dilakukan sebelum penyajian ke browser; periksa datum dan satuannya. |
| Lanjutan | [Portal Tata Ruang Kebumen](https://tataruang.kebumenkab.go.id/index.php/peta) | Kategori jaringan energi, sumber daya air, telekomunikasi, dan pusat permukiman untuk melengkapi struktur ruang. | WebGIS tersedia; endpoint dan akses unduhan tiap layer perlu diverifikasi. Bandingkan dengan data INTARU agar tidak menggandakan layer yang sama. |
| Lanjutan | [Data Terbuka BMKG](https://data.bmkg.go.id/prakiraan-cuaca/) | Prakiraan cuaca tiga hari per desa atau kelurahan untuk panel informasi lokasi. | API JSON memakai kode wilayah administrasi tingkat IV, batas 60 permintaan per menit per IP, dan mewajibkan atribusi BMKG. Gunakan cache dan tampilkan waktu pemutakhiran. |

## Urutan integrasi

1. Ambil sampel kecil dari setiap sumber prioritas. Pastikan format, cakupan Kebumen, tahun data, tingkat wilayah, dan ketentuan penggunaannya.
2. Gunakan API, layanan GIS, atau unduhan resmi yang tersedia. Simpan sumber asli dan metadata pengambilan agar pembaruan dapat diulang.
3. Potong data spasial ke wilayah Kebumen, samakan sistem koordinat, lalu periksa geometri dan duplikasi. Cocokkan statistik menggunakan pemetaan kode wilayah; kode BPS dan Kemendagri tidak diasumsikan sama.
4. Simpan data yang sudah diolah di Supabase/PostGIS. Catat penerbit, URL sumber, tahun data, tanggal pengambilan, skala atau resolusi, lisensi, dan transformasi yang dilakukan.
5. Tambahkan layer pilihan dan panel informasi. Muat data sesuai layer aktif, area yang terlihat, dan tingkat zoom; siapkan tile untuk layer besar. Simpan geometri analisis terpisah dari versi tampilan yang disederhanakan.
6. Periksa hasil di beberapa lokasi Kebumen, kecocokan statistik, atribusi, dan performa sebelum merilisnya.

## Hasil tahap pertama

Status implementasi dan temuan pemeriksaan sumber:

- **OpenStreetMap.** Diambil melalui Overpass API, bukan unduhan Geofabrik Jawa (sekitar 1 GB), dengan User-Agent yang mengidentifikasi aplikasi; tanpa itu server menolak dengan HTTP 406. Hasilnya 577 fasilitas dalam enam kategori setelah pemotongan ke batas kecamatan dan penghapusan 40 duplikat. Kelengkapan sangat timpang antarkecamatan, dan sejumlah puskesmas ditandai sebagai rumah sakit sehingga labelnya dikoreksi dari nama.
- **Open Data Kebumen.** Tersedia sebagai XLSX tanpa datastore dan tanpa lisensi (`license_id: null`). Angka per kecamatan tersimpan sebagai desimal karena pemisah ribuan; nilai dipulihkan dan divalidasi terhadap total 1.453.417. Kode Kemendagri (33.05.xx) cocok dengan nama di layer batas desa untuk semua 26 kecamatan. Kepadatan belum dihitung karena luas resmi belum dicocokkan.
- **InaRISK.** Layer `layer_bahaya_*` berupa ImageServer indeks 0–1, resolusi 100 m, tanpa cache tile, tahun, lisensi, maupun label kelas. Overlay memakai `exportImage` per tile di dalam bounds Kebumen dan dipotong mengikuti mask kabupaten. Hanya satu bahaya ditampilkan sekaligus.
- **Supabase.** Migration `202610280001_enrichment.sql` diterapkan dan `pnpm data:import:enrichment` dijalankan pada 28 Oktober 2026. Snapshot statis hanya dipakai jika tabel belum ada.
- **Belum dikerjakan.** Ketentuan penggunaan ulang data penduduk dan InaRISK masih perlu diperjelas ke penerbitnya.

## Hasil tahap kedua

Sampel diambil pada 28 Oktober 2026:

- **BPS Kebumen: diintegrasikan.** Tabel "Luas Daerah dan Jumlah Pulau Menurut Kecamatan di Kabupaten Kebumen, 2025" (sumber Podes) dapat diambil tanpa login, tetapi hanya jika parameter `?year=2025` disertakan. Tabelnya tersimpan sebagai JSON di payload Next.js halaman (`scripts/bps-table.mjs`). Kode BPS (3305010) berbeda dari kode Kemendagri (33.05.01), sehingga luas dicocokkan dengan nama kecamatan, dan jumlah 26 kecamatan wajib sama dengan total yang diterbitkan (1.281,12 km²). Luas geodesik poligon batas sekitar 4% lebih besar, jadi kepadatan memakai angka resmi BPS: 449–3.274 jiwa/km², rata-rata kabupaten 1.134. [Ketentuan BPS](https://kebumenkab.bps.go.id/id/term-of-use) mengizinkan penggunaan ulang, termasuk komersial, dengan menyebut BPS sebagai sumber. Kolom luas disimpan di `district_population` (migration `202610280003_district_area.sql`).
- **BMKG: diintegrasikan.** API `api.bmkg.go.id/publik/prakiraan-cuaca?adm4=` mengizinkan semua origin (CORS `*`) dan memberi `Cache-Control: max-age=3600`, sehingga dipanggil langsung dari browser tanpa proxy. Kode tingkat IV sama dengan atribut `KDEPUM` pada 460 desa/kelurahan di layer batas desa. Respons berisi prakiraan tiga hari per tiga jam. Panel informasi lokasi menampilkan empat slot berikutnya dengan atribusi BMKG; TanStack Query menyimpan hasil 30 menit, jauh di bawah batas 60 permintaan per menit per IP.
- **DEMNAS: belum dapat dipakai.** Metadata layanan dapat dibaca (piksel sekitar 8 m, Float32, datum vertikal EGM2008), tetapi `identify` dan `getSamples` menjawab galat 500 setelah 60 detik, dan `exportImage`, bahkan 10×10 piksel, tidak menjawab dalam 60–120 detik. Elevasi dan kemiringan perlu menunggu layanan pulih, atau memakai DEM terbuka lain yang lisensinya diperiksa terlebih dahulu.
- **Portal Tata Ruang Kebumen: layak dengan catatan, diintegrasikan pada tahap ketiga.** Portal memakai Leaflet dengan GeoJSON per layer di `index.php/peta/geojson/{kecamatan|pola|struktur}/{id}`, tanpa CORS dan tanpa ketentuan penggunaan tertulis (pemilik: Bidang Tata Ruang dan Pertanahan DPUPR Kebumen). Data harus diunduh saat persiapan dan disajikan sendiri. Layer struktur ruang yang belum ada di INTARU: infrastruktur dan jaringan energi, sumber daya air, telekomunikasi, prasarana lainnya, serta sistem pusat permukiman. Sebagian berupa titik dengan koordinat 4D yang harus dipangkas ke 2D. Integrasinya memerlukan dukungan simbol layer titik dan izin atau atribusi dari DPUPR.

## Hasil tahap ketiga

Struktur ruang Portal Tata Ruang Kebumen diintegrasikan pada 28 Oktober 2026:

- **Cakupan.** Sepuluh layer struktur ruang (5.131 fitur) masuk kelompok "Struktur ruang": pusat permukiman, infrastruktur transportasi, energi, telekomunikasi, sumber daya air, dan prasarana lainnya, masing-masing jaringan (garis) dan infrastruktur (titik). Layer 12 (jaringan transportasi) dilewati karena geometrinya identik dengan 298 garis layer transportasi dari aplikasi sumber. Layer 14 (655 titik: 625 jembatan, stasiun, terminal, dan pelabuhan) tidak tumpang tindih dengan layer itu, yang hanya berisi garis, sehingga ikut ditambahkan.
- **Pipeline.** `pnpm data:export:tataruang` mengunduh layer secara berurutan dengan User-Agent INTARU. Exporter memeriksa judul layer di halaman peta portal, memangkas koordinat titik 4D menjadi 2D, memastikan jenis geometri dan bounds WGS84 Kebumen, lalu menyimpan respons asli beserta manifest (URL, waktu pengambilan, SHA-256, nilai `SBDATA` dan tahunnya). `pnpm data:prepare` mengemasnya bersama layer lain dengan resep tampilan yang sama, dan `pnpm data:import:tataruang` mengimpor hanya layer berawalan `tataruang-struktur-`.
- **Tahun data.** `SBDATA` per fitur berkisar 2018–2023: Kominfo dan PT Telkom 2019/2022, Kementerian ESDM 2020–2022, BPBD 2021–2022, PDAM 2022, Bina Marga DPUPR 2023, dan analisis tim teknis revisi RTRW 2019–2023. Tahun diambil sebagai tahun terakhir yang tidak melewati tahun ekspor, sehingga horizon rencana seperti 2009–2029 tidak terbaca sebagai 2029.
- **Tampilan.** 40 kategori `NAMOBJ` memiliki simbol sendiri; tidak ada fitur yang jatuh ke klasifikasi belum tersedia. Titik digambar sebagai lingkaran canvas berukuran sesuai hierarki, dan jaringan sekunder digambar putus-putus. Titik dan garis berada pada pane tersendiri dengan toleransi klik 5 piksel. Informasi lokasi menampilkan jenis dan nama (`REMARK`) fitur yang diklik.
- **Atribusi dan lisensi.** Legenda dan informasi lokasi menyebut Portal Tata Ruang Kabupaten Kebumen dan Bidang Tata Ruang dan Pertanahan DPUPR, serta menyatakan bahwa lisensi belum dicantumkan. Izin atau lisensi tertulis perlu diminta ke dpupr.kebumenkab@gmail.com.
- **Belum dikerjakan.** Impor ke Supabase produksi (`pnpm data:import:tataruang`) menunggu persetujuan; sampai itu dilakukan, deployment mode Supabase belum menampilkan layer baru. `SBDATA` per fitur belum ditampilkan karena tidak termasuk atribut salinan tampilan.

Target awal:

- Pengguna dapat melihat fasilitas umum di sekitar titik yang dipilih.
- Pemilihan kecamatan menampilkan jumlah penduduk beserta sumber dan tahunnya. Kepadatan dihitung dari luas resmi BPS, karena luas poligon batas berbeda sekitar 4%.
- Panel informasi lokasi menampilkan desa/kelurahan titik dan prakiraan cuaca BMKG beberapa jam ke depan.
- Pengguna dapat menyalakan overlay bahaya InaRISK dengan legenda dan tahun data, terpisah dari layer rencana tata ruang.

Ukuran keberhasilan mencakup ketepatan cakupan Kebumen, kecocokan kode wilayah, keterlacakan sumber, serta perbandingan waktu muat dan respons peta sebelum dan setelah integrasi.
