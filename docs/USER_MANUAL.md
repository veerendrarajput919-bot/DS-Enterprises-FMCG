# 📘 DS Enterprises — User Manual & Operations Guide
## (Admin & Sales Officer Management System)

---

## 🔐 0. Login Panel (लॉगिन पैनल गाइड)

### 0.1 Portal Sign-In (ऐप खोलते ही लॉगिन स्क्रीन)
- जब भी आप ऐप खोलेंगे, स्क्रीन पर एक प्रीमियम **Secure Portal Sign-In** पैनल दिखाई देगा।
- यहाँ 2 टैब्स हैं:
  1. **👑 Admin Login:**
     - 4-digit एडमिन पिन डालें (Default: **`1234`**).
     - स्क्रीन पर दिए गए टच कीपैड (1 to 9, C, 0, ✓) या कीबोर्ड से टाइप करें।
     - **`Unlock Administrator Panel`** दबाएं।
  2. **💼 Sales Officer Login:**
     - ड्रॉपडाउन से अपना नाम चुनें (उदा. `Rahul Sharma`, `Amit Verma`, `Vikas Singh`).
     - नीचे आपकी बीट रूट्स और दैनिक टारगेट दिखेंगे।
     - **`Enter Field Sales Portal`** दबाएं।
- **🚪 Logout:** काम पूरा होने पर टॉप बार में **`🚪 Logout`** बटन दबाकर बाहर निकलें, जिससे सिस्टम फिर से लॉक हो जाएगा।

---

## 👑 1. Admin Panel Guide (एडमिन पैनल गाइड)

### 1.1 How to Unlock Admin Panel (एडमिन पैनल अनलॉक कैसे करें)
- Default Admin PIN है: **`1234`**
- अगर ऐप Sales Officer मोड में है, तो ऊपर हेडर में **`⇄ Switch to Admin`** बटन दबाएं।
- स्क्रीन पर 4-digit टच कीपैड खुलेगा।
- `1` `2` `3` `4` दबाएं और **`Unlock Admin`** पर क्लिक करें।
- आपका पूरा एडमिन डैशबोर्ड सभी 14 टैब्स के साथ खुल जाएगा।

### 1.2 Sales Officers Master (सेल्स ऑफिसर्स मास्टर और टारगेट सेट करना)
- **`👥 Sales Officers`** टैब पर जाएं।
- यहाँ आप:
  1. **नया Sales Officer जोड़ सकते हैं**: नाम, फ़ोन नंबर, Beat Routes (कॉमा से अलग करके, e.g. `Main Market, Civil Lines`), और Daily Target (₹ में)।
  2. **Edit/Delete**: किसी भी ऑफिसर का टारगेट बदल सकते हैं या स्टेटस एक्टिव/इनएक्टिव कर सकते हैं।
  3. **Admin PIN बदलें**: नीचे दिए गए कार्ड में नया 4-digit PIN डालकर **Update PIN** दबाएं।

### 1.3 Order Fulfillment Pipeline (ऑर्डर अप्रूवल और डिस्पैच सिस्टम)
- **`📦 Order Approval`** टैब पर जाएं।
- यहाँ 5 मुख्य कार्ड्स दिखते हैं:
  - Total Orders, Submitted (Pending), Approved, Dispatched, Delivered.
- **Workflow Steps**:
  1. **Approved करें**: जब SO ऑर्डर पंच करता है, वह `Submitted` स्टेटस में आता है। एडमिन **`✓ Approve`** दबाकर ऑर्डर कन्फर्म करता है।
  2. **Dispatched करें**: **`🚚 Dispatch`** दबाएं। सिस्टम पूछेगा: *Delivery Boy / Vehicle Number* (उदा. `Ramesh - PB10-1234`).
  3. **Print Slip (Challan)**: **`🖨 Slip`** बटन दबाएं। खूबसूरत DS Enterprises Dispatch Challan & Packing Slip खुलेगा जिसमें पार्टी का नाम, रूट, सभी आइटम्स, रेट, और डिस्काउंट विवरण होगा। इसे प्रिंट करके गाड़ी में भेजें।
  4. **WhatsApp Update**: **`💬 WhatsApp`** बटन दबाकर दुकानदार या डिलीवरी बॉय को तुरंत डिस्पैच मैसेज भेजें।
  5. **Delivered**: माल पहुँचने और पेमेंट कन्फर्म होने पर **`📦 Delivered`** मार्क करें।

