const { spawn } = require('child_process');
const http = require('http');

async function findScrollContainer() {
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
            const elements = [document.documentElement, document.body, ...document.querySelectorAll('div, main, section')];
            const scrollable = [];
            for (const el of elements) {
              if (el.scrollHeight > el.clientHeight) {
                const s = getComputedStyle(el);
                scrollable.push({
                  tag: el.tagName,
                  id: el.id,
                  class: el.className,
                  overflowY: s.overflowY,
                  height: s.height,
                  maxHeight: s.maxHeight,
                  clientHeight: el.clientHeight,
                  scrollHeight: el.scrollHeight
                });
              }
            }
            return JSON.stringify(scrollable.slice(0, 10), null, 2);
          })()`
        });
        console.log('Scrollable elements:', res.result.value);

        chrome.kill();
        process.exit(0);
      };
    });
  });
}

findScrollContainer().catch(console.error);
