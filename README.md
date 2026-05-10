# 🌳 FinTree: Expense Tracker & Budget

> **Take control of your finances — offline, fast, and secure.**

FinTree is a powerful personal finance management app built with React Native (Expo). It uses a unique **Infinite Tree Hierarchy** system to organize your expenses and income into a visually intuitive structure — like branches of a tree. Your data lives on **your device first**, with optional cloud backup powered by Firebase.

---

## ✨ Features

### 💰 Smart Finance Tracking
- Add **income** and **expense** entries instantly
- Organize finances using a unique **tree-based category hierarchy**
- View real-time **balance**, total income, and total expenses

### 🌳 Infinite Tree System
- Create **parent and child categories** with unlimited depth
- Navigate your financial structure like a file explorer
- Each node shows its own **subtotal** rolled up from children

### 🔒 Offline-First Architecture
- **No login required** to use the app
- All data stored locally using `AsyncStorage`
- Works 100% without an internet connection
- Lightning-fast — no server round-trips

### ☁️ Manual Cloud Backup (Firebase)
- **You control when your data goes to the cloud**
- Log in with email inside the Settings menu
- **☁️ Save to Cloud** — backs up your data to Firebase Firestore
- **📥 Restore from Cloud** — downloads your data on any new device
- Like a "Minecraft Save" — sync only when YOU want

### 🔐 Lock Screen Protection
- PIN/passcode lock screen on app open
- Keeps your financial data private

### 💾 Local Backup
- Copy your entire data to clipboard as JSON
- Paste it back anytime to restore — no internet needed

---

## 📱 Screenshots

> App opens instantly → Lock Screen → Dashboard → Settings for Cloud Sync

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or above)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- An Android device or emulator

### Installation

```bash
# Clone the repository
git clone https://github.com/Tanjim991/FinTree-Expense-Tracker-Budget.git

# Navigate into the project
cd FinTree-Expense-Tracker-Budget

# Install dependencies
npm install

# Start the development server
npx expo start
```

Scan the QR code with the **Expo Go** app on your Android phone to run it instantly.

---

## ☁️ Firebase Setup (Optional — for Cloud Sync)

If you want to enable cloud backup:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project and enable:
   - **Authentication → Email/Password**
   - **Firestore Database** (Start in Test Mode)
3. Register a Web App and copy the `firebaseConfig`
4. Paste it into `App.js` replacing the existing config

> ⚠️ Cloud sync is **completely optional**. The app works perfectly without it.

---

## 🏗️ Tech Stack

| Technology | Purpose |
|------------|---------|
| React Native (Expo) | Cross-platform mobile framework |
| AsyncStorage | Local offline data storage |
| Firebase Auth | Optional cloud authentication |
| Firebase Firestore | Optional cloud database |
| EAS Build | Production APK build system |

---

## 📦 Building an APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build Android APK
eas build --platform android --profile preview
```

---

## 🗺️ Roadmap

- [x] Offline-first architecture
- [x] Infinite tree category system
- [x] Manual cloud backup & restore
- [x] Lock screen protection
- [ ] Google AdMob integration
- [ ] Budget goal setting with alerts
- [ ] Charts and spending insights
- [ ] iOS support
- [ ] Google Play Store release

---

## 👤 Author

**Tanjim Ahmed Kingshuk**
- GitHub: [@Tanjim991](https://github.com/Tanjim991)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">Made with ❤️ — Track smarter, not harder.</p>
