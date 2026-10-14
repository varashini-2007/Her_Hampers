const http = require('http');
const fs = require('fs');
const path = require('path');

function request(method, pathName, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: pathName,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runPaymentSuite() {
  console.log('--- STARTING PAYMENT VERIFICATION SUITE (PAY ONLINE & CARD ONLY) ---');
  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  }

  try {
    // 1. Verify Server is active
    const statusRes = await request('GET', '/api/status');
    assert(statusRes.status === 200 && statusRes.data.status === 'online', 'Local server is online and operational on port 3000');

    // 2. Verify HTML structure
    const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

    // Scanner removed completely
    assert(!indexHtml.includes('id="upiDynamicQrSvg"'), 'Scanner / QR code SVG has been completely removed from checkout HTML');
    assert(!indexHtml.includes('QR Valid for:'), 'QR code countdown timer has been completely removed');

    // Only 2 payment methods: Pay Online & Card
    assert(indexHtml.includes('id="methodCardOnline"'), 'index.html contains "Pay Online" payment method card');
    assert(indexHtml.includes('id="methodCardCard"'), 'index.html contains "Debit / Credit Card" payment method card');
    assert(!indexHtml.includes('id="methodCardRazorpay"'), 'Razorpay has been removed from top selection cards');
    assert(!indexHtml.includes('id="methodCardNetBanking"'), 'NetBanking has been removed from top selection cards');

    // 4 prominent online apps visible with their logos
    assert(indexHtml.includes('id="appCardGPay"'), 'Google Pay (GPay) card is present');
    assert(indexHtml.includes('id="appCardPhonePe"'), 'PhonePe card is present');
    assert(indexHtml.includes('id="appCardPaytm"'), 'Paytm card is present');
    assert(indexHtml.includes('id="appCardBHIM"'), 'BHIM UPI card is present');

    // Card logos present (Visa, Mastercard, RuPay)
    assert(indexHtml.includes('title="Visa"'), 'Visa card network logo is present');
    assert(indexHtml.includes('title="Mastercard"'), 'Mastercard network logo is present');
    assert(indexHtml.includes('title="RuPay"'), 'RuPay network logo is present');

    // WhatsApp 9994977734 direct touch integration
    assert(indexHtml.includes('99949 77734') || indexHtml.includes('9994977734'), 'WhatsApp boutique number 9994977734 is clearly displayed in checkout');
    assert(indexHtml.includes("handlePaymentAppTouch('Google Pay (GPay)'"), 'GPay touch handler is wired up to handlePaymentAppTouch');
    assert(indexHtml.includes("handlePaymentAppTouch('PhonePe'"), 'PhonePe touch handler is wired up');
    assert(indexHtml.includes("handlePaymentAppTouch('Paytm'"), 'Paytm touch handler is wired up');
    assert(indexHtml.includes("handlePaymentAppTouch('BHIM UPI'"), 'BHIM touch handler is wired up');
    assert(indexHtml.includes("handlePaymentAppTouch('Debit / Credit Card'"), 'Card touch handler is wired up');

    // Verify removed wordings & banners as requested by user
    assert(!indexHtml.includes('Touch your payment app below'), 'Prompt "Touch your payment app below..." is removed');
    assert(!indexHtml.includes('Touch to pay on 9994977734'), 'Note "Touch to pay on 9994977734" on app cards is removed');
    assert(!indexHtml.includes('whatsapp-direct-pill'), 'Pill "WhatsApp: 99949 77734" is removed');

    // 3. Verify CSS styling in style.css
    const styleCss = fs.readFileSync(path.join(__dirname, '../assets/css/style.css'), 'utf8');
    assert(styleCss.includes('.payment-methods-grid'), 'style.css defines .payment-methods-grid');
    assert(styleCss.includes('.online-apps-grid'), 'style.css defines responsive .online-apps-grid');
    assert(styleCss.includes('.online-app-card'), 'style.css contains luxury .online-app-card styling');
    assert(styleCss.includes('.online-app-card:hover'), 'style.css provides interactive hover effects on payment apps');
    assert(styleCss.includes('.online-app-card.active'), 'style.css provides highlighted active selection state');

    // 4. Verify JavaScript logic in app.js
    const appJs = fs.readFileSync(path.join(__dirname, '../assets/js/app.js'), 'utf8');
    assert(appJs.includes('window.handlePaymentAppTouch'), 'app.js defines window.handlePaymentAppTouch');
    assert(appJs.includes('9994977734'), 'app.js redirects touch events to WhatsApp number 9994977734');
    assert(appJs.includes('window.selectPaymentMethod'), 'app.js exports selectPaymentMethod');
    assert(appJs.includes('detectCardBrand'), 'app.js implements automatic card network detection');
    assert(appJs.includes('autoFillTestCard'), 'app.js implements 1-click test card auto-fill');
    assert(appJs.includes('finalizeOrderWithPayment'), 'app.js implements universal order confirmation');

    // 5. Test Order Persistence for Online & Card Gateways
    const ordersRes = await request('GET', '/api/orders');
    assert(ordersRes.status === 200 && Array.isArray(ordersRes.data), 'GET /api/orders returns existing order array');

    const timestamp = new Date().toISOString().slice(0, 10) + ' ' + new Date().toTimeString().slice(0, 5);
    const existingOrders = ordersRes.data;

    // Test Order: GPay
    const gpayOrder = {
      id: 'HH-' + Math.floor(10000 + Math.random() * 90000),
      customerName: 'Pooja Sundaram',
      phone: '9994977734',
      email: 'pooja@example.com',
      state: 'Tamil Nadu',
      address: '24, TTK Road, Alwarpet, Chennai, Tamil Nadu - 600018',
      items: [{ name: 'Royal Queen Luxury Hamper', price: 1499, qty: 1 }],
      subtotal: 1499,
      discountCode: 'WELCOME10',
      discountAmount: 150,
      shippingFee: 70,
      total: 1419,
      status: 'Packed',
      paymentMethod: 'Google Pay (GPay)',
      upiRef: 'UPI-GPAY-9994977734',
      estimatedDelivery: '3 - 7 working days',
      date: timestamp,
      notes: 'Delivery State: Tamil Nadu (Shipping: ₹70)'
    };

    // Test Order: Card
    const cardOrder = {
      id: 'HH-' + Math.floor(10000 + Math.random() * 90000),
      customerName: 'Meera Nambiar',
      phone: '9994977734',
      email: 'meera@example.com',
      state: 'Karnataka',
      address: '15, Indiranagar 100ft Road, Bengaluru, Karnataka - 560038',
      items: [{ name: 'Mulberry Silk Satin Scrunchies (Pack of 3)', price: 199, qty: 1 }],
      subtotal: 199,
      discountCode: null,
      discountAmount: 0,
      shippingFee: 100,
      total: 299,
      status: 'Packed',
      paymentMethod: 'Debit / Credit Card (VISA •••• 8910)',
      upiRef: 'CARD-3DS-8910-9994977734',
      estimatedDelivery: '3 - 7 working days',
      date: timestamp,
      notes: 'Delivery State: Karnataka (Shipping: ₹100)'
    };

    const updatedOrders = [gpayOrder, cardOrder, ...existingOrders];
    const postRes = await request('POST', '/api/orders', updatedOrders);
    assert(postRes.status === 200 && postRes.data.success, 'Successfully persisted test orders for GPay & Card to /api/orders');

    // Verify orders exist on disk
    const diskOrdersRaw = fs.readFileSync(path.join(__dirname, '../data/orders.json'), 'utf8');
    const diskOrders = JSON.parse(diskOrdersRaw);
    assert(diskOrders.some(o => o.id === gpayOrder.id && o.paymentMethod.includes('Google Pay')), `Verified Google Pay order #${gpayOrder.id} saved to data/orders.json`);
    assert(diskOrders.some(o => o.id === cardOrder.id && o.paymentMethod.includes('Card')), `Verified Card order #${cardOrder.id} saved to data/orders.json`);

    console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
    if (failed === 0) {
      console.log('🎉 ALL PAYMENT & WHATSAPP 9994977734 VERIFICATION TESTS PASSED (100%)!');
    }
  } catch (err) {
    console.error('Test suite encountered an error:', err);
  }
}

runPaymentSuite();
