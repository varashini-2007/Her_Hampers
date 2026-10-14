const { spawn } = require('child_process');
const http = require('http');

async function debugScroll2() {
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
          expression: `(() => {
            const splash = document.getElementById("openingPageSplash");
            if (splash) splash.remove();
            
            // Try scrolling documentElement
            document.documentElement.scrollTop = 800;
            const top1 = document.documentElement.scrollTop;
            
            // Try window.scrollTo
            window.scrollTo(0, 800);
            const top2 = window.scrollY;

            // Check navbar
            const nav = document.querySelector('.navbar');
            const rect = nav.getBoundingClientRect();

            return JSON.stringify({
              scrollTopDoc: top1,
              scrollYWindow: top2,
              navRectTop: rect.top,
              navOffsetTop: nav.offsetTop,
              navPosition: getComputedStyle(nav).position,
              navTopCSS: getComputedStyle(nav).top
            }, null, 2);
          })()`
        });
        console.log('Scroll test 2:', res.result.value);

        chrome.kill();
        process.exit(0);
      };
    });
  });
}

debugScroll2().catch(console.error);
