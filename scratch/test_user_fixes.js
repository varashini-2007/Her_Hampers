const { spawn } = require('child_process');
const http = require('http');

async function run() {
  console.log('--- Starting verification tests for all 5 requirements ---');

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,800'
  ]);

  await new Promise(r => setTimeout(r, 1200));

  const newTab = await fetch('http://127.0.0.1:9222/json/new?http://localhost:3000', { method: 'PUT' }).then(r => r.json());
  const ws = new WebSocket(newTab.webSocketDebuggerUrl);

  let idCounter = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise(r => ws.onopen = r);

  await send('Page.enable');
  await send('Runtime.enable');

  await send('Page.navigate', { url: 'http://localhost:3000' });
  await new Promise(r => setTimeout(r, 1500));

  // TEST 1: Navbar is not sticky (moves when moving/scrolling the page)
  const navTest = await send('Runtime.evaluate', {
    expression: `(() => {
      const nav = document.querySelector('.navbar');
      const style = window.getComputedStyle(nav);
      return {
        position: style.position,
        top: style.top,
        isSticky: style.position === 'sticky'
      };
    })()`,
    returnByValue: true
  });
  console.log('TEST 1 (Navbar positioning):', navTest.result.value);

  // TEST 2 & 3: Home page product cards do NOT have color swatches or size pills
  const homeCardsTest = await send('Runtime.evaluate', {
    expression: `(() => {
      const cards = document.querySelectorAll('.product-card');
      let foundVariants = 0;
      cards.forEach(c => {
        if (c.querySelector('.card-variant-selector') || c.querySelector('.card-color-dot') || c.querySelector('.card-size-pill')) {
          foundVariants++;
        }
      });
      return {
        totalCards: cards.length,
        cardsWithColorOrSize: foundVariants
      };
    })()`,
    returnByValue: true
  });
  console.log('TEST 2 (Home page product cards color/size taken off):', homeCardsTest.result.value);

  // TEST 4 & 5: Laptop Product Viewing Page - Details & Reviews scrollable up and down, and both Add to Cart & Buy Product visible!
  const modalTest = await send('Runtime.evaluate', {
    expression: `(() => {
      // Click first product card
      const firstCard = document.querySelector('.product-card');
      firstCard.click();
      
      const modal = document.getElementById('quickViewModal');
      const isOpen = modal && modal.classList.contains('open');
      const detailsCol = document.querySelector('.product-page-details-col');
      const addBtn = document.getElementById('qvAddToCartBtn');
      const buyBtn = document.getElementById('qvBuyProductBtn');
      const reviewsSec = document.getElementById('qvReviewsSection');

      const colCanScroll = detailsCol && (detailsCol.scrollHeight > detailsCol.clientHeight);
      
      // Test scrolling down
      if (detailsCol) detailsCol.scrollTop = 250;
      const scrolledTop = detailsCol ? detailsCol.scrollTop : 0;

      return {
        isOpen,
        detailsColScrollHeight: detailsCol ? detailsCol.scrollHeight : 0,
        detailsColClientHeight: detailsCol ? detailsCol.clientHeight : 0,
        colCanScroll,
        scrolledTop,
        reviewsInsideCol: !!(detailsCol && detailsCol.contains(reviewsSec)),
        addBtnVisible: !!(addBtn && addBtn.offsetParent !== null),
        addBtnText: addBtn ? addBtn.innerText.trim() : null,
        buyBtnVisible: !!(buyBtn && buyBtn.offsetParent !== null),
        buyBtnText: buyBtn ? buyBtn.innerText.trim() : null
      };
    })()`,
    returnByValue: true
  });
  console.log('TEST 4 & 5 (Laptop Product Viewing Modal Details/Reviews scroll & Action Buttons):', modalTest.result.value);

  // TEST Mobile view normalization
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 600));

  const mobileTest = await send('Runtime.evaluate', {
    expression: `(() => {
      const grid = document.querySelector('.products-grid');
      const card = document.querySelector('.product-card');
      const gridStyle = window.getComputedStyle(grid);
      const cardRect = card ? card.getBoundingClientRect() : null;
      return {
        gridColumns: gridStyle.gridTemplateColumns,
        cardWidth: cardRect ? cardRect.width : 0,
        cardHeight: cardRect ? cardRect.height : 0
      };
    })()`,
    returnByValue: true
  });
  console.log('TEST MOBILE NORMALIZATION (2-col grid & compact card height):', mobileTest.result.value);

  // Close chrome
  chrome.kill();
  console.log('--- Verification complete! ---');
}

run().catch(console.error);
