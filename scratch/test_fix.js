const { spawn } = require('child_process');
const http = require('http');

async function testFix() {
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

        // Dismiss opening splash
        await send('Runtime.evaluate', {
          expression: `(() => {
            if (window.dismissOpeningPage) window.dismissOpeningPage();
            const splash = document.getElementById("openingPageSplash");
            if (splash) splash.remove();
          })()`
        });

        await new Promise(r => setTimeout(r, 1000));

        // Test scrolling without touching styles
        let resBefore = await send('Runtime.evaluate', {
          expression: `(() => {
            window.scrollTo(0, 600);
            return JSON.stringify({
              scrollY: window.scrollY,
              navbarTop: document.querySelector('.navbar').getBoundingClientRect().top,
              navbarPosition: getComputedStyle(document.querySelector('.navbar')).position,
              bodyOverflowX: getComputedStyle(document.body).overflowX,
              htmlOverflowX: getComputedStyle(document.documentElement).overflowX
            });
          })()`
        });
        console.log('Current behavior scrolling 600px:', resBefore.result.value);

        chrome.kill();
        process.exit(0);
      };
    });
  });
}

testFix().catch(console.error);
