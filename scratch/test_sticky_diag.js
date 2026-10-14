const { spawn } = require('child_process');
const http = require('http');

async function testStickyHtml() {
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
        await new Promise(r => setTimeout(r, 2000));

        // Let's inspect why sticky isn't working
        let res = await send('Runtime.evaluate', {
          expression: `(() => {
            const nav = document.querySelector('.navbar');
            // Remove splash
            const splash = document.getElementById('openingPageSplash');
            if (splash) splash.remove();

            // Check offsetParent
            const op = nav.offsetParent;
            
            // Try wrapping or setting fixed
            return JSON.stringify({
              offsetParentTag: op ? op.tagName : null,
              bodyHeight: document.body.offsetHeight,
              windowInnerHeight: window.innerHeight,
              scrollYBefore: window.scrollY
            });
          })()`
        });
        console.log('Sticky diag:', res.result.value);

        // Now test position: fixed on .navbar
        let res2 = await send('Runtime.evaluate', {
          expression: `(async () => {
            const nav = document.querySelector('.navbar');
            nav.style.position = 'fixed';
            nav.style.top = '10px';
            nav.style.left = '50%';
            nav.style.transform = 'translateX(-50%)';
            nav.style.zIndex = '9999';

            document.documentElement.style.scrollBehavior = 'auto';
            window.scrollTo(0, 700);
            await new Promise(r => setTimeout(r, 100));

            const rect = nav.getBoundingClientRect();
            return JSON.stringify({
              scrollY: window.scrollY,
              rectTop: rect.top,
              rectBottom: rect.bottom,
              rectLeft: rect.left,
              rectWidth: rect.width
            });
          })()`,
          awaitPromise: true
        });
        console.log('Fixed test:', res2.result.value);

        chrome.kill();
        process.exit(0);
      };
    });
  });
}

testStickyHtml().catch(console.error);
