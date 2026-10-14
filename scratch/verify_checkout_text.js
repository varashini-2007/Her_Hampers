const { spawn } = require('child_process');

async function test() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=390,844'
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
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });

  await send('Page.navigate', { url: 'http://localhost:3000' });
  await new Promise(r => setTimeout(r, 1500));

  const res = await send('Runtime.evaluate', {
    expression: `(async () => {
      const splash = document.getElementById('openingPageSplash');
      if (splash) splash.remove();

      // Open checkout modal
      openCheckoutModal();
      await new Promise(r => setTimeout(r, 300));

      const submitBtn = document.getElementById('checkoutSubmitText');
      const cardBtn = document.querySelector('.btn-whatsapp-card-direct');
      
      const submitText = submitBtn ? submitBtn.textContent.trim() : '';
      const cardBtnText = cardBtn ? cardBtn.textContent.trim() : '';

      // Test selecting GPay app touch
      handlePaymentAppTouch('Google Pay (GPay)', null);
      await new Promise(r => setTimeout(r, 100));
      const gpayText = submitBtn ? submitBtn.textContent.trim() : '';

      // Test selecting Card method
      selectPaymentMethod('Card');
      await new Promise(r => setTimeout(r, 100));
      const cardMethodText = submitBtn ? submitBtn.textContent.trim() : '';

      return {
        initialSubmitText: submitText,
        gpaySubmitText: gpayText,
        cardMethodSubmitText: cardMethodText,
        touchCardBtnText: cardBtnText,
        anyHas99949: [submitText, gpayText, cardMethodText, cardBtnText].some(t => t.includes('99949'))
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Payment Button Verification:', JSON.stringify(res.result.value, null, 2));

  // Take screenshot of checkout modal
  const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
  const fs = require('fs');
  fs.writeFileSync('scratch/mobile_checkout_verified.png', Buffer.from(screenshotRes.data, 'base64'));
  console.log('Saved checkout screenshot to scratch/mobile_checkout_verified.png');

  chrome.kill();
  process.exit(0);
}

test().catch(console.error);
