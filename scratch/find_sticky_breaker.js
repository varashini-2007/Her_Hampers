const { spawn } = require('child_process');
const http = require('http');

async function findStickyBreaker() {
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
        await new Promise(r => setTimeout(r, 1500));

        // Test step-by-step
        let res = await send('Runtime.evaluate', {
          expression: `(async () => {
            const splash = document.getElementById("openingPageSplash");
            if (splash) splash.remove();

            // Create a clean minimal sticky test div at top of body
            const testDiv = document.createElement('div');
            testDiv.id = 'stickyTestDiv';
            testDiv.style.cssText = 'position: sticky; top: 0px; height: 50px; background: red; z-index: 99999; width: 100%;';
            testDiv.textContent = 'STICKY TEST';
            document.body.prepend(testDiv);

            document.documentElement.style.scrollBehavior = 'auto';
            window.scrollTo(0, 500);
            await new Promise(r => setTimeout(r, 100));

            const testRect = testDiv.getBoundingClientRect();
            const navRect = document.querySelector('.navbar').getBoundingClientRect();

            return JSON.stringify({
              scrollY: window.scrollY,
              testRectTop: testRect.top,
              navRectTop: navRect.top
            });
          })()`,
          awaitPromise: true
        });
        console.log('Prepend sticky test result:', res.result.value);

        chrome.kill();
        process.exit(0);
      };
    });
  });
}

findStickyBreaker().catch(console.error);
