# CAD Bounding Box Auto-Measure & Tray Designer (Web_M)

> **Ứng dụng Web chuyên dụng phân tích file 3D CAD STEP (.step/.stp), tự động đo kích thước phủ bì (AABB & OBB), bù trừ vách/khay (Face Offset) và xuất file 3D đa khối (Multi-Body STEP & OBJ) hoàn toàn ở phía client-side.**

![CAD Bounding Box Auto-Measure Preview](web_m/src/assets/hero.png)

---

## 🌟 Tính Năng Nổi Bật (Key Features)

- 🔒 **100% Client-Side & Bảo mật tuyệt đối:** 
  - Toàn bộ quá trình đọc, giải mã và tính toán hình học STEP diễn ra trực tiếp trên trình duyệt bằng nhân **OpenCASCADE WebAssembly (`occt-import-js`)**. 
  - **Không bao giờ tải file CAD lên server**, đảm bảo bảo mật dữ liệu kỹ thuật và bản quyền chi tiết.
- ⚡ **Xử lý ngầm qua Web Worker:** 
  - Cấu hình nhân giải mã CAD trong Web Worker riêng biệt, không gây đơ/lag giao diện (zero UI-freeze) ngay cả với các mô hình STEP lắp ráp phức tạp, hàng vạn đỉnh tam giác.
- 📐 **Tự động đo kích thước phủ bì kép (Dual Bounding Box):**
  - **AABB (Axis-Aligned Bounding Box):** Kích thước bao cố định theo 3 trục tọa độ mặc định $X, Y, Z$ ($Dài \times Rộng \times Cao$).
  - **OBB (Oriented Bounding Box):** Kích thước bao tối ưu tự động xoay ôm khít chi tiết nghiêng, giảm thể tích đóng gói và lãng phí vật liệu.
- 🎯 **Đa chiến lược định hướng OBB thông minh:**
  - **Tối ưu thể tích (Minimum Volume):** Thuật toán tìm kiếm góc xoay có thể tích bao nhỏ nhất.
  - **Trục vươn xa (Max Reach / Diagonal):** Định hướng hộp ôm theo chiều dài phát triển dài nhất của chi tiết.
  - **Quán tính PCA (Covariance Matrix):** Phân tích thành phần chính từ tập hợp đỉnh và mật độ diện tích tam giác.
  - **Căn theo mặt phẳng chuẩn (Face-Aligned):** Tự động gom nhóm các mặt phẳng chiếm diện tích lớn, hoặc cho phép người dùng **click chuột trực tiếp vào bất kỳ mặt nào trên 3D** để đặt đáy hộp phủ bì áp sát mặt đó.
  - **Thanh trượt góc xoay thời gian thực (Interactive Angle Slider):** Xoay tự do $0^\circ \to 180^\circ$ kèm các nút bắt góc nhanh $0^\circ, 30^\circ, 45^\circ, 90^\circ, 135^\circ$.
- 📦 **Bù trừ kích thước làm Vách / Khay định hình (Face Offset):**
  - Tùy chỉnh khoảng hở (Clearance) phục vụ thiết kế khay hút định hình (Thermoformed Tray), vách ngăn thùng carton, đệm mút xốp hoặc gá đặt CNC.
  - Hỗ trợ cả **Offset đều (Uniform)** và **Bù trừ chi tiết từng hướng** ($\pm$ Dài, $\pm$ Rộng, $-$ Đáy khay, $+$ Miệng nắp).
  - Cập nhật khung dây vách khay và thước đo kích thước 3D thời gian thực.
- 🚀 **Xuất file 3D CAD đa khối (Multi-Body STEP & OBJ Export):**
  - **Xuất file STEP (.stp) gồm 2 Parts riêng:** Tạo file ISO 10303-21 AP203/214 chuẩn công nghiệp chứa **2 Solid Bodies độc lập**: (1) Chi tiết CAD gốc, (2) Khối Solid B-Rep hộp OBB/khay đã xác nhận tọa độ và góc xoay. Mở trực tiếp trên **Autodesk Inventor** hoặc **SolidWorks** dưới dạng Multi-Body Part/Assembly.
  - **Xuất file STEP (.stp) chỉ riêng Hộp OBB Tray:** Khối Solid B-Rep chuẩn để chèn (*Place Component*) vào cụm lắp ráp Inventor.
  - **Xuất file 3D OBJ (.obj) 2 Parts riêng:** Định dạng đa khối tiêu chuẩn cho Rhino, Blender, 3ds Max.
  - **Tải báo cáo JSON tọa độ 8 góc OBB:** Đầy đủ 8 điểm tọa độ 3D $(X, Y, Z)$ và kích thước để nhập vào bảng thông số CAD (*Inventor Parameters / iLogic / SolidWorks Equations*).

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Công nghệ | Vai trò |
| :--- | :--- |
| **React 19 + TypeScript** | Framework giao diện người dùng hiện đại, an toàn kiểu dữ liệu |
| **Vite 8** | Trình đóng gói & máy chủ phát triển siêu tốc |
| **Tailwind CSS v4** | Hệ thống style giao diện Dark Mode kỹ thuật chuẩn công nghiệp |
| **OpenCASCADE WebAssembly (`occt-import-js`)** | Nhân CAD B-Rep C++ biên dịch sang WebAssembly chạy trực tiếp trên Client |
| **Three.js** | Hiển thị mô hình 3D, OrbitControls, bóng đổ, thước đo kích thước 3D (Callouts) |
| **Lucide React** | Bộ icon kỹ thuật đồng bộ, trực quan |

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án (Getting Started)

