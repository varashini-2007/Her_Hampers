const { spawn } = require('child_process');
const http = require('http');

async function testStickyRootCause() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
      const tabs = JSON.parse(data);
      const tab = tabs.find(t => t.type === 'page');
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      let id = 1;
      const send = (method, params = {}) => new Promise((resolve) => {
        const curId = id++;
        const handler = (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.id === curId) {
            ws.removeEventListener('message', handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });

      ws.onopen = async () => {
        await new Promise(r => setTimeout(r, 1000));

        let res = await send('Runtime.evaluate', {
          expression: `(async () => {
            const splash = document.getElementById("openingPageSplash");
            if (splash) splash.remove();

            // Check what happens if we set html and body overflow to visible
            document.documentElement.style.cssText = 'overflow: visible !important; scroll-behavior: auto !important;';
            document.body.style.cssText = 'overflow: visible !important;';

            window.scrollTo(0, 500);
            await new Promise(r => setTimeout(r, 300));

            const nav = document.querySelector('.navbar');
            const rect = nav.getBoundingClientRect();

            return JSON.stringify({
              scrollY: window.scrollY,
              navRectTop: rect.top,
              navOffsetTop: nav.offsetTop
            }, null, 2);
          })()`,
          awaitPromise: true
        });
        console.log('Test result:', res.result.value);

        chrome.kill();
        process.exit(0);
      };
    });
  });
}

testStickyRootCause().catch(console.error);
