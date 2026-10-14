const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testNavbar() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900',
    'http://localhost:3000'
  ]);

  // wait 2s for chrome to start
  await new Promise(r => setTimeout(r, 2000));

  http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
      const tabs = JSON.parse(data);
      const tab = tabs.find(t => t.type === 'page');
      if (!tab) {
        console.log('No page tab found');
        chrome.kill();
        return;
      }
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
        // Wait 2.5 seconds for page & preloader to finish
        await new Promise(r => setTimeout(r, 2500));

        // Evaluate navbar position before scroll
        let evalBefore = await send('Runtime.evaluate', {
          expression: `JSON.stringify({
            navbarTop: document.querySelector('.navbar')?.getBoundingClientRect().top,
            navbarPosition: getComputedStyle(document.querySelector('.navbar')).position,
            bodyOverflowX: getComputedStyle(document.body).overflowX,
            htmlOverflowX: getComputedStyle(document.documentElement).overflowX
          })`
        });
        console.log('Before scroll:', evalBefore.result.value);

        // Scroll down 600px
        await send('Runtime.evaluate', {
          expression: 'window.scrollTo(0, 600);'
        });
        await new Promise(r => setTimeout(r, 500));

        // Evaluate navbar position after scroll
        let evalAfter = await send('Runtime.evaluate', {
          expression: `JSON.stringify({
            scrollY: window.scrollY,
            navbarTop: document.querySelector('.navbar')?.getBoundingClientRect().top,
            navbarHeight: document.querySelector('.navbar')?.getBoundingClientRect().height,
            navbarDisplay: getComputedStyle(document.querySelector('.navbar')).display,
            navbarPosition: getComputedStyle(document.querySelector('.navbar')).position,
            searchInputWidth: document.getElementById('searchInput')?.getBoundingClientRect().width,
            placeholder: document.getElementById('searchInput')?.placeholder
          })`
        });
        console.log('After scroll:', evalAfter.result.value);

        // Capture screenshot after scroll
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('c:\\Users\\HP\\OneDrive\\Desktop\\project\\test_scrolled.png', Buffer.from(shot.data, 'base64'));
        console.log('Saved test_scrolled.png');

        ws.close();
        chrome.kill();
        process.exit(0);
      };
    });
  });
}

testNavbar().catch(console.error);
