const { spawn } = require('child_process');
const http = require('http');

async function inspectNavComputed() {
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
            const nav = document.querySelector('.navbar');
            const s = getComputedStyle(nav);
            return JSON.stringify({
              position: s.position,
              top: s.top,
              bottom: s.bottom,
              display: s.display,
              zIndex: s.zIndex,
              parentTag: nav.parentElement.tagName,
              parentHeight: nav.parentElement.offsetHeight,
              parentScrollHeight: nav.parentElement.scrollHeight,
              navHeight: nav.offsetHeight,
              offsetTop: nav.offsetTop,
              allMatchingRules: Array.from(document.styleSheets).flatMap(sheet => {
                try {
                  return Array.from(sheet.cssRules).filter(r => r.selectorText && r.selectorText.includes('.navbar')).map(r => ({
                    sel: r.selectorText,
                    css: r.cssText
                  }));
                } catch(e) { return []; }
              })
            }, null, 2);
          })()`
        });
        console.log('Nav detailed rules:', res.result.value);

        chrome.kill();
        process.exit(0);
      };
    });
  });
}

inspectNavComputed().catch(console.error);
