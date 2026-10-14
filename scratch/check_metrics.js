const { spawn } = require('child_process');
const fs = require('fs');

async function run() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=C:\\Users\\HP\\AppData\\Local\\Temp\\chrome-tmp-user',
    '--window-size=390,844'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  let newTab;
  try {
    newTab = await fetch('http://127.0.0.1:9222/json/new?http://localhost:3000', { method: 'PUT' }).then(r => r.json());
  } catch (e) {
    console.error('Failed to connect to Chrome:', e);
    chrome.kill();
    return;
  }

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

  // Dismiss splash if present
  await send('Runtime.evaluate', {
    expression: 'window.dismissOpeningPage && window.dismissOpeningPage()'
  });
  await new Promise(r => setTimeout(r, 600));

  // 1. Check Page metrics
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        winWidth: window.innerWidth,
        docScrollWidth: document.documentElement.scrollWidth,
        docClientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth
      };
    })()`,
    returnByValue: true
  });
  console.log('Page Metrics:', res.result.value);

  // Take screenshot of mobile home
  const shotHome = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/mobile_home_verified.png', Buffer.from(shotHome.data, 'base64'));

  // 2. Test Hamper Box Size click tick mark
  const hamperTest = await send('Runtime.evaluate', {
    expression: `(() => {
      // Scroll to hamper builder
      const section = document.getElementById('builder');
      if (section) section.scrollIntoView({ behavior: 'instant', block: 'start' });

      // Check current active size pill
      const activePill = document.querySelector('.size-pill-btn.active');
      const tick = activePill ? activePill.querySelector('.size-pill-tick') : null;
      
      // Click another size pill
      const pills = document.querySelectorAll('.size-pill-btn');
      let clickedPillText = null;
      if (pills.length > 1) {
        pills[1].click();
        const newActive = document.querySelector('.size-pill-btn.active');
        clickedPillText = newActive ? newActive.textContent.trim() : null;
      }

      return {
        initialActiveTickText: tick ? tick.textContent.trim() : null,
        initialActiveTickVisible: tick ? window.getComputedStyle(tick).color : null,
        clickedPillResult: clickedPillText
      };
    })()`,
    returnByValue: true
  });
  console.log('Hamper Box Size Test:', hamperTest.result.value);

  // Take screenshot of Hamper Box Size
  await new Promise(r => setTimeout(r, 600));
  const shotHamper = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/mobile_hamper_size_tick.png', Buffer.from(shotHamper.data, 'base64'));

  // 3. Test Mobile Product View: Image Fixed, Details Scrollable
  const productModalTest = await send('Runtime.evaluate', {
    expression: `(() => {
      if (window.openQuickView) window.openQuickView('clip-01');

      const modal = document.getElementById('quickViewModal');
      const modalWindow = document.querySelector('.product-page-modal');
      const imgCol = document.querySelector('.product-page-img-col');
      const detailsCol = document.querySelector('.product-page-details-col');

      const modalComputed = modal ? window.getComputedStyle(modal) : null;
      const windowComputed = modalWindow ? window.getComputedStyle(modalWindow) : null;
      const imgComputed = imgCol ? window.getComputedStyle(imgCol) : null;
      const detailsComputed = detailsCol ? window.getComputedStyle(detailsCol) : null;

      // Scroll details column down
      let scrolledAmount = 0;
      if (detailsCol) {
        detailsCol.scrollTop = 300;
        scrolledAmount = detailsCol.scrollTop;
      }

      return {
        modalIsOpen: modal && modal.classList.contains('open'),
        modalWindowOverflow: windowComputed ? windowComputed.overflow : null,
        imgColPosition: imgComputed ? imgComputed.position : null,
        imgColFlexShrink: imgComputed ? imgComputed.flexShrink : null,
        detailsColOverflowY: detailsComputed ? detailsComputed.overflowY : null,
        detailsScrolledAmount: scrolledAmount
      };
    })()`,
    returnByValue: true
  });
  console.log('Product Modal Mobile Test:', productModalTest.result.value);

  // Take screenshot of open product view scrolled down on mobile
  await new Promise(r => setTimeout(r, 600));
  const shotModal = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/mobile_product_view_fixed_img.png', Buffer.from(shotModal.data, 'base64'));

  // Close chrome
  chrome.kill();
}

run().catch(console.error);
