[README (2).md](https://github.com/user-attachments/files/34873863/README.2.md)
# ELITE MEN — erkaklar kiyim do'koni

Ishga tushirish (faqat Node.js 18+ kerak, hech narsa o'rnatish shart emas):

    node server.js

- Sayt:        http://localhost:3000
- Admin panel: http://localhost:3000/admin

Admin parolini yo'qotsangiz: `data/db.json` faylini o'chirib, `node server.js --init` ni ishga tushiring
(yangi parol chiqadi; mahsulotlar boshidan yaratiladi).

Internetda ishlatish uchun Node.js ishlaydigan hosting kerak (VPS, Render, Railway va h.k.).
HTTPS bilan ishlatsangiz: `COOKIE_SECURE=1 node server.js`.
`data/` papkasini muntazam zaxiralab turing (buyurtmalar, mijozlar, cheklar shu yerda).
