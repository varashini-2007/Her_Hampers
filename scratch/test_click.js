const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

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
  await new Promise(r => setTimeout(r, 2000));

  await send('Runtime.evaluate', {
    expression: 'window.dismissOpeningPage && window.dismissOpeningPage();'
  });
  await new Promise(r => setTimeout(r, 600));

  // Measure page heights
  const pageMetrics = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        scrollHeight: document.documentElement.scrollHeight,
        heroHeight: document.getElementById('hero')?.offsetHeight,
        shopHeight: document.getElementById('shop')?.offsetHeight,
        builderHeight: document.getElementById('builder')?.offsetHeight,
        reviewsHeight: document.getElementById('reviews')?.offsetHeight,
        footerHeight: document.querySelector('.site-footer')?.offsetHeight
      };
    })()`,
    returnByValue: true
  });
  console.log('--- NEW PAGE METRICS ON MOBILE ---');
  console.log(JSON.stringify(pageMetrics.result.value, null, 2));

  // Capture mobile homepage screenshot
  const homeSS = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/mobile_home_fixed.png', Buffer.from(homeSS.data, 'base64'));

  // Click Kolusu category pill and then click kolusu card
  const clickRes = await send('Runtime.evaluate', {
    expression: `(() => {
      // Filter to kolusu
      const kolusuBtn = Array.from(document.querySelectorAll('.cat-pill-btn')).find(b => b.textContent.toLowerCase().includes('kolusu'));
      if (kolusuBtn) kolusuBtn.click();

      const card = document.getElementById('card-kolusu-02');
      if (card) {
        card.scrollIntoView();
        const imgWrap = card.querySelector('.product-img-wrap');
        if (imgWrap) imgWrap.click();
        else card.click();
        return 'Clicked kolusu card successfully';
      }
      return 'No card found';
    })()`,
    returnByValue: true
  });
  console.log('Click result:', clickRes.result.value);

  await new Promise(r => setTimeout(r, 800));

  // Check modal state
  const modalInfo = await send('Runtime.evaluate', {
    expression: `(() => {
      const modal = document.getElementById('quickViewModal');
      const modalWin = document.querySelector('.product-page-modal');
      const img = document.getElementById('qvImage');
      const stage = document.querySelector('.main-img-stage');
      const title = document.getElementById('qvTitle');
      const price = document.getElementById('qvPrice');
      return {
        modalOpen: modal.classList.contains('open'),
        modalWinScrollTop: modalWin.scrollTop,
        stageHeight: stage?.offsetHeight,
        imgVisible: img?.complete && img?.naturalWidth > 0,
        imgSrc: img?.src,
        title: title?.textContent,
        price: price?.textContent,
        bodyHasModalOpen: document.body.classList.contains('modal-open')
      };
    })()`,
    returnByValue: true
  });
  console.log('--- MODAL METRICS AFTER OPEN ---');
  console.log(JSON.stringify(modalInfo.result.value, null, 2));

  // Capture modal screenshot
  const modalSS = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/modal_fixed.png', Buffer.from(modalSS.data, 'base64'));
  console.log('Screenshots saved to scratch/mobile_home_fixed.png and scratch/modal_fixed.png');

  ws.close();
  chrome.kill();
}

run().catch(console.error);
