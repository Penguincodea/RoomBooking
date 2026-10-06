# VKU Study Room Booking

Ứng dụng đặt phòng học cho VKU, xây dựng bằng Expo, React Native, TypeScript và Firebase. Khách có thể tìm phòng và đặt theo khung giờ; người quản lý có thể quản lý tòa nhà, phòng và lịch đặt.

**Live demo:** [vku-room-booking.expo.app](https://vku-room-booking.expo.app)

## Tính năng

- Đăng ký/đăng nhập bằng email và mật khẩu, xác nhận mật khẩu khi đăng ký.
- Đăng nhập Google bằng Firebase Authentication.
- Vai trò `guest` và `manager`, được kiểm tra bằng Firestore Security Rules.
- Danh sách phòng realtime, tìm kiếm và lọc theo tòa nhà.
- Đặt phòng theo ngày, giờ bắt đầu và thời lượng; giao dịch Firestore ngăn đặt trùng slot.
- Khách xem/hủy lịch của mình; quản lý CRUD tòa nhà/phòng và xử lý lịch.
- Press spring, màn hình fade/slide-in, chuyển màn hình dạng slide và haptic feedback.

## Yêu cầu môi trường

- Node.js 22.13 trở lên (phù hợp Expo SDK 57).
- npm.
- Firebase project có Authentication và Cloud Firestore.
- Development build cho Google Sign-In trên Android/iOS. Expo Go không chứa native Google Sign-In module.

## Cài đặt

```bash
npm install
```

Google Sign-In trên web dùng Firebase popup và không cần OAuth client ID trong bundle. Chỉ tạo `.env.local` từ `.env.example` nếu chạy Google Sign-In native trên Android/iOS; điền **Web OAuth client ID** lấy từ Google Cloud Console:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1234567890-xxxxxxxx.apps.googleusercontent.com
```

`EXPO_PUBLIC_` có nghĩa giá trị được đưa vào ứng dụng client. OAuth client ID không phải secret; tuyệt đối không đặt OAuth client secret, service-account key hoặc private key vào biến này hay bundle app.

### Firebase Authentication

1. Mở Firebase Console → **Authentication → Sign-in method**.
2. Bật **Email/Password** và **Google**.
3. Vào **Authentication → Settings → Authorized domains**, thêm `vku-room-booking.expo.app` để đăng nhập web hoạt động.
4. Trong Firestore, publish [firestore.rules](firestore.rules). Đừng mở quyền ghi public.

### Google Sign-In cho Android/iOS

Native Google Sign-In cần một bản app có custom native code:

1. Firebase Console → **Project settings → General → Your apps**, thêm Android app với package name `com.vku.roombooking`.
2. Thêm SHA-1 fingerprint của signing key vào Android app trong Firebase. Cần fingerprint tương ứng cho từng loại build (development/debug, EAS/release và Play App Signing khi phát hành).
3. Tải `google-services.json` và đặt ở thư mục gốc, đúng đường dẫn được khai báo trong `app.json`.
4. Thêm iOS app với bundle ID `com.vku.roombooking`, tải `GoogleService-Info.plist` và đặt ở thư mục gốc theo `app.json`.
5. Google Cloud Console → **APIs & Services → Credentials**, tạo hoặc lấy OAuth client ID loại **Web application**, rồi đặt vào `.env.local`.
6. Sau khi thay package/bundle ID, SHA-1 hoặc Firebase native config, tạo lại development build.

Hai file native Firebase config chứa thông tin nhận diện ứng dụng, không chứa Admin credentials. Không đưa service-account JSON hoặc private keys vào ứng dụng.

## Chạy ứng dụng

Web:

```bash
npx expo start --web
```

Để xuất bản bản web hiện tại hoặc cập nhật live demo:

```bash
npm run deploy:web
```

Lệnh export web rồi deploy lên EAS Hosting production. Cần đăng nhập Expo bằng `npx eas-cli@latest login` trước khi chạy.

Android development build (Windows cần Android Studio/Android SDK đã cài):

```bash
npx expo run:android
```

Có thể dùng EAS Development Build nếu không muốn cài Android toolchain local. Google Sign-In native không hoạt động trong Expo Go, kể cả chạy bằng tunnel. Sau khi cài development build, chạy Metro như thường:

```bash
npx expo start
```

## Cấp vai trò quản lý

Đăng ký trong app luôn tạo `guest`; người dùng không thể chọn role quản lý. Để cấp quyền quản lý:

1. Đăng nhập tài khoản một lần để tạo Firebase Auth user.
2. Firebase Console → Authentication → Users, sao chép UID.
3. Firestore tạo document `users/{UID}` với các trường `email`, `displayName`, `role: "manager"`.
4. Đăng nhập lại. App đọc role realtime từ Firestore; Rules là lớp bảo vệ quyền thực, không chỉ ẩn nút UI.

## Seed dữ liệu demo

Seed dùng Firebase Admin SDK từ Node và Application Default Credentials. Không chạy script bằng credential client của app. Dataset gồm 20 phòng ban đầu và thêm 100 phòng ở 10 tòa mới. Script ghi vào project `study-room-booking-9107b`, nhận diện tòa đã có theo tên, bỏ qua phòng có sẵn và không thay đổi trạng thái/booking của chúng.

### Cách 1: Google Cloud CLI

Sau khi cài Google Cloud CLI, đăng nhập ADC bằng tài khoản có quyền ghi Firestore vào project:

```powershell
gcloud auth application-default login
gcloud config set project study-room-booking-9107b
npm run seed:rooms
```

### Cách 2: Service account key

Tải key cho service account có quyền ghi Firestore, lưu an toàn ở máy local (không gửi key qua chat, không commit):

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="$PWD\serviceAccountKey.json"
npm run seed:rooms
```

Đặt service-account JSON ở thư mục gốc; tên mặc định này được `.gitignore` loại trừ. Sau khi chạy thành công, terminal báo số tòa/phòng mới tạo và số mục đã tồn tại. Chạy lại an toàn để bổ sung phần còn thiếu.

## Kiểm tra

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

## Cấu trúc chính

```text
components/       UI dùng chung và motion primitives
contexts/        trạng thái đăng nhập/vai trò
services/        Firebase Auth, Firestore, booking, quản trị
src/app/         Expo Router screens
scripts/          công cụ seed Firebase Admin
types/            kiểu dữ liệu domain
firestore.rules   quy tắc bảo mật Cloud Firestore
```

Xem [REQUIREMENTS.md](REQUIREMENTS.md) để biết yêu cầu chức năng và phi chức năng của dự án.
