# Project Requirements

## 1. Mục tiêu

Cung cấp ứng dụng đa nền tảng để khách tìm kiếm và đặt phòng học theo khung giờ, đồng thời cho phép người quản lý cập nhật danh mục phòng, tòa nhà và xử lý lịch.

## 2. Vai trò

- **Khách (`guest`)**: đăng ký/đăng nhập, xem phòng và lịch khả dụng, đặt phòng theo ngày/giờ, xem và hủy lịch của chính mình trước giờ bắt đầu.
- **Quản lý (`manager`)**: các quyền xem phòng/tòa nhà; tạo, sửa, xóa phòng/tòa nhà; xem mọi lịch và hủy lịch khi cần.
- Tài khoản đăng ký từ client mặc định là khách. Chỉ quy trình quản trị tin cậy mới được cấp role `manager`.

## 3. Yêu cầu chức năng

### FR-01: Xác thực

- Hỗ trợ email/password và Google Sign-In bằng Firebase Authentication.
- Form đăng ký yêu cầu tên, email, mật khẩu và nhập lại mật khẩu; hai mật khẩu phải trùng nhau.
- Phiên đăng nhập được lưu trên thiết bị native bằng AsyncStorage persistence của Firebase Auth.
- Sau đăng nhập, tải role từ `users/{uid}` và chuyển người dùng tới luồng phù hợp.

### FR-02: Khám phá phòng

- Đọc collection `rooms` và `buildings` từ Firestore.
- Cập nhật danh sách khi dữ liệu Firestore thay đổi.
- Tìm kiếm theo tên phòng hoặc tòa nhà và lọc theo tòa.
- Mở trang chi tiết cho từng phòng.

### FR-03: Đặt phòng

- Khách chọn ngày, giờ bắt đầu và thời lượng từ 1 đến 4 giờ trên UI.
- Lịch được biểu diễn bằng document slot duy nhất cho mỗi phòng/ngày/giờ.
- Tạo booking và slot trong cùng transaction; một slot không thể được đặt hai lần.
- Seed demo phải tạo tối thiểu 100 phòng bổ sung ở nhiều tòa và có thể chạy lặp lại mà không ghi đè phòng đã tồn tại.
- Khách chỉ xem/hủy lịch của mình; không cho hủy lịch đã bắt đầu.
- Hiển thị slot khả dụng/đã đặt realtime.

### FR-04: Quản lý

- Thêm, sửa, xóa phòng; một phòng có tên, tòa, sức chứa và mô tả tùy chọn.
- Thêm, đổi tên, xóa tòa nhà; không xóa tòa còn phòng tham chiếu.
- Xem lịch đặt realtime và hủy lịch theo quyền quản lý.

### FR-05: Trải nghiệm giao diện

- Hỗ trợ safe areas trên iOS/Android.
- Có loading, empty và error states cho request Firebase.
- Nút có press feedback; màn hình có chuyển tiếp; tương tác chọn có haptic feedback khi nền tảng hỗ trợ.
- Hỗ trợ web và native; Google Sign-In native yêu cầu development build.

## 4. Mô hình dữ liệu Firestore

- `users/{uid}`: `email`, `displayName`, `role`, `createdAt`.
- `buildings/{buildingId}`: `name`, `createdAt`.
- `rooms/{roomId}`: `name`, `building`, `buildingId`, `capacity`, `description`, `available`, `bookedAt`, `createdAt`.
- `bookings/{bookingId}`: `roomId`, thông tin phòng/tòa snapshot, `userId`, `userEmail`, ngày, giờ bắt đầu, thời lượng, `slotIds`, `startsAt`, `endsAt`, `status`, timestamps.
- `roomSlots/{roomId_day_hour}`: `roomId`, `day`, `hour`, `bookingId`, `userId`.

## 5. Bảo mật và cấu hình

- Firestore Security Rules phải yêu cầu Firebase Authentication.
- Client chỉ được tạo hồ sơ có role `guest`; không được tự sửa role.
- Chỉ manager được CRUD phòng/tòa và xem toàn bộ booking.
- Guest chỉ được đọc lịch của mình, tạo booking cho UID hiện tại và hủy lịch của mình.
- Service-account credentials chỉ dùng ở công cụ Node/CI đáng tin cậy; không được bundle vào app hoặc commit.
- Android/iOS Google Sign-In cần Firebase native config, OAuth client IDs và signing SHA-1 phù hợp.

## 6. Yêu cầu môi trường và chất lượng

- Expo SDK 57, React Native 0.86, React 19, TypeScript strict.
- Node.js 22.13 trở lên và npm.
- Các cổng kiểm tra trước khi hoàn tất thay đổi: `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`.
- Xác thực Google trên iOS/Android chỉ được nghiệm thu bằng development/release build; Expo Go không hỗ trợ native Google Sign-In module.
