# 🚀 Installation & Setup Guide — DS Enterprises FMCG System

---

## ⚡ Quick Start (No Installation Required)

DS Enterprises FMCG System is engineered as a **Zero-Build, Serverless, Offline-First** application. You do not need to install Node.js, Python, or database servers to run the system.

### Step 1: Open Application
* Simply double-click [`index.html`](file:///c:/Users/Admin/OneDrive/Desktop/DS%20Enterprises/index.html) or [`DS_Enterprises_FMCG_Dashboard_v33_Route_Item_Brand_Order.html`](file:///c:/Users/Admin/OneDrive/Desktop/DS%20Enterprises/DS_Enterprises_FMCG_Dashboard_v33_Route_Item_Brand_Order.html) in any modern web browser:
  * Google Chrome (v90+)
  * Microsoft Edge (v90+)
  * Brave Browser
  * Safari (iOS 14+) / Chrome for Android

### Step 2: Sign-In to Portal
* **Default Admin PIN:** `1234`
* Type `1234` on the touch keypad or your physical keyboard and press **Enter** or click **Unlock Administrator Panel**.

---

## 📱 Installing as a PWA (Progressive Web App)

You can install DS Enterprises directly as a native desktop or mobile application on your device:

### On Windows / Mac (Chrome & Edge):
1. Open [`index.html`](file:///c:/Users/Admin/OneDrive/Desktop/DS%20Enterprises/index.html) in Chrome or Edge.
2. Look at the browser address bar on the top-right. Click the **Install App icon** (💻 or ⊕).
   *(Alternatively: Click **⋮ (Menu)** ➔ **Save and share** ➔ **Install page as app**).*
3. Name it **DS Enterprises** and click **Install**.
4. A desktop shortcut will be created. The app will launch in its own dedicated, clean window without browser address bars or tabs.

### On Android (Chrome):
1. Open the application URL/file in Google Chrome.
2. Tap the three dots **⋮ (Menu)** in the top-right corner.
3. Tap **Add to Home screen** (or **Install App**).
4. Tap **Add**. The app icon will appear on your phone's home screen and work 100% offline.

### On iPhone / iPad (Safari):
1. Open the application in Safari.
2. Tap the **Share** button (box with an upward arrow) at the bottom.
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.

---

## 🌐 Optional: Running with a Local Static Server

If you prefer serving the app over your local Wi-Fi network so field salesmen can connect their phones directly to your laptop:

### Using Python (Built-in on Windows/Mac):
```bash
# In the DS Enterprises directory:
python -m http.server 8080
```
Then open `http://localhost:8080` on your PC, or `http://<your-laptop-ip>:8080` on mobile devices connected to the same Wi-Fi.

### Using Node.js (npx serve):
```bash
npx -y serve . -p 8080
```

---

## 🛡️ Browser Compatibility & Permissions

| Feature | Chrome / Edge | Safari | Firefox | Brave |
| :--- | :---: | :---: | :---: | :---: |
| **LocalStorage Database** | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| **Excel Sheet Import** | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| **Challan Slip Print** | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| **Offline Service Worker** | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| **PWA Home Screen Install** | ✅ 100% | ✅ 100% | ⚠️ Manual | ✅ 100% |
