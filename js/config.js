// ============================================================
//  💖 EDIT DI SINI 💖
//  Semua teks personal ada di file ini. Ganti sesukamu.
// ============================================================

export const CONFIG = {
  name: 'Falicya',
  from: 'Aidan', // ← ganti dengan nama / panggilan kamu

  // Streak couple (Supabase). Isi dari Supabase → Project Settings → API.
  // Kalau dikosongkan, fitur streak disembunyikan dan game tetap jalan normal.
  supabase: {
    url: 'https://xmbshvmyztvaalcifqib.supabase.co',
    anonKey: 'sb_publishable_Lpbw5KeRUfzUFi1_nksa_g_nIoY9HWR', // publishable key (aman ditaruh di sini)
    pushFunction: 'bright-action', // nama edge function pengirim notifikasi di Supabase
    // Kunci publik notifikasi (VAPID). Kunci privatnya disimpan di Supabase Edge Function Secrets.
    vapidPublicKey: 'BAMRmoqQbHJKhKLgt-F3dpV48v81e4dK8ajHAisMrWft9iTrqtA9MUd699q1WeipWTOrjvBBD0Ufowq2aoi-emw',
  },

  // Pintu masuk rahasia: masukin tanggal ulang tahun masing-masing (sekali aja per HP).
  // Dari tanggalnya ketahuan siapa yang buka (Fall / Aidan), jadi nggak perlu milih lagi.
  // Yang disimpan cuma hash SHA-256 dari "YYYY-MM-DD", bukan tanggalnya.
  gate: {
    title: 'Masuk dulu yaa 🤍',
    question: 'Masukin tanggal ulang tahun kamu 🎂',
    wrong: 'Hmm, tanggalnya bukan itu 🤭 coba lagi yaa',
    people: {
      '77e1fbbbce7f7cf9c3890860d48a02ef5b5709299247df85ce0bb2b1f84d5707': 'fall',
      'ef1fef826e0a5c68c65b6dd249116e1c927ad8c7ccb7e9522750df42e8a766b5': 'aidan',
    },
  },

  // Pesan hari ini: muncul di halaman depan, ganti tiap hari (urut, balik lagi dari awal).
  daily: [
    "pagi fall 🌤️ jangan lupa sarapan ya, aidan nggak mau kamu lemes",
    "hari ini kamu cantik. kemarin juga. besok juga pasti. udah itu aja 😌",
    "kalau hari ini capek, istirahat bentar ya. aidan bangga sama kamu kok",
    "fun fact: aidan senyum-senyum sendiri tiap liat chat dari fall 🙈",
    "semangat ya hari ini! kalau ada yang nyebelin, cerita ke aidan aja",
    "minum air putih dulu gih 💧 ini perintah dari aidan hehe",
    "aidan tuh beruntung banget bisa kenal kamu, serius",
    "kalau lagi kangen, buka kotak kita aja. siapa tau ada surat baru 👀",
    "senyum dong fall, dunia jadi lebih cerah kalau kamu senyum 🌼",
    "aidan lagi mikirin kamu. iya, lagi. sekarang. hehe",
    "jangan lupa, kamu nggak sendirian. ada aidan di sini 🤍",
    "hari ini coba lakuin satu hal kecil yang bikin kamu seneng ya",
    "kamu tuh alasan aidan semangat buka hp tiap pagi",
    "fall yang lagi baca ini: iya kamu, aidan sayang kamu 💕",
    "jangan begadang terus ya, aidan mau kamu sehat",
    "kalau hari ini nggak sesuai rencana, nggak papa. besok kita coba lagi bareng",
    "aidan masih inget cara kamu ketawa, dan itu masih bikin aidan seneng",
    "hari ini makan yang enak ya, kirim fotonya ke kotak kita 🍜",
    "kamu hebat, bahkan di hari-hari yang kamu ngerasa nggak hebat",
    "reminder: fall itu lucu, pinter, dan cantik. no debat 😤",
    "semoga hari ini banyak hal baik yang dateng ke kamu ✨",
    "aidan pengen cepet-cepet ketemu kamu lagi 🥺",
    "kalau lagi bete, inget ada yang selalu nungguin cerita kamu",
    "jangan lupa bernapas pelan-pelan kalau lagi panik ya, kamu pasti bisa",
    "makasih udah jadi fall. udah, gitu aja 🤍",
    "hari ini tantangannya: senyum 3x. aidan pantau dari jauh 👀",
    "kamu itu rumah, tempat aidan pengen pulang",
    "kalau dunia lagi berisik, sini, dengerin aidan aja",
    "aidan doain hari ini lancar semua ya fall 🙏",
    "sampai ketemu di pesan besok ya. tetep jadi kamu yang aidan sayang 💖",
  ],

  // Pesan untuk level utama (6 per dunia, urut dunia 1 → 5; nomor level ada di urutan peta)
  messages: [
    "Level pertama uda beres! Fall emang jago dari awal, kayak waktu Fall bikin aidan jatuh cinta 😳", // Dunia 1
    "Fall emang jago nangkep yaa… kayak hati aidan juga udah lama ketangkep sama Fall hehe",
    "Gemes banget sih mainnya. Eh, tapi yang main lebih gemes lagii🐰",
    "i know Ingatan Fall hebat banget! Semoga Fall juga selalu inget kalau aidan sayang Fall 💕",
    "Fall Makin jago aja! nih, Aidan bangga punya cewe sekeren fall",
    "Dunia Taman Bunga uda selesai! Tapi bunga paling cantik ya tetep dong Fall 🌸",
    "Permen permennya emang manis sih, Tapi tetep Fall yang paling manis buat aidan🍭", // Dunia 2
    "Fall tuh kayak gula tawuu, bikin hari hari aidan jadi manis terus 🍬",
    "Tap tap tap! Kalau aku jadi kucingnya, aku maunya dielus Fall terus hehe🐱",
    "Makasih ya udah sabar sama aidan selama ini 🥹",
    "Skill Fall naik terus nih. kayak rasa sayang aidan juga naik level tiap hari hehe",
    "Dunia Permennya uda beres! tau nggak kalau fall itu hadiah paling manis yang pernah aidan dapet🍭",
    "Pantai Cinta! Pengen deh liat sunset bareng Fall, when yhhh 🌅", // Dunia 3
    "Ombak aja kalah sama semangat Fall 🌊",
    "Fall tahu nggak? Senyum Fall itu vitamin buat aidan ☀️",
    "Ayoo tinggal dikit lagii! Aidan tau fall bisa",
    "Yeayy keren banget. cewe aidan emang hebat 🥹",
    "Pantai Cintanya uda beress! tawuu nggak kalo sama Fall, ke mana pun rasanya jadi seru 🏝️",
    "Kalau disuruh milih dari miliaran bintang yang ada, aidan bakal tetep milih Fall 😝", // Dunia 4
    "Kalau Fall lagi capek, inget ya: ada aidan yang selalu di sini 🌙",
    "Fall bersinar banget sih, bintang bintangnya nih sampe minder semua ✨",
    "Kuenya tinggi bangett sampe ke bintang! Fall emang jago 🎂✨",
    "Satu level lagi! ayooo semangat sayangkuuu 🥰",
    "Dunia Langit Bintang uda beres! eits masih ada satu dunia lagi loh, dunia rumah kita 🏡",
    "Selamat datang di rumah kita! 🏡 dunia terakhir, ada owl sama kucingnya juga lohh", // Dunia 5
    "Nangkepnya jago bangett, kayak Fall yang udah nangkep hati aidan dari lama hehe 🧺",
    "Owl sama kucingnya muncul terus, soalnya mereka kangen Fall 🦉🐱",
    "Aidan Jr lari-lari terus, kayak aidan yang lari ke Fall tiap kangen 🏃",
    "Ingatan Fall kuat bangett, jangan lupa inget juga semua momen kita yaa 🎵",
    "Yeay uda tamatt Sekarang coba buka suratnyaa hehe 💖",
  ],

  // Pesan untuk stage tambahan (6 per dunia, urut a–f; nomor level ada di komentar)
  stageMessages: [
    "Mata Fall jeli bangett yaa! kalo di mata aidan mah Fall yang paling beda sendiri, paling cantik hehe 👀", // Dunia 1 · Level 4 · Cari yang Beda
    "Fall nemu jalan ke aidan! emang dari awal jalannya udah ke aidan hehe 💞", // Dunia 1 · Level 8 · Labirin Cinta
    "Owlnya terbang tinggi bangett, kayak perasaan aidan tiap liat Fall hehe 🦉", // Dunia 1 · Level 6 · Terbang Tinggi
    "Tepat sasaran! panah cinta Fall kena terus ke hati aidan 💘", // Dunia 1 · Level 9 · Panah Cinta
    "Kuenya tinggi bangett! nanti kita makan kue beneran bareng yaa 🎂", // Dunia 1 · Level 10 · Susun Kue
    "Aidan Jr kena lempar hati terus 😆 dari dulu emang udah kena hati Fall sih hehe 🎯", // Dunia 1 · Level 11 · Lempar Hati

    "Owlnya gemesin kayak fall hehe 🦉", // Dunia 2 · Level 16 · Terbang Tinggi
    "Nemu lagi! Fall emang paling jago nyari, hati aidan juga uda lama ketemu sama Fall kan hehe 🔍", // Dunia 2 · Level 22 · Cari yang Beda
    "Urutannya hafal semua! Fall pinter bangett sih 🎵", // Dunia 2 · Level 18 · Ingat Urutan
    "Lemparannya jago bangett! kena Aidan Jr terus, gapapa kok aidan rela 😝🎯", // Dunia 2 · Level 20 · Lempar Hati
    "Pas banget di tengah! Fall emang selalu tepat, termasuk pas milih aidan hehe 💘", // Dunia 2 · Level 21 · Panah Cinta
    "Labirinnya muter-muter tapi tetep ketemu aidan, kayak takdir hehe 🧭💖", // Dunia 2 · Level 23 · Labirin Cinta

    "Owl sama kucingnya aja seneng dipencet Fall, apalagi aidan hehe 🦉🐱", // Dunia 3 · Level 28 · Ingat Urutan
    "Satu lagi ayooo! aidan tau sayangkuu pasti bisaa 🔥", // Dunia 3 · Level 35 · Terbang Tinggi
    "Mata Fall tajem bangett, ga ada yang bisa lolos dari Fall hehe 🔍", // Dunia 3 · Level 30 · Cari yang Beda
    "Sejauh apa pun jalannya, Fall pasti sampe ke aidan 🥹", // Dunia 3 · Level 34 · Labirin Cinta
    "Ombak boleh ganti-ganti, tapi sayang aidan ke Fall tetep sama 🌊", // Dunia 3 · Level 32 · Lempar Hati
    "Bidikan Fall tepat bangett, kayak Fall yang tepat sasaran di hati aidan 💘", // Dunia 3 · Level 33 · Panah Cinta

    "lucu yaa aidan sama fall jrnya hehe", // Dunia 4 · Level 40 · Puzzle Fall Jr & Aidan Jr
    "Fall jago bangett, padahal levelnya uda susah loh ini 😳", // Dunia 4 · Level 45 · Ingat Urutan
    "Owlnya terbang sampe ke bintang, kayak Fall yang bikin hari aidan bersinar ✨", // Dunia 4 · Level 41 · Terbang Tinggi
    "Dari semua bintang, yang paling beda dan paling bersinar ya tetep Fall ⭐", // Dunia 4 · Level 42 · Cari yang Beda
    "Aidan Jr kena lagi 😆 lempar terus Fall, aidan nggak bakal kabur kok 🎯", // Dunia 4 · Level 44 · Lempar Hati
    "Makin susah tapi tetep kena! Fall emang jago bangett 💘", // Dunia 4 · Level 43 · Panah Cinta

    "Kue di rumah kita tinggi bangett! nanti bikin kue beneran bareng yuk 🎂", // Dunia 5 · Level 52 · Susun Kue
    "Di rumah kita nanti nggak perlu labirin, Fall tinggal peluk aidan aja hehe 🤗🏡", // Dunia 5 · Level 54 · Labirin Cinta
    "Kena lagi! Aidan Jr nyerah deh, emang dari awal udah kalah sama Fall 😆🎯", // Dunia 5 · Level 55 · Lempar Hati
    "Fall Jr terbang tinggi bangett! lucu banget sih dari kecil 🦉", // Dunia 5 · Level 57 · Terbang Tinggi
    "Yang beda ketemu terus! tapi buat aidan, Fall itu nggak ada duanya 🔍", // Dunia 5 · Level 58 · Cari yang Beda
    "yeay hampir beres nih gamenya… makasih yaa udah mainin game aidan inii 🥰", // Dunia 5 · Level 59 · Panah Cinta
  ],

  // Pesan setelah level Bonus Puzzle Foto di akhir tiap dunia
  bonusMessages: [
    "Falicya uda lucu bangett sih dari kecil, pantes aidan kepincut hehe 🦉", // Dunia 1 · foto Fall Jr
    "Nah sekarang Aidan Jr! gimana, lucu kan? hehe tapi tetep lebih imoets Fall Jr sih 😝", // Dunia 2 · foto Aidan Jr
    "Aidan Jr lagi nih, gaya bangett pegang gitar hehe 🎸", // Dunia 3 · foto Aidan Jr main gitar
    "Fall Jr sama Aidan Jr versi susah uda jadi! makasih yaa uda mainin semua game dari aidan, love you sayangkuu 💖", // Dunia 4 · foto Fall Jr & Aidan Jr (4×4)
    "Puzzle terakhir beres! makasih udah mainin semuanyaa sampe habis, love you Fall 💖", // Dunia 5 · foto Fall Jr (4×4)
  ],

  // Kuis di akhir tiap dunia (5 dunia × 3 soal).
  // answer = index jawaban benar (mulai dari 0). answer: -1 artinya SEMUA jawaban benar 😆
  // Tips: ganti dengan pertanyaan tentang kalian berdua (tempat kencan pertama, makanan favorit, dll).
  quiz: [
    [
      { q: 'Siapa cewek paling cantik sedunia?', options: ['Falicya', 'Falicya banget', 'Falicya pastinya', 'Falicya 💖'], answer: -1, yes: 'Nggak ada jawaban salah, semuanya Fall 😝' },
      { q: 'Berapa persen aku sayang Fall?', options: ['50%', '99%', '100%', 'Tak terhingga ♾️'], answer: 3, yes: 'Betul! Nggak bisa diukur pakai angka 🥰' },
      { q: 'Kalau Fall lagi bad mood, aku harus ngapain?', options: ['Diemin aja', 'Beliin makanan 🍜', 'Peluk 🤗', 'Beliin makanan terus peluk'], answer: 3, yes: 'Paket komplit! Siap laksanakan 🫡' },
    ],
    [
      { q: 'Apa yang paling aku suka dari Fall?', options: ['Senyumnya', 'Ketawanya', 'Semuanya 💕', 'Pas ngambek lucu'], answer: 2, yes: 'Iya, semuanya! Nggak bisa milih satu 😚' },
      { q: 'Kalau Fall minta dipeluk jam 2 pagi, aku…', options: ['Pura-pura tidur', 'Langsung datang 🏃', 'Kirim stiker peluk', 'Peluk guling'], answer: 1, yes: 'Langsung meluncur! 🚀' },
      { q: 'Kalau aku telat bales chat, artinya…', options: ['Aku lupa Fall', 'Lagi sibuk tapi tetep mikirin Fall', 'Ketiduran 😴', 'Lupa Fall tapi boong'], answer: 1, yes: 'Fall selalu ada di kepalaku kok 🧠💖' },
    ],
    [
      { q: 'Emoji yang paling cocok buat Fall?', options: ['🐰', '🌸', '☀️', 'Semuanya!'], answer: 3, yes: 'Lucu, cantik, dan bikin hangat. Fall banget ✨' },
      { q: 'Kalau Fall ngambek, cara paling ampuh baikan adalah…', options: ['Minta maaf', 'Bawain jajan 🍰', 'Gombalin', 'Semua jurus sekaligus'], answer: 3, yes: 'Combo attack! 💥💖' },
      { q: 'Tempat terbaik di dunia menurut aku adalah…', options: ['Pantai', 'Gunung', 'Di samping Fall 🥹', 'Kasur'], answer: 2, yes: 'Di mana pun, asal sama Fall 🥹' },
    ],
    [
      { q: 'Kita cocoknya disebut…', options: ['Temen', 'Partner in crime', 'Pasangan paling lucu sedunia', 'Dua-duanya: B dan C'], answer: 3, yes: 'Partner in crime paling lucu sedunia 😎💕' },
      { q: 'Seberapa beruntung aku punya Fall?', options: ['Beruntung banget', 'Paling beruntung sedunia 🍀', 'Nggak bisa diukur', 'Semua di atas'], answer: -1, yes: 'Semuanya bener. Aku beruntung banget 🍀' },
      { q: 'Pertanyaan terakhir: Fall mau terus sama aku?', options: ['Iya 💖', 'Iya dong!!', 'Pastinya 🥰', 'Selamanya ♾️'], answer: -1, yes: 'Yeay!! Aku juga mau sama Fall terus 🥹💖' },
    ],
    [
      { q: 'Kalau kita punya rumah nanti, harus ada apa?', options: ['Owl 🦉', 'Kucing 🐱', 'Dapur buat bikin kue 🎂', 'Semuanya dong!'], answer: 3, yes: 'Setuju! rumah kita harus lengkap hehe 🏡' },
      { q: 'Hal pertama yang aidan lakuin kalau ketemu Fall?', options: ['Say hi 👋', 'Peluk 🤗', 'Cubit pipi', 'Peluk terus cubit pipi'], answer: 3, yes: 'Hehe bener, dua-duanya wajib 😝' },
      { q: 'Seberapa sayang aidan sama Fall?', options: ['Sayang', 'Sayang banget', 'Sayang banget banget', 'Nggak bisa dihitung ♾️'], answer: -1, yes: 'Semuanya bener, sayangnya nggak ada ujungnya 💖' },
    ],
  ],

  // Surat yang terbuka setelah semua level selesai. Pisahkan paragraf dengan baris kosong.
  finalLetter: `Hai sayangku,

Kalau Fall lagi baca ini, berarti Fall udah namatin game buatan aidann. Hebat banget sayangku! 🥳

Game ini aidan bikin khusus buat Fall. Setiap level, setiap pesan, dan setiap hati yang Fall tangkep, semuanya aidan siapin cuma buat kamuuu.

Makasih ya udah jadi orang yang bikin hari-hari aidan lebih berwarna. Makasih udah sabar, udah perhatian, dan udah milih aidann.

Aidan nggak janji semuanya bakal selalu gampang, tapi aidan janji bakal selalu berusaha bikin Fall senyum, kayak yang Fall lakuin buat aidann.

love you my baby honey cutey pie, ismoyoooo`,
};
