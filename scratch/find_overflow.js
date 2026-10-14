const { spawn } = require('child_process');

async function run() {
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
  await new Promise(r => setTimeout(r, 1200));

  const res = await send('Runtime.evaluate', {
    expression: `(async () => {
      const splash = document.getElementById('openingPageSplash');
      if (splash) splash.remove();

      const winWidth = window.innerWidth;
      const docScrollWidth = document.documentElement.scrollWidth;
      const bodyScrollWidth = document.body.scrollWidth;

      // Check header initially
      const initialHeaderRect = document.getElementById('siteHeader').getBoundingClientRect();
      const initialNavRect = document.querySelector('.navbar').getBoundingClientRect();

      // Scroll down by 600px
      window.scrollTo(0, 600);
      await new Promise(r => setTimeout(r, 200));

      const scrolledHeaderRect = document.getElementById('siteHeader').getBoundingClientRect();
      const scrolledNavRect = document.querySelector('.navbar').getBoundingClientRect();
      const scrollY = window.scrollY;

      return {
        winWidth,
        docScrollWidth,
        bodyScrollWidth,
        zeroHorizontalOverflow: docScrollWidth <= winWidth,
        scrollY,
        initialNavTop: initialNavRect.top,
        scrolledNavTop: scrolledNavRect.top,
        isNavFrozenAndVisible: scrolledNavRect.top >= 0 && scrolledNavRect.bottom > 0
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log(JSON.stringify(res.result.value, null, 2));

  // Scroll back to top to verify hero section
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0)' });
  await new Promise(r => setTimeout(r, 400));
  const topScreenshotRes = await send('Page.captureScreenshot', { format: 'png' });
  const fs = require('fs');
  fs.writeFileSync('scratch/mobile_top_hero_verified.png', Buffer.from(topScreenshotRes.data, 'base64'));
  console.log('Saved top screenshot to scratch/mobile_top_hero_verified.png');

  chrome.kill();
  process.exit(0);
}

run().catch(console.error);
