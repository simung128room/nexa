# JomCode AI (J-1.0 Architecture) - Source Code

ระบบเว็บแอปพลิเคชัน AI Assistant อัจฉริยะ (Frontend + Backend + RAG Memory + Code Sandbox)

## 📁 โครงสร้างโปรเจกต์ (Project Structure)
```text
├── src/
│   ├── components/         # คอมโพเนนต์ UI ทั้งหมด (แชท, ป้อนข้อมูล, กล่องโค้ด, พรีวิว)
│   │   ├── ChatMessage.tsx          # แสดงผลข้อความแชท, Markdown, ปุ่มคัดลอก, TTS
│   │   ├── ChatInput.tsx            # ช่องพิมพ์ข้อความ, แนบไฟล์, อัปโหลดรูปภาพ, ไมค์พูด
│   │   ├── CodeBlock.tsx            # กล่องรันโค้ด Sandbox (JS, TS, Python, SQL, HTML)
│   │   ├── ArtifactPreviewModal.tsx # พรีวิว UI แบบเรียลไทม์
│   │   ├── DiffViewerModal.tsx      # ตัวเปรียบเทียบ Code Diff แบบไฮไลท์สี
│   │   ├── KnowledgeModal.tsx       # ระบบจัดการข้อมูล RAG Memory
│   │   ├── Sidebar.tsx              # เมนูประวัติแชทและการตั้งค่า
│   │   ├── SettingsModal.tsx        # ตั้งค่าโมเดลและระบบ
│   │   ├── VoiceInputButton.tsx     # ปุ่มสั่งงานด้วยเสียง (Speech-to-Text)
│   │   └── ...
│   ├── utils/              # เครื่องมือคำนวณและเสียง (Audio, Sandbox, Evaluators)
│   ├── data/presets.ts     # ข้อมูลพรีเซ็ตและโปรไฟล์โมเดล AI
│   ├── App.tsx             # หน้าแอปพลิเคชันหลัก
│   ├── main.tsx            # React Entry Point
│   ├── index.css           # Tailwind CSS Styling
│   └── types.ts            # TypeScript Interfaces & Types
├── server.ts               # Express Backend Server (เชื่อมต่อ Google GenAI SDK & xKiro Gateway)
├── package.json            # รายการ Dependencies ทั้งหมด
├── vite.config.ts          # Vite Configuration
├── tsconfig.json           # TypeScript Configuration
└── .env.example            # ตัวอย่าง Environment Variables
```

## 🚀 วิธีติดตั้งและรันในเครื่อง (Quick Start)

### 1. ติดตั้ง Dependencies
เปิด Terminal ในโฟลเดอร์โปรเจกต์แล้วพิมพ์:
```bash
npm install
```

### 2. ตั้งค่า API Key (สร้างไฟล์ .env)
คัดลอกไฟล์ `.env.example` เป็น `.env`:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. รันเซิร์ฟเวอร์สำหรับ Development
```bash
npm run dev
```
เปิดเว็บเบราว์เซอร์ไปที่: `http://localhost:3000`

---
*หมายเหตุ: โค้ดต้นฉบับ (Source Code) เป็นไฟล์ข้อความ (Plain Text) ขนาดรวมก่อนแตกไฟล์ประมาณ ~97 KB เมื่อติดตั้ง `npm install` ระบบจะดาวน์โหลดแพ็กเกจไลบรารีที่จำเป็นให้ครบถ้วนสมบูรณ์อัตโนมัติ*