### 1. Yêu cầu hệ thống
- **Node.js:** Phiên bản `>= 18.0.0` (Khuyên dùng Node 20 hoặc Node 22 LTS).
- **Trình duyệt:** Google Chrome, Microsoft Edge, Firefox, Brave, Safari (Hỗ trợ WebAssembly & WebGL 2.0).

### 2. Cài đặt thư viện dependencies

```bash
# Di chuyển vào thư mục web_m
cd web_m

# Cài đặt toàn bộ thư viện (Three.js, React, OpenCASCADE WASM, Tailwind...)
npm install
```

### 3. Khởi động môi trường phát triển (Dev Server)

```bash
npm run dev
```

Sau khi chạy lệnh, truy cập trình duyệt theo địa chỉ:
👉 **`http://localhost:5173/`**

### 4. Đóng gói cho môi trường Production (Build)

```bash
npm run build
```

Toàn bộ mã nguồn tối ưu sẽ được xuất ra thư mục `web_m/dist/`, sẵn sàng triển khai lên **Vercel, Netlify, GitHub Pages, hoặc máy chủ nội bộ công ty**.

---

## 📂 Cấu Trúc Thư Mục (Project Structure)

```text
WEB_M/
├── web_m/
│   ├── public/
│   │   ├── cad-worker.js          # Web Worker chạy OpenCASCADE giải mã STEP ngầm
│   │   ├── occt-import-js.js      # Wrapper JavaScript cho nhân OpenCASCADE WASM
│   │   ├── occt-import-js.wasm    # OpenCASCADE WebAssembly Binary (7.6 MB)
│   │   ├── Part2.stp              # File STEP mẫu thực tế từ Autodesk Inventor
│   │   ├── sample_bracket.step    # Chi tiết tấm uốn kim loại có góc nghiêng
│   │   └── sample_assembly.stp    # Mô hình cụm chi tiết máy
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas3D.tsx       # Viewport 3D Three.js, OrbitControls, Face Raycaster, HUD
│   │   │   ├── Header.tsx         # Thanh tiêu đề, nút Reset, mở file mới
│   │   │   ├── ProgressBar.tsx    # Thanh tiến trình tải và phân tích hình học STEP
│   │   │   ├── Sidebar.tsx        # Bảng điều khiển OBB, AABB, Face Offset & Xuất file STEP
│   │   │   └── UploadZone.tsx     # Khu vực kéo thả file STEP, chọn file mẫu
│   │   ├── utils/
│   │   │   ├── boundingBox.ts     # Thuật toán tính AABB, OBB, Jacobi PCA, Face Clustering, Offset
│   │   │   ├── cadExporter.ts     # Trình tạo file Multi-Body STEP B-Rep, OBJ, GLB & JSON Report
│   │   │   ├── stepParserService.ts # Service giao tiếp với Web Worker xử lý STEP
│   │   │   ├── threeHelpers.ts    # Dựng lưới CAD, đường nét cạnh, thước đo 3D callouts
│   │   │   └── types.ts           # Định nghĩa cấu trúc dữ liệu TypeScript
│   │   ├── App.tsx                # Quản lý trạng thái chính của ứng dụng
│   │   ├── index.css              # Thiết lập Tailwind CSS v4 & Fullscreen layout
│   │   └── main.tsx               # Entry point ứng dụng React
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── .gitignore
├── package.json                   # Root package script
└── README.md                      # Tài liệu dự án
```

---

## 💻 Tương Thích Với Các Phần Mềm CAD

| Phần mềm CAD | Định dạng nhập | Khả năng tương thích |
| :--- | :--- | :--- |
| **Autodesk Inventor** | `.stp` / `.step` | Nhận diện đủ 2 Part/Solid riêng (`PART1` và `PART2_OBB_TRAY_BOX`) |
| **SolidWorks** | `.stp` / `.step` | Mở trực tiếp dưới dạng Multi-Body Solid hoặc Assembly |
| **Rhino 7 / 8** | `.stp` / `.obj` | Giữ nguyên góc nghiêng, vị trí tâm và mặt phẳng tham chiếu |
| **PTC Creo / Catia** | `.stp` (AP203/214) | Hỗ trợ đầy đủ Manifold Solid B-Rep |
| **Blender / 3ds Max** | `.obj` / `.glb` | Nhận diện 2 Object riêng biệt kèm chất liệu màu sắc |

---

## 📄 Bản Quyền & Giấy Phép (License)

Dự án được phân phối dưới giấy phép **MIT License**. Bạn có thể tự do sử dụng, chỉnh sửa và tích hợp vào các dự án thương mại hoặc hệ thống nội bộ công ty.
