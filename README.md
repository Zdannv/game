# Falicya's Love Quest 💖

Game web kecil berisi 24 level di 4 dunia (Taman Bunga, Kota Permen, Pantai Cinta, Langit Bintang).
Ada 4 jenis mini-game: Kartu Kembar, Tangkap Cinta, Tap si Imut, dan Kuis Sayang.
Kalau semua level selesai, surat rahasia di akhir bakal kebuka.

Situs statis murni (HTML/CSS/JS), jadi nggak butuh build step atau database.
Progress disimpan di `localStorage` browser.

## Personalisasi

Semua teks ada di `js/config.js`:
- `from`: nama kamu
- `messages`: pesan setelah tiap level
- `quiz`: 12 soal kuis (ganti dengan kenangan kalian!)
- `finalLetter`: surat penutup

## Jalankan lokal

```bash
python3 -m http.server 5178
```

Lalu buka http://localhost:5178

## Deploy ke Vercel

```bash
npx vercel --prod
```

Waktu ditanya, pilih framework **Other** dan biarkan build command & output directory kosong.
