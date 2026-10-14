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
  await new Promise(r => setTimeout(r, 1200));

  // Open product details modal for first product
  await send('Runtime.evaluate', {
    expression: `(() => {
      const prod = currentProducts[0];
      openProductDetailsModal(prod.id);
    })()`
  });
  await new Promise(r => setTimeout(r, 500));

  // Take laptop screenshot with modal open
  const laptopShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/laptop_product_view.png', Buffer.from(laptopShot.data, 'base64'));

  // Close modal and switch to mobile emulation
  await send('Runtime.evaluate', { expression: `closeQuickViewModal()` });
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 500));

  // Scroll a bit down to see normalized mobile product cards
  await send('Runtime.evaluate', { expression: `window.scrollTo(0, 500)` });
  await new Promise(r => setTimeout(r, 300));

  const mobileShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/mobile_home_view.png', Buffer.from(mobileShot.data, 'base64'));

  chrome.kill();
  console.log('Screenshots saved successfully!');
}

run().catch(console.error);
