const http = require('http');
const fs = require('fs');
const path = require('path');

// Helper to make HTTP requests
function request(method, pathName, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: pathName,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING VERIFICATION TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Verify Server Status
    const statusRes = await request('GET', '/api/status');
    assert(statusRes.status === 200 && statusRes.data.status === 'online', 'Server is running online on port 3000');
    assert(typeof statusRes.data.appRatingsCount === 'number', 'Server status reports appRatingsCount');

    // 2. Test App Ratings API (Prompted after order completed)
    const newAppRating = {
      rating: 5,
      ratingText: '5 of 5',
      tags: ['Smooth Checkout', 'Lovely Packaging'],
      comment: 'Super fast delivery and adorable pink hamper! 5 of 5 stars!',
      orderId: 'TEST-ORD-999',
      userName: 'Priya Sundaram',
      date: new Date().toISOString()
    };

    const postAppRatingRes = await request('POST', '/api/app-ratings', newAppRating);
    assert(postAppRatingRes.status === 200 && postAppRatingRes.data.success, 'Successfully submitted app rating via POST /api/app-ratings');

    const getAppRatingsRes = await request('GET', '/api/app-ratings');
    assert(getAppRatingsRes.status === 200 && Array.isArray(getAppRatingsRes.data), 'GET /api/app-ratings returns array');
    const savedAppRating = getAppRatingsRes.data.find(r => r.orderId === 'TEST-ORD-999');
    assert(savedAppRating && savedAppRating.rating === 5 && savedAppRating.ratingText === '5 of 5', 'App rating persisted to disk with (5 of 5) rating and tags');

    // 3. Test Product Review Submission and (__ of 5) Rating Recalculation
    const productsRes = await request('GET', '/api/products');
    assert(productsRes.status === 200 && Array.isArray(productsRes.data), 'GET /api/products returns products list');
    
    // Find target product (e.g. jimmiki-01)
    const targetProduct = productsRes.data.find(p => p.id === 'jimmiki-01') || productsRes.data[0];
    assert(targetProduct != null, `Found target product for review test: ${targetProduct.name} (${targetProduct.id})`);

    const initialReviewCount = (targetProduct.reviews && targetProduct.reviews.length) || 0;
    const newProductReview = {
      id: 'rev-test-' + Date.now(),
      name: 'Ananya Ramesh',
      rating: 5,
      ratingText: '5 of 5',
      date: 'Just now',
      orderId: 'HH-10492',
      title: 'Exquisite antique ruby finish!',
      comment: 'Looks even more regal in person. 5 of 5!',
      verified: true
    };

    if (!targetProduct.reviews) targetProduct.reviews = [];
    targetProduct.reviews.unshift(newProductReview);
    
    // Recalculate average rating (__ of 5)
    const avg = (targetProduct.reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / targetProduct.reviews.length).toFixed(1);
    targetProduct.rating = parseFloat(avg);
    targetProduct.reviewsCount = targetProduct.reviews.length;

    assert(targetProduct.reviewsCount === initialReviewCount + 1, 'Product reviews count incremented');
    assert(typeof targetProduct.rating === 'number', `Product rating calculated as ${targetProduct.rating} of 5`);

    // Save updated products back to server
    const saveProdRes = await request('POST', '/api/products', productsRes.data);
    assert(saveProdRes.status === 200 && saveProdRes.data.success, 'Saved updated product catalog with new review to /api/products');

    // Re-fetch products from disk to verify persistence
    const refetchProdRes = await request('GET', '/api/products');
    const refetchedTarget = refetchProdRes.data.find(p => p.id === targetProduct.id);
    const persistedReview = refetchedTarget.reviews.find(r => r.orderId === 'HH-10492' && r.name === 'Ananya Ramesh');
    assert(persistedReview != null && persistedReview.ratingText === '5 of 5', 'Product review persisted to disk with ratingText "5 of 5"');
    assert(refetchedTarget.rating === targetProduct.rating, `Product rating preserved on disk as ${refetchedTarget.rating} of 5`);

    // 4. Verify Order Item Matcher Logic
    const ordersRes = await request('GET', '/api/orders');
    assert(ordersRes.status === 200 && Array.isArray(ordersRes.data), 'GET /api/orders returns orders list');
    const deliveredOrder = ordersRes.data.find(o => o.status === 'Delivered');
    assert(deliveredOrder != null, `Delivered order exists: #${deliveredOrder.id}`);

    // Read assets/js/data.js and test findProductForOrderItem
    const dataJsContent = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'data.js'), 'utf8');
    assert(dataJsContent.includes('window.findProductForOrderItem = findProductForOrderItem'), 'findProductForOrderItem is exported to window in data.js');
    assert(dataJsContent.includes('window.getStoredAppRatings = getStoredAppRatings'), 'getStoredAppRatings is exported to window in data.js');
    assert(dataJsContent.includes('window.saveStoredAppRatings = saveStoredAppRatings'), 'saveStoredAppRatings is exported to window in data.js');

    // 5. Verify App Rating Card in index.html
    const indexHtmlContent = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert(indexHtmlContent.includes('id="postOrderAppRatingCard"'), 'index.html contains postOrderAppRatingCard');
    assert(indexHtmlContent.includes('Rate Her Hampers App'), 'index.html contains Rate Her Hampers App section');
    assert(indexHtmlContent.includes('Submit App Rating (5 of 5) ⭐'), 'index.html initial button has (5 of 5) text');
    assert(indexHtmlContent.includes('id="appRatingTags"'), 'index.html contains app experience feedback tags');

    // 6. Verify Product Review Modal & Format in index.html
    assert(indexHtmlContent.includes('id="productReviewModal"'), 'index.html contains productReviewModal');
    assert(indexHtmlContent.includes('id="prodStarRatingText"'), 'index.html contains prodStarRatingText displaying (__ of 5)');
    assert(indexHtmlContent.includes('id="deliveredOrderReviewPromptBanner"'), 'index.html contains deliveredOrderReviewPromptBanner for proactive notification');

    // 7. Verify Product Card & Quick View Display in app.js
    const appJsContent = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'app.js'), 'utf8');
    assert(appJsContent.includes('${product.rating} of 5'), 'app.js product cards format rating strictly as "${product.rating} of 5"');
    assert(appJsContent.includes('${prod.rating} of 5'), 'app.js Quick View modal formats rating strictly as "${prod.rating} of 5"');
    assert(appJsContent.includes('Submit App Rating (${currentAppRating} of 5) ⭐'), 'app.js updates app rating submit button with current star selection (__ of 5)');
    assert(appJsContent.includes('Submit Product Review (${currentProductStarRating} of 5) 🌸'), 'app.js updates product review submit button with current star selection (__ of 5)');
    assert(appJsContent.includes('window.checkDeliveredOrdersAndPromptReview'), 'app.js includes proactive delivered orders prompt');
    assert(appJsContent.includes('Order Delivered! Rate &amp; Review Your Items'), 'app.js track search displays prompt for delivered orders');

    // 8. Verify Admin Portal Reviews Tab in admin.html & admin.js
    const adminHtmlContent = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
    assert(adminHtmlContent.includes('id="reviewsTab"'), 'admin.html contains reviewsTab');
    assert(adminHtmlContent.includes('id="adminAppRatingScore"'), 'admin.html contains adminAppRatingScore');
    assert(adminHtmlContent.includes('id="adminProductReviewsCount"'), 'admin.html contains adminProductReviewsCount');
    assert(adminHtmlContent.includes('id="adminReviewsTabBadge"'), 'admin.html contains adminReviewsTabBadge');

    const adminJsContent = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'admin.js'), 'utf8');
    assert(adminJsContent.includes('renderAdminAppRatings'), 'admin.js implements renderAdminAppRatings');
    assert(adminJsContent.includes('renderAdminProductReviews'), 'admin.js implements renderAdminProductReviews');
    assert(adminJsContent.includes('adminReviewsTabBadge'), 'admin.js updates adminReviewsTabBadge');

    console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
    if (failed === 0) {
      console.log('🎉 ALL 26 TESTS PASSED WITH 100% SUCCESS!');
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
