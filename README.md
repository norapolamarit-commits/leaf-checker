# LeafCheck Camera

เว็บต้นแบบสำหรับเปิดกล้อง ถ่ายภาพใบ และเตรียมส่งภาพให้ AI วิเคราะห์

## ใช้บนเครื่องนี้

```bash
cd /Users/norapol/Documents/Codex/2026-07-07/9/outputs/leaf-camera-web
python3 -m http.server 5173
```

เปิด:

```text
http://127.0.0.1:5173/
```

## ให้คนอื่นใช้ใน Wi-Fi เดียวกัน

กล้องบนมือถือ/เครื่องอื่นต้องใช้ `https` หรือ `localhost` เท่านั้น ถ้าเปิดผ่าน `http://192.168.x.x` บาง browser จะไม่ยอมเปิดกล้อง

สร้าง certificate สำหรับทดสอบ:

```bash
cd /Users/norapol/Documents/Codex/2026-07-07/9/outputs/leaf-camera-web
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout local-key.pem \
  -out local-cert.pem \
  -days 365 \
  -subj "/CN=localhost"
```

รัน HTTPS server:

```bash
python3 server_https.py
```

จากเครื่องอื่นที่อยู่ Wi-Fi เดียวกัน เปิด:

```text
https://192.168.1.107:5443/
```

หมายเหตุ: certificate เป็นแบบ self-signed จึงอาจมีหน้าคำเตือนความปลอดภัย ให้ใช้เฉพาะทดสอบในวง Wi-Fi เดียวกัน

## ให้คนอื่นใช้นอกเครือข่าย

อัปโหลดโฟลเดอร์นี้ไป static hosting ที่มี HTTPS เช่น:

- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages
- Render

ไฟล์นี้เป็น static web app จึงไม่ต้องมี backend เพื่อเปิดกล้องและถ่ายภาพในขั้นแรก

## Deploy บน Render

Render Static Site ต้อง deploy จาก Git repo และ Render จะให้ HTTPS URL แบบ `*.onrender.com` อัตโนมัติ

1. สร้าง GitHub repo ใหม่
2. อัปโหลดไฟล์ในโฟลเดอร์นี้ขึ้น repo
3. เข้า Render Dashboard
4. เลือก New > Blueprint หรือ New > Static Site
5. เชื่อม GitHub repo ที่สร้างไว้
6. ถ้าใช้ Blueprint ให้ Render อ่านไฟล์ `render.yaml`
7. ถ้าตั้งค่าเองใน Static Site ให้ใช้:

```text
Build Command: echo "No build required"
Publish Directory: ./
```

หลัง deploy เสร็จ ให้เปิด URL ที่ Render สร้างให้ เช่น:

```text
https://leafcheck-camera.onrender.com/
```

เมื่อเป็น HTTPS แล้ว ผู้ใช้คนอื่นจะเปิดกล้องจากมือถือหรือคอมตัวเองได้

## จุดต่อ AI

ตำแหน่งที่ควรต่อ backend/AI อยู่ใน `app.js` หลังจากได้ `dataUrl` ในฟังก์ชัน `capturePhoto()`

ตัวอย่าง flow ถัดไป:

```text
capturePhoto -> ส่งรูปไป /api/analyze -> AI วิเคราะห์ -> แสดงผลจริงแทน mock analysis
```
