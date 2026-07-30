# Folder Foto — cara pakai

Taruh folder `photos/` ini **satu level sejajar** dengan file `thriftfit-prototype.html`, contoh:

```
my-portfolio/
├── thriftfit-prototype.html
└── photos/
    ├── nike90.jpg
    ├── levi501.jpg
    ├── champhood.jpg
    ├── carhartt.jpg
    ├── ralph.jpg
    ├── harrington.jpg
    ├── flannel.jpg
    ├── adidastrack.jpg
    └── corduroy.jpg
```

## Nama file harus tepat

9 nama file di atas sudah sesuai dengan 9 produk contoh di prototype (Nike Crewneck, Levi's Jacket, dst). Kalau nama file cocok, foto langsung otomatis muncul — **tidak perlu ubah kode apapun**.

Kalau nama file tidak ada / salah ketik, prototype otomatis fallback ke foto placeholder (picsum.photos) — jadi tidak akan tampil rusak/broken image, cuma tidak pakai foto aslimu.

Format yang didukung: `.jpg`. Kalau punya `.png` atau `.webp`, cukup ubah ekstensi jadi `.jpg` saat rename, atau bilang ke saya nanti biar kode disesuaikan.

## Kalau sudah pakai backend Supabase (bukan foto lokal)

Kalau kamu sudah isi `image_urls` di database (misal lewat Cloudinary), foto dari database itu **selalu diprioritaskan** di atas foto lokal folder ini. Folder ini hanya dipakai kalau prototype masih jalan standalone (belum tersambung `API_BASE`).

## Rekomendasi sumber foto

**Foto sendiri (paling disarankan untuk portofolio):**
- Bentangkan baju di lantai/tembok polos (background putih/netral), foto dari atas dengan cahaya natural (dekat jendela siang hari)
- Ini yang bikin portofolio kelihatan personal & kredibel — reviewer suka lihat ada effort nyata, bukan cuma stok foto

**Kalau butuh cepat / belum punya baju fisiknya, stok foto gratis (boleh dipakai bebas, termasuk portofolio):**
- unsplash.com — cari "vintage clothing", "denim jacket flat lay", "vintage hoodie"
- pexels.com — cari kata kunci serupa
- Keduanya gratis, tidak perlu atribusi wajib (tapi cek lisensi tiap foto kalau ragu)

Unduh manual dari situs itu (klik download di browser), lalu rename sesuai daftar di atas dan taruh di folder `photos/`.