### 1.4 Consolidated Tempo / Van Loading Sheet (टेम्पो/गाड़ी की लोडिंग शीट)
- **`📦 Order Approval`** टैब पर जाएं।
- ऊपर दिए गए **`🚚 Tempo / Van Loading Sheet`** बटन पर क्लिक करें।
- रूट (जैसे `Civil Lines` या `All Routes`) और तारीख सेलेक्ट करें।
- सिस्टम दो महत्वपूर्ण सेक्शन्स जनरेट करेगा:
  1. **Section A (SKU Pick List):** उस रूट के सभी ऑर्डर्स का कुल माल आइटम-वाइज़ (e.g. *Item A: 45 Peti*, *Item B: 20 Peti*). गोदाम से टेम्पो में माल चढ़ाना अब 10 गुना तेज़ हो जाएगा।
  2. **Section B (Drop Sequence):** किस दुकान पर कौन सा ऑर्डर deliver करना है उसकी पूरी लिस्ट।
- **`🖨 Print Loading Sheet`** दबाकर ड्राइवर/डिलीवरी बॉय को प्रिंट कॉपी दें।

### 1.5 Payment Collections Log & Audit (पेमेंट वसूली का पूरा हिसाब)
- **`📦 Order Approval`** टैब पर **`💰 Payment Collections`** बटन दबाएं।
- यहाँ सभी Sales Officers द्वारा फील्ड से कलेक्ट किए गए Cash, UPI, और Cheque का पूरा ऑडिट लॉग दिखता है।
- **`⇩ Export Excel`** दबाकर पूरे कलेक्शन का एक्सेल डाउनलोड करें।

---

## 💼 2. Sales Officer Panel Guide (सेल्स ऑफिसर गाइड)

### 2.1 SO Login / Role Switch (सेल्स ऑफिसर मोड में जाना)
- टॉप बार में **`⇄ Switch Mode`** दबाएं।
- अपना नाम चुनें (उदा. `Rahul Sharma (SO-01)`).
- स्क्रीन तुरंत मोबाइल-फ्रेंडली **SO Dashboard** पर स्विच हो जाएगी।
- एडमिन से जुड़े संवेदनशील टैब्स (Upload, Clear Data, Settings) छुप जाएंगे ताकि कोई डेटा डिलीट न हो सके।

### 2.2 Daily Sales & Collection Tracking (टारगेट व कलेक्शन ट्रैकिंग)
- SO Dashboard के टॉप पर अब मुख्य कार्ड्स हैं:
  - **Target (₹)** — एडमिन द्वारा सेट किया गया लक्ष्य।
  - **Booked Today (₹)** — आज जितने के ऑर्डर्स पंच किए।
  - **Remaining (₹)** — टारगेट पूरा करने के लिए बाकी रकम।
  - **💵 Collected Today (₹)** — आज फील्ड से जितना कैश/UPI वसूला।
- साथ ही लाइव प्रोग्रेस बार प्रतिशत (%) में दिखता है।

### 2.3 Beat Stores, Credit Limit & Payment Collection (बीट की दुकानें व वसूली)
- रूट सेलेक्ट करें (उदा. `Civil Lines`).
- उस रूट की सभी दुकानों की लिस्ट सामने आ जाएगी:
  - **बकाया रकम (Pending Due):** लाल रंग में दिखती है।
  - **🛑 Credit Limit Alert:** अगर किसी दुकान का बकाया ₹40,000 से अधिक है, तो लाल अलर्ट दिखेगा।
  - **💵 Collect Payment:** **`💵 Collect`** बटन दबाकर तुरंत Cash, UPI या Cheque कलेक्शन की रसीद बनाएं। रकम डालते ही दुकान का बकाया खुद-ब-खुद कम हो जाएगा।
  - **🛒 Take Order:** बटन दबाते ही सीधे उस पार्टी का ऑर्डर फॉर्म खुल जाएगा।

### 2.4 Quick Order Punching (तेज़ ऑर्डर बुकिंग)
- पार्टी चुनें, आइटम सर्च करें, क्वांटिटी और रेट डालें।
- कार्ट में डिस्काउंट और टैक्स अपने आप कैलकुलेट होते हैं।
- **Submit Order** दबाते ही ऑर्डर लोकल डेटाबेस में सेव हो जाता है और एडमिन पाइपलाइन में तुरंत दिखने लगता है।

---

## 💾 3. Data Backup & Safety (डेटा सुरक्षा)

- सारा डेटा सुरक्षित ब्राउज़र के LocalStorage में रहता है।
- इंटरनेट न होने पर भी ऑर्डर बुकिंग, पेमेंट कलेक्शन और रिपोर्टिंग 100% ऑफलाइन काम करती है।
- एक्सेल अपलोड करने के लिए एडमिन **`📥 Upload`** टैब से Sales, Stock, और Outstanding शी́t्स अपलोड कर सकता है।

