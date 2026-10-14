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

  const versionRes = await fetch('http://127.0.0.1:9222/json/version').then(r => r.json());
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
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('PAGE EXCEPTION:', JSON.stringify(msg.params.exceptionDetails));
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('CONSOLE:', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
    }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise(r => ws.onopen = r);

  // Enable Page, Runtime, Emulation
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });

  await send('Page.navigate', { url: 'http://localhost:3000' });
  
  // Wait until scripts have executed
  await send('Runtime.evaluate', {
    expression: `new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (typeof window.openQuickView === 'function') {
          if (typeof window.dismissOpeningPage === 'function') window.dismissOpeningPage();
          resolve(true);
        } else if (Date.now() - start > 5000) {
          resolve(false);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    })`,
    awaitPromise: true
  });
  await new Promise(r => setTimeout(r, 800));

  // Measure total page height before opening modal
  const pageHeightInfo = await send('Runtime.evaluate', {
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
  console.log('Page Height Metrics (Mobile):', JSON.stringify(pageHeightInfo.result.value, null, 2));

  // Now open quick view modal for 'kolusu-02'
  const openResult = await send('Runtime.evaluate', {
    expression: `(() => {
      try {
        window.openQuickView('kolusu-02');
        const modal = document.getElementById('quickViewModal');
        const imgCol = document.querySelector('.product-page-img-col');
        const stage = document.querySelector('.main-img-stage');
        const img = document.getElementById('qvImage');
        const detailsCol = document.querySelector('.product-page-details-col');
        const modalWin = document.querySelector('.product-page-modal');

        function getInfo(el) {
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return {
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            height: rect.height,
            width: rect.width,
            top: rect.top,
            left: rect.left,
            computedHeight: style.height,
            computedMaxHeight: style.maxHeight,
            computedMinHeight: style.minHeight,
            overflow: style.overflow
          };
        }

        return {
          modalWinScrollTop: modalWin ? modalWin.scrollTop : null,
          modalWinScrollHeight: modalWin ? modalWin.scrollHeight : null,
          modalWinClientHeight: modalWin ? modalWin.clientHeight : null,
          modal: getInfo(modal),
          modalWin: getInfo(modalWin),
          imgCol: getInfo(imgCol),
          stage: getInfo(stage),
          img: {
            ...getInfo(img),
            src: img ? img.src : null,
            naturalWidth: img ? img.naturalWidth : null,
            naturalHeight: img ? img.naturalHeight : null,
            complete: img ? img.complete : null
          },
          detailsCol: getInfo(detailsCol)
        };
      } catch (e) {
        return { error: e.message, stack: e.stack };
      }
    })()`,
    returnByValue: true
  });

  console.log('Modal Element Inspection:', JSON.stringify(openResult.result.value, null, 2));

  // Capture screenshot of the modal
  const ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/modal_mobile_screen.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved screenshot to scratch/modal_mobile_screen.png');

  ws.close();
  chrome.kill();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
