# Folder Assets — gambar desain halaman (bukan foto produk)

Beda dengan folder `photos/` (isinya foto per-produk, dibaca berdasarkan nama `seed`), folder ini untuk gambar **layout/desain halaman**, seperti background hero.

## Cara pakai

Taruh `background.png` di sini, sejajar dengan `thriftfit-prototype.html`:

```
thriftfit-portfolio/
├── thriftfit-prototype.html
├── photos/            ← foto produk (nike90.jpg, dst)
└── assets/
    └── background.png  ← foto hero section
```

Nama file **harus** `background.png` — itu yang sudah ditulis di kode HTML (`<img src="assets/background.png">`). Kalau mau pakai nama lain atau format lain (`.jpg`/`.webp`), tinggal bilang, saya sesuaikan satu baris kode itu.

## Rekomendasi ukuran foto

Untuk hasil tajam di layar lebar tanpa file kegedean:
- Lebar minimal ~1600px (idealnya 1920–2400px)
- Rasio bebas (kode otomatis crop dengan `object-cover`), tapi landscape/wide lebih cocok untuk hero
- Kompres dulu (misal lewat squoosh.app atau tinypng.com) supaya halaman tetap cepat dibuka — target di bawah 500KB kalau bisa

## Kalau belum ada filenya

Kode tetap aman — bagian di belakang teks hero otomatis jadi overlay gelap polos (bukan gambar rusak), jadi teks putih tetap kebaca meski file belum ditaruh.
