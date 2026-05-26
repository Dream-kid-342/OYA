# Mobile Application Documentation

The OYA mobile application is the primary interface for our customers. It is built using **Flutter** and **Dart**, ensuring a smooth, native-like experience across iOS, Android, and the Web from a single codebase.

## Codebase Location
The mobile app is located at `apps/mobile/` within the Turborepo monorepo.

## Core Technologies
- **Framework:** Flutter (Dart)
- **State Management:** `flutter_riverpod` (used for reactive, predictable state mapping)
- **Routing:** `go_router` (handles deep linking, URL-based web navigation, and route guarding)
- **Networking:** `dio` (powerful HTTP client for intercepting requests, injecting JWTs, and catching API errors)

## Aesthetic & Design System
The app employs a custom **Premium Fintech Theme**, defined primarily in `apps/mobile/lib/core/theme/app_theme.dart`.
- **Primary Color:** Deep Slate 900 (`0xFF0F172A`)
- **Accent Color:** Vibrant Emerald Green (`0xFF10B981`)
- **Typography:** Google Fonts (`Outfit` for headings, `Inter` for body text)
- **Interaction:** Heavy usage of `HapticFeedback` across all buttons, pull-to-refresh indicators, and successful form submissions to provide a premium, tactile user experience.

## Key Features
1. **Authentication:** Register, Login, and OTP verification flows. State is managed by `auth_provider.dart` which directly intercepts API error responses for clean UI snackbars.
2. **Dashboard:** Summarizes the user's current outstanding loans, limits, and recent activity.
3. **Loan Application:** Handled via a dynamic `ModalBottomSheet` on the Loans screen. Submits directly to the backend and yields a unique Reference Number.

## Building and Dockerization
While the app *can* be run locally using standard Flutter tools, the production system completely encapsulates it within Docker.

### How the Docker Build Works
1. The `apps/mobile/Dockerfile` begins from an official Ubuntu container.
2. It clones the Flutter SDK and sets up the toolchain.
3. It runs `flutter build web --release` to compile the Dart code into optimized HTML/JS/WASM.
4. It copies the resulting web bundle (`build/web`) into an **Nginx** container.
5. Nginx statically serves the flutter app on port `8080`.

Because of this, there is zero requirement for the host machine to have Android Studio, Xcode, or the Flutter SDK installed to serve the app!
