const { spawn } = require('child_process');
const http = require('http');

async function debugScroll() {
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
            const html = document.documentElement;
            const body = document.body;
            const splash = document.getElementById("openingPageSplash");
            const preloader = document.getElementById("preloader");
            return JSON.stringify({
              htmlScrollHeight: html.scrollHeight,
              htmlClientHeight: html.clientHeight,
              htmlOverflow: getComputedStyle(html).overflow,
              htmlOverflowY: getComputedStyle(html).overflowY,
              htmlOverflowX: getComputedStyle(html).overflowX,
              bodyScrollHeight: body.scrollHeight,
              bodyClientHeight: body.clientHeight,
              bodyOverflow: getComputedStyle(body).overflow,
              bodyOverflowY: getComputedStyle(body).overflowY,
              bodyOverflowX: getComputedStyle(body).overflowX,
              preloaderDisplay: preloader ? getComputedStyle(preloader).display : 'none',
              splashDisplay: splash ? getComputedStyle(splash).display : 'none',
              splashClasses: splash ? splash.className : ''
            }, null, 2);
          })()`
        });
        console.log('Scroll inspection:', res.result.value);

        chrome.kill();
        process.exit(0);
      };
    });
  });
}

debugScroll().catch(console.error);
