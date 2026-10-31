# CAD Bounding Box Auto-Measure & Tray Designer (Web_M)

> **Ứng dụng Web chuyên dụng phân tích file 3D CAD STEP (.step/.stp), tự động đo kích thước phủ bì (AABB & OBB), bù trừ vách/khay (Face Offset) và xuất file 3D đa khối (Multi-Body STEP & OBJ) hoàn toàn ở phía client-side.**

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

## 🚀 Cài Đặt & Khởi Động

```bash
# Cài đặt thư viện
npm install

# Chạy môi trường phát triển
npm run dev

# Đóng gói xuất bản
npm run build
```

Mở trình duyệt: **`http://localhost:5173/`**
