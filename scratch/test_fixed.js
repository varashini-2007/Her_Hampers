const { spawn } = require('child_process');
const http = require('http');

async function testParentAndFixed() {
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
            const nav = document.querySelector('.navbar');
            const chain = [];
            let curr = nav;
            while (curr) {
              const s = getComputedStyle(curr);
              chain.push({
                tag: curr.tagName,
                id: curr.id,
                className: curr.className,
                position: s.position,
                overflow: s.overflow,
                overflowX: s.overflowX,
                overflowY: s.overflowY,
                transform: s.transform,
                filter: s.filter,
                perspective: s.perspective,
                contain: s.contain
              });
              curr = curr.parentElement;
            }

            // Test position: fixed
            nav.style.position = 'fixed';
            nav.style.top = '10px';
            nav.style.left = '50%';
            nav.style.transform = 'translateX(-50%)';
            nav.style.zIndex = '9999';

            window.scrollTo(0, 800);
            await new Promise(r => setTimeout(r, 200));
            const fixedRect = nav.getBoundingClientRect();

            return JSON.stringify({
              chain,
              fixedRectTop: fixedRect.top,
              scrollY: window.scrollY
            }, null, 2);
          })()`,
          awaitPromise: true
        });
        console.log('Result:', res.result.value);

        chrome.kill();
        process.exit(0);
      };
    });
  });
}

testParentAndFixed().catch(console.error);
