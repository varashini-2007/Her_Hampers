# Her Hampers - Luxury Boutique & Handcrafted Hampers

An aesthetic e-commerce web application designed with a **pretty pink and white boutique theme**, featuring handcrafted accessories, jewelry, traditional items, and a custom hamper builder studio alongside a **protected Host Admin Portal** with credential verification.

---

## Features & Catalog Items

All requested items and categories have been curated and integrated into the store:

1. **Clips**: Pastel Matte Cloud Claw Clips, French Pearl & Crystal Barrette Hairpin Duos, Butterfly Clips.
2. **Scrunchies**: Mulberry Silk Satin Scrunchies (Pack of 3), Organza Cloud Dream Scrunchies with pearl accents.
3. **Chains**: Dainty 18K Rose Gold Layered Chain with Rose Quartz, Shimmer Butterfly Silver Choker Chain.
4. **Jimmiki**: Royal Kemp Temple Heritage Jimmiki with Pearl Drops, Pastel Pink Meenakari Floral Jimmikis.
5. **Cute Earrings**: Sweet Korean Heart & Crystal Bow Dangles, Pastel Strawberry Blossom Studs.
6. **Kolusu**: Traditional Ghungroo Bell Silver Kolusu (Pair), Dainty Cubic Zirconia Daily Wear Silver Kolusu.
7. **Evil Eye Kolusu**: Rose Gold Turkish Evil Eye Protection Kolusu, Nazariya Black Bead & Silver Payal.
8. **Rings for Boys**: Sleek Matte Black Titanium Band for Him, Minimalist Silver Shield Signet Ring.
9. **Rings for Girls**: Dainty Rose Gold Bow Solitaire Ring (Adjustable), Butterfly Opal Twinkle Stacking Ring.
10. **Nail Polish**: Rose All Day Gel-Shine Nail Polish (Blush Pink), Glitterati Rose Gold Holographic Shimmer Polish.
11. **Glass Bangles**: Jaipur Velvet Touch Pink Glass Bangles (Set of 24), Pastel Rainbow Ombré Glass Bangles Stack.
12. **Raindrop Bangles**: Signature Iridescent Crystal Raindrop Glass Bangles (Stack of 12), Blush Pink Faceted Dewdrop Bangles.
13. **Curated Luxury Hampers**: "The Royal Queen Luxury Hamper", "Bestie Birthday Pamper Box", and "Couple Connection Keepsake Hamper".

---

## Interactive "Build Your Own Hamper" Studio

Customers can curate a one-of-a-kind hamper in 4 interactive steps:
- **Step 1**: Pick luxury hamper box style (Blush Keepsake Box, Rose Velvet Chest, or Pastel Floral Carton).
- **Step 2**: Select 3 to 6 accessories to fill the box (toggles with real-time feedback).
- **Step 3**: Choose luxury add-ons (Warm Fairy Lights, Rose & Peony Scented Candle, Plush Teddy Charm, Gourmet Chocolates).
- **Step 4**: Enter a personalized handwritten calligraphy greeting note.
- **Instant Preview & Pricing**: Real-time cost updates and single-click "Add Custom Hamper to Cart".

---

## Boutique E-Commerce & Checkout Features

### 1. Multi-Option Boutique Payment Gateway Simulation
- **Instant UPI (Dynamic QR & Apps)**:
  - Generates a sharp SVG QR code with central Her Hampers emblem and HDFC Bank verification.
  - 5-Minute Live Countdown Timer with auto-expiration warning.
  - 1-Click UPI VPA Copy for `herhampers@okhdfcbank` with visual toast feedback.
  - Interactive UPI App quick pills for Google Pay, PhonePe, Paytm, BHIM, and Cred.
  - Optional 12-Digit UTR tracking with 1-click test auto-fill.
  - Simulated NPCI verification delay with realistic bank processing feedback.
- **Interactive Holographic 3D-Secure Card Checkout**:
  - Live interactive card preview updating cardholder name, expiry, CVV, and card number in real-time.
  - Automatic Card Brand Detection for **Visa**, **Mastercard**, **RuPay**, and **American Express** based on BIN prefix.
  - 1-Click "⚡ Fill Test Card" shortcut for instantaneous testing.
  - Bank 3D-Secure 2.0 OTP dialog simulation with 3-minute live countdown, auto-fill OTP (`482910`), and unique bank authorization reference (`CARD-3DS-xxxx`).
- **Razorpay Standard Checkout Gateway Simulation**:
  - Branded Razorpay modal with authentic `#0c2340` styling, Her Hampers logo, order amount, and security seals.
  - Supports simulated payment modes: UPI Intent, Cards, NetBanking, and Wallets/PayLater.
  - Generates official Razorpay Payment IDs (e.g. `pay_rzp_9x2b4m1a`).
