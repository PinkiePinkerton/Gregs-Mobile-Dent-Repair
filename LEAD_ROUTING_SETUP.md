# Greg's Mobile Dent Repair: Lead Routing & Dual Alert Setup

This guide details how estimate submissions on `gregsdent.com` are captured, logged to Google Sheets, emailed to Greg's inbox, and sent as an instant SMS alert to Greg's cell phone.

---

## 1. How the System Works

1. **Lead Enters Form:** Customer fills out name, phone, email, vehicle info, dent description, and optional photos (inline on desktop/mobile or via the header popup modal).
2. **Local Insurance (Zero Lost Leads):** The browser instantly writes a backup copy to `localStorage.gregs_estimates`.
3. **Google Apps Script Webhook:** Form data and base64-encoded photos are dispatched asynchronously via `fetch()` to your Google Apps Script Web App.
4. **Google Sheets Logging:** The script automatically appends the lead to your spreadsheet with Arizona timestamp, customer details, and Google Drive links to any uploaded photos.
5. **Dual Notification to Greg:**
   - **Full Email:** Sent to `greg.napier37@gmail.com` with formatted details, photo links, and 1-tap call/text buttons.
   - **Instant SMS Alert:** Sent to Greg's phone `(602) 316-9263` via carrier email-to-SMS gateway (`vtext.com`, `tmomail.net`, `txt.att.net`).
6. **Instant Mobile Customer Handoff:** The website displays an immediate confirmation screen with a 1-tap button: *"Need It Faster? Tap to Text Greg Directly"*, pre-populating an SMS with the customer's vehicle and dent info.

---

## 2. 2-Minute Setup Instructions

### Step 1: Open Your Google Sheet
1. Open Google Drive and create a new Google Sheet (or open your existing leads spreadsheet).
2. Title it: `Greg's Mobile Dent Repair - Leads`.

### Step 2: Open Google Apps Script
1. In the menu bar, click **Extensions** > **Apps Script**.
2. Select and delete any code currently inside the editor (`myFunction`).
3. Open `google-apps-script.js` from this project folder, copy all code, and paste it into the editor.
4. Click the **Save** icon (disk).

### Step 3: Deploy as Web App
1. In the upper-right corner, click **Deploy** > **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in the fields:
   - **Description:** `Greg's Website Form Webhook`
   - **Execute as:** `Me (your email)`
   - **Who has access:** `Anyone` (essential so customer submissions from the website can post data).
4. Click **Deploy**.
5. Click **Authorize access**, choose your Google account, click *Advanced* > *Go to untitled project (unsafe)*, and click **Allow**.
6. Copy the **Web App URL** (looks like `https://script.google.com/macros/s/AKfycb.../exec`).

### Step 4: Add URL to Website
1. Open `index.html`.
2. Locate line ~2745:
   ```javascript
   const GOOGLE_SCRIPT_URL = window.GREG_ESTIMATE_WEBHOOK_URL || "";
   ```
3. Paste your Web App URL inside the quotation marks:
   ```javascript
   const GOOGLE_SCRIPT_URL = window.GREG_ESTIMATE_WEBHOOK_URL || "https://script.google.com/macros/s/YOUR_DEPLOYED_ID/exec";
   ```
4. Commit and push to GitHub (or deploy to Cloudflare Pages).

---

## 3. Recommended Long-Term Upgrade: Carrier Gateways vs. Direct Webhooks

### The Tradeoff
- **Current Setup (Email-to-SMS Gateways):** 100% free with zero monthly SaaS fees. Works well for low-volume direct alerts.
- **The Risk:** US mobile carriers (Verizon, AT&T, T-Mobile) increasingly filter or throttle email-to-SMS gateways due to strict A2P 10DLC spam regulations. Messages can occasionally be delayed by 15 to 45 minutes or blocked silently.

### The Bulletproof Alternative
When ready to eliminate all carrier delivery delays, plug a Twilio SMS webhook directly into the Apps Script:
- Twilio cost: ~\$0.0079 per text (less than a penny per lead).
- Instant 1 to 2 second SMS delivery directly to Greg's phone every single time.
- Allows automated instant auto-replies to the customer: *"Hi [Name], Greg received your dent request for your [Vehicle]. He is finishing up a repair and will call or text you within 30 minutes!"*
