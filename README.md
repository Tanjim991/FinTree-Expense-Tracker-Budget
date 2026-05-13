# 🌳 FinTree: Intelligent Financial Hierarchy

**FinTree** is a professional, privacy-first expense tracker designed for individuals and business owners who need to manage complex financial flows with a simple, hierarchical interface.

[![Expo Build](https://img.shields.io/badge/Build-Expo-000000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

## ✨ Key Features

- **🌲 Unlimited Hierarchy:** Organize your finances like a tree. Create categories, sub-categories, and deep-nested sub-sub-categories.
- **🔐 Privacy First:** Your data belongs to you. Local-first storage means your finances are stored on your device by default.
- **☁️ Optional Cloud Sync:** Securely back up your financial tree to the cloud using Google Firebase integration.
- **📸 Receipt Vault:** Attach photos of receipts directly to transactions for tax and record-keeping.
- **🌗 Stunning Dark Mode:** A premium, high-contrast UI designed for clarity and visual excellence.
- **📥 Export/Import:** Move your data anywhere with one-click clipboard backup—no internet required.

## 🛠️ Tech Stack

- **Core:** React Native (Expo)
- **Database:** Firebase Firestore (Cloud) & AsyncStorage (Local)
- **Auth:** Firebase Authentication
- **Media:** Expo Image Picker
- **Styling:** Custom Vanilla CSS-in-JS (Premium Dark Theme)

## 🚀 Getting Started

### Prerequisites
- Node.js (Latest)
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/kingshuk1s-organization/fintree-expense-tracker.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npx expo start
   ```

## 📦 Deployment

FinTree is built and deployed using **Expo Application Services (EAS)**.

To build for production:
```bash
eas build --profile production --platform android
```

---

## 🛡️ Security & Privacy
FinTree Lab is committed to financial privacy. We do not track your spending or sell your data. The cloud sync feature is entirely optional and encrypted.

---
**Developed by [FinTree Lab](https://github.com/kingshuk1s-organization)**