- **Indian NetBanking Gateway Simulation**:
  - Quick-select pills for Top 6 Indian Banks: **HDFC Bank**, **State Bank of India (SBI)**, **ICICI Bank**, **Axis Bank**, **Kotak Mahindra Bank**, and **Punjab National Bank (PNB)**.
  - Dropdown menu covering 45+ other Indian nationalized and private banks.
  - Bank NetBanking Gateway login & transaction approval simulation dialog generating official bank confirmation references (`NETBANK-HDFC-xxxx`).

### 2. Boutique Promotional Coupon Code System
- **Quick-Click Offer Chips**: Interactive coupon chips displayed in both the Cart Drawer and Checkout Modal.
- **Available Boutique Promo Codes**:
  - `PINKLOVE10` - 10% OFF storewide love discount (No minimum order).
  - `HERHAMPERS` - 20% OFF boutique VIP discount (Min. order ₹499).
  - `WELCOME50` - Flat ₹50 OFF for welcome gifts (Min. order ₹399).
  - `ROYAL100` - Flat ₹100 OFF on luxury hampers (Min. order ₹1,499).
- **Live Price Breakdown**: Real-time recalculation of Subtotal, Discount Savings, Free Luxury Satin Packaging, and Free Express Shipping.
- **1-Click Remove**: Instantly toggle or remove applied coupons.

### 3. Printable Boutique Tax Invoice & PDF Download
- **Luxury Letterhead & Details**: Formatted with Her Hampers boutique address, GSTIN, invoice number, and customer delivery address.
- **Itemized Table**: Includes unit pricing, quantities, totals, and bespoke hamper curation details (box style, curated accessories, handwritten notes).
- **Official Authenticity Stamp**: Gold/pink circular boutique artisan seal with authorized signature.
- **1-Click PDF / Print**: Formatted specifically with `@media print` rules for clean, borderless printing and saving as PDF.
- **Accessible Everywhere**: Available immediately after placing an order, via the Track Order modal, and from the Host Admin Orders table.

### 4. Real-Time Customer Order Tracking
- **Order Lookup**: Search by Order ID (e.g., `HH-10492`, `HH-10493`, `HH-10494`) or customer phone number.
- **4-Stage Visual Progress Stepper**:
  - 🟢 **Order Confirmed**: Payment verified with bank.
  - 🟣 **Artisan Packing**: Accessories handpicked and wrapped in satin ribbon boxes.
  - 🔵 **Dispatched**: Handed over to Express Courier (`Blush Express Air` or `BlueDart`).
  - 🌸 **Delivered**: Successfully delivered to the customer's doorstep.
- **Courier & AWB Details**: Displays tracking number, estimated delivery date, recipient address, and direct WhatsApp support link.

---

The Host Admin Portal is strictly restricted to the **Her Hampers Host Member**:
- **Host Security Gate**: The admin dashboard is locked and hidden until valid credentials are submitted.
- **Verification Rule**: Only when the Host Member ID and Password match does the admin portal unlock. Invalid attempts trigger visual error alerts and card shake animations.
- **Default Host Credentials**:
  - **Host ID / Username**: `admin`
  - **Password**: `pinkpassword123`
- **Host Capabilities**:
  - **Executive Overview**: Total store revenue, total orders placed, live products in catalog, pending shipments.
  - **Product & Inventory Management**: Add new accessories/hampers with photo and pricing, edit existing items, update stock counts, or delete items.
  - **Order Fulfillment Tracker**: View all customer orders (including recipient details, items, delivery address, payment method) and update delivery status (*Packed → Shipped → Delivered*).
  - **Custom Hamper Requests View**: View bespoke hamper orders with selected accessories and customer personalized greeting notes.
  - **Host Settings**: Update Host Member ID & Password anytime, or reset catalog to default items.

---

## Design & Aesthetic Highlights

- **Palette**: Pretty pastel pinks (`#fff8f9`, `#fce7f3`, `#f472b6`, `#db2777`), warm cream, and crisp porcelain white.
- **Typography**: Google Fonts *Playfair Display* for boutique luxury headings, *Outfit* for modern UI, and *Great Vibes* for cursive accents.
- **Visuals**: High-resolution photography of hamper boxes, jimmikis, kolusu, raindrop bangles, rings, and scrunchies.
- **Animations**: Soft floating badges, heart wishlist toggles, confetti celebrations on placing orders, and slide-out shopping cart drawer.

---

## Running Locally

The project can be opened directly or run via a local web server:

```bash
# Option 1: Run with local server (already running on port 3000)
npx serve -p 3000 -s .

# Option 2: Open directly in your browser
Double click index.html or open admin.html
```

- **Customer Storefront**: `http://localhost:3000/` or `index.html`
- **Host Admin Portal**: `http://localhost:3000/admin` or `admin.html`
