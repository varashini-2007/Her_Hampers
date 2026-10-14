const { spawn } = require('child_process');
const fs = require('fs');

async function run() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,800'
  ]);

  await new Promise(r => setTimeout(r, 1200));

  const newTab = await fetch('http://127.0.0.1:9222/json/new?http://localhost:3000', { method: 'PUT' }).then(r => r.json());
  const ws = new WebSocket(newTab.webSocketDebuggerUrl);

  let idCounter = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise(r => ws.onopen = r);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://localhost:3000' });
  await new Promise(r => setTimeout(r, 1000));

  // Dismiss opening splash page
  await send('Runtime.evaluate', {
    expression: `(() => {
      if (typeof dismissOpeningPage === 'function') dismissOpeningPage();
      const splash = document.getElementById('openingPageSplash');
      if (splash) splash.style.display = 'none';
      const prompt = document.getElementById('deliveredOrderReviewPromptBanner');
      if (prompt) prompt.style.display = 'none';
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  // Open first product modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const prod = currentProducts[0];
      openProductDetailsModal(prod.id);
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  const laptopModalShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/laptop_product_modal_open.png', Buffer.from(laptopModalShot.data, 'base64'));

  // Scroll details column down to show reviews & sticky action bar
  await send('Runtime.evaluate', {
    expression: `(() => {
      const col = document.querySelector('.product-page-details-col');
      if (col) col.scrollTop = 500;
    })()`
  });
  await new Promise(r => setTimeout(r, 400));

  const laptopModalScrolled = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/laptop_product_modal_scrolled.png', Buffer.from(laptopModalScrolled.data, 'base64'));

  // Mobile screenshot
  await send('Runtime.evaluate', { expression: `closeQuickViewModal()` });
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 500));
  await send('Runtime.evaluate', { expression: `window.scrollTo(0, 420)` });
  await new Promise(r => setTimeout(r, 400));

  const mobileShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/mobile_home_view.png', Buffer.from(mobileShot.data, 'base64'));

  chrome.kill();
  console.log('All screenshots captured successfully!');
}

run().catch(console.error);
