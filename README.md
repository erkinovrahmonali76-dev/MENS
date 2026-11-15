[README (3).md](https://github.com/user-attachments/files/34874935/README.3.md)
# ELITE MEN — erkaklar kiyim do'koni

Ishga tushirish (Node.js 18+, hech narsa o'rnatish shart emas):

    node server.js

- Sayt:        http://localhost:3000
- Admin panel: http://localhost:3000/admin

## Papka tuzilishi
    server.js, package.json, Dockerfile, render.yaml, .gitignore
    public/      → index.html, admin.html, app.js, admin.js, style.css
    public/img/  → mahsulot rasmlari (p-brown-set.jpg va boshqalar) — o'zingizdagi papkani shu yerga qo'ying

## Yangi imkoniyatlar
- Buyurtma/to'lov kelishi bilan admin panel DARROV yangilanadi (ovoz + xabar + sahifa sarlavhasida son)
- Telegram bildirishnoma (Render → Environment: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID); Sozlamalarda sinov tugmasi
- Boshqaruv: 7 kunlik grafik, eng ko'p sotilgan mahsulotlar, bugungi buyurtmalar (Toshkent vaqti)
- Buyurtmalar: qidiruv, Excel (CSV) eksport, chop etish
- Mahsulotlar: qidiruv, bir bosishda "Sotuvda/Yo'q", nusxa olish
- Mijozlar: qidiruv va "Buyurtmalari" tugmasi
- Sozlamalar: yuqoridagi e'lon matni, zaxira yuklab olish va tiklash
- Sayt: "Savol bormi?" aloqa tugmasi, FAQ bo'limi, buyurtma sahifasi holatni o'zi yangilaydi

## Muhim: ma'lumotlar saqlanishi
Render'ning bepul rejasida fayllar vaqtinchalik: qayta deploy yoki qayta ishga tushganda `data/` o'chib ketishi mumkin.
Doimiy saqlash uchun Render'da Disk (pullik) ulang va `DATA_DIR` ni disk yo'liga qo'ying, yoki Sozlamalar → Zaxira orqali muntazam yuklab oling.
Admin parolini yo'qotsangiz: `data/db.json` ni o'chirib, `node server.js --init` ni ishga tushiring.
