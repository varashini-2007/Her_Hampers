/**
 * Her Hampers - Main Client Application Logic
 */

// Global State
let currentProducts = [];
let currentCategory = "all";
let currentSort = "featured";
let searchQuery = "";
let cart = [];
let wishlist = new Set();
let appliedDiscount = null; // { code: 'WELCOME10', percent: 10 }
let lastCreatedOrderId = null;
let upiTimerInterval = null;
let selectedPaymentMethod = "Online";
let selectedPaymentApp = "Google Pay (GPay)";
const SHIPPING_FEE_TN = 70; // Inside Tamil Nadu Express
const SHIPPING_FEE_INDIA = 100; // Inside India (Other States) Express
const SHIPPING_FEE = 70; // Default fallback

// Helper to determine delivery state and shipping fee
window.handleStateShippingChange = function() {
  updateCheckoutTotals();
};

function getDeliveryStateShippingFee() {
  const stateEl = document.getElementById("custState");
  const stateVal = stateEl ? stateEl.value.trim() : "";
  if (!stateVal) return { fee: SHIPPING_FEE_TN, stateName: "", isSelected: false };
  if (stateVal.toLowerCase().includes("tamil nadu") || stateVal.toLowerCase() === "tn") {
    return { fee: SHIPPING_FEE_TN, stateName: "Tamil Nadu", isSelected: true };
  }
  return { fee: SHIPPING_FEE_INDIA, stateName: stateVal, isSelected: true };
}

// Render dynamic gold star icons according to rating (1 to 5)
function renderStarsHtml(rating, size = 13) {
  const r = Math.max(1, Math.min(5, Math.round(Number(rating || 5))));
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= r;
    const color = isFilled ? '#f59e0b' : '#e2e8f0';
    stars += `<svg class="icon-svg" style="width:${size}px;height:${size}px;color:${color};fill:${color};flex-shrink:0;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  }
  return `<span class="rating-stars" style="display:inline-flex; align-items:center; gap:2px;">${stars}</span>`;
}
window.renderStarsHtml = renderStarsHtml;

// Custom Hamper Builder State
const hamperBuilder = {
  styleId: "box-ribbon",
  styleName: "Luxury Ribbon Keepsake Box",
  sizeId: "size-ribbon-m",
  sizeLabel: "Medium",
  basePrice: 350,
  image: "assets/images/box_ribbon.png",
  selectedItemIds: new Set(["clip-01", "scrunch-01", "jimmiki-01"]),
  customRequestedItems: [], // [{ id, name, details, price }]
  addons: [
    { id: "addon-choc-silk", name: "Cadbury Dairy Milk Silk", price: 95 }
  ],
  greetingNote: ""
};

document.addEventListener("DOMContentLoaded", () => {
  try {
    currentProducts = getStoredProducts();
    window.currentProducts = currentProducts;
    loadCartFromStorage();
    loadWishlistFromStorage();
    
    renderProducts();
    initHamperBuilder();
    renderCustomerReviews();
    setupEventListeners();
    updateCartBadge();
    renderCartCouponChips();
    initScrollReveal();

    // Check for delivered orders and prompt review if any items pending
    checkDeliveredOrdersAndPromptReview();

    // Check if user already saw the opening splash in this browsing session
    const splash = document.getElementById("openingPageSplash");
    const urlParams = new URLSearchParams(window.location.search);
    const testOpen = urlParams.get("test_open");
    if (sessionStorage.getItem("her_hampers_splash_seen") || testOpen) {
      if (splash) {
        splash.classList.add("dismissed");
        splash.style.display = "none";
        splash.style.pointerEvents = "none";
      }
    } else {
      // Launch Logo Self-Formation Opening Page on entrance
      initOpeningPage();
    }
    if (testOpen) {
      setTimeout(() => {
        openQuickView(testOpen);
      }, 200);
    }
  } catch (err) {
    console.error("Storefront initialization error:", err);
    // Safety guard: ensure the splash is never stuck if any error occurs
    const splash = document.getElementById("openingPageSplash");
    if (splash) {
      splash.classList.add("dismissed");
      splash.style.display = "none";
      splash.style.pointerEvents = "none";
    }
  }

  // Instant sync with Host Admin Panel price/product updates
  window.addEventListener("catalogUpdated", () => {
    currentProducts = getStoredProducts();
    window.currentProducts = currentProducts;
    renderProducts();
    renderHamperBuilderItems();
    updateHamperBuilderPreview();
  });

  window.addEventListener("ordersUpdated", () => {
    if (typeof checkDeliveredOrdersAndPromptReview === "function") {
      checkDeliveredOrdersAndPromptReview();
    }
  });

  window.addEventListener("storage", (e) => {
    if (e.key === "her_hampers_products") {
      currentProducts = getStoredProducts();
      window.currentProducts = currentProducts;
      renderProducts();
      renderHamperBuilderItems();
      updateHamperBuilderPreview();
    }
    if (e.key === "her_hampers_orders") {
      if (typeof checkDeliveredOrdersAndPromptReview === "function") {
        checkDeliveredOrdersAndPromptReview();
      }
    }
  });
});

// Setup DOM Event Listeners
function setupEventListeners() {
  // Category tabs
  const catButtons = document.querySelectorAll(".cat-pill-btn");
  catButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      catButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.category;
      window.mobileProductsLimit = 8;
      window.mobileShowAllProducts = false;
      renderProducts();
    });
  });

  // Search input
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderProducts();
    });
  }

  // Sort dropdown
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      renderProducts();
    });
  }

  // Cart Drawer open/close
  const cartDrawerBtn = document.getElementById("cartDrawerBtn");
  const cartDrawerBackdrop = document.getElementById("cartDrawerBackdrop");
  const closeCartBtn = document.getElementById("closeCartBtn");

  if (cartDrawerBtn && cartDrawerBackdrop) {
    cartDrawerBtn.addEventListener("click", () => openCartDrawer());
    closeCartBtn.addEventListener("click", () => closeCartDrawer());
    cartDrawerBackdrop.addEventListener("click", (e) => {
      if (e.target === cartDrawerBackdrop) closeCartDrawer();
    });
  }

  // Wishlist Drawer open/close
  const wishlistToggleBtn = document.getElementById("wishlistToggleBtn");
  const wishlistDrawerBackdrop = document.getElementById("wishlistDrawerBackdrop");
  const closeWishlistBtn = document.getElementById("closeWishlistBtn");

  if (wishlistToggleBtn) {
    wishlistToggleBtn.addEventListener("click", () => openWishlistDrawer());
  }
  if (closeWishlistBtn) {
    closeWishlistBtn.addEventListener("click", () => closeWishlistDrawer());
  }

  // Coupon code
  const applyCouponBtn = document.getElementById("applyCouponBtn");
  if (applyCouponBtn) {
    applyCouponBtn.addEventListener("click", applyCouponCode);
  }

  // Host Admin Gate Modal open/close
  const hostGateBtn = document.getElementById("hostAdminGateBtn");
  const footerHostBtn = document.getElementById("footerHostBtn");
  const hostLoginModal = document.getElementById("hostLoginModal");
  const closeHostModalBtn = document.getElementById("closeHostModalBtn");

  if (hostGateBtn && hostLoginModal) {
    hostGateBtn.addEventListener("click", () => openHostGateModal());
  }
  if (footerHostBtn && hostLoginModal) {
    footerHostBtn.addEventListener("click", () => openHostGateModal());
  }
  if (closeHostModalBtn && hostLoginModal) {
    closeHostModalBtn.addEventListener("click", () => closeHostGateModal());
    hostLoginModal.addEventListener("click", (e) => {
      if (e.target === hostLoginModal) closeHostGateModal();
    });
  }

  // Checkout modal
  const proceedToCheckoutBtn = document.getElementById("proceedToCheckoutBtn");
  const checkoutModal = document.getElementById("checkoutModal");
  const closeCheckoutBtn = document.getElementById("closeCheckoutBtn");

  if (proceedToCheckoutBtn) {
    proceedToCheckoutBtn.addEventListener("click", () => {
      if (cart.length === 0) {
        showToast("Your hamper cart is empty!", "info");
        return;
      }
      closeCartDrawer();
      openCheckoutModal();
    });
  }

  if (closeCheckoutBtn && checkoutModal) {
    closeCheckoutBtn.addEventListener("click", () => closeCheckoutModal());
    checkoutModal.addEventListener("click", (e) => {
      if (e.target === checkoutModal) closeCheckoutModal();
    });
  }

  // WhatsApp Direct Order button
  const whatsappOrderBtn = document.getElementById("whatsappOrderBtn");
  if (whatsappOrderBtn) {
    whatsappOrderBtn.addEventListener("click", handleWhatsAppOrder);
  }

  // Quick View Close
  const closeQuickViewBtn = document.getElementById("closeQuickViewBtn");
  const quickViewModal = document.getElementById("quickViewModal");
  if (closeQuickViewBtn && quickViewModal) {
    closeQuickViewBtn.addEventListener("click", () => closeQuickViewModal());
    quickViewModal.addEventListener("click", (e) => {
      if (e.target === quickViewModal) closeQuickViewModal();
    });
  }

  // Product Review Modal close on backdrop click
  const productReviewModal = document.getElementById("productReviewModal");
  if (productReviewModal) {
    productReviewModal.addEventListener("click", (e) => {
      if (e.target === productReviewModal) closeProductReviewModal();
    });
  }

  // Success modal button
  const successDoneBtn = document.getElementById("successDoneBtn");
  const orderSuccessModal = document.getElementById("orderSuccessModal");
  if (successDoneBtn && orderSuccessModal) {
    successDoneBtn.addEventListener("click", () => orderSuccessModal.classList.remove("open"));
  }

  // Hamper Builder: Box style selection
  const boxCards = document.querySelectorAll(".box-choice-card");
  boxCards.forEach(card => {
    card.addEventListener("click", () => {
      boxCards.forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      hamperBuilder.box = {
        id: card.dataset.boxId,
        name: card.dataset.boxName,
        price: parseInt(card.dataset.boxPrice, 10)
      };
      updateHamperBuilderPreview();
    });
  });

  // Hamper Builder: Addon checkboxes
  const addonCheckboxes = document.querySelectorAll(".builder-addon-cb");
  addonCheckboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      hamperBuilder.addons = [];
      addonCheckboxes.forEach(item => {
        if (item.checked) {
          hamperBuilder.addons.push({
            name: item.dataset.addonName,
            price: parseInt(item.dataset.addonPrice, 10)
          });
        }
      });
      updateHamperBuilderPreview();
    });
  });

  // Hamper Builder: Add to Cart button
  const addCustomHamperBtn = document.getElementById("addCustomHamperBtn");
  if (addCustomHamperBtn) {
    addCustomHamperBtn.addEventListener("click", addCustomHamperToCart);
  }

  // Hamper note input
  const hamperNoteInput = document.getElementById("hamperNoteInput");
  if (hamperNoteInput) {
    hamperNoteInput.addEventListener("input", (e) => {
      hamperBuilder.greetingNote = e.target.value.trim();
    });
  }
}

// Category helper for footer links
window.selectCategory = function(cat) {
  const catButtons = document.querySelectorAll(".cat-pill-btn");
  catButtons.forEach(btn => {
    if (btn.dataset.category === cat) {
      btn.click();
    }
  });
};

// Card Variant Selection State & Helpers
window.cardSelections = window.cardSelections || {};

window.selectCardColor = function(productId, color, e) {
  if (e) e.stopPropagation();
  if (!window.cardSelections) window.cardSelections = {};
  if (!window.cardSelections[productId]) window.cardSelections[productId] = {};
  window.cardSelections[productId].color = color;

  const lbl = document.getElementById(`card-choice-color-${productId}`);
  if (lbl) lbl.textContent = color;

  const card = document.getElementById(`card-${productId}`);
  if (card) {
    const dots = card.querySelectorAll('.card-color-dot');
    dots.forEach(d => {
      if (d.getAttribute('data-color') === color) {
        d.classList.add('active');
        d.style.borderColor = 'var(--pink-700)';
        d.style.boxShadow = '0 0 0 2px var(--pink-300)';
        d.innerHTML = '<span style="display:block; width:5px; height:5px; background:white; border-radius:50%; margin:auto;"></span>';
      } else {
        d.classList.remove('active');
        d.style.borderColor = 'rgba(0,0,0,0.18)';
        d.style.boxShadow = 'none';
        d.innerHTML = '';
      }
    });

    // Identify which photo has the given color and switch product image!
    const product = (typeof currentProducts !== 'undefined' ? currentProducts : getStoredProducts()).find(p => p.id === productId);
    if (product && typeof getProductImageForColor === "function") {
      const targetImg = getProductImageForColor(product, color);
      const cardImg = document.getElementById(`card-img-${productId}`) || card.querySelector('.product-img-wrap img');
      if (cardImg && targetImg && cardImg.src !== targetImg) {
        cardImg.style.opacity = '0.35';
        setTimeout(() => {
          cardImg.src = targetImg;
          cardImg.style.opacity = '1';
        }, 120);
      }
      window.cardSelections[productId].image = targetImg;
    }
  }
};

window.selectCardSize = function(productId, size, e) {
  if (e) e.stopPropagation();
  if (!window.cardSelections[productId]) window.cardSelections[productId] = {};
  window.cardSelections[productId].size = size;

  const lbl = document.getElementById(`card-choice-size-${productId}`);
  if (lbl) lbl.textContent = size;

  const card = document.getElementById(`card-${productId}`);
  if (card) {
    const pills = card.querySelectorAll('.card-size-pill');
    pills.forEach(p => {
      if (p.getAttribute('data-size') === size) {
        p.classList.add('active');
        p.style.background = 'var(--pink-600)';
        p.style.color = '#fff';
        p.style.borderColor = 'var(--pink-600)';
      } else if (!p.classList.contains('sold-out')) {
        p.classList.remove('active');
        p.style.background = '#fff';
        p.style.color = 'var(--pink-950)';
        p.style.borderColor = 'var(--pink-200)';
      }
    });
  }
};

window.addToCartWithCardSelection = function(productId, e) {
  const sel = window.cardSelections && window.cardSelections[productId];
  const chosenColor = sel ? sel.color : null;
  const chosenSize = sel ? sel.size : null;
  addToCart(productId, chosenColor, chosenSize, e);
};

// Render Products Grid
window.mobileProductsLimit = 8;
window.mobileShowAllProducts = false;

window.loadMoreMobileProducts = function() {
  window.mobileProductsLimit = (window.mobileProductsLimit || 8) + 8;
  renderProducts();
};

window.showAllMobileProducts = function() {
  window.mobileShowAllProducts = true;
  renderProducts();
};

window.collapseMobileProducts = function() {
  window.mobileShowAllProducts = false;
  window.mobileProductsLimit = 8;
  renderProducts();
  const shopEl = document.getElementById("shop");
  if (shopEl) shopEl.scrollIntoView({ behavior: "smooth", block: "start" });
};

function renderProducts() {
  const container = document.getElementById("productsGrid");
  const countDisplay = document.getElementById("productCountDisplay");
  if (!container) return;

  // Filter products
  let filtered = currentProducts.filter(item => {
    const matchesCategory = (currentCategory === "all") || (item.category === currentCategory);
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery) ||
      item.category.toLowerCase().includes(searchQuery) ||
      (item.description && item.description.toLowerCase().includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  // Sort products
  if (currentSort === "price-low") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (currentSort === "price-high") {
    filtered.sort((a, b) => b.price - a.price);
  } else if (currentSort === "rating") {
    filtered.sort((a, b) => b.rating - a.rating);
  } else if (currentSort === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (countDisplay) {
    countDisplay.textContent = filtered.length;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
        <div style="margin-bottom: 0.8rem; color: var(--pink-300);">
          <svg class="icon-svg lg" style="width: 48px; height: 48px;" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <h3 style="font-size: 1.4rem; color: var(--pink-900);">No matching accessories found</h3>
        <p style="color: var(--text-secondary); margin-top: 0.4rem;">Try searching for clips, scrunchies, jimmiki, kolusu, or rings!</p>
        <button onclick="resetFilters()" class="btn-secondary" style="margin-top: 1.2rem;">Clear Filters</button>
      </div>
    `;
    return;
  }

  const isMobile = window.innerWidth <= 768;
  const isAllCategory = (currentCategory === "all") && !searchQuery;
  const shouldLimit = isMobile && isAllCategory && !window.mobileShowAllProducts;
  const currentLimit = window.mobileProductsLimit || 8;
  const visibleProducts = shouldLimit ? filtered.slice(0, currentLimit) : filtered;

  let cardsHtml = visibleProducts.map(product => {
    const isWished = wishlist.has(product.id);
    const isOutOfStock = (product.stock !== undefined && Number(product.stock) <= 0);

    const badgeHtml = isOutOfStock
      ? `<span class="product-badge stock-out-badge">Stock Out</span>`
      : (product.badge ? `<span class="product-badge ${product.badgeType || 'pink'}">${product.badge}</span>` : '');

    // Initialize default variant selection state in background
    const hasColors = product.colors && Array.isArray(product.colors) && product.colors.length > 0;
    const hasSizes = product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0;

    if (hasColors || hasSizes) {
      if (!window.cardSelections[product.id]) {
        const outC = product.outOfStockColors || [];
        const outS = product.outOfStockSizes || [];
        const initCol = hasColors ? (product.colors.find(c => !outC.includes(c)) || product.colors[0]) : null;
        const initSz = hasSizes ? (product.sizes.find(s => !outS.includes(s)) || product.sizes[0]) : null;
        window.cardSelections[product.id] = { color: initCol, size: initSz };
      }
    }


    const cardActiveColor = window.cardSelections[product.id] ? window.cardSelections[product.id].color : null;
    const cardInitialImg = (cardActiveColor && typeof getProductImageForColor === 'function')
      ? getProductImageForColor(product, cardActiveColor)
      : product.image;

    return `
      <article class="product-card ${isOutOfStock ? 'is-out-of-stock' : ''}" id="card-${product.id}">
        <div class="product-img-wrap" onclick="openProductDetailsModal('${product.id}')" style="cursor: pointer;" title="View ${product.name} details">
          ${badgeHtml}
          ${isOutOfStock ? `<div class="stock-out-overlay-banner"><span>Stock Out</span></div>` : ''}
          <button class="wishlist-btn ${isWished ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlist('${product.id}', event)" title="Save to Wishlist">
            <svg class="heart-icon ${isWished ? 'active' : ''}" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </button>
          <img src="${cardInitialImg}" alt="${product.name}" id="card-img-${product.id}" loading="lazy" style="transition: opacity 0.2s ease;">
        </div>
        <div class="product-body" onclick="openProductDetailsModal('${product.id}')" style="cursor: pointer;" title="View ${product.name} details">
          <div class="product-cat-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.35rem;">
            <div class="product-cat" style="margin-bottom:0;">${product.categoryLabel || product.category}</div>
            ${isOutOfStock 
              ? `<span class="stock-indicator-pill stock-out">Stock Out (0 left)</span>`
              : (product.stock !== undefined && product.stock <= 5 
                  ? `<span class="stock-indicator-pill stock-low">Only ${product.stock} left</span>` 
                  : '')
            }
          </div>
          <h3 class="product-title" title="${product.name}">${product.name}</h3>
          
          <div class="product-rating">
            ${renderStarsHtml(product.rating, 13)}
            <span class="count" style="font-weight: 700; color: var(--pink-950); margin-left: 4px;">${product.rating} of 5 <span style="font-weight: 500; color: var(--text-muted); font-size: 0.76rem;">(${product.reviewsCount || (product.reviews ? product.reviews.length : 1)} reviews)</span></span>
          </div>

          <div class="product-price-row">
            <span class="price-current">₹${product.price}</span>
            ${product.originalPrice ? `<span class="price-original">₹${product.originalPrice}</span>` : ''}
            ${product.originalPrice ? `<span class="price-discount">${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF</span>` : ''}
          </div>

          ${isOutOfStock 
            ? `<button class="btn-add-cart btn-stock-out" disabled title="Item is currently out of stock" onclick="event.stopPropagation()">
                 <span>Stock Out</span>
               </button>`
            : `<button class="btn-add-cart" onclick="event.stopPropagation(); addToCartWithCardSelection('${product.id}', event)">
                 <span>Add to Cart</span>
               </button>`
          }
        </div>
      </article>
    `;
  }).join('');

  if (shouldLimit && currentLimit < filtered.length) {
    cardsHtml += `
      <div class="mobile-load-more-bar" style="grid-column: 1 / -1; text-align: center; padding: 1.25rem 0.5rem 0.5rem; width: 100%;">
        <div style="font-size: 0.82rem; color: var(--pink-950); margin-bottom: 0.65rem; font-weight: 700;">
          Showing ${visibleProducts.length} of ${filtered.length} Handcrafted Accessories
        </div>
        <div style="display: flex; gap: 0.6rem; justify-content: center; flex-wrap: wrap;">
          <button type="button" class="btn-primary" onclick="loadMoreMobileProducts()" style="padding: 0.65rem 1.35rem; font-size: 0.84rem; border-radius: var(--radius-full); box-shadow: 0 4px 14px rgba(219,39,119,0.3); display: inline-flex; align-items: center; gap: 0.4rem;">
            <span>Show More Items (+8)</span>
            <svg class="icon-svg sm" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <button type="button" class="btn-secondary" onclick="showAllMobileProducts()" style="padding: 0.65rem 1.2rem; font-size: 0.84rem; border-radius: var(--radius-full);">
            <span>View All (${filtered.length})</span>
          </button>
        </div>
      </div>
    `;
  } else if (isMobile && isAllCategory && window.mobileShowAllProducts && filtered.length > 8) {
    cardsHtml += `
      <div class="mobile-load-more-bar" style="grid-column: 1 / -1; text-align: center; padding: 1.25rem 0.5rem 0.5rem; width: 100%;">
        <button type="button" class="btn-secondary" onclick="collapseMobileProducts()" style="padding: 0.6rem 1.2rem; font-size: 0.82rem; border-radius: var(--radius-full);">
          <span>▲ Show Less (Top 8 Items)</span>
        </button>
      </div>
    `;
  }

  container.innerHTML = cardsHtml;
}

window.resetFilters = function() {
  currentCategory = "all";
  searchQuery = "";
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";
  const catButtons = document.querySelectorAll(".cat-pill-btn");
  catButtons.forEach(b => b.classList.remove("active"));
  if (catButtons[0]) catButtons[0].classList.add("active");
  renderProducts();
}// ========================================================
// CUSTOM HAMPER BUILDER CONTROLLER (3-10 Items, Box Styles, Sizes, Custom Items, Chocolates, Note)
// ========================================================

function initHamperBuilder() {
  // Prune any 0-stock items from selected items
  for (const id of Array.from(hamperBuilder.selectedItemIds)) {
    const prod = currentProducts.find(p => p.id === id);
    if (prod && prod.stock !== undefined && Number(prod.stock) <= 0) {
      hamperBuilder.selectedItemIds.delete(id);
    }
  }

  renderHamperBoxStyles();
  renderHamperBoxSizes();
  renderHamperBuilderItems();
  renderHamperAddons();
  renderCustomRequestedItems();
  updateHamperBuilderPreview();
}

// 1. Render Packaging Styles (Corrugated Box, Ribbon Box, Acrylic Bag)
function renderHamperBoxStyles() {
  const container = document.getElementById("boxStylesGrid");
  if (!container || typeof HAMPER_BOX_STYLES === "undefined") return;

  container.innerHTML = HAMPER_BOX_STYLES.map(style => {
    const isSelected = hamperBuilder.styleId === style.id;
    const priceText = style.hasSizes ? `From ₹${style.sizes[0].price}` : `₹${style.price}`;

    return `
      <div class="box-choice-card ${isSelected ? 'selected' : ''}" onclick="selectHamperBoxStyle('${style.id}')">
        <div class="box-card-tick-badge ${isSelected ? 'active' : ''}">
          ${isSelected ? '✓' : ''}
        </div>
        <img src="${style.image}" alt="${style.name}" class="box-card-thumb">
        <span class="box-badge-pill">${style.badge}</span>
        <div class="box-name">${style.name}</div>
        <div class="box-price">${priceText}</div>
        ${isSelected ? '<span class="box-selected-pill">✓ Selected</span>' : ''}
      </div>
    `;
  }).join('');
}

// Select Box/Bag Style
window.selectHamperBoxStyle = function(styleId) {
  const style = HAMPER_BOX_STYLES.find(s => s.id === styleId);
  if (!style) return;

  hamperBuilder.styleId = style.id;
  hamperBuilder.styleName = style.name;
  hamperBuilder.image = style.image;

  if (style.hasSizes) {
    // Default to medium size or first size
    const defSize = style.sizes.find(sz => sz.isDefault) || style.sizes[0];
    hamperBuilder.sizeId = defSize.id;
    hamperBuilder.sizeLabel = defSize.label;
    hamperBuilder.basePrice = defSize.price;
  } else {
    // Acrylic bag has no size selection needed
    hamperBuilder.sizeId = null;
    hamperBuilder.sizeLabel = "Universal Luxury Tote";
    hamperBuilder.basePrice = style.price;
  }

  renderHamperBoxStyles();
  renderHamperBoxSizes();
  updateHamperBuilderPreview();
};

// 2. Render Box Sizes Row with Visible Checkmark (Tick)
function renderHamperBoxSizes() {
  const container = document.getElementById("boxSizePillsRow");
  const heading = document.getElementById("boxSizeHeading");
  const subnote = document.getElementById("boxSizeSubnote");
  if (!container || typeof HAMPER_BOX_STYLES === "undefined") return;

  const currentStyle = HAMPER_BOX_STYLES.find(s => s.id === hamperBuilder.styleId) || HAMPER_BOX_STYLES[0];

  if (currentStyle.hasSizes) {
    if (heading) heading.textContent = `Select Dimensions for ${currentStyle.name}:`;
    if (subnote) subnote.textContent = "Choose box size (Small, Medium, or Large)";

    container.innerHTML = currentStyle.sizes.map(sz => {
      const isActive = hamperBuilder.sizeId === sz.id;
      return `
        <button type="button" class="size-pill-btn ${isActive ? 'active' : ''}" onclick="selectHamperBoxSize('${sz.id}')">
          <span class="size-pill-tick ${isActive ? 'active' : ''}">${isActive ? '✓' : ''}</span>
          <span>${sz.label} (+₹${sz.price})</span>
          ${isActive ? '<span class="size-active-tag">Selected</span>' : ''}
        </button>
      `;
    }).join('');
  } else {
    // Acrylic bag has no size
    if (heading) heading.textContent = `Bag Dimensions for ${currentStyle.name}:`;
    if (subnote) subnote.textContent = "Universal luxury format";

    container.innerHTML = `
      <div class="universal-size-badge active">
        <span class="size-pill-tick active">✓</span>
        <span>${currentStyle.sizeNote} (+₹${currentStyle.price})</span>
        <span class="size-active-tag">Selected</span>
      </div>
    `;
  }
}

// Select Box Size
window.selectHamperBoxSize = function(sizeId) {
  const currentStyle = HAMPER_BOX_STYLES.find(s => s.id === hamperBuilder.styleId);
  if (!currentStyle || !currentStyle.hasSizes) return;

  const sz = currentStyle.sizes.find(s => s.id === sizeId);
  if (!sz) return;

  hamperBuilder.sizeId = sz.id;
  hamperBuilder.sizeLabel = sz.label;
  hamperBuilder.basePrice = sz.price;

  renderHamperBoxSizes();
  updateHamperBuilderPreview();
};

let hamperActiveCategory = 'all';

window.filterHamperItemsCategory = function(cat, btn) {
  hamperActiveCategory = cat;
  const pills = document.querySelectorAll("#builderCatPills .cat-pill-btn");
  pills.forEach(p => p.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderHamperBuilderItems();
};

// 3. Render Builder Items Picker (Step 2: 3 to 10 Items)
function renderHamperBuilderItems() {
  const container = document.getElementById("builderItemsGrid");
  if (!container) return;

  // Filter items: inHamperBuilder !== false, category !== 'hampers', AND exclude items with 0 stock!
  let items = currentProducts.filter(p => 
    p.inHamperBuilder !== false && 
    p.category !== "hampers" && 
    (p.stock === undefined || Number(p.stock) > 0)
  );

  // Auto-prune any item from hamperBuilder.selectedItemIds if its stock is 0
  for (const id of Array.from(hamperBuilder.selectedItemIds)) {
    const prod = currentProducts.find(p => p.id === id);
    if (prod && prod.stock !== undefined && Number(prod.stock) <= 0) {
      hamperBuilder.selectedItemIds.delete(id);
    }
  }

  if (hamperActiveCategory !== 'all') {
    if (hamperActiveCategory === 'jewelry') {
      const jCats = ['chain', 'jimmiki', 'cute earrings', 'kolusu', 'evil eye kolusu', 'glass bangles', 'raindrop bangles', 'ring for boys', 'ring for girls'];
      items = items.filter(p => jCats.includes(p.category));
    } else if (hamperActiveCategory === 'clips-scrunchies') {
      items = items.filter(p => p.category === 'clips' || p.category === 'scrunchies');
    } else {
      items = items.filter(p => p.category === hamperActiveCategory);
    }
  }

  if (items.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No in-stock accessories found in this category. Select 'All Items' or explore other categories!</div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const isPicked = hamperBuilder.selectedItemIds.has(item.id);

    return `
      <div class="builder-item-card ${isPicked ? 'picked' : ''}" onclick="toggleHamperBuilderItem('${item.id}')">
        <img src="${item.image}" alt="${item.name}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover; margin-bottom: 0.35rem; border: 1px solid var(--pink-200);">
        <div class="builder-item-name" title="${item.name}">${item.name}</div>
        <div class="builder-item-price">+ ₹${item.price}</div>
      </div>
    `;
  }).join('');
}

// Toggle Hamper Builder Item (Enforce 3 to 10 limits & 0-stock check)
window.toggleHamperBuilderItem = function(id) {
  const item = currentProducts.find(p => p.id === id);
  if (item && item.stock !== undefined && Number(item.stock) <= 0) {
    showToast(`"${item.name}" has 0 units in stock and cannot be added to your hamper.`, "error");
    return;
  }

  const totalItems = hamperBuilder.selectedItemIds.size + hamperBuilder.customRequestedItems.length;

  if (hamperBuilder.selectedItemIds.has(id)) {
    hamperBuilder.selectedItemIds.delete(id);
  } else {
    if (totalItems >= 10) {
      showToast("Maximum 10 items fit in this hamper box! Deselect an item to add another.", "info");
      return;
    }
    hamperBuilder.selectedItemIds.add(id);
  }

  renderHamperBuilderItems();
  updateHamperBuilderPreview();
};

// 4. Custom Item Requester (Items Not on the Website: Keychain, Photo Frame, etc.)
window.currentCustomItemPhoto = null;

window.handleCustomPhotoUpload = function(inputEl) {
  if (!inputEl || !inputEl.files || !inputEl.files[0]) return;
  const file = inputEl.files[0];
  if (!file.type.startsWith("image/")) {
    showToast("Please choose an image file (JPG, PNG, WEBP)", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // Compress client-side via canvas to prevent storage overflow
      const canvas = document.createElement("canvas");
      const maxDim = 500;
      let width = img.width;
      let height = img.height;
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.72);

      window.currentCustomItemPhoto = {
        dataUrl: dataUrl,
        fileName: file.name
      };

      const thumb = document.getElementById("customPhotoPreviewThumb");
      const name = document.getElementById("customPhotoPreviewName");
      const area = document.getElementById("customPhotoPreviewArea");
      const label = document.getElementById("customPhotoPickLabel");
      if (thumb) thumb.src = dataUrl;
      if (name) name.textContent = file.name;
      if (area) area.style.display = "flex";
      if (label) label.textContent = "Change Photo";

      showToast("Photo attached for your custom item request! 📸", "success");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.clearCustomPhotoUpload = function() {
  window.currentCustomItemPhoto = null;
  const fileInput = document.getElementById("customItemPhotoInput");
  if (fileInput) fileInput.value = "";
  const area = document.getElementById("customPhotoPreviewArea");
  if (area) area.style.display = "none";
  const label = document.getElementById("customPhotoPickLabel");
  if (label) label.textContent = "Choose Photo / Image";
};

window.handleAddCustomItemToHamper = function() {
  const nameInput = document.getElementById("customItemNameInput");
  const detailsInput = document.getElementById("customItemDetailsInput");
  const priceInput = document.getElementById("customItemPriceInput");

  const name = nameInput ? nameInput.value.trim() : "";
  const details = detailsInput ? detailsInput.value.trim() : "";
  const price = priceInput ? parseInt(priceInput.value, 10) : 149;

  if (!name) {
    showToast("Please enter a name for your custom item request (e.g. Photo Frame or Keychain)", "error");
    return;
  }

  const totalItems = hamperBuilder.selectedItemIds.size + hamperBuilder.customRequestedItems.length;
  if (totalItems >= 10) {
    showToast("Maximum 10 items can be packed in this hamper! Remove an item to add this custom request.", "info");
    return;
  }

  const customItem = {
    id: "custom-req-" + Date.now(),
    name: name,
    details: details || "Customized request",
    price: isNaN(price) || price < 0 ? 0 : price,
    photo: window.currentCustomItemPhoto ? window.currentCustomItemPhoto.dataUrl : null,
    photoName: window.currentCustomItemPhoto ? window.currentCustomItemPhoto.fileName : null
  };

  hamperBuilder.customRequestedItems.push(customItem);

  if (nameInput) nameInput.value = "";
  if (detailsInput) detailsInput.value = "";
  if (priceInput) priceInput.value = "149";
  clearCustomPhotoUpload();

  renderCustomRequestedItems();
  updateHamperBuilderPreview();
  showToast(`Added custom request "${name}" with photo to your hamper!`, "success");
};

window.removeCustomRequestedItem = function(id) {
  hamperBuilder.customRequestedItems = hamperBuilder.customRequestedItems.filter(item => item.id !== id);
  renderCustomRequestedItems();
  updateHamperBuilderPreview();
};

function renderCustomRequestedItems() {
  const container = document.getElementById("customRequestedItemsContainer");
  if (!container) return;

  if (hamperBuilder.customRequestedItems.length === 0) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.innerHTML = hamperBuilder.customRequestedItems.map(item => `
    <div class="custom-requested-item" style="display:flex; justify-content:space-between; align-items:center; background:white; padding:0.6rem 0.9rem; border-radius:10px; border:1px solid var(--pink-200); margin-bottom:0.4rem; box-shadow: 0 1px 4px rgba(0,0,0,0.04);">
      <div style="display:flex; align-items:center; gap:0.6rem;">
        ${item.photo ? `<img src="${item.photo}" alt="${item.name}" style="width:38px; height:38px; object-fit:cover; border-radius:6px; border:1px solid var(--pink-300);">` : ''}
        <div>
          <strong style="color: var(--pink-950); font-size: 0.85rem;">[Custom] ${item.name}</strong>
          ${item.details ? `<div style="font-size: 0.74rem; color: var(--text-muted);">${item.details}</div>` : ''}
          ${item.photo ? `<span style="font-size:0.68rem; color:#10b981; font-weight:700;">✓ Customer Photo Attached</span>` : ''}
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <span style="font-weight: 700; color: var(--pink-700); font-size:0.85rem;">+ ₹${item.price}</span>
        <button type="button" class="remove-btn" onclick="removeCustomRequestedItem('${item.id}')" title="Remove custom item" style="background:none; border:none; color:#ef4444; font-size:1.15rem; cursor:pointer; font-weight:bold;">&times;</button>
      </div>
    </div>
  `).join('');
}

// 5. Render Hamper Add-ons (Chocolates with Photos & Fairy Lights)
function renderHamperAddons() {
  const container = document.getElementById("builderAddonsList");
  if (!container || typeof HAMPER_ADDONS === "undefined") return;

  container.innerHTML = HAMPER_ADDONS.map(addon => {
    const isChecked = hamperBuilder.addons.some(a => a.id === addon.id);

    return `
      <div class="addon-card-rich ${isChecked ? 'selected' : ''}" onclick="toggleHamperAddon('${addon.id}', !${isChecked})">
        <input type="checkbox" class="builder-addon-cb" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); toggleHamperAddon('${addon.id}', this.checked)">
        ${addon.image ? `<img src="${addon.image}" alt="${addon.name}" class="addon-img-thumb">` : ''}
        <div class="addon-meta">
          <div class="addon-title-row">
            <span class="addon-title">${addon.name}</span>
            <span class="addon-price-badge">+ ₹${addon.price}</span>
          </div>
          <div class="addon-desc">${addon.description}</div>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleHamperAddon = function(addonId, isChecked) {
  const addon = HAMPER_ADDONS.find(a => a.id === addonId);
  if (!addon) return;

  if (isChecked) {
    if (!hamperBuilder.addons.some(a => a.id === addonId)) {
      hamperBuilder.addons.push(addon);
    }
  } else {
    hamperBuilder.addons = hamperBuilder.addons.filter(a => a.id !== addonId);
  }

  renderHamperAddons();
  updateHamperBuilderPreview();
};

// 6. Handle Greeting Note Input
window.handleHamperNoteChange = function(val) {
  hamperBuilder.greetingNote = val.trim();
  updateHamperBuilderPreview();
};

// 7. Update Live Hamper Preview & Price Calculation
function updateHamperBuilderPreview() {
  const summaryList = document.getElementById("builderSummaryList");
  const totalDisplay = document.getElementById("builderTotalDisplay");
  const countBadge = document.getElementById("builderItemsCountBadge");
  const capBadge = document.getElementById("builderItemsCapBadge");
  const previewImg = document.getElementById("builderPreviewImg");
  const addBtn = document.getElementById("addCustomHamperBtn");
  if (!summaryList || !totalDisplay) return;

  const totalStoreItems = hamperBuilder.selectedItemIds.size;
  const totalCustomItems = hamperBuilder.customRequestedItems.length;
  const totalItemsCount = totalStoreItems + totalCustomItems;

  // Update Preview Image to active packaging photo
  if (previewImg && hamperBuilder.image) {
    previewImg.src = hamperBuilder.image;
    previewImg.alt = `${hamperBuilder.styleName} Preview`;
  }

  // Toggle Mini Cute Fairy Lights Ambiance inside box preview
  const lightsOverlay = document.getElementById("fairyLightsBoxOverlay");
  const hasLights = hamperBuilder.addons.some(a => a.id === "addon-lights" || a.isLights);
  if (lightsOverlay) {
    lightsOverlay.style.display = hasLights ? "block" : "none";
  }

  // Update Count & Capacity Badges
  const countText = `${totalItemsCount} / 10 items chosen`;
  if (countBadge) countBadge.textContent = countText;

  if (capBadge) {
    if (totalItemsCount < 3) {
      capBadge.textContent = `${totalItemsCount} / 10 items chosen (Pick at least 3 items)`;
      capBadge.style.background = "#fef3c7";
      capBadge.style.color = "#92400e";
    } else {
      capBadge.textContent = `${totalItemsCount} / 10 items chosen (Ready to pack!)`;
      capBadge.style.background = "#d1fae5";
      capBadge.style.color = "#065f46";
    }
  }

  let total = hamperBuilder.basePrice;
  let summaryHtml = `
    <div class="summary-row" style="font-weight: 700; color: var(--pink-950);">
      <span>Packaging: ${hamperBuilder.styleName} [${hamperBuilder.sizeLabel || 'Standard'}]</span>
      <span>₹${hamperBuilder.basePrice}</span>
    </div>
  `;

  // Selected Store Products
  const selectedProducts = currentProducts.filter(p => hamperBuilder.selectedItemIds.has(p.id));
  selectedProducts.forEach(item => {
    total += item.price;
    summaryHtml += `
      <div class="summary-row">
        <span>• ${item.name}</span>
        <span>₹${item.price}</span>
      </div>
    `;
  });

  // Custom User Requested Items (Not in store)
  hamperBuilder.customRequestedItems.forEach(item => {
    total += item.price;
    summaryHtml += `
      <div class="summary-row" style="color: var(--pink-800); font-style: italic;">
        <span>[Custom] ${item.name}${item.photo ? ' 📸' : ''}</span>
        <span>₹${item.price}</span>
      </div>
    `;
  });

  // Addons (Chocolates, Candle, Lights)
  hamperBuilder.addons.forEach(ad => {
    total += ad.price;
    summaryHtml += `
      <div class="summary-row" style="color: var(--pink-700);">
        <span>+ ${ad.name}</span>
        <span>₹${ad.price}</span>
      </div>
    `;
  });

  // Personalized Note Snippet
  if (hamperBuilder.greetingNote) {
    summaryHtml += `
      <div class="summary-row" style="border-top: 1px dashed var(--pink-200); padding-top: 0.4rem; font-size: 0.78rem; color: var(--pink-900);">
        <span>Personalized Note:</span>
        <span style="font-style: italic; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">"${hamperBuilder.greetingNote}"</span>
      </div>
    `;
  }

  summaryList.innerHTML = summaryHtml;
  totalDisplay.textContent = `₹${total}`;

  if (addBtn) {
    if (totalItemsCount < 3) {
      addBtn.innerHTML = `<span>Pick At Least 3 Items (${totalItemsCount}/10)</span>`;
      addBtn.style.opacity = "0.75";
    } else {
      addBtn.innerHTML = `<span>Add Custom Hamper to Cart • ₹${total}</span>`;
      addBtn.style.opacity = "1";
    }
  }
}

// 8. Add Custom Hamper to Cart with Validation (3 to 10 Items)
function addCustomHamperToCart() {
  const totalStoreItems = hamperBuilder.selectedItemIds.size;
  const totalCustomItems = hamperBuilder.customRequestedItems.length;
  const totalItemsCount = totalStoreItems + totalCustomItems;

  if (totalItemsCount < 3) {
    showToast(`Please choose at least 3 items to complete your hamper! (Currently ${totalItemsCount} selected)`, "info");
    return;
  }

  if (totalItemsCount > 10) {
    showToast(`Maximum 10 items fit in this hamper! (Currently ${totalItemsCount} selected)`, "error");
    return;
  }

  const selectedProducts = currentProducts.filter(p => hamperBuilder.selectedItemIds.has(p.id));

  let total = hamperBuilder.basePrice;
  selectedProducts.forEach(p => total += p.price);
  hamperBuilder.customRequestedItems.forEach(c => total += c.price);
  hamperBuilder.addons.forEach(a => total += a.price);

  const customHamperItem = {
    id: "custom-hamper-" + Date.now(),
    name: `Custom Hamper (${hamperBuilder.styleName} - ${hamperBuilder.sizeLabel || "Universal"})`,
    price: total,
    image: hamperBuilder.image || "assets/images/box_corrugated.png",
    qty: 1,
    isCustom: true,
    details: {
      boxStyle: hamperBuilder.styleName,
      boxSize: hamperBuilder.sizeLabel || "Universal",
      items: selectedProducts.map(p => {
        const sel = window.cardSelections && window.cardSelections[p.id];
        const vParts = [];
        if (sel && sel.color) vParts.push(sel.color);
        if (sel && sel.size) vParts.push(`Size: ${sel.size}`);
        return vParts.length ? `${p.name} (${vParts.join(', ')})` : p.name;
      }),
      customRequestedItems: hamperBuilder.customRequestedItems.map(c => ({
        name: c.name,
        details: c.details,
        price: c.price,
        photo: c.photo || null
      })),
      addons: hamperBuilder.addons.map(a => a.name),
      note: hamperBuilder.greetingNote || "No note provided",
      hasLights: hamperBuilder.addons.some(a => a.id === 'addon-lights' || a.isLights)
    }
  };

  cart.push(customHamperItem);
  saveCartToStorage();
  updateCartBadge();
  renderCartDrawer();
  openCartDrawer();
  triggerSparkles();
  showToast("Your bespoke custom hamper has been added to your cart!", "success");
}

// ========================================================
// CART MANAGEMENT
// ========================================================

window.addToCart = function(productId, arg2, arg3, arg4) {
  const product = currentProducts.find(p => p.id === productId);
  if (!product) return;

  if (product.stock !== undefined && Number(product.stock) <= 0) {
    showToast(`Sorry, "${product.name}" is currently Stock Out!`, "error");
    return;
  }

  // Parse flexible arguments
  let chosenColor = null;
  let chosenSize = null;
  let eventObj = null;

  const passedArgs = [arg2, arg3, arg4];
  for (const arg of passedArgs) {
    if (!arg) continue;
    if (typeof arg === "object" && (arg.clientX !== undefined || typeof arg.preventDefault === "function")) {
      eventObj = arg;
    } else if (typeof arg === "string") {
      if (!chosenColor && product.colors && product.colors.includes(arg)) {
        chosenColor = arg;
      } else if (!chosenSize && product.sizes && product.sizes.includes(arg)) {
        chosenSize = arg;
      } else if (!chosenColor) {
        chosenColor = arg;
      } else if (!chosenSize) {
        chosenSize = arg;
      }
    }
  }

  // Fallback to active card selection or default available variant
  const cardSel = window.cardSelections && window.cardSelections[productId];
  if (!chosenColor && product.colors && product.colors.length > 0) {
    const outC = product.outOfStockColors || [];
    chosenColor = (cardSel && cardSel.color) || product.colors.find(c => !outC.includes(c)) || product.colors[0];
  }
  if (!chosenSize && product.sizes && product.sizes.length > 0) {
    const outS = product.outOfStockSizes || [];
    chosenSize = (cardSel && cardSel.size) || product.sizes.find(s => !outS.includes(s)) || product.sizes[0];
  }

  // Short naming logic for admin table and invoices (e.g. "Bangles (Red)" or "Scrunchies (Pink)")
  let shortBase = "Item";
  const pNameLower = product.name.toLowerCase();
  const pCatLower = (product.category || "").toLowerCase();
  if (pCatLower.includes("bangle") || pNameLower.includes("bangle")) {
    shortBase = "Bangles";
  } else if (pNameLower.includes("scrunchie")) {
    shortBase = "Scrunchies";
  } else if (pNameLower.includes("clip")) {
    shortBase = "Clips";
  } else if (pNameLower.includes("kolusu") || pNameLower.includes("anklet")) {
    shortBase = "Kolusu";
  } else if (pNameLower.includes("jimmiki") || pNameLower.includes("earring")) {
    shortBase = "Jimmiki";
  } else if (pNameLower.includes("ring")) {
    shortBase = "Ring";
  } else {
    shortBase = product.name.split(' ')[0];
  }

  const shortName = chosenColor 
    ? `${shortBase} (${chosenColor})` 
    : (chosenSize ? `${shortBase} (${chosenSize})` : shortBase);

  const variantParts = [];
  if (chosenColor) variantParts.push(chosenColor);
  if (chosenSize) variantParts.push(`Size: ${chosenSize}`);
  const variantStr = variantParts.length ? ` (${variantParts.join(', ')})` : '';
  const formattedName = `${product.name}${variantStr}`;

  // Find existing cart item with matching variants
  const existing = cart.find(item => 
    !item.isCustom && 
    item.id === productId && 
    (item.color || null) === (chosenColor || null) && 
    (item.size || null) === (chosenSize || null)
  );

  if (existing) {
    if (product.stock !== undefined && existing.qty + 1 > product.stock) {
      showToast(`Only ${product.stock} units of "${product.name}" are in stock!`, "info");
      return;
    }
    existing.qty += 1;
  } else {
    const itemImg = (cardSel && cardSel.image) || (typeof getProductImageForColor === 'function' ? getProductImageForColor(product, chosenColor) : product.image);
    cart.push({
      id: product.id,
      productId: product.id,
      name: formattedName,
      baseName: product.name,
      shortName: shortName,
      color: chosenColor || null,
      size: chosenSize || null,
      price: product.price,
      image: itemImg || product.image,
      qty: 1,
      isCustom: false
    });
  }

  saveCartToStorage();
  updateCartBadge();
  renderCartDrawer();
  showToast(`Added "${shortName}" to cart! 🛍️`, "success");

  if (eventObj && eventObj.clientX) {
    triggerSparklesAt(eventObj.clientX, eventObj.clientY);
  }
};

window.updateCartQty = function(index, delta) {
  if (cart[index]) {
    const item = cart[index];
    if (delta > 0 && !item.isCustom) {
      const prod = currentProducts.find(p => p.id === item.id);
      if (prod && prod.stock !== undefined && item.qty + delta > prod.stock) {
        showToast(`Only ${prod.stock} units of "${item.name}" available!`, "info");
        return;
      }
    }
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
      cart.splice(index, 1);
    }
    saveCartToStorage();
    updateCartBadge();
    renderCartDrawer();
  }
};

window.removeCartItem = function(index) {
  cart.splice(index, 1);
  saveCartToStorage();
  updateCartBadge();
  renderCartDrawer();
  showToast("Item removed from cart", "info");
};

function renderCartDrawer() {
  const itemsContainer = document.getElementById("cartItemsList");
  const countBadge = document.getElementById("cartDrawerCount");
  const subtotalDisplay = document.getElementById("cartSubtotalDisplay");
  const discountRow = document.getElementById("cartDiscountRow");
  const discountDisplay = document.getElementById("cartDiscountDisplay");
  const appliedCouponLabel = document.getElementById("appliedCouponLabel");
  const totalDisplay = document.getElementById("cartTotalDisplay");
  const checkoutPayable = document.getElementById("checkoutTotalPayable");

  if (!itemsContainer) return;

  const totalItemsCount = cart.reduce((sum, item) => sum + item.qty, 0);
  if (countBadge) countBadge.textContent = totalItemsCount;

  if (cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="cart-empty-state">
        <div class="empty-icon">
          <svg class="icon-svg lg" style="width: 48px; height: 48px; color: var(--pink-300);" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
        </div>
        <h4 style="font-size: 1.1rem; color: var(--pink-900); margin-bottom: 0.5rem;">Your Hamper Cart is Empty</h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.2rem;">
          Add lovely clips, traditional kolusu, jimmiki, chocolates, or build a personalized hamper box.
        </p>
        <button onclick="closeCartDrawer();" class="btn-secondary" style="font-size: 0.85rem;">
          Start Shopping
        </button>
      </div>
    `;
    if (subtotalDisplay) subtotalDisplay.textContent = "₹0";
    if (totalDisplay) totalDisplay.textContent = "₹0";
    if (discountRow) discountRow.style.display = "none";
    const emptyShippingDisplay = document.getElementById("cartShippingDisplay");
    if (emptyShippingDisplay) emptyShippingDisplay.textContent = "Calculated at checkout";
    return;
  }

  // Render items - completely visible without cutoff or hidden items
  itemsContainer.innerHTML = cart.map((item, idx) => {
    let customDetailsHtml = '';
    if (item.isCustom && item.details) {
      const d = item.details;
      const insideItems = (d.items && d.items.length) 
        ? d.items.map(it => `<span style="display:inline-block; background:white; border:1px solid var(--pink-200); border-radius:4px; padding:1px 6px; margin:2px 3px 2px 0; font-size:0.75rem;">• ${it}</span>`).join('') 
        : '<span style="font-size:0.75rem;">Assorted Boutique Accessories</span>';
      
      let customReqsHtml = '';
      if (d.customRequestedItems && d.customRequestedItems.length) {
        customReqsHtml = `
          <div style="margin-top: 0.5rem; padding-top: 0.45rem; border-top: 1px dashed var(--pink-200);">
            <strong style="color: var(--pink-900); display: block; margin-bottom: 4px; font-size: 0.78rem;">Custom Items (Not In Store):</strong>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${d.customRequestedItems.map(cr => {
                if (typeof cr === "string") return `<div style="font-size:0.75rem; color:var(--pink-800);">• ${cr}</div>`;
                return `
                  <div style="display: flex; align-items: center; gap: 0.5rem; background: white; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--pink-200);">
                    ${cr.photo ? `<img src="${cr.photo}" alt="${cr.name}" style="width:36px; height:36px; object-fit:cover; border-radius:4px; border:1px solid var(--pink-300);" title="Customer Uploaded Photo">` : ''}
                    <div style="font-size: 0.76rem;">
                      <strong style="color: var(--pink-950);">${cr.name}</strong> (+₹${cr.price})
                      ${cr.details ? `<div style="color: var(--text-muted); font-size: 0.7rem;">${cr.details}</div>` : ''}
                      ${cr.photo ? `<span style="color: #10b981; font-weight: 700; font-size: 0.68rem;">✓ Photo Included</span>` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      let addonsHtml = '';
      if (d.addons && d.addons.length) {
        addonsHtml = `
          <div style="margin-top: 0.4rem; font-size: 0.76rem; color: var(--pink-800);">
            <strong>Chocolates & Add-ons:</strong> ${d.addons.join(', ')}
            ${d.hasLights ? ' <span style="background:#fef08a; color:#854d0e; padding:1px 6px; border-radius:4px; font-weight:700; font-size:0.7rem;">✨ Fairy Lights</span>' : ''}
          </div>
        `;
      }

      let noteHtml = '';
      if (d.note && d.note !== "No note provided") {
        noteHtml = `
          <div style="margin-top: 0.4rem; font-style: italic; font-size: 0.76rem; color: var(--pink-950); background: white; padding: 5px 8px; border-radius: 6px; border: 1px dashed var(--pink-300);">
            <strong>Heartfelt Note:</strong> "${d.note}"
          </div>
        `;
      }

      customDetailsHtml = `
        <div class="cart-item-custom-breakdown">
          <div style="font-weight:700; color:var(--pink-900); font-size:0.82rem;">
            Packaging: ${d.boxStyle || 'Curated Hamper Box'} [${d.boxSize || 'Universal'}]
          </div>
          <div style="margin-top: 0.35rem;">
            <strong style="font-size:0.76rem; color:var(--pink-950); display:block; margin-bottom:2px;">Packed Inclusions:</strong>
            ${insideItems}
          </div>
          ${customReqsHtml}
          ${addonsHtml}
          ${noteHtml}
        </div>
      `;
    }

    let variantBadgeHtml = '';
    if (item.color || item.size) {
      const hex = (typeof getColorHex === 'function') ? getColorHex(item.color) : '#ec4899';
      variantBadgeHtml = `
        <div class="cart-item-variants" style="display: flex; flex-wrap: wrap; gap: 5px; align-items: center; margin: 3px 0 5px;">
          ${item.shortName ? `<span style="background:#ffe4e6; color:#9f1239; border:1px solid #fda4af; padding:1px 6px; border-radius:4px; font-size:0.72rem; font-weight:800;">🏷️ ${item.shortName}</span>` : ''}
          ${item.color ? `<span style="display:inline-flex; align-items:center; gap:4px; background:#fff0f5; color:#be185d; border:1px solid #fbcfe8; padding:1px 7px; border-radius:999px; font-size:0.72rem; font-weight:700;"><span style="width:8px; height:8px; border-radius:50%; background:${hex}; display:inline-block; border:1px solid rgba(0,0,0,0.15);"></span> 🎨 ${item.color}</span>` : ''}
          ${item.size ? `<span style="display:inline-flex; align-items:center; gap:4px; background:#fdf2f8; color:#9d174d; border:1px solid #fbcfe8; padding:1px 7px; border-radius:999px; font-size:0.72rem; font-weight:700;">📏 Size: ${item.size}</span>` : ''}
        </div>
      `;
    }

    return `
      <div class="cart-item-row">
        <img src="${item.image}" alt="${item.name}" class="cart-item-thumb">
        <div class="cart-item-info">
          <h4 class="cart-item-title" style="font-size: 0.95rem; font-weight: 700; color: var(--pink-950); margin-bottom: 0.2rem;">${item.name}</h4>
          ${variantBadgeHtml}
          <div class="cart-item-price" style="font-weight: 700; color: var(--pink-700); font-size: 0.9rem;">₹${item.price} each</div>
          ${customDetailsHtml}
          <div class="qty-control" style="margin-top: 0.6rem;">
            <button class="qty-btn" onclick="updateCartQty(${idx}, -1)" title="Decrease">-</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" onclick="updateCartQty(${idx}, 1)" title="Increase">+</button>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; min-height: 72px;">
          <button class="cart-item-remove" onclick="removeCartItem(${idx})" title="Remove item" style="background: none; border: none; color: #ef4444; font-size: 1.3rem; cursor: pointer; padding: 2px 6px;">&times;</button>
          <div style="font-weight: 800; color: var(--pink-950); font-size: 1.05rem;">₹${item.price * item.qty}</div>
        </div>
      </div>
    `;
  }).join('');

  // Calculations without adding shipping fee in cart drawer (as requested: shipping calculated at checkout)
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let discountAmount = 0;

  if (appliedDiscount) {
    if (appliedDiscount.percent) {
      discountAmount = Math.round((subtotal * appliedDiscount.percent) / 100);
    } else if (appliedDiscount.flat) {
      discountAmount = appliedDiscount.flat;
    }
  }

  const cartTotal = Math.max(0, subtotal - discountAmount);

  if (subtotalDisplay) subtotalDisplay.textContent = `₹${subtotal}`;
  const cartShippingDisplay = document.getElementById("cartShippingDisplay");
  if (cartShippingDisplay) {
    cartShippingDisplay.innerHTML = `<span style="font-size:0.75rem; color:var(--pink-700); font-weight:700;">TN: ₹70 | Other States: ₹100</span><br><span style="font-size:0.68rem; color:var(--text-muted);">(Calculated at Checkout)</span>`;
  }
  if (totalDisplay) totalDisplay.textContent = `₹${cartTotal}`;

  if (discountRow && appliedDiscount && discountAmount > 0) {
    discountRow.style.display = "flex";
    if (discountDisplay) discountDisplay.textContent = `- ₹${discountAmount}`;
    if (appliedCouponLabel) appliedCouponLabel.textContent = appliedDiscount.code;
  } else if (discountRow) {
    discountRow.style.display = "none";
  }

  // Update applied coupon badge in cart drawer
  const appliedRow = document.getElementById("cartCouponAppliedRow");
  if (appliedRow) {
    if (appliedDiscount && discountAmount > 0) {
      appliedRow.style.display = "block";
      appliedRow.innerHTML = `
        <span class="coupon-applied-badge">
          <span>✓ ${appliedDiscount.code} Active (-₹${discountAmount})</span>
          <button type="button" class="coupon-remove-btn" onclick="removeCouponCode()" title="Remove coupon">✕</button>
        </span>
      `;
    } else {
      appliedRow.style.display = "none";
      appliedRow.innerHTML = "";
    }
  }

  if (totalDisplay) totalDisplay.textContent = `₹${cartTotal}`;
  if (checkoutPayable) checkoutPayable.textContent = `₹${cartTotal}`;
}

window.toggleCartFullscreen = function(force) {
  const drawer = document.getElementById("cartDrawerAside");
  const icon = document.getElementById("cartFsIcon");
  const label = document.getElementById("cartFsLabel");
  if (!drawer) return;

  let isFull = drawer.classList.contains("fullscreen");
  if (typeof force === "boolean") {
    isFull = !force;
  }

  if (!isFull) {
    drawer.classList.add("fullscreen");
    if (icon) icon.textContent = "🗗";
    if (label) label.textContent = "Standard View";
  } else {
    drawer.classList.remove("fullscreen");
    if (icon) icon.textContent = "⛶";
    if (label) label.textContent = "Full Screen";
  }
};

window.openCartDrawer = function() {
  try {
    renderCartDrawer();
  } catch (err) {
    console.error("Error rendering cart drawer:", err);
  }
  try {
    renderCartCouponChips();
  } catch (err) {
    console.error("Error rendering cart coupon chips:", err);
  }
  const drawer = document.getElementById("cartDrawerBackdrop");
  if (drawer) drawer.classList.add("open");
};

window.closeCartDrawer = function() {
  const drawer = document.getElementById("cartDrawerBackdrop");
  if (drawer) drawer.classList.remove("open");
};

function openCartDrawer() {
  window.openCartDrawer();
}

function closeCartDrawer() {
  window.closeCartDrawer();
}

function updateCartBadge() {
  const badge = document.getElementById("cartCount");
  if (badge) {
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    badge.textContent = totalCount;
  }
}

// Render Available Boutique Coupon Chips - ONLY WELCOME10
function renderCartCouponChips() {
  const container = document.getElementById("cartCouponChipsList");
  if (!container) return;
  const coupons = (typeof getBoutiqueCoupons === 'function') 
    ? getBoutiqueCoupons() 
    : (typeof BOUTIQUE_COUPONS !== 'undefined' ? BOUTIQUE_COUPONS : [{ code: "WELCOME10", label: "10% OFF", desc: "First-Order 10% Discount" }]);
  container.innerHTML = coupons.map(c => `
    <button type="button" class="coupon-chip" onclick="applyCouponCode('${c.code}')" title="${c.desc}">
      <span style="font-size:0.75rem;">🏷️</span>
      <span>${c.code}</span>
      <span style="opacity:0.85; font-size:0.7rem;">(${c.label})</span>
    </button>
  `).join('');
}

// Apply Coupon Code - ONLY WELCOME10 allowed, 1st time only per email
function applyCouponCode(codeParam) {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  if (subtotal === 0) {
    showToast("Please add items to cart before applying promo code!", "info");
    return;
  }

  let code = codeParam;
  if (!code) {
    const input = document.getElementById("couponCodeInput");
    code = input ? input.value.trim().toUpperCase() : "";
  } else {
    code = code.trim().toUpperCase();
  }

  if (!code) {
    showToast("Please enter promo code 'WELCOME10'!", "info");
    return;
  }

  // Only WELCOME10 is permitted, all others removed
  if (code !== "WELCOME10") {
    showToast(`Invalid promo code '${code}'. Use 'WELCOME10' for 10% OFF your first order!`, "error");
    return;
  }

  // Check if customer email was already used
  const custEmailInput = document.getElementById("custEmail");
  const emailToCheck = custEmailInput ? custEmailInput.value.trim() : "";
  if (emailToCheck && isEmailUsedForWelcome10(emailToCheck)) {
    showToast(`The promo code WELCOME10 has already been used for ${emailToCheck}. It is valid only once per customer email!`, "error");
    return;
  }

  appliedDiscount = {
    code: "WELCOME10",
    label: "10% OFF",
    percent: 10,
    flat: null
  };

  const discountAmount = Math.round((subtotal * 10) / 100);
  showToast(`🎉 Coupon WELCOME10 Applied! You saved ₹${discountAmount} (First-Order 10% Welcome Discount)`, "success");
  triggerSparkles();

  renderCartDrawer();
  updateCheckoutTotals();
}

function applyCheckoutCoupon() {
  const input = document.getElementById("checkoutCouponInput");
  if (!input) return;
  const code = input.value.trim();
  applyCouponCode(code);
}

function removeCouponCode() {
  appliedDiscount = null;
  showToast("Coupon removed", "info");
  renderCartDrawer();
  updateCheckoutTotals();
}

// WhatsApp Direct Order Trigger with 9994977734
function handleWhatsAppOrder() {
  if (cart.length === 0) {
    showToast("Please add items to your cart first!", "info");
    return;
  }

  let text = "🌸 *Hello Her Hampers!* I would like to place an order directly with you:\n\n";
  cart.forEach((item, i) => {
    text += `*${i + 1}. ${item.name}* (Qty: ${item.qty}) - ₹${item.price * item.qty}\n`;
    if (item.isCustom && item.details) {
      const d = item.details;
      text += `   • Packaging: ${d.boxStyle || 'Gift Box'} [${d.boxSize || 'Standard'}]\n`;
      if (d.items && d.items.length) {
        text += `   • Items: ${d.items.join(', ')}\n`;
      }
      if (d.customRequestedItems && d.customRequestedItems.length) {
        const customNames = d.customRequestedItems.map(c => typeof c === 'string' ? c : `${c.name} (₹${c.price})`).join(', ');
        text += `   • Custom Requests: ${customNames}\n`;
      }
      if (d.addons && d.addons.length) {
        text += `   • Add-ons & Chocolates: ${d.addons.join(', ')}\n`;
      }
      if (d.note && d.note !== "No note provided") {
        text += `   • Handwritten Note: "${d.note}"\n`;
      }
    }
  });

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let discountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.percent) discountAmount = Math.round((subtotal * appliedDiscount.percent) / 100);
    else if (appliedDiscount.flat) discountAmount = appliedDiscount.flat;
  }
  const shippingFee = cart.length > 0 ? SHIPPING_FEE : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  text += `\n*Items Subtotal:* ₹${subtotal}\n`;
  if (discountAmount > 0) {
    text += `*Discount (${appliedDiscount.code}):* -₹${discountAmount}\n`;
  }
  text += `*Express Shipping:* ₹70 (Inside Tamil Nadu) / ₹100 (Rest of India)\n`;
  text += `*Estimated Total:* ₹${subtotal - discountAmount + 70} (if TN) or ₹${subtotal - discountAmount + 100} (outside TN)\n\n`;
  text += `Please let me know how to proceed with payment & delivery confirmation! 💕`;

  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/919994977734?text=${encoded}`, '_blank');
}

// Storage helpers for Cart
function saveCartToStorage() {
  localStorage.setItem("her_hampers_cart", JSON.stringify(cart));
}

function loadCartFromStorage() {
  const data = localStorage.getItem("her_hampers_cart");
  if (data) {
    try {
      cart = JSON.parse(data);
    } catch (e) {
      cart = [];
    }
  }
}

// Wishlist
window.toggleWishlist = function(productId, e) {
  if (e) e.stopPropagation();
  if (wishlist.has(productId)) {
    wishlist.delete(productId);
    showToast("Removed from wishlist", "info");
  } else {
    wishlist.add(productId);
    showToast("💖 Saved to your wishlist!", "success");
    if (e && e.clientX) triggerSparklesAt(e.clientX, e.clientY);
  }
  saveWishlistToStorage();
  updateWishlistBadge();
  renderProducts();
  renderWishlistDrawer();
};

function saveWishlistToStorage() {
  localStorage.setItem("her_hampers_wishlist", JSON.stringify(Array.from(wishlist)));
}

function loadWishlistFromStorage() {
  const data = localStorage.getItem("her_hampers_wishlist");
  if (data) {
    try {
      wishlist = new Set(JSON.parse(data));
      updateWishlistBadge();
    } catch(e) {}
  }
}

function updateWishlistBadge() {
  const badge = document.getElementById("wishlistCount");
  if (badge) {
    badge.textContent = wishlist.size;
    badge.style.display = wishlist.size > 0 ? "flex" : "none";
  }
  const drawerCount = document.getElementById("wishlistDrawerCount");
  if (drawerCount) {
    drawerCount.textContent = wishlist.size;
  }
}

// Boutique Wishlist Drawer Management
window.openWishlistDrawer = function() {
  const backdrop = document.getElementById("wishlistDrawerBackdrop");
  if (backdrop) {
    backdrop.classList.add("open");
    renderWishlistDrawer();
  }
};

window.closeWishlistDrawer = function() {
  const backdrop = document.getElementById("wishlistDrawerBackdrop");
  if (backdrop) backdrop.classList.remove("open");
};

window.handleWishlistBackdropClick = function(e) {
  const backdrop = document.getElementById("wishlistDrawerBackdrop");
  if (e.target === backdrop) {
    closeWishlistDrawer();
  }
};

window.renderWishlistDrawer = function() {
  const listContainer = document.getElementById("wishlistItemsList");
  const footerArea = document.getElementById("wishlistFooterArea");
  const drawerCount = document.getElementById("wishlistDrawerCount");
  if (!listContainer) return;

  if (drawerCount) drawerCount.textContent = wishlist.size;

  if (wishlist.size === 0) {
    listContainer.innerHTML = `
      <div class="cart-empty" style="text-align: center; padding: 3rem 1.5rem;">
        <div class="empty-icon" style="font-size: 3rem; margin-bottom: 0.8rem;">💖</div>
        <h4 style="font-size: 1.15rem; color: var(--pink-900); margin-bottom: 0.4rem;">Your Wishlist is Empty</h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.5rem;">Heart your favorite bespoke hampers, jewelry, and aesthetic accessories to save them for later!</p>
        <button class="btn-primary" style="padding: 0.65rem 1.5rem; font-size: 0.88rem;" onclick="closeWishlistDrawer(); location.href='#shop';">
          <span>Explore Boutique Collection</span>
        </button>
      </div>
    `;
    if (footerArea) footerArea.style.display = "none";
    return;
  }

  if (footerArea) footerArea.style.display = "block";

  const allItems = currentProducts || [];
  let html = '';

  wishlist.forEach(id => {
    const item = allItems.find(p => p.id === id);
    if (!item) return;

    html += `
      <div class="wishlist-item-card" id="wishlist-row-${item.id}">
        <img src="${item.image}" alt="${item.name}" class="wishlist-item-img" onerror="this.src='assets/images/logo.png'">
        <div class="wishlist-item-details">
          <h4 class="wishlist-item-name" title="${item.name}">${item.name}</h4>
          <div class="wishlist-item-price">₹${item.price}</div>
          <div class="wishlist-item-actions">
            <button type="button" class="btn-wishlist-cart" onclick="moveWishlistToCart('${item.id}')">
              <span>Add to Cart</span>
            </button>
            <button type="button" class="btn-wishlist-remove" onclick="removeWishlistItem('${item.id}')" title="Remove from Wishlist">
              ✕
            </button>
          </div>
        </div>
      </div>
    `;
  });

  listContainer.innerHTML = html;
};

window.moveWishlistToCart = function(productId) {
  addToCart(productId, 1);
  wishlist.delete(productId);
  saveWishlistToStorage();
  updateWishlistBadge();
  renderProducts();
  renderWishlistDrawer();
  showToast("Moved item to your hamper cart! 🛍️", "success");
};

window.removeWishlistItem = function(productId) {
  wishlist.delete(productId);
  saveWishlistToStorage();
  updateWishlistBadge();
  renderProducts();
  renderWishlistDrawer();
  showToast("Removed from wishlist", "info");
};

window.moveAllWishlistToCart = function() {
  if (wishlist.size === 0) return;
  wishlist.forEach(id => {
    addToCart(id, 1);
  });
  wishlist.clear();
  saveWishlistToStorage();
  updateWishlistBadge();
  renderProducts();
  renderWishlistDrawer();
  showToast("All wishlisted items moved to your cart! 💖", "success");
  closeWishlistDrawer();
  openCartDrawer();
};

// Quick View Modal & Gallery Switcher
window.switchQuickViewImage = function(url, thumbEl, productId, idx) {
  const mainImg = document.getElementById("qvImage");
  if (mainImg) mainImg.src = url;
  if (thumbEl && thumbEl.parentElement) {
    thumbEl.parentElement.querySelectorAll(".qv-thumb-box").forEach(el => {
      el.classList.remove("active");
      el.style.borderColor = "transparent";
      el.style.boxShadow = "none";
    });
    thumbEl.classList.add("active");
    thumbEl.style.borderColor = "var(--pink-500)";
    thumbEl.style.boxShadow = "0 0 0 2px var(--pink-200)";
  }

  // If clicked thumbnail corresponds to a variant color, select that color too
  if (productId !== undefined && idx !== undefined) {
    const product = (typeof currentProducts !== 'undefined' ? currentProducts : getStoredProducts()).find(p => p.id === productId);
    if (product && product.colors && product.colors[idx]) {
      const matchingColor = product.colors[idx];
      window.qvSelectedColor = matchingColor;
      const label = document.getElementById("qvSelectedColorName");
      if (label) label.textContent = matchingColor;
      const grid = document.getElementById("qvColorsGrid");
      if (grid) {
        grid.querySelectorAll(".variant-chip").forEach(btn => {
          btn.classList.toggle("active", btn.getAttribute("data-color") === matchingColor);
        });
      }
      if (!window.cardSelections) window.cardSelections = {};
      if (!window.cardSelections[productId]) window.cardSelections[productId] = {};
      window.cardSelections[productId].color = matchingColor;
      window.cardSelections[productId].image = url;
      const cardChoice = document.getElementById(`card-choice-color-${productId}`);
      if (cardChoice) cardChoice.textContent = matchingColor;
      const cardImg = document.getElementById(`card-img-${productId}`);
      if (cardImg) cardImg.src = url;
      const cardWrap = document.getElementById(`card-colors-${productId}`);
      if (cardWrap) {
        cardWrap.querySelectorAll(".card-color-dot").forEach(b => {
          const isSel = (b.getAttribute("data-color") === matchingColor);
          b.classList.toggle("active", isSel);
          b.style.borderColor = isSel ? 'var(--pink-700)' : 'rgba(0,0,0,0.18)';
          b.style.boxShadow = isSel ? '0 0 0 2px var(--pink-300)' : 'none';
          b.innerHTML = isSel ? '<span style="width: 5px; height: 5px; background: white; border-radius: 50%;"></span>' : '';
        });
      }
    }
  }
};

window.openQuickView = function(productId) {
  const product = currentProducts.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById("quickViewModal");
  const modalWin = modal ? modal.querySelector(".modal-window") : null;
  const imgCol = modal ? modal.querySelector(".product-page-img-col") : null;
  const detailsCol = modal ? modal.querySelector(".product-page-details-col") : null;

  // Immediately lock background scrolling
  document.body.classList.add("modal-open");

  if (modal) modal.scrollTop = 0;
  if (modalWin) {
    modalWin.scrollTop = 0;
    if (typeof modalWin.scrollTo === "function") modalWin.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
  if (imgCol) imgCol.scrollTop = 0;
  if (detailsCol) detailsCol.scrollTop = 0;

  const images = (product.images && product.images.length > 0) ? product.images : [product.image];

  // Determine active color and image upfront
  const hasColors = product.colors && Array.isArray(product.colors) && product.colors.length > 0;
  const outColors = product.outOfStockColors || [];
  const activeCardCol = window.cardSelections && window.cardSelections[product.id] && window.cardSelections[product.id].color;
  let chosenColor = hasColors ? (activeCardCol || product.colors.find(c => !outColors.includes(c)) || product.colors[0]) : null;

  const initialColorImg = (hasColors && chosenColor && typeof getProductImageForColor === 'function') 
    ? getProductImageForColor(product, chosenColor) 
    : (images[0] || product.image);

  const mainImg = document.getElementById("qvImage");
  if (mainImg) {
    const finalSrc = initialColorImg || images[0] || product.image || "assets/images/logo.png";
    mainImg.src = finalSrc;
    mainImg.loading = "eager";
    mainImg.decoding = "sync";
    mainImg.style.display = "block";
    mainImg.style.opacity = "1";
    mainImg.onerror = function() {
      this.onerror = null;
      this.src = product.image || "assets/images/logo.png";
    };
  }

  const thumbsContainer = document.getElementById("qvGalleryThumbs");
  if (thumbsContainer) {
    if (images.length > 1) {
      thumbsContainer.style.display = "flex";
      thumbsContainer.innerHTML = images.map((imgUrl, idx) => {
        const isThumbActive = (imgUrl === initialColorImg) || (!initialColorImg && idx === 0);
        return `
          <div class="qv-thumb-box ${isThumbActive ? 'active' : ''}" onclick="switchQuickViewImage('${imgUrl}', this, '${product.id}', ${idx})" style="width: 52px; height: 52px; border-radius: 8px; overflow: hidden; border: 2px solid ${isThumbActive ? 'var(--pink-500)' : 'transparent'}; cursor: pointer; flex-shrink: 0; transition: all 0.2s ease; box-shadow: ${isThumbActive ? '0 0 0 2px var(--pink-200)' : 'none'};" title="Photo ${idx + 1}">
            <img src="${imgUrl}" alt="Thumbnail ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.src='assets/images/logo.png'">
          </div>
        `;
      }).join('');
    } else {
      thumbsContainer.style.display = "none";
      thumbsContainer.innerHTML = "";
    }
  }

  document.getElementById("qvCategory").textContent = product.categoryLabel || product.category;
  document.getElementById("qvTitle").textContent = product.name;
  const revCount = product.reviewsCount || (product.reviews ? product.reviews.length : 1);
  document.getElementById("qvRating").innerHTML = `${renderStarsHtml(product.rating, 14)} <span class="count" style="font-weight: 700; color: var(--pink-950); margin-left: 6px;">${product.rating} of 5 <span style="font-weight: 500; color: var(--text-muted); font-size: 0.8rem;">(${revCount} Customer Reviews)</span></span>`;
  document.getElementById("qvPrice").textContent = `₹${product.price}`;
  document.getElementById("qvOriginalPrice").textContent = product.originalPrice ? `₹${product.originalPrice}` : '';
  document.getElementById("qvDescription").textContent = product.description || '';

  const isOutOfStock = (product.stock !== undefined && Number(product.stock) <= 0);
  let qvStockBadge = document.getElementById("qvStockBadge");
  if (!qvStockBadge) {
    qvStockBadge = document.createElement("div");
    qvStockBadge.id = "qvStockBadge";
    document.getElementById("qvTitle").after(qvStockBadge);
  }

  if (isOutOfStock) {
    qvStockBadge.innerHTML = `<span class="stock-indicator-pill stock-out" style="display:inline-block; margin-bottom:0.75rem;">● Stock Out (0 units available)</span>`;
  } else if (product.stock !== undefined && product.stock <= 5) {
    qvStockBadge.innerHTML = `<span class="stock-indicator-pill stock-low" style="display:inline-block; margin-bottom:0.75rem;">Only ${product.stock} units left in stock!</span>`;
  } else {
    qvStockBadge.innerHTML = `<span class="stock-indicator-pill in-stock" style="display:inline-block; margin-bottom:0.75rem;">✓ In Stock (${product.stock || 'Ready to Ship'})</span>`;
  }

  const detailsList = document.getElementById("qvDetailsList");
  if (product.details && product.details.length > 0) {
    detailsList.innerHTML = product.details.map(d => `<li>${d}</li>`).join('');
  } else {
    detailsList.innerHTML = `<li>Handcrafted luxury item</li><li>Complimentary gift packaging included</li>`;
  }

  window.qvCurrentProductId = product.id;
  if (typeof renderQuickViewReviews === "function") {
    renderQuickViewReviews(product);
  }

  // Handle Sizes in Quick View
  const qvSizeSec = document.getElementById("qvSizeSection");
  const qvSizeLabel = document.getElementById("qvSelectedSizeName");
  const qvSizesGrid = document.getElementById("qvSizesGrid");
  const hasSizes = product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0;

  if (hasSizes && qvSizeSec && qvSizesGrid) {
    qvSizeSec.style.display = "block";
    const outSizes = product.outOfStockSizes || [];
    const activeCardSz = window.cardSelections && window.cardSelections[product.id] && window.cardSelections[product.id].size;
    let chosenSize = activeCardSz || product.sizes.find(s => !outSizes.includes(s)) || product.sizes[0];
    window.qvSelectedSize = chosenSize;
    if (qvSizeLabel) qvSizeLabel.textContent = chosenSize;

    qvSizesGrid.innerHTML = product.sizes.map(sz => {
      const isSold = outSizes.includes(sz);
      const isSel = (sz === chosenSize);
      return `
        <button type="button" class="variant-chip ${isSel ? 'active' : ''} ${isSold ? 'is-striked-out' : ''}"
          data-size="${sz}" ${isSold ? 'disabled' : `onclick="selectQuickViewSize('${product.id}', '${sz}')"`}
          title="${sz}${isSold ? ' (Out of stock)' : ''}">
          <span>${sz}</span>
          ${isSold ? '<span class="strikethrough-line"></span>' : ''}
        </button>
      `;
    }).join('');
  } else if (qvSizeSec) {
    qvSizeSec.style.display = "none";
    window.qvSelectedSize = null;
  }

  // Handle Colors in Quick View
  const qvColorSec = document.getElementById("qvColorSection");
  const qvColorLabel = document.getElementById("qvSelectedColorName");
  const qvColorsGrid = document.getElementById("qvColorsGrid");

  if (hasColors && qvColorSec && qvColorsGrid) {
    qvColorSec.style.display = "block";
    window.qvSelectedColor = chosenColor;
    if (qvColorLabel) qvColorLabel.textContent = chosenColor;

    qvColorsGrid.innerHTML = product.colors.map(col => {
      const isSold = outColors.includes(col);
      const isSel = (col === chosenColor);
      const hex = (typeof getColorHex === 'function') ? getColorHex(col) : '#f472b6';
      return `
        <button type="button" class="variant-chip color-chip ${isSel ? 'active' : ''} ${isSold ? 'is-striked-out' : ''}"
          data-color="${col}" ${isSold ? 'disabled' : `onclick="selectQuickViewColor('${product.id}', '${col}')"`}
          title="${col}${isSold ? ' (Out of stock)' : ''}" style="display:inline-flex; align-items:center; gap:6px;">
          <span class="color-swatch-dot" style="background:${hex}; width:14px; height:14px; border-radius:50%; display:inline-block; border:1px solid rgba(0,0,0,0.15);"></span>
          <span>${col}</span>
          ${isSold ? '<span class="strikethrough-line"></span>' : ''}
        </button>
      `;
    }).join('');
  } else if (qvColorSec) {
    qvColorSec.style.display = "none";
    window.qvSelectedColor = null;
  }

  const addToCartBtn = document.getElementById("qvAddToCartBtn");
  const buyProductBtn = document.getElementById("qvBuyProductBtn");

  if (isOutOfStock) {
    if (addToCartBtn) {
      addToCartBtn.disabled = true;
      addToCartBtn.classList.add("btn-stock-out");
      addToCartBtn.innerHTML = `<span>Stock Out</span>`;
      addToCartBtn.onclick = null;
    }
    if (buyProductBtn) {
      buyProductBtn.disabled = true;
      buyProductBtn.classList.add("btn-stock-out");
      buyProductBtn.classList.remove("btn-buy-product-animated");
      buyProductBtn.innerHTML = `<span>Stock Out</span>`;
      buyProductBtn.onclick = null;
    }
  } else {
    if (addToCartBtn) {
      addToCartBtn.disabled = false;
      addToCartBtn.classList.remove("btn-stock-out");
      addToCartBtn.innerHTML = `<span>🛒 Add to Cart</span>`;
      addToCartBtn.onclick = (e) => {
        addToCart(product.id, window.qvSelectedColor, window.qvSelectedSize, e);
        modal.classList.remove("open");
      };
    }
    if (buyProductBtn) {
      buyProductBtn.disabled = false;
      buyProductBtn.classList.remove("btn-stock-out");
      buyProductBtn.classList.add("btn-buy-product-animated");
      buyProductBtn.innerHTML = `<span>⚡ Buy Product</span>`;
      buyProductBtn.onclick = (e) => {
        window.buyProductDirect(product.id, window.qvSelectedColor, window.qvSelectedSize, e);
      };
    }
  }

  modal.classList.add("open");

  // Force scroll to top on modal window immediately and in subsequent frames
  const resetModalScroll = () => {
    if (modal) modal.scrollTop = 0;
    if (modalWin) {
      modalWin.scrollTop = 0;
      if (typeof modalWin.scrollTo === "function") {
        modalWin.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    }
    if (imgCol) {
      imgCol.scrollTop = 0;
      if (typeof imgCol.scrollTo === "function") imgCol.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    if (detailsCol) {
      detailsCol.scrollTop = 0;
      if (typeof detailsCol.scrollTo === "function") detailsCol.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  };
  resetModalScroll();
  requestAnimationFrame(resetModalScroll);
  setTimeout(resetModalScroll, 20);
  setTimeout(resetModalScroll, 60);
  setTimeout(resetModalScroll, 180);
};

// Direct Buy Product Flow: Adds product with selected options and takes user straight to checkout
window.buyProductDirect = function(productId, color, size, e) {
  const prodId = productId || window.qvCurrentProductId;
  if (!prodId) return;

  const product = (typeof currentProducts !== 'undefined' ? currentProducts : getStoredProducts()).find(p => p.id === prodId);
  if (product && product.stock !== undefined && Number(product.stock) <= 0) {
    showToast(`Sorry, "${product.name}" is currently Stock Out!`, "error");
    return;
  }

  const chosenColor = (color !== undefined && color !== null) ? color : window.qvSelectedColor;
  const chosenSize = (size !== undefined && size !== null) ? size : window.qvSelectedSize;

  // Add the item to hamper cart
  addToCart(prodId, chosenColor, chosenSize, e);

  // Close Quick View modal
  if (typeof closeQuickViewModal === "function") {
    closeQuickViewModal();
  } else {
    const qvModal = document.getElementById("quickViewModal");
    if (qvModal) qvModal.classList.remove("open");
  }

  // Immediately proceed to Checkout page modal
  if (typeof openCheckoutModal === "function") {
    openCheckoutModal();
  } else {
    const chkModal = document.getElementById("checkoutModal");
    if (chkModal) chkModal.classList.add("open");
  }
};

window.selectQuickViewSize = function(productId, size) {
  window.qvSelectedSize = size;
  const label = document.getElementById("qvSelectedSizeName");
  if (label) label.textContent = size;
  const grid = document.getElementById("qvSizesGrid");
  if (grid) {
    grid.querySelectorAll(".variant-chip").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-size") === size);
    });
  }
  if (!window.cardSelections) window.cardSelections = {};
  if (!window.cardSelections[productId]) window.cardSelections[productId] = {};
  window.cardSelections[productId].size = size;
  const cardChoice = document.getElementById(`card-choice-size-${productId}`);
  if (cardChoice) cardChoice.textContent = size;
  const cardWrap = document.getElementById(`card-sizes-${productId}`);
  if (cardWrap) {
    cardWrap.querySelectorAll(".card-size-chip").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-size") === size);
    });
  }
};

window.selectQuickViewColor = function(productId, color) {
  window.qvSelectedColor = color;
  const label = document.getElementById("qvSelectedColorName");
  if (label) label.textContent = color;
  const grid = document.getElementById("qvColorsGrid");
  if (grid) {
    grid.querySelectorAll(".variant-chip").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-color") === color);
    });
  }

  // Switch Quick View Photo to match chosen color
  const product = (typeof currentProducts !== 'undefined' ? currentProducts : getStoredProducts()).find(p => p.id === productId);
  if (product && typeof getProductImageForColor === "function") {
    const targetImg = getProductImageForColor(product, color);
    const mainImg = document.getElementById("qvImage");
    if (mainImg && targetImg && mainImg.src !== targetImg) {
      mainImg.style.opacity = '0.35';
      setTimeout(() => {
        mainImg.src = targetImg;
        mainImg.style.opacity = '1';
      }, 120);
    }
    const thumbsContainer = document.getElementById("qvGalleryThumbs");
    if (thumbsContainer) {
      thumbsContainer.querySelectorAll(".qv-thumb-box").forEach(thumb => {
        const tImg = thumb.querySelector("img");
        const isMatch = tImg && (tImg.src === targetImg || tImg.getAttribute('src') === targetImg);
        thumb.classList.toggle("active", isMatch);
        thumb.style.borderColor = isMatch ? "var(--pink-500)" : "transparent";
        thumb.style.boxShadow = isMatch ? "0 0 0 2px var(--pink-200)" : "none";
      });
    }

    // Also sync with card image
    const cardImg = document.getElementById(`card-img-${productId}`);
    if (cardImg && targetImg) cardImg.src = targetImg;
  }

  if (!window.cardSelections) window.cardSelections = {};
  if (!window.cardSelections[productId]) window.cardSelections[productId] = {};
  window.cardSelections[productId].color = color;
  const cardChoice = document.getElementById(`card-choice-color-${productId}`);
  if (cardChoice) cardChoice.textContent = color;
  const cardWrap = document.getElementById(`card-colors-${productId}`);
  if (cardWrap) {
    cardWrap.querySelectorAll(".card-color-dot").forEach(b => {
      const isSel = (b.getAttribute("data-color") === color);
      b.classList.toggle("active", isSel);
      b.style.borderColor = isSel ? 'var(--pink-700)' : 'rgba(0,0,0,0.18)';
      b.style.boxShadow = isSel ? '0 0 0 2px var(--pink-300)' : 'none';
      b.innerHTML = isSel ? '<span style="width: 5px; height: 5px; background: white; border-radius: 50%;"></span>' : '';
    });
  }
};

window.openProductDetailsModal = window.openQuickView;
window.openProductPageModal = window.openQuickView;

window.closeQuickViewModal = function() {
  const modal = document.getElementById("quickViewModal");
  if (modal) {
    modal.classList.remove("open");
    modal.scrollTop = 0;
    const modalWin = modal.querySelector(".modal-window");
    if (modalWin) {
      modalWin.scrollTop = 0;
      if (typeof modalWin.scrollTo === "function") modalWin.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    const imgCol = modal.querySelector(".product-page-img-col");
    if (imgCol) imgCol.scrollTop = 0;
    const detailsCol = modal.querySelector(".product-page-details-col");
    if (detailsCol) detailsCol.scrollTop = 0;
  }
  document.body.classList.remove("modal-open");
  document.body.style.overflow = "";
};

// ========================================================
// MODERN PAYMENT GATEWAY & UPI QR SIMULATION
// ========================================================

let selectedNetBankCode = "HDFC";
let selectedNetBankName = "HDFC Bank";
let selectedRzpSubMethod = "UPI";
let card3dsTimerInterval = null;
let pendingOrderData = null;

// ========================================================
// ONLINE PAYMENT & CARD GATEWAY WITH WHATSAPP 99949 77734
// ========================================================

window.handlePaymentAppTouch = function(appTitle, element) {
  selectedPaymentApp = appTitle;

  // 1. Highlight clicked app in UI
  if (element && element.classList) {
    document.querySelectorAll(".online-app-card").forEach(c => c.classList.remove("active"));
    element.classList.add("active");
  } else {
    document.querySelectorAll(".online-app-card").forEach(c => c.classList.remove("active"));
    if (appTitle.includes("Google Pay") || appTitle.includes("GPay")) {
      document.getElementById("appCardGPay")?.classList.add("active");
    } else if (appTitle.includes("PhonePe")) {
      document.getElementById("appCardPhonePe")?.classList.add("active");
    } else if (appTitle.includes("Paytm")) {
      document.getElementById("appCardPaytm")?.classList.add("active");
    } else if (appTitle.includes("BHIM")) {
      document.getElementById("appCardBHIM")?.classList.add("active");
    }
  }

  // 2. Compute checkout financial totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let discountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.percent) discountAmount = Math.round((subtotal * appliedDiscount.percent) / 100);
    else if (appliedDiscount.flat) discountAmount = appliedDiscount.flat;
  }
  const stateInfo = getDeliveryStateShippingFee();
  const shippingFee = cart.length > 0 ? stateInfo.fee : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  // 3. Update main submit button text in checkout modal
  const submitText = document.getElementById("checkoutSubmitText");
  if (submitText) {
    submitText.innerHTML = `<span>💬 Pay ₹${grandTotal} via ${appTitle}</span>`;
  }

  // 4. Gather Customer details if filled
  const name = document.getElementById("custName")?.value.trim() || "";
  const phone = document.getElementById("custPhone")?.value.trim() || "";
  const address = document.getElementById("custAddress")?.value.trim() || "";
  const city = document.getElementById("custCity")?.value.trim() || "";
  const state = document.getElementById("custState") ? document.getElementById("custState").value.trim() : "";
  const pincode = document.getElementById("custPincode")?.value.trim() || "";

  // 5. Construct customized WhatsApp message for 9994977734
  let text = `🌸 *Her Hampers - Payment Request*\n\n`;
  text += `Hi Her Hampers! I want to pay via *${appTitle}* to your boutique care number *9994977734*.\n\n`;

  if (name) text += `👤 *Customer Name:* ${name}\n`;
  if (phone) text += `📞 *Customer Phone:* ${phone}\n`;
  if (address || city || state) {
    text += `📍 *Delivery Address:* ${[address, city, state, pincode].filter(Boolean).join(', ')}\n`;
  }

  if (cart.length > 0) {
    text += `\n🛒 *My Order Hamper Items (${cart.length}):*\n`;
    cart.forEach((item, i) => {
      text += `${i + 1}. ${item.name} (Qty: ${item.qty}) - ₹${item.price * item.qty}\n`;
      if (item.isCustom && item.details) {
        const d = item.details;
        text += `   • Packaging: ${d.boxStyle || 'Gift Box'} [${d.boxSize || 'Standard'}]\n`;
        if (d.items && d.items.length) text += `   • Items: ${d.items.join(', ')}\n`;
        if (d.customRequestedItems && d.customRequestedItems.length) {
          text += `   • Custom Requests: ${d.customRequestedItems.map(c => typeof c === 'string' ? c : `${c.name} (₹${c.price})`).join(', ')}\n`;
        }
        if (d.note && d.note !== "No note provided") text += `   • Note: "${d.note}"\n`;
      }
    });
    text += `\n*Items Subtotal:* ₹${subtotal}\n`;
    if (discountAmount > 0) text += `*Discount (${appliedDiscount.code}):* -₹${discountAmount}\n`;
    text += `*Shipping Fee:* ₹${shippingFee} (${stateInfo.isSelected ? stateInfo.stateName : 'Standard'})\n`;
    text += `*Total Amount to Pay:* ₹${grandTotal}\n`;
  }

  text += `\n💳 *Payment Method Clicked:* ${appTitle}\n`;
  text += `📲 *Boutique WhatsApp / UPI:* 99949 77734\n\n`;
  text += `Please send me your ${appTitle} payment link / UPI confirmation to proceed! 💕`;

  showToast(`Selected ${appTitle}! Connecting to payment...`, "success");

  // 6. Direct user to WhatsApp with the specified payment method
  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/919994977734?text=${encoded}`, '_blank');
};

window.selectPaymentMethod = function(method) {
  const allowed = ["Online", "UPI", "Card"];
  if (method === "UPI") method = "Online";
  if (!allowed.includes(method)) method = "Online";
  selectedPaymentMethod = method;
  
  const cardOnline = document.getElementById("methodCardOnline") || document.getElementById("methodCardUPI");
  const cardCard = document.getElementById("methodCardCard");
  
  const boxOnline = document.getElementById("onlineGatewayBox") || document.getElementById("upiGatewayBox");
  const boxCard = document.getElementById("cardGatewayBox");
  
  const submitText = document.getElementById("checkoutSubmitText");
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let discountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.percent) discountAmount = Math.round((subtotal * appliedDiscount.percent) / 100);
    else if (appliedDiscount.flat) discountAmount = appliedDiscount.flat;
  }
  const stateInfo = getDeliveryStateShippingFee();
  const shippingFee = cart.length > 0 ? stateInfo.fee : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  if (cardOnline) cardOnline.classList.toggle("selected", method === "Online");
  if (cardCard) cardCard.classList.toggle("selected", method === "Card");

  // Radio input state
  const radios = document.getElementsByName("payMethod");
  for (const r of radios) {
    if (r.value === method) r.checked = true;
  }

  if (boxOnline) boxOnline.style.display = method === "Online" ? "block" : "none";
  if (boxCard) boxCard.style.display = method === "Card" ? "block" : "none";

  if (submitText) {
    if (method === "Card") {
      submitText.innerHTML = `<span>💳 Pay ₹${grandTotal} with Card</span>`;
    } else {
      const activeApp = selectedPaymentApp || "Google Pay (GPay)";
      submitText.innerHTML = `<span>💬 Pay ₹${grandTotal} via ${activeApp}</span>`;
    }
  }
};

// --- Interactive Card Live Preview & Brand Detection ---
window.detectCardBrand = function(rawNum) {
  const clean = rawNum.replace(/\s+/g, '');
  if (/^4/.test(clean)) return { brand: "VISA", color: "#2563eb", pill: "VISA" };
  if (/^(5[1-5]|2[2-7])/.test(clean)) return { brand: "Mastercard", color: "#ea580c", pill: "MC" };
  if (/^(60|65|81|82)/.test(clean)) return { brand: "RuPay", color: "#16a34a", pill: "RuPay" };
  if (/^3[47]/.test(clean)) return { brand: "Amex", color: "#0284c7", pill: "AMEX" };
  return { brand: "Card", color: "#db2777", pill: "CARD" };
};

window.handleCardNumberInput = function(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 16);
  let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
  input.value = formatted;

  const display = document.getElementById("holoCardNumDisplay");
  if (display) {
    display.textContent = formatted.length > 0 ? (formatted + " •••• •••• •••• ••••".substring(formatted.length)) : "•••• •••• •••• ••••";
  }

  const brandInfo = detectCardBrand(val);
  const pill = document.getElementById("holoCardBrandPill");
  const inlineBadge = document.getElementById("cardBrandInlineBadge");
  if (pill) {
    pill.textContent = brandInfo.pill;
  }
  if (inlineBadge) {
    inlineBadge.textContent = brandInfo.pill;
    inlineBadge.style.color = brandInfo.color;
  }
};

window.handleCardNameInput = function(input) {
  const val = input.value.trim();
  const display = document.getElementById("holoCardNameDisplay");
  if (display) {
    display.textContent = val.length > 0 ? val.toUpperCase() : "YOUR NAME";
  }
};

window.handleCardExpiryInput = function(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 4);
  if (val.length >= 2) {
    val = val.substring(0, 2) + '/' + val.substring(2);
  }
  input.value = val;
  const display = document.getElementById("holoCardExpiryDisplay");
  if (display) {
    display.textContent = val.length > 0 ? val : "MM/YY";
  }
};

window.handleCardCvvInput = function(input) {
  const val = input.value.replace(/\D/g, '').substring(0, 4);
  input.value = val;
  const display = document.getElementById("holoCardCvvDisplay");
  if (display) {
    display.textContent = val.length > 0 ? "•••".substring(0, val.length) : "•••";
  }
};

window.autoFillTestCard = function() {
  const numInput = document.getElementById("simCardNumber");
  const nameInput = document.getElementById("simCardName");
  const expInput = document.getElementById("simCardExpiry");
  const cvvInput = document.getElementById("simCardCvv");

  if (numInput) {
    numInput.value = "4532 8910 2345 6789";
    handleCardNumberInput(numInput);
  }
  if (nameInput) {
    nameInput.value = "Priya Sharma";
    handleCardNameInput(nameInput);
  }
  if (expInput) {
    expInput.value = "12/28";
    handleCardExpiryInput(expInput);
  }
  if (cvvInput) {
    cvvInput.value = "888";
    handleCardCvvInput(cvvInput);
  }

  showToast("Auto-filled test 3D-Secure Card: 4532 •••• 6789", "success");
};

// --- Indian NetBanking Handlers ---
window.selectNetBank = function(code, name, btnEl) {
  selectedNetBankCode = code;
  selectedNetBankName = name;

  const allBtns = document.querySelectorAll(".netbank-pill-btn");
  allBtns.forEach(b => b.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");

  const otherSelect = document.getElementById("otherBankSelect");
  if (otherSelect) otherSelect.value = "";

  const label = document.getElementById("selectedBankLabel");
  if (label) label.textContent = name;

  const submitText = document.getElementById("checkoutSubmitText");
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let discountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.percent) discountAmount = Math.round((subtotal * appliedDiscount.percent) / 100);
    else if (appliedDiscount.flat) discountAmount = appliedDiscount.flat;
  }
  const stateInfo = getDeliveryStateShippingFee();
  const shippingFee = cart.length > 0 ? stateInfo.fee : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  if (submitText && selectedPaymentMethod === "NetBanking") {
    submitText.textContent = `Pay ₹${grandTotal} via NetBanking (${code})`;
  }
};

window.handleOtherBankSelect = function(selectEl) {
  const code = selectEl.value;
  const name = selectEl.options[selectEl.selectedIndex].text;
  if (!code) return;

  selectedNetBankCode = code;
  selectedNetBankName = name;

  const allBtns = document.querySelectorAll(".netbank-pill-btn");
  allBtns.forEach(b => b.classList.remove("active"));

  const label = document.getElementById("selectedBankLabel");
  if (label) label.textContent = name;

  showToast(`Selected: ${name} for NetBanking`, "info");
};

// --- Razorpay Simulation Flow ---
window.triggerRazorpaySimulation = function() {
  const modal = document.getElementById("razorpayCheckoutModal");
  if (!modal) return;

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let discountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.percent) discountAmount = Math.round((subtotal * appliedDiscount.percent) / 100);
    else if (appliedDiscount.flat) discountAmount = appliedDiscount.flat;
  }
  const stateInfo = getDeliveryStateShippingFee();
  const shippingFee = cart.length > 0 ? stateInfo.fee : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const tempOrderId = "HH-" + Math.floor(10000 + Math.random() * 90000);
  const orderIdEl = document.getElementById("rzpModalOrderId");
  const amountEl = document.getElementById("rzpModalAmount");
  const btnAmountEl = document.getElementById("rzpBtnAmountText");

  if (orderIdEl) orderIdEl.textContent = "#" + tempOrderId;
  if (amountEl) amountEl.textContent = "₹" + grandTotal;
  if (btnAmountEl) btnAmountEl.textContent = "₹" + grandTotal;

  modal.classList.add("open");
};

window.selectRzpSubOption = function(optionName, rowEl) {
  selectedRzpSubMethod = optionName;
  const rows = document.querySelectorAll(".razorpay-option-row");
  rows.forEach(r => {
    r.classList.remove("selected");
    const span = r.querySelector("span:last-child");
    if (span) {
      span.textContent = "Select";
      span.style.color = "#64748b";
    }
  });

  if (rowEl) {
    rowEl.classList.add("selected");
    const activeSpan = rowEl.querySelector("span:last-child");
    if (activeSpan) {
      activeSpan.textContent = "● Active";
      activeSpan.style.color = "#38ef7d";
    }
  }
};

window.closeRazorpayModal = function() {
  const modal = document.getElementById("razorpayCheckoutModal");
  if (modal) modal.classList.remove("open");
};

window.completeRazorpayPayment = function() {
  const confirmBtn = document.getElementById("rzpConfirmPayBtn");
  const confirmText = document.getElementById("rzpConfirmBtnText");
  if (confirmBtn) confirmBtn.disabled = true;
  if (confirmText) confirmText.innerHTML = `<span>⏳ Authorizing with Razorpay Secure Gateway...</span>`;

  setTimeout(() => {
    if (confirmBtn) confirmBtn.disabled = false;
    closeRazorpayModal();
    const rzpPayId = "pay_rzp_" + Math.random().toString(36).substring(2, 11);
    finalizeOrderWithPayment("Razorpay (" + selectedRzpSubMethod + ")", rzpPayId);
  }, 1000);
};

// --- 3D-Secure Card OTP Flow ---
window.openCard3dsModal = function(grandTotal) {
  const modal = document.getElementById("card3dsModal");
  if (!modal) return;

  const amtEl = document.getElementById("card3dsAmountText");
  if (amtEl) amtEl.textContent = "₹" + grandTotal;

  const otpInput = document.getElementById("cardOtpInput");
  if (otpInput) {
    otpInput.value = "";
    setTimeout(() => otpInput.focus(), 200);
  }

  // 3-minute timer countdown
  startCardOtpTimer();

  modal.classList.add("open");
};

window.closeCard3dsModal = function() {
  stopCardOtpTimer();
  const modal = document.getElementById("card3dsModal");
  if (modal) modal.classList.remove("open");
};

function startCardOtpTimer() {
  stopCardOtpTimer();
  let remaining = 179;
  const timerEl = document.getElementById("cardOtpTimerText");
  function tick() {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    if (timerEl) timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    if (remaining <= 0) {
      stopCardOtpTimer();
      if (timerEl) timerEl.textContent = "Expired";
    }
    remaining--;
  }
  tick();
  card3dsTimerInterval = setInterval(tick, 1000);
}

function stopCardOtpTimer() {
  if (card3dsTimerInterval) {
    clearInterval(card3dsTimerInterval);
    card3dsTimerInterval = null;
  }
}

window.autoFillCardOtp = function() {
  const otpInput = document.getElementById("cardOtpInput");
  if (otpInput) otpInput.value = "482910";
  showToast("Auto-filled simulated Bank OTP: 482910", "success");
};

window.submitCard3dsOtp = function() {
  const otpInput = document.getElementById("cardOtpInput");
  const otpVal = otpInput ? otpInput.value.trim() : "";
  if (!otpVal || otpVal.length < 4) {
    showToast("Please enter the 6-digit Bank OTP or click Auto-fill!", "error");
    if (otpInput) otpInput.focus();
    return;
  }

  const submitBtn = document.getElementById("card3dsSubmitBtn");
  const submitText = document.getElementById("card3dsSubmitText");
  if (submitBtn) submitBtn.disabled = true;
  if (submitText) submitText.innerHTML = `<span>⏳ Verifying 3D-Secure with Bank...</span>`;

  setTimeout(() => {
    if (submitBtn) submitBtn.disabled = false;
    closeCard3dsModal();
    const cardNum = document.getElementById("simCardNumber")?.value.replace(/\s+/g, '') || "4532";
    const last4 = cardNum.length >= 4 ? cardNum.slice(-4) : "8910";
    const brand = detectCardBrand(cardNum).brand;
    const authCode = "CARD-3DS-" + last4 + "-" + Math.floor(100000 + Math.random() * 900000);
    finalizeOrderWithPayment(`Card (${brand} •••• ${last4})`, authCode);
  }, 1000);
};

// --- NetBanking Approval Flow ---
window.openNetBankingModal = function(grandTotal) {
  const modal = document.getElementById("netbankSimulatorModal");
  if (!modal) return;

  const amtEl = document.getElementById("netbankModalAmount");
  if (amtEl) amtEl.textContent = "₹" + grandTotal;

  const titleEl = document.getElementById("netbankModalTitle");
  if (titleEl) titleEl.textContent = selectedNetBankName + " NetBanking";

  const iconEl = document.getElementById("netbankModalIcon");
  if (iconEl) {
    iconEl.className = "bank-logo-icon " + selectedNetBankCode.toLowerCase();
    iconEl.textContent = selectedNetBankCode;
  }

  modal.classList.add("open");
};

window.closeNetBankingModal = function() {
  const modal = document.getElementById("netbankSimulatorModal");
  if (modal) modal.classList.remove("open");
};

window.confirmNetBankingPayment = function() {
  const btn = document.getElementById("netbankConfirmBtn");
  const text = document.getElementById("netbankConfirmText");
  if (btn) btn.disabled = true;
  if (text) text.innerHTML = `<span>⏳ Connecting to ${selectedNetBankName} Secure Server...</span>`;

  setTimeout(() => {
    if (btn) btn.disabled = false;
    closeNetBankingModal();
    const ref = `NETBANK-${selectedNetBankCode}-` + Math.floor(10000000 + Math.random() * 90000000);
    finalizeOrderWithPayment(`NetBanking (${selectedNetBankName})`, ref);
  }, 1000);
};

// Generate Sharp SVG QR Code pattern for UPI Intent
function generateSvgQr(amount) {
  const container = document.getElementById("upiDynamicQrSvg");
  if (!container) return;

  const size = 25;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));

  // 1. Finder patterns
  function drawFinder(startX, startY) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matrix[startY + r][startX + c] = 1;
        }
      }
    }
  }

  drawFinder(0, 0);          // Top-Left
  drawFinder(size - 7, 0);   // Top-Right
  drawFinder(0, size - 7);   // Bottom-Left

  // 2. Timing Patterns
  for (let i = 8; i < size - 8; i++) {
    if (i % 2 === 0) {
      matrix[6][i] = 1;
      matrix[i][6] = 1;
    }
  }

  // 3. Alignment Pattern at (16, 16)
  const ax = 16, ay = 16;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
        matrix[ay + r][ax + c] = 1;
      }
    }
  }

  // 4. Encode stylized modules based on amount and boutique UPI
  const seedStr = `upi://pay?pa=herhampers@okhdfcbank&pn=HerHampers&am=${amount}&cu=INR`;
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) & 0xffffffff;
  }

  function pseudoRandom() {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 4294967296;
  }

  // Leave center 7x7 clear for the boutique logo emblem
  const centerStart = Math.floor(size / 2) - 2;
  const centerEnd = Math.floor(size / 2) + 2;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder zones
      if ((r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)) continue;
      // Skip timing patterns
      if (r === 6 || c === 6) continue;
      // Skip alignment zone
      if (r >= ay - 2 && r <= ay + 2 && c >= ax - 2 && c <= ax + 2) continue;
      // Skip logo center hole
      if (r >= centerStart && r <= centerEnd && c >= centerStart && c <= centerEnd) continue;

      if (pseudoRandom() > 0.46) {
        matrix[r][c] = 1;
      }
    }
  }

  // Build SVG Rect elements
  const cellSize = 7;
  const svgSize = size * cellSize;
  let rects = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) {
        rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize - 0.2}" height="${cellSize - 0.2}" rx="1.5" fill="#371822"/>`;
      }
    }
  }

  container.innerHTML = `
    <svg class="upi-qr-svg" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${svgSize}" height="${svgSize}" fill="#ffffff" rx="10"/>
      ${rects}
    </svg>
  `;
}

// UPI Countdown Timer (5 Minutes)
function startUpiTimer() {
  stopUpiTimer();
  let remainingSeconds = 300;
  const countdownEl = document.getElementById("upiCountdownText");
  const badgeEl = document.getElementById("upiTimerBadge");

  function update() {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    const str = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    if (countdownEl) countdownEl.textContent = str;

    if (badgeEl) {
      if (remainingSeconds < 60) badgeEl.classList.add("expiring");
      else badgeEl.classList.remove("expiring");
    }

    if (remainingSeconds <= 0) {
      stopUpiTimer();
      if (countdownEl) countdownEl.textContent = "Expired - Refresh";
    }
    remainingSeconds--;
  }

  update();
  upiTimerInterval = setInterval(update, 1000);
}

function stopUpiTimer() {
  if (upiTimerInterval) {
    clearInterval(upiTimerInterval);
    upiTimerInterval = null;
  }
}

window.copyBoutiqueVpa = function() {
  const vpa = "herhampers@okhdfcbank";
  navigator.clipboard.writeText(vpa).then(() => {
    const label = document.getElementById("copyVpaLabel");
    if (label) {
      label.textContent = "Copied! ✓";
      setTimeout(() => { label.textContent = "Copy ID"; }, 2000);
    }
    showToast(`Boutique UPI ID copied: ${vpa}`, "success");
  }).catch(() => {
    showToast(`UPI ID: ${vpa}`, "info");
  });
};

window.selectUpiApp = function(appName, btnEl) {
  const allBtns = document.querySelectorAll(".upi-app-btn");
  allBtns.forEach(b => b.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");
  showToast(`Simulated intent: Launching ${appName}... Scan QR or enter UPI PIN!`, "info");
};

window.autoFillTestUtr = function() {
  const input = document.getElementById("upiUtrInput");
  const randomUtr = Math.floor(100000000000 + Math.random() * 900000000000).toString();
  if (input) input.value = randomUtr;
  showToast(`Auto-filled 12-digit UPI UTR: ${randomUtr}`, "success");
};

// Update Checkout Financial Summary based on Selected State
function updateCheckoutTotals() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let discountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.percent) discountAmount = Math.round((subtotal * appliedDiscount.percent) / 100);
    else if (appliedDiscount.flat) discountAmount = appliedDiscount.flat;
  }

  const stateInfo = getDeliveryStateShippingFee();
  const shippingFee = cart.length > 0 ? stateInfo.fee : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const subtotalEl = document.getElementById("checkoutSubtotal");
  const shippingEl = document.getElementById("checkoutShippingDisplay");
  const shippingLabelEl = document.getElementById("checkoutShippingLabel");

  if (shippingEl) {
    if (!stateInfo.isSelected) {
      shippingEl.innerHTML = `<span style="color:var(--pink-700); font-weight:700;">+ ₹70 (TN) / ₹100 (India)</span> <span style="font-size:0.75rem; color:var(--text-muted);">(Select state above)</span>`;
    } else if (stateInfo.fee === 70) {
      shippingEl.innerHTML = `<span style="color:#15803d; font-weight:800;">+ ₹70</span> <span style="font-size:0.75rem; color:var(--pink-800); font-weight:600;">(Inside Tamil Nadu)</span>`;
    } else {
      shippingEl.innerHTML = `<span style="color:var(--pink-700); font-weight:800;">+ ₹100</span> <span style="font-size:0.75rem; color:var(--pink-800); font-weight:600;">(${stateInfo.stateName})</span>`;
    }
  }

  if (shippingLabelEl) {
    shippingLabelEl.textContent = stateInfo.isSelected 
      ? `Express Shipping (${stateInfo.stateName}):` 
      : `Express Shipping:`;
  }
  const discountRow = document.getElementById("checkoutDiscountRow");
  const discountTag = document.getElementById("checkoutDiscountTag");
  const discountVal = document.getElementById("checkoutDiscountVal");
  const totalPayable = document.getElementById("checkoutTotalPayable");
  const couponFeedback = document.getElementById("checkoutCouponFeedback");

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
  if (discountRow) {
    if (appliedDiscount && discountAmount > 0) {
      discountRow.style.display = "flex";
      if (discountTag) discountTag.textContent = appliedDiscount.code;
      if (discountVal) discountVal.textContent = `- ₹${discountAmount}`;
    } else {
      discountRow.style.display = "none";
    }
  }

  if (totalPayable) totalPayable.textContent = `₹${grandTotal}`;

  if (couponFeedback) {
    if (appliedDiscount) {
      couponFeedback.innerHTML = `<span style="color:#15803d; font-weight:700;">✓ Active: ${appliedDiscount.code} (-₹${discountAmount})</span> <a href="javascript:void(0)" onclick="removeCouponCode()" style="color:#b91c1c; margin-left:8px; font-weight:600;">Remove</a>`;
    } else {
      couponFeedback.innerHTML = `<span style="color:var(--text-muted);">e.g. <strong>welcome10</strong></span>`;
    }
  }

  // Update dynamic QR Code with fresh grand total
  generateSvgQr(grandTotal);

  // Update submit button text
  selectPaymentMethod(selectedPaymentMethod);
}

// Checkout Modal Open / Close
function openCheckoutModal() {
  if (cart.length === 0) {
    showToast("Your hamper cart is empty!", "info");
    return;
  }
  closeCartDrawer();
  updateCheckoutTotals();
  selectPaymentMethod("Online");

  const modal = document.getElementById("checkoutModal");
  if (modal) modal.classList.add("open");
}
window.openCheckoutModal = openCheckoutModal;

function closeCheckoutModal() {
  stopUpiTimer();
  const modal = document.getElementById("checkoutModal");
  if (modal) modal.classList.remove("open");
}
window.closeCheckoutModal = closeCheckoutModal;

// Finalize & Confirm Order for Any Payment Gateway Method
window.finalizeOrderWithPayment = function(payMethodTitle, payReference) {
  const name = document.getElementById("custName")?.value.trim() || "Valued Boutique Guest";
  const phone = document.getElementById("custPhone")?.value.trim() || "+91 98765 43210";
  const email = document.getElementById("custEmail")?.value.trim() || "care@example.com";
  const address = document.getElementById("custAddress")?.value.trim() || "Boutique Residence";
  const city = document.getElementById("custCity")?.value.trim() || "Chennai";
  const state = document.getElementById("custState") ? document.getElementById("custState").value.trim() : "Tamil Nadu";
  const pincode = document.getElementById("custPincode")?.value.trim() || "600001";

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let discountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.percent) discountAmount = Math.round((subtotal * appliedDiscount.percent) / 100);
    else if (appliedDiscount.flat) discountAmount = appliedDiscount.flat;
  }
  const isTn = state.toLowerCase().includes("tamil nadu") || state.toLowerCase() === "tn";
  const shippingFee = isTn ? SHIPPING_FEE_TN : SHIPPING_FEE_INDIA;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const orderId = "HH-" + Math.floor(10000 + Math.random() * 90000);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10) + " " + now.toTimeString().slice(0, 5);

  const newOrder = {
    id: orderId,
    customerName: name,
    phone: phone,
    email: email || "Not provided",
    state: state,
    address: `${address}, ${city}, ${state} - ${pincode}`,
    items: cart.map(i => ({
      id: i.id || i.productId,
      productId: i.productId || i.id,
      name: i.name,
      baseName: i.baseName || i.name,
      shortName: i.shortName || (i.color ? `${(i.baseName || i.name).split(' ')[0]} (${i.color})` : (i.baseName || i.name)),
      color: i.color || null,
      size: i.size || null,
      qty: i.qty,
      price: i.price,
      image: i.image,
      isCustom: !!i.isCustom,
      details: i.details || null
    })),
    subtotal: subtotal,
    discountCode: appliedDiscount ? appliedDiscount.code : null,
    discountAmount: discountAmount,
    shippingFee: shippingFee,
    total: grandTotal,
    status: "Packed",
    paymentMethod: payMethodTitle,
    upiRef: payReference,
    estimatedDelivery: "3 - 7 working days",
    date: dateStr,
    notes: `Delivery State: ${state} (Shipping: ₹${shippingFee})`
  };

  // Save to stored orders & persistent server disk
  const existingOrders = getStoredOrders();
  existingOrders.unshift(newOrder);
  saveStoredOrders(existingOrders);

  // Record email as used for WELCOME10 coupon
  if (newOrder.discountCode === "WELCOME10" && email) {
    recordEmailUsedForWelcome10(email);
  }

  lastCreatedOrderId = orderId;

  // Clear cart
  cart = [];
  appliedDiscount = null;
  saveCartToStorage();
  updateCartBadge();
  closeCheckoutModal();

  // Show order success modal
  const successOrderIdEl = document.getElementById("successOrderId");
  const successPayMethodEl = document.getElementById("successPayMethod");
  const upiRefRow = document.getElementById("successUpiRefRow");
  const upiRefEl = document.getElementById("successUpiRef");

  if (successOrderIdEl) successOrderIdEl.textContent = "#" + orderId;
  if (successPayMethodEl) successPayMethodEl.textContent = payMethodTitle;
  if (upiRefRow && upiRefEl) {
    upiRefEl.textContent = payReference;
    upiRefRow.style.display = "flex";
  }

  // Prompt user to rate the app after order is completed
  if (typeof resetAppRatingWidget === "function") {
    resetAppRatingWidget(orderId);
  }

  const successModal = document.getElementById("orderSuccessModal");
  if (successModal) successModal.classList.add("open");

  triggerSparkles();
  showToast(`Order #${orderId} Confirmed via ${payMethodTitle}! Please rate our app ⭐`, "success");
};

// Checkout Submission with Online UPI / Card & WhatsApp Integration
window.handleCheckoutSubmit = function(e) {
  e.preventDefault();
  
  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const email = document.getElementById("custEmail").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const city = document.getElementById("custCity").value.trim();
  const state = document.getElementById("custState") ? document.getElementById("custState").value.trim() : "";
  const pincode = document.getElementById("custPincode").value.trim();

  if (!state) {
    showToast("Please select your delivery state to calculate shipping charges!", "error");
    const stateEl = document.getElementById("custState");
    if (stateEl) {
      stateEl.focus();
      stateEl.style.borderColor = "#e11d48";
    }
    return;
  }

  const paymentRadios = document.getElementsByName("payMethod");
  let payMethod = "Online";
  for (const r of paymentRadios) {
    if (r.checked) payMethod = r.value;
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let discountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.percent) discountAmount = Math.round((subtotal * appliedDiscount.percent) / 100);
    else if (appliedDiscount.flat) discountAmount = appliedDiscount.flat;
  }
  const isTn = state.toLowerCase().includes("tamil nadu") || state.toLowerCase() === "tn";
  const shippingFee = isTn ? SHIPPING_FEE_TN : SHIPPING_FEE_INDIA;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  // Verify WELCOME10 single-use restriction per customer email
  if (appliedDiscount && appliedDiscount.code === "WELCOME10") {
    if (!email) {
      showToast("Please provide your email address to verify first-order welcome discount!", "error");
      return;
    }
    if (isEmailUsedForWelcome10(email)) {
      showToast(`The promo code WELCOME10 has already been used for ${email}. It is only valid for your first order!`, "error");
      appliedDiscount = null;
      updateCheckoutTotals();
      renderCartDrawer();
      return;
    }
  }

  // Route to corresponding gateway flow
  if (payMethod === "Card") {
    const cardNum = document.getElementById("simCardNumber")?.value.replace(/\s+/g, '');
    if (!cardNum || cardNum.length < 12) {
      autoFillTestCard();
    }
    openCard3dsModal(grandTotal);
    return;
  }

  // Pay Online Flow: Google Pay, PhonePe, Paytm, BHIM
  const chosenMethod = selectedPaymentApp || "Google Pay (GPay)";
  const utrInput = document.getElementById("upiUtrInput");
  const upiRef = (utrInput && utrInput.value.trim()) ? utrInput.value.trim() : ("UPI-" + Math.floor(100000000000 + Math.random() * 900000000000));

  const submitBtn = document.getElementById("checkoutSubmitBtn");
  const submitText = document.getElementById("checkoutSubmitText");
  if (submitBtn) submitBtn.disabled = true;

  if (submitText) {
    submitText.innerHTML = `<span>⏳ Processing Payment...</span>`;
  }

  setTimeout(() => {
    if (submitBtn) submitBtn.disabled = false;
    finalizeOrderWithPayment(chosenMethod, upiRef);

    // Open WhatsApp to 9994977734 with Order confirmation and payment details
    let text = `🌸 *Her Hampers - New Order Placed!*\n\n`;
    text += `Hi Her Hampers! I just placed Order *#${lastCreatedOrderId}* on your boutique!\n\n`;
    text += `👤 *Customer Name:* ${name}\n`;
    text += `📞 *Phone:* ${phone}\n`;
    text += `📍 *Delivery Address:* ${address}, ${city}, ${state} - ${pincode}\n\n`;
    text += `💳 *Chosen Payment Method:* ${chosenMethod}\n`;
    text += `💵 *Total Amount:* ₹${grandTotal}\n`;
    if (upiRef) text += `🔖 *Reference/UTR:* ${upiRef}\n\n`;
    text += `Please confirm my order and send payment acknowledgement to 9994977734! 💕`;

    window.open(`https://wa.me/919994977734?text=${encodeURIComponent(text)}`, '_blank');
  }, 900);
};

// ========================================================
// TAX INVOICE & PRINTABLE RECEIPT
// ========================================================

window.openOrderInvoice = function(orderId) {
  let targetId = orderId || lastCreatedOrderId;
  const orders = getStoredOrders();
  let order = orders.find(o => o.id === targetId);
  if (!order && orders.length > 0) order = orders[0];
  if (!order) {
    showToast("No order record found to print!", "error");
    return;
  }

  const area = document.getElementById("invoicePrintableArea");
  if (!area) return;

  const itemsRows = order.items.map((it, idx) => {
    let customNote = '';
    if (it.isCustom && it.details) {
      const d = it.details;
      const box = d.box || d.boxStyle || "Corrugated Box";
      const size = d.boxSize || d.size || "Standard";
      const note = d.note ? `Personal Note: "${d.note}"` : "";
      const insideItems = d.items ? d.items.join(", ") : "";
      customNote = `<div style="font-size:0.76rem; color:var(--pink-900); margin-top:3px; background:#fff0f5; padding:4px 8px; border-radius:4px;">
        <strong>Custom Hamper:</strong> ${box} (${size})<br>
        <strong>Items:</strong> ${insideItems}<br>
        ${note ? `<em>${note}</em>` : ''}
      </div>`;
    }
    const itemTotal = it.price * it.qty;
    return `
      <tr>
        <td style="width: 35px; text-align: center;">${idx + 1}</td>
        <td>
          <strong>${it.name}</strong>
          ${it.color || it.size ? `
            <div style="font-size: 0.76rem; color: #be185d; margin-top: 2px;">
              ${it.shortName ? `<span style="background:#ffe4e6; color:#9f1239; border:1px solid #fda4af; padding:1px 6px; border-radius:4px; font-weight:800; font-size:0.7rem; margin-right:4px;">🏷️ ${it.shortName}</span>` : ''}
              ${it.color ? `<span style="display:inline-block; background:#fce7f3; color:#9d174d; border:1px solid #fbcfe8; padding:1px 6px; border-radius:4px; font-weight:700; margin-right:4px;">🎨 Color: ${it.color}</span>` : ''}
              ${it.size ? `<span style="display:inline-block; background:#fdf2f8; color:#831843; border:1px solid #fbcfe8; padding:1px 6px; border-radius:4px; font-weight:700;">📏 Size: ${it.size}</span>` : ''}
            </div>
          ` : ''}
          ${customNote}
        </td>
        <td style="text-align: right;">₹${it.price}</td>
        <td style="text-align: center;">${it.qty}</td>
        <td style="text-align: right; font-weight: 700;">₹${itemTotal}</td>
      </tr>
    `;
  }).join('');

  const subtotal = order.subtotal || order.items.reduce((s, i) => s + (i.price * i.qty), 0);
  const discountHtml = order.discountAmount ? `
    <div class="invoice-total-line" style="color: #10b981;">
      <span>Promo Discount (${order.discountCode || 'OFFER'}):</span>
      <span>- ₹${order.discountAmount}</span>
    </div>
  ` : '';

  area.innerHTML = `
    <!-- Letterhead -->
    <div class="invoice-header-grid">
      <div class="invoice-brand-col">
        <img src="assets/images/logo.png" alt="Her Hampers Logo">
        <div>
          <h1 style="font-family:'Playfair Display',serif; font-size:1.5rem; color:var(--pink-950); margin:0;">Her Hampers</h1>
          <p style="font-size:0.8rem; color:var(--pink-700); margin:0;">Luxury Handcrafted Boutique & Curated Hampers</p>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Studio 4B, Pink Boulevard, Bandra West, Mumbai 400050<br>GSTIN: 27AABCH1234F1Z8 • care@herhampers.com • +91 98765 43210</p>
        </div>
      </div>
      <div class="invoice-title-col">
        <h2>TAX INVOICE</h2>
        <span class="invoice-tag">ORIGINAL FOR RECIPIENT</span>
        <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">
          Invoice No: <strong>INV-${order.id}</strong><br>
          Date: <strong>${order.date}</strong>
        </div>
      </div>
    </div>

    <!-- Meta Details Grid -->
    <div class="invoice-meta-grid">
      <div>
        <div style="font-size:0.75rem; font-weight:700; color:var(--pink-800); text-transform:uppercase; margin-bottom:4px;">Billed & Shipped To:</div>
        <div style="font-weight:700; font-size:0.95rem; color:var(--text-primary);">${order.customerName}</div>
        <div style="font-size:0.82rem; color:var(--text-secondary); margin-top:2px;">${order.address}</div>
        <div style="font-size:0.82rem; color:var(--text-secondary); margin-top:2px;">Phone: <strong>${order.phone}</strong> | Email: ${order.email || 'N/A'}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size:0.75rem; font-weight:700; color:var(--pink-800); text-transform:uppercase; margin-bottom:4px;">Payment & Delivery:</div>
        <div style="font-size:0.85rem;">Payment Method: <strong>${order.paymentMethod}</strong></div>
        <div style="font-size:0.85rem; font-family:monospace; margin-top:2px;">Txn Ref / UTR: <strong>${order.upiRef || 'PAID-OK'}</strong></div>
        <div style="font-size:0.85rem; margin-top:2px;">Estimated Delivery: <strong style="color:#15803d;">3 - 7 Working Days</strong></div>
        <div style="font-size:0.85rem; color:#15803d; font-weight:700; margin-top:3px;">Status: ${order.status.toUpperCase()}</div>
      </div>
    </div>

    <!-- Items Table -->
    <table class="invoice-table">
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">#</th>
          <th>Item Description & Specifications</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <!-- Financial Breakdown & Notes -->
    <div class="invoice-summary-grid">
      <div class="invoice-notes-box">
        <strong>Handcrafted with Love:</strong>
        <p style="margin-top:4px; font-size:0.8rem; line-height:1.4;">
          Thank you for choosing Her Hampers! Every single accessory and hamper box is crafted by our boutique artisans with meticulous care and dressed with delicate satin ribbons.
        </p>
        <div style="margin-top:8px; font-size:0.75rem; color:var(--text-muted);">
          Questions or returns? Contact boutique care at <strong>care@herhampers.com</strong> or WhatsApp <strong>+91 99949 77734</strong>.
        </div>
      </div>

      <div class="invoice-totals-list">
        <div class="invoice-total-line">
          <span>Items Subtotal:</span>
          <span>₹${subtotal}</span>
        </div>
        ${discountHtml}
        <div class="invoice-total-line">
          <span>Luxury Satin Ribbon Packaging:</span>
          <span style="color:#10b981; font-weight:600;">COMPLIMENTARY</span>
        </div>
        <div class="invoice-total-line">
          <span>Express Shipping (${order.state ? (order.state.toLowerCase().includes('tamil') ? 'Inside Tamil Nadu' : 'Inside India - ' + order.state) : 'All India'}):</span>
          <span style="font-weight:700; color:var(--pink-700);">₹${order.shippingFee !== undefined ? order.shippingFee : (order.state && order.state.toLowerCase().includes('tamil') ? 70 : 100)}</span>
        </div>
        <div class="invoice-total-line grand">
          <span>Grand Total:</span>
          <span>₹${order.total}</span>
        </div>
      </div>
    </div>

    <!-- Seal and Sign -->
    <div class="invoice-footer-sign">
      <div class="invoice-stamp">
        <span>HER HAMPERS</span>
        <span style="font-size:0.55rem; margin:2px 0;">★ ★ ★</span>
        <span>AUTHENTIC BOUTIQUE</span>
      </div>
      <div style="text-align: right;">
        <div style="font-family:'Great Vibes',cursive; font-size:1.8rem; color:var(--pink-700);">Diya & Team</div>
        <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Authorized Boutique Artisan Signature</div>
      </div>
    </div>
  `;

  document.getElementById("invoiceModal").classList.add("open");
};

window.closeInvoiceModal = function() {
  const modal = document.getElementById("invoiceModal");
  if (modal) modal.classList.remove("open");
};

// ========================================================
// CUSTOMER ORDER REAL-TIME TRACKING
// ========================================================

window.openTrackOrderModal = function(prefilledOrderId) {
  const modal = document.getElementById("trackOrderModal");
  if (!modal) return;

  const orders = getStoredOrders();
  const chipsContainer = document.getElementById("trackQuickChipsContainer");
  if (chipsContainer) {
    chipsContainer.innerHTML = orders.slice(0, 4).map(o => `
      <button type="button" class="track-chip-link" onclick="quickTrackOrder('${o.id}')">#${o.id}</button>
    `).join('');
  }

  const input = document.getElementById("trackSearchInput");
  if (input) {
    if (prefilledOrderId) {
      input.value = prefilledOrderId;
      handleTrackSearch();
    } else if (orders.length > 0) {
      input.value = orders[0].id;
      handleTrackSearch();
    }
  }

  modal.classList.add("open");
};

window.closeTrackOrderModal = function() {
  const modal = document.getElementById("trackOrderModal");
  if (modal) modal.classList.remove("open");
};

window.quickTrackOrder = function(orderId) {
  const input = document.getElementById("trackSearchInput");
  if (input) input.value = orderId;
  handleTrackSearch();
};

window.handleTrackSearch = function() {
  const input = document.getElementById("trackSearchInput");
  const query = input ? input.value.trim() : "";
  const resultContainer = document.getElementById("trackOrderResultContainer");
  if (!resultContainer) return;

  if (!query) {
    resultContainer.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">Please enter an Order ID or Phone Number to track.</div>`;
    return;
  }

  const order = findOrderByIdOrPhone(query);
  if (!order) {
    resultContainer.innerHTML = `
      <div style="background:#fef2f2; border:1px dashed #fca5a5; border-radius:var(--radius-md); padding:1.5rem; text-align:center; color:#991b1b;">
        <strong>No order found matching "${query}"</strong>
        <p style="margin-top:0.3rem; font-size:0.82rem;">Please double check your Order ID (e.g. HH-10492) or contact our boutique support on WhatsApp.</p>
      </div>
    `;
    return;
  }

  const isDelivered = order.status === "Delivered";
  const isShipped = order.status === "Shipped" || isDelivered;

  const step1Class = "completed";
  const step2Class = isShipped ? "completed" : (order.status === "Packed" ? "active" : "");
  const step3Class = isDelivered ? "completed" : (order.status === "Shipped" ? "active" : "");
  const step4Class = isDelivered ? "completed" : "";

  resultContainer.innerHTML = `
    <div style="background:var(--pink-50); border:1px solid var(--pink-200); border-radius:var(--radius-md); padding:1.2rem; margin-bottom:1.2rem;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="font-size:0.75rem; color:var(--text-muted); display:block;">Tracking Order:</span>
          <strong style="font-size:1.1rem; color:var(--pink-900); font-family:monospace;">#${order.id}</strong>
        </div>
        <span class="product-badge pink" style="position:static; font-size:0.78rem;">${order.status}</span>
      </div>
      <div style="font-size:0.82rem; color:var(--text-secondary); margin-top:4px;">
        Placed on <strong>${order.date}</strong> by <strong>${order.customerName}</strong>
      </div>
    </div>

    <!-- Stepper -->
    <div class="tracking-stepper-wrap">
      <div class="tracking-steps">
        <div class="tracking-step-item ${step1Class}">
          <div class="tracking-step-dot">✓</div>
          <div class="tracking-step-title">Confirmed</div>
          <div class="tracking-step-desc">Payment Verified</div>
        </div>

        <div class="tracking-step-item ${step2Class}">
          <div class="tracking-step-dot">${isShipped ? '✓' : '2'}</div>
          <div class="tracking-step-title">Artisan Packing</div>
          <div class="tracking-step-desc">Ribbon Wrap</div>
        </div>

        <div class="tracking-step-item ${step3Class}">
          <div class="tracking-step-dot">${isDelivered ? '✓' : '3'}</div>
          <div class="tracking-step-title">Dispatched</div>
          <div class="tracking-step-desc">In Transit</div>
        </div>

        <div class="tracking-step-item ${step4Class}">
          <div class="tracking-step-dot">${isDelivered ? '✓' : '4'}</div>
          <div class="tracking-step-title">Delivered</div>
          <div class="tracking-step-desc">At Doorstep</div>
        </div>
      </div>
    </div>

    <!-- Delivery Details Card -->
    <div class="tracking-courier-card" style="grid-template-columns: 1fr 1fr; gap: 1rem;">
      <div>
        <span style="font-size:0.74rem; color:var(--text-muted); display:block;">Estimated Delivery:</span>
        <strong style="color:#15803d; font-size:1.02rem;">${order.estimatedDelivery || '3 - 7 Working Days'}</strong>
        <span style="font-size:0.74rem; color:var(--text-muted); display:block; margin-top:6px;">Recipient:</span>
        <strong style="color:var(--pink-950);">${order.customerName}</strong>
      </div>
      <div>
        <span style="font-size:0.74rem; color:var(--text-muted); display:block;">Delivery Location:</span>
        <span style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4; display:block;">${order.address}</span>
        <span style="font-size:0.72rem; color:var(--pink-700); font-weight:600; display:block; margin-top:4px;">🌸 Bespoke order (Cannot be cancelled or returned)</span>
      </div>
    </div>

    <!-- Items in this Order -->
    <div style="background: white; border: 1px solid var(--pink-200); border-radius: var(--radius-md); padding: 1rem; margin-top: 1rem;">
      <span style="font-size: 0.76rem; font-weight: 700; color: var(--pink-900); text-transform: uppercase; display: block; margin-bottom: 0.6rem; letter-spacing: 0.5px;">Items in this Order:</span>
      <div style="display: flex; flex-direction: column; gap: 0.6rem;">
        ${order.items.map(it => `
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.84rem; border-bottom: 1px dashed var(--pink-100); padding-bottom: 0.45rem;">
            <div>
              <strong style="color: var(--pink-950);">${it.name}</strong>
              <div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-top: 3px;">
                ${it.shortName ? `<span style="background:#ffe4e6; color:#be123c; border:1px solid #fda4af; padding:1px 6px; border-radius:4px; font-weight:800; font-size:0.7rem;">🏷️ ${it.shortName}</span>` : ''}
                ${it.color ? `<span style="background:#fce7f3; color:#9d174d; border:1px solid #fbcfe8; padding:1px 6px; border-radius:4px; font-weight:700; font-size:0.7rem;">🎨 ${it.color}</span>` : ''}
                ${it.size ? `<span style="background:#fdf2f8; color:#831843; border:1px solid #fbcfe8; padding:1px 6px; border-radius:4px; font-weight:700; font-size:0.7rem;">📏 ${it.size}</span>` : ''}
                <span style="color: var(--text-muted); font-size: 0.75rem;">(Qty: ${it.qty})</span>
              </div>
            </div>
            <strong style="color: var(--pink-950); font-size: 0.92rem;">₹${it.price * it.qty}</strong>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Delivered Order Products Review Prompt -->
    ${(() => {
      if (!isDelivered) return '';
      let reviewedMap = {};
      try {
        reviewedMap = JSON.parse(localStorage.getItem('her_hampers_reviewed_items') || '{}');
      } catch (e) {}

      const prodsList = (typeof currentProducts !== 'undefined' && currentProducts && currentProducts.length) ? currentProducts : getStoredProducts();

      return `
        <div class="delivered-reviews-container">
          <div style="display:flex; align-items:center; gap:0.65rem; margin-bottom:0.75rem;">
            <span style="font-size:1.4rem;">📦🌸</span>
            <div>
              <strong style="color:var(--pink-950); font-size:0.95rem; display:block;">Order Delivered! Rate &amp; Review Your Items</strong>
              <span style="font-size:0.78rem; color:var(--text-secondary);">How are your handcrafted pieces? Help other boutique shoppers by rating (__ of 5) and reviewing your products!</span>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:0.6rem;">
            ${order.items.map(it => {
              const matchProd = (typeof findProductForOrderItem === 'function') ? findProductForOrderItem(it, prodsList) : prodsList.find(p => p.id === it.productId || p.id === it.id || p.name === it.name);
              const prodId = matchProd ? matchProd.id : (it.productId || it.id || 'clip-01');
              const prodName = matchProd ? matchProd.name : (it.baseName || it.name);
              const prodImg = it.image || (matchProd ? matchProd.image : 'assets/images/logo.png');
              const revKey = order.id + '_' + prodId;
              const isReviewed = !!reviewedMap[revKey];
              const safeName = (prodName || it.name || '').replace(/'/g, "\\'");
              const safeCust = (order.customerName || '').replace(/'/g, "\\'");
              const safeCol = (it.color || '').replace(/'/g, "\\'");
              const safeSz = (it.size || '').replace(/'/g, "\\'");
              const userRating = (reviewedMap[revKey] && reviewedMap[revKey].rating) ? reviewedMap[revKey].rating : 5;

              return `
                <div class="delivered-item-review-row">
                  <div style="display:flex; align-items:center; gap:0.65rem;">
                    <img src="${prodImg}" alt="${prodName}" style="width:48px; height:48px; border-radius:8px; object-fit:cover; border:1px solid #fbcfe8; flex-shrink:0;">
                    <div>
                      <strong style="font-size:0.86rem; color:var(--pink-950); display:block;">${prodName}</strong>
                      <div style="font-size:0.72rem; color:var(--text-muted); display:flex; flex-wrap:wrap; gap:6px; margin-top:2px;">
                        ${it.color ? `<span>🎨 ${it.color}</span>` : ''}
                        ${it.size ? `<span>📏 ${it.size}</span>` : ''}
                        <span>(Qty: ${it.qty})</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    ${isReviewed 
                      ? `<span style="display:inline-flex; align-items:center; gap:4px; background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; padding:4px 9px; border-radius:999px; font-size:0.75rem; font-weight:700; white-space:nowrap;">✓ Reviewed (${userRating} of 5)</span>`
                      : `<div style="display:flex; flex-direction:column; align-items:flex-end; gap:3px;">
                          <div class="delivered-star-quick-pick" style="display:flex; gap:1px;" title="Rate 1 to 5 Stars">
                            ${[1,2,3,4,5].map(st => `
                              <button type="button" onclick="openProductReviewModal('${prodId}', '${safeName}', '${order.id}', '${safeCust}', '${safeCol}', '${safeSz}', ${st})" title="Rate ${st} of 5" style="background:none; border:none; cursor:pointer; font-size:1.15rem; color:#f59e0b; padding:0 1px; line-height:1;">★</button>
                            `).join('')}
                          </div>
                          <button type="button" class="btn-primary" onclick="openProductReviewModal('${prodId}', '${safeName}', '${order.id}', '${safeCust}', '${safeCol}', '${safeSz}', 5)" style="padding:0.35rem 0.75rem; font-size:0.75rem; background:linear-gradient(135deg, #ec4899, #db2777); display:inline-flex; align-items:center; gap:4px; white-space:nowrap; border-radius:6px;">
                            <span>⭐ Rate &amp; Review (___ of 5)</span>
                          </button>
                        </div>`
                    }
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    })()}

    <!-- Actions -->
    <div style="display:flex; gap:0.6rem; margin-top:1.2rem;">
      <button class="btn-primary" onclick="openOrderInvoice('${order.id}')" style="flex:1; justify-content:center; padding:0.65rem; font-size:0.85rem;">
        <svg class="icon-svg sm" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        <span>View & Print Invoice</span>
      </button>
      <a href="https://wa.me/919994977734?text=Hi%20Her%20Hampers!%20Need%20update%20for%20order%20%23${order.id}" target="_blank" class="btn-secondary" style="flex:1; justify-content:center; padding:0.65rem; font-size:0.85rem; text-decoration:none;">
        <svg class="icon-svg sm" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        <span>WhatsApp Support</span>
      </a>
    </div>
  `;
};

// ========================================================
// POST-ORDER APP RATING & SHOPPING EXPERIENCE
// ========================================================

let currentAppRating = 5;

window.setAppRating = function(stars) {
  currentAppRating = Math.max(1, Math.min(5, stars));
  const container = document.getElementById("appRatingStars");
  if (container) {
    const btns = container.querySelectorAll(".app-star-btn");
    btns.forEach((btn, idx) => {
      const val = idx + 1;
      btn.classList.toggle("active", val <= currentAppRating);
    });
  }

  const label = document.getElementById("appRatingLabel");
  if (label) {
    const descriptors = {
      1: "1 of 5 - Needs Improvement",
      2: "2 of 5 - Fair Experience",
      3: "3 of 5 - Good Experience",
      4: "4 of 5 - Very Good! Loved it",
      5: "5 of 5 - Loved it! ⭐⭐⭐⭐⭐"
    };
    label.textContent = descriptors[currentAppRating] || `${currentAppRating} of 5`;
  }

  const submitBtn = document.getElementById("submitAppRatingBtn");
  if (submitBtn) {
    submitBtn.innerHTML = `<span>Submit App Rating (${currentAppRating} of 5) ⭐</span>`;
  }
};

window.toggleFeedbackTag = function(btn) {
  if (btn) btn.classList.toggle("selected");
};

window.resetAppRatingWidget = function(orderId) {
  const card = document.getElementById("postOrderAppRatingCard");
  if (!card) return;
  card.style.display = "block";
  const successMsg = document.getElementById("appRatingSuccessMsg");
  if (successMsg) successMsg.style.display = "none";

  const submitBtn = document.getElementById("submitAppRatingBtn");
  if (submitBtn) {
    submitBtn.style.display = "flex";
    submitBtn.innerHTML = `<span>Submit App Rating (5 of 5) ⭐</span>`;
  }

  const commentEl = document.getElementById("appRatingComment");
  if (commentEl) {
    commentEl.value = "";
    commentEl.style.display = "block";
  }

  const tagsContainer = document.getElementById("appRatingTags");
  if (tagsContainer) {
    tagsContainer.style.display = "flex";
    const tags = tagsContainer.querySelectorAll(".feedback-tag");
    tags.forEach(t => t.classList.remove("selected"));
  }

  window.setAppRating(5);

  setTimeout(() => {
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 150);
};

window.submitAppRating = function() {
  const selectedTags = [];
  document.querySelectorAll("#appRatingTags .feedback-tag.selected").forEach(t => {
    selectedTags.push(t.textContent.trim());
  });

  const commentEl = document.getElementById("appRatingComment");
  const comment = commentEl ? commentEl.value.trim() : "";

  const appRatingEntry = {
    id: "app-rat-" + Date.now(),
    orderId: lastCreatedOrderId || "GUEST",
    rating: currentAppRating,
    ratingText: `${currentAppRating} of 5`,
    tags: selectedTags,
    comment: comment,
    date: new Date().toISOString().replace('T', ' ').slice(0, 19)
  };

  try {
    const existing = (typeof getStoredAppRatings === 'function') ? getStoredAppRatings() : [];
    existing.unshift(appRatingEntry);
    if (typeof saveStoredAppRatings === 'function') {
      saveStoredAppRatings(existing);
    } else {
      localStorage.setItem("her_hampers_app_ratings", JSON.stringify(existing));
    }
  } catch (err) {
    console.warn("Could not save app rating", err);
  }

  const successMsg = document.getElementById("appRatingSuccessMsg");
  if (successMsg) {
    successMsg.style.display = "block";
    successMsg.innerHTML = `🌸 <strong>Thank you for rating Her Hampers App (${currentAppRating} of 5)!</strong> Your feedback inspires our boutique artisans to create magic!`;
  }

  const submitBtn = document.getElementById("submitAppRatingBtn");
  if (submitBtn) submitBtn.style.display = "none";
  if (commentEl) commentEl.style.display = "none";

  const tagsContainer = document.getElementById("appRatingTags");
  if (tagsContainer) tagsContainer.style.display = "none";

  triggerSparkles();
  showToast(`Thank you for rating our app ${currentAppRating} of 5! 💖`, "success");
};

// ========================================================
// PRODUCT RATING & REVIEWS CONTROLLER
// ========================================================

let currentProductStarRating = 5;

window.setProductStarRating = function(stars) {
  currentProductStarRating = Math.max(1, Math.min(5, stars));
  const hiddenInput = document.getElementById("reviewSelectedRating");
  if (hiddenInput) hiddenInput.value = currentProductStarRating;

  const container = document.getElementById("prodStarPickerRow");
  if (container) {
    const btns = container.querySelectorAll(".prod-star-btn");
    btns.forEach((btn, idx) => {
      const val = idx + 1;
      btn.classList.toggle("active", val <= currentProductStarRating);
    });
  }

  const textEl = document.getElementById("prodStarRatingText");
  if (textEl) {
    const descriptors = {
      1: "1.0 of 5 (Poor quality)",
      2: "2.0 of 5 (Fair)",
      3: "3.0 of 5 (Good product)",
      4: "4.0 of 5 (Very Good! ⭐⭐⭐⭐)",
      5: "5.0 of 5 (Outstanding quality! Loved it! ⭐⭐⭐⭐⭐)"
    };
    textEl.textContent = descriptors[currentProductStarRating] || `${currentProductStarRating}.0 of 5`;
  }

  const submitBtn = document.getElementById("submitProductReviewBtn");
  if (submitBtn) {
    submitBtn.innerHTML = `<span>Submit Product Review (${currentProductStarRating} of 5) 🌸</span>`;
  }
};

window.openProductReviewModal = function(productId, productName, orderId, customerName, chosenColor, chosenSize, initialRating = 5) {
  const modal = document.getElementById("productReviewModal");
  if (!modal) return;

  const prods = typeof currentProducts !== 'undefined' && currentProducts && currentProducts.length ? currentProducts : getStoredProducts();
  const prod = (typeof findProductForOrderItem === 'function')
    ? findProductForOrderItem({ id: productId, name: productName }, prods)
    : (prods.find(p => p.id === productId || p.name === productName) || prods[0]);

  document.getElementById("reviewProdId").value = prod ? prod.id : productId;
  document.getElementById("reviewOrderId").value = orderId || "";

  const variantParts = [];
  if (chosenColor) variantParts.push(`Color: ${chosenColor}`);
  if (chosenSize) variantParts.push(`Size: ${chosenSize}`);
  const variantStr = variantParts.join(" • ");
  document.getElementById("reviewChosenVariant").value = variantStr;

  const titleEl = document.getElementById("reviewProdTitle");
  if (titleEl) titleEl.textContent = prod ? prod.name : productName;

  const thumbEl = document.getElementById("reviewProdThumb");
  if (thumbEl) {
    const targetImg = (chosenColor && typeof getProductImageForColor === "function" && prod)
      ? getProductImageForColor(prod, chosenColor)
      : (prod ? prod.image : 'assets/images/logo.png');
    thumbEl.src = targetImg;
  }

  const orderTagEl = document.getElementById("reviewOrderTag");
  if (orderTagEl) {
    if (orderId) {
      orderTagEl.innerHTML = `<span style="color:#15803d; font-weight:700;">✓ Verified Delivered Order #${orderId}</span>${variantStr ? ` • ${variantStr}` : ''}`;
    } else {
      orderTagEl.innerHTML = `<span>Verified Boutique Purchase</span>${variantStr ? ` • ${variantStr}` : ''}`;
    }
  }

  const nameInput = document.getElementById("reviewerNameInput");
  if (nameInput) {
    nameInput.value = customerName || (orderId ? "Boutique Patron" : "");
  }

  const headlineInput = document.getElementById("reviewHeadlineInput");
  if (headlineInput) headlineInput.value = "";

  const commentInput = document.getElementById("reviewCommentInput");
  if (commentInput) commentInput.value = "";

  window.setProductStarRating(initialRating || 5);
  modal.classList.add("open");
};

window.closeProductReviewModal = function() {
  const modal = document.getElementById("productReviewModal");
  if (modal) modal.classList.remove("open");
};

window.openProductReviewModalFromQV = function() {
  const prodId = window.qvCurrentProductId;
  const prods = typeof currentProducts !== 'undefined' ? currentProducts : getStoredProducts();
  const prod = prods.find(p => p.id === prodId);
  if (!prod) return;
  window.openProductReviewModal(prod.id, prod.name, "", "", window.qvSelectedColor, window.qvSelectedSize, 5);
};

window.handleProductReviewSubmit = function(e) {
  e.preventDefault();

  const prodId = document.getElementById("reviewProdId").value;
  const orderId = document.getElementById("reviewOrderId").value;
  const variant = document.getElementById("reviewChosenVariant").value;
  const rating = Number(document.getElementById("reviewSelectedRating").value || 5);
  const name = document.getElementById("reviewerNameInput").value.trim();
  const title = document.getElementById("reviewHeadlineInput").value.trim();
  const comment = document.getElementById("reviewCommentInput").value.trim();

  const prods = typeof currentProducts !== 'undefined' && currentProducts && currentProducts.length ? currentProducts : getStoredProducts();
  const prod = prods.find(p => p.id === prodId) || ((typeof findProductForOrderItem === 'function') ? findProductForOrderItem({ id: prodId }, prods) : null);
  if (!prod) {
    showToast("Product not found to add review!", "error");
    return;
  }

  // Build review object
  const newRev = {
    id: "rev-" + Date.now(),
    name: name || "Verified Buyer",
    rating: rating,
    ratingText: `${rating} of 5`,
    title: title,
    comment: comment,
    variant: variant || null,
    orderId: orderId || null,
    date: "Just now",
    verified: true,
    avatar: (name ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "VB")
  };

  if (!prod.reviews || !Array.isArray(prod.reviews)) {
    prod.reviews = [];
  }
  prod.reviews.unshift(newRev);
  prod.reviewsCount = prod.reviews.length;

  // Recalculate average rating (__ of 5)
  const sum = prod.reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0);
  prod.rating = Number((sum / prod.reviews.length).toFixed(1));

  // Save to stored products & sync to server disk (data/products.json)
  saveStoredProducts(prods);
  currentProducts = prods;
  window.currentProducts = prods;

  // If submitted for an order item, record reviewed item key
  if (orderId) {
    try {
      const reviewedMap = JSON.parse(localStorage.getItem("her_hampers_reviewed_items") || "{}");
      reviewedMap[orderId + "_" + prod.id] = { rating: rating, date: new Date().toISOString() };
      localStorage.setItem("her_hampers_reviewed_items", JSON.stringify(reviewedMap));
    } catch (err) {}
  }

  // Update product catalog display
  renderProducts();

  // If Quick View modal is open for this product, update it
  if (window.qvCurrentProductId === prod.id) {
    const qvRating = document.getElementById("qvRating");
    if (qvRating) {
      qvRating.innerHTML = `${renderStarsHtml(prod.rating, 14)} <span class="count" style="font-weight: 700; color: var(--pink-950); margin-left: 6px;">${prod.rating} of 5 <span style="font-weight: 500; color: var(--text-muted); font-size: 0.8rem;">(${prod.reviewsCount} Customer Reviews)</span></span>`;
    }
    renderQuickViewReviews(prod);
  }

  // If Track Order modal is open, refresh tracking result
  const trackModal = document.getElementById("trackOrderModal");
  if (trackModal && trackModal.classList.contains("open")) {
    handleTrackSearch();
  }

  // Refresh delivered orders prompt banner
  if (typeof checkDeliveredOrdersAndPromptReview === "function") {
    checkDeliveredOrdersAndPromptReview();
  }

  closeProductReviewModal();
  triggerSparkles();
  showToast(`🌸 Thank you! Your ${rating} of 5 review for ${prod.name} has been published!`, "success");
};

window.renderQuickViewReviews = function(product) {
  if (!product) return;
  const bigRatingEl = document.getElementById("qvBigRatingNumber");
  const countEl = document.getElementById("qvScorecardCount");
  const starsEl = document.getElementById("qvScorecardStars");
  const listEl = document.getElementById("qvReviewsListContainer");
  const subheaderEl = document.getElementById("qvReviewsSubheader");

  const revCount = product.reviewsCount || (product.reviews ? product.reviews.length : 0);
  const ratingVal = product.rating || 5.0;

  if (bigRatingEl) bigRatingEl.textContent = ratingVal;
  if (countEl) countEl.textContent = `Based on ${revCount} verified customer reviews`;
  if (subheaderEl) subheaderEl.textContent = `${revCount} verified boutique patron reviews (${ratingVal} of 5 avg)`;

  if (starsEl) {
    starsEl.innerHTML = renderStarsHtml(ratingVal, 16);
  }

  if (listEl) {
    if (product.reviews && Array.isArray(product.reviews) && product.reviews.length > 0) {
      listEl.innerHTML = product.reviews.map(rev => {
        const starNum = Math.round(Number(rev.rating || 5));
        const starsStr = '★'.repeat(Math.max(1, Math.min(5, starNum)));
        const avatarStr = rev.avatar || (rev.name ? rev.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "VB");
        return `
          <div class="qv-review-item">
            <div class="qv-review-header">
              <div class="qv-reviewer-info">
                <div class="qv-reviewer-avatar">${avatarStr}</div>
                <div>
                  <div class="qv-reviewer-name">
                    <span>${rev.name || 'Verified Buyer'}</span>
                    ${rev.verified ? `<span class="qv-verified-badge">✓ Verified Buyer</span>` : ''}
                  </div>
                  <div class="qv-review-date">${rev.date || 'Recent order'}</div>
                </div>
              </div>
              <div class="qv-review-stars-val">
                <span style="color: #f59e0b;">${starsStr}</span>
                <span><strong>${rev.rating} of 5</strong></span>
              </div>
            </div>
            ${rev.variant ? `<div class="qv-review-variant-pill">🌸 Purchased: ${rev.variant}</div>` : ''}
            ${rev.title ? `<div class="qv-review-title">"${rev.title}"</div>` : ''}
            <div class="qv-review-body">${rev.comment || 'Loving this handcrafted piece!'}</div>
          </div>
        `;
      }).join('');
    } else {
      listEl.innerHTML = `
        <div class="qv-no-reviews-box">
          <div style="font-size: 1.8rem; margin-bottom: 0.35rem;">🌸✨</div>
          <strong style="color: var(--pink-950); font-size: 0.92rem; display: block; margin-bottom: 0.2rem;">Be the First to Review This Piece!</strong>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">Share your honest thoughts about the design, sparkle, and packaging.</p>
          <button type="button" onclick="openProductReviewModalFromQV()" class="btn-primary" style="padding: 0.45rem 1rem; font-size: 0.8rem;">
            <span>✍️ Write a Review</span>
          </button>
        </div>
      `;
    }
  }
};

// ========================================================
// PROACTIVE DELIVERED ORDER RATING & REVIEW PROMPT
// ========================================================

window.checkDeliveredOrdersAndPromptReview = function() {
  const orders = (typeof getStoredOrders === 'function') ? getStoredOrders() : [];
  const deliveredOrders = orders.filter(o => o.status === "Delivered");
  const banner = document.getElementById("deliveredOrderReviewPromptBanner");
  if (!banner) return;

  if (!deliveredOrders.length) {
    banner.style.display = "none";
    return;
  }

  let reviewedMap = {};
  try {
    reviewedMap = JSON.parse(localStorage.getItem('her_hampers_reviewed_items') || '{}');
  } catch (e) {}

  const prodsList = (typeof currentProducts !== 'undefined' && currentProducts && currentProducts.length) ? currentProducts : getStoredProducts();

  // Find first delivered order with unreviewed items
  let pendingOrder = null;
  let unreviewedCount = 0;

  for (const ord of deliveredOrders) {
    if (!ord.items || !ord.items.length) continue;
    const unrev = ord.items.filter(it => {
      const match = (typeof findProductForOrderItem === 'function') ? findProductForOrderItem(it, prodsList) : null;
      const pid = match ? match.id : (it.productId || it.id);
      return !reviewedMap[ord.id + '_' + pid];
    });
    if (unrev.length > 0) {
      pendingOrder = ord;
      unreviewedCount = unrev.length;
      break;
    }
  }

  if (pendingOrder && !sessionStorage.getItem("dismissed_review_banner_" + pendingOrder.id)) {
    banner.style.display = "flex";
    banner.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.65rem; flex:1;">
        <span style="font-size:1.6rem; line-height:1;">📦🌸</span>
        <div style="line-height:1.35;">
          <strong style="color:var(--pink-950); font-size:0.88rem; display:block;">Order #${pendingOrder.id} Delivered!</strong>
          <span style="color:var(--text-secondary); font-size:0.76rem;">Please rate &amp; review your items (${unreviewedCount} item${unreviewedCount > 1 ? 's' : ''} pending).</span>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:0.4rem;">
        <button type="button" class="btn-primary" onclick="openTrackOrderModal('${pendingOrder.id}')" style="padding:0.42rem 0.9rem; font-size:0.78rem; background:linear-gradient(135deg, #ec4899, #db2777); white-space:nowrap; border-radius:999px; box-shadow:0 3px 10px rgba(219,39,119,0.25);">
          ⭐ Rate &amp; Review
        </button>
        <button type="button" onclick="dismissDeliveredReviewBanner('${pendingOrder.id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.2rem; line-height:1; padding:0 4px;" title="Dismiss">&times;</button>
      </div>
    `;
  } else {
    banner.style.display = "none";
  }
};

window.dismissDeliveredReviewBanner = function(orderId) {
  sessionStorage.setItem("dismissed_review_banner_" + orderId, "true");
  const banner = document.getElementById("deliveredOrderReviewPromptBanner");
  if (banner) banner.style.display = "none";
};

// Customer Reviews Testimonials
function renderCustomerReviews() {
  const container = document.getElementById("reviewsContainer");
  if (!container) return;

  container.innerHTML = CUSTOMER_REVIEWS.map(rev => `
    <div class="review-card">
      <div class="review-stars">
        <span class="rating-stars" style="display:inline-flex; align-items:center; gap:2px; color: #f59e0b;">
          <svg class="icon-svg" style="width:14px;height:14px;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <svg class="icon-svg" style="width:14px;height:14px;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <svg class="icon-svg" style="width:14px;height:14px;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <svg class="icon-svg" style="width:14px;height:14px;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <svg class="icon-svg" style="width:14px;height:14px;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </span>
      </div>
      <p class="review-text">"${rev.comment}"</p>
      <div class="reviewer-info">
        <div class="reviewer-avatar">${rev.avatar}</div>
        <div>
          <div class="reviewer-name">${rev.name}</div>
          <div class="reviewer-location">${rev.city} • Verified Buyer</div>
        </div>
      </div>
    </div>
  `).join('');
}

// ========================================================
// HOST ADMIN AUTHENTICATION & GATE LOGIC
// ========================================================

function openHostGateModal() {
  const modal = document.getElementById("hostLoginModal");
  const errorAlert = document.getElementById("hostErrorAlert");
  if (errorAlert) errorAlert.style.display = "none";
  if (modal) {
    // If already logged in, redirect directly to admin page
    if (isHostAuthenticated()) {
      window.location.href = "admin.html";
      return;
    }
    modal.classList.add("open");
    document.getElementById("hostUsernameInput").focus();
  }
}

function closeHostGateModal() {
  const modal = document.getElementById("hostLoginModal");
  if (modal) modal.classList.remove("open");
}

window.handleHostLoginSubmit = function(e) {
  e.preventDefault();
  const usernameInput = document.getElementById("hostUsernameInput");
  const passwordInput = document.getElementById("hostPasswordInput");
  const errorAlert = document.getElementById("hostErrorAlert");
  const modalWindow = document.querySelector(".host-gate-modal");

  const enteredUser = usernameInput.value.trim();
  const enteredPass = passwordInput.value.trim();

  const creds = getHostCredentials();

  // Strict verification check (accepts admin / pinkpassword123 or stored credentials)
  if ((enteredUser === "admin" && enteredPass === "pinkpassword123") || 
      (enteredUser === creds.username && enteredPass === creds.password)) {
    // True host credentials!
    setHostSession(true);
    showToast("Host Verified! Opening Her Hampers Admin Dashboard...", "success");
    modalWindow.classList.remove("error-shake");
    
    setTimeout(() => {
      window.location.href = "admin.html";
    }, 600);
  } else {
    // False credentials - Access denied!
    setHostSession(false);
    errorAlert.style.display = "block";
    errorAlert.textContent = "Access Denied: Invalid Host ID or Password. Restricted to host member only!";
    modalWindow.classList.remove("error-shake");
    // trigger reflow
    void modalWindow.offsetWidth;
    modalWindow.classList.add("error-shake");
    passwordInput.value = "";
    passwordInput.focus();
    showToast("Access Denied: Incorrect Host credentials", "error");
  }
};

// ========================================================
// UI UTILITIES (Toast, Sparkles)
// ========================================================

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  
  let statusBadge = `<svg class="icon-svg sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle></svg>`;
  if (type === "success") statusBadge = `<svg class="icon-svg sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  if (type === "error") statusBadge = `<svg class="icon-svg sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  toast.innerHTML = `<span style="display:inline-flex; align-items:center; color: var(--pink-600);">${statusBadge}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function triggerSparkles() {
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight * 0.8 + 100;
    triggerSparklesAt(x, y);
  }
}

function triggerSparklesAt(x, y) {
  const particle = document.createElement("div");
  particle.className = "sparkle-particle";
  particle.style.left = `${x}px`;
  particle.style.top = `${y}px`;
  document.body.appendChild(particle);

  setTimeout(() => {
    particle.remove();
  }, 800);
}

// ========================================================
// OPENING PAGE: LOGO SELF-FORMING SPLASH CONTROLLER
// ========================================================

let formationTimers = [];

function initOpeningPage() {
  const splash = document.getElementById("openingPageSplash");
  if (!splash) return;

  spawnFloatingPetals();
  startLogoFormationSequence();

  // Auto-transition into boutique after logo has fully formed (4.2 seconds)
  formationTimers.push(setTimeout(() => {
    dismissOpeningPage();
  }, 4200));
}

window.dismissOpeningPage = function() {
  const splash = document.getElementById("openingPageSplash");
  if (splash) {
    splash.classList.add("dismissed");
    splash.style.pointerEvents = "none";
    sessionStorage.setItem("her_hampers_splash_seen", "true");
    clearFormationTimers();
    setTimeout(() => {
      splash.style.display = "none";
    }, 600);
  }
};

window.showOpeningPage = function(e) {
  if (e) e.preventDefault();
  const splash = document.getElementById("openingPageSplash");
  if (splash) {
    splash.classList.remove("dismissed");
    clearFormationTimers();
    spawnFloatingPetals();
    startLogoFormationSequence();
  }
};

window.replayLogoFormation = function() {
  clearFormationTimers();
  startLogoFormationSequence();
};

function clearFormationTimers() {
  formationTimers.forEach(t => clearTimeout(t));
  formationTimers = [];
}

function startLogoFormationSequence() {
  const aura = document.getElementById("stageGlowAura");
  const bgCircle = document.getElementById("vecBgCircle");
  const brushRing = document.getElementById("vecBrushRing");
  const brushRingInner = document.getElementById("vecBrushRingInner");
  const sparkle1 = document.getElementById("vecSparkle1");
  const sparkle2 = document.getElementById("vecSparkle2");
  const sparkle3 = document.getElementById("vecSparkle3");
  const sparkle4 = document.getElementById("vecSparkle4");
  const bagGroup = document.getElementById("vecBagGroup");
  const flowersGroup = document.getElementById("vecFlowersGroup");
  const textHer = document.getElementById("vecTextHer");
  const textSub = document.getElementById("vecTextSub");
  const finalLogo = document.getElementById("stageFinalLogo");
  const shimmer = document.getElementById("stageShimmer");
  const statusLabel = document.getElementById("formationStatusLabel");
  const progressFill = document.getElementById("formationProgressFill");

  // Reset all elements
  [bgCircle, brushRing, brushRingInner, sparkle1, sparkle2, sparkle3, sparkle4, bagGroup, flowersGroup, textHer, textSub].forEach(el => {
    if (el) el.classList.remove("stage-active");
  });
  if (aura) aura.classList.remove("formed");
  if (finalLogo) finalLogo.classList.remove("crystallized");
  if (shimmer) shimmer.classList.remove("shimmering");
  if (progressFill) progressFill.style.width = "0%";

  if (statusLabel) {
    statusLabel.innerHTML = `<span>Beginning the creation of Her...</span>`;
  }

  // Stage 1: Soft Blush Pink Disc Blooms (T = 100ms)
  formationTimers.push(setTimeout(() => {
    if (bgCircle) bgCircle.classList.add("stage-active");
    if (aura) aura.classList.add("formed");
    if (progressFill) progressFill.style.width = "18%";
    if (statusLabel) {
      statusLabel.innerHTML = `<span>Blossoming soft pastel blush aura...</span>`;
    }
    triggerSparkles();
  }, 100));

  // Stage 2: Painterly Circular Brush Ring Tracing (T = 600ms)
  formationTimers.push(setTimeout(() => {
    if (brushRing) brushRing.classList.add("stage-active");
    if (brushRingInner) brushRingInner.classList.add("stage-active");
    if (progressFill) progressFill.style.width = "35%";
    if (statusLabel) {
      statusLabel.innerHTML = `<span>Tracing handcrafted brushstroke ring...</span>`;
    }
  }, 600));

  // Stage 3: Twinkling Stardust Sparkles (T = 1100ms)
  formationTimers.push(setTimeout(() => {
    [sparkle1, sparkle2, sparkle3, sparkle4].forEach(s => {
      if (s) s.classList.add("stage-active");
    });
    if (progressFill) progressFill.style.width = "52%";
    if (statusLabel) {
      statusLabel.innerHTML = `<span>Radiant starlight illuminating emblem...</span>`;
    }
  }, 1100));

  // Stage 4: Boutique Gift Bag Unfolds in 3D (T = 1600ms)
  formationTimers.push(setTimeout(() => {
    if (bagGroup) bagGroup.classList.add("stage-active");
    if (progressFill) progressFill.style.width = "68%";
    if (statusLabel) {
      statusLabel.innerHTML = `<span>Unfolding luxury boutique gift tote bag...</span>`;
    }
  }, 1600));

  // Stage 5: Botanical Roses & Peonies Blossom (T = 2100ms)
  formationTimers.push(setTimeout(() => {
    if (flowersGroup) flowersGroup.classList.add("stage-active");
    if (progressFill) progressFill.style.width = "80%";
    if (statusLabel) {
      statusLabel.innerHTML = `<span>Hand-painted peony & botanical bouquet blooming...</span>`;
    }
  }, 2100));

  // Stage 6: Calligraphic "Her" Ink Script (T = 2500ms)
  formationTimers.push(setTimeout(() => {
    if (textHer) textHer.classList.add("stage-active");
    if (progressFill) progressFill.style.width = "90%";
    if (statusLabel) {
      statusLabel.innerHTML = `<span>Flowing 'Her' calligraphy scripted with love...</span>`;
    }
  }, 2500));

  // Stage 7: Subtitle "MADE WITH LOVE" Reveals (T = 2900ms)
  formationTimers.push(setTimeout(() => {
    if (textSub) textSub.classList.add("stage-active");
    if (progressFill) progressFill.style.width = "96%";
    if (statusLabel) {
      statusLabel.innerHTML = `<span>Presenting 'MADE WITH LOVE' promise...</span>`;
    }
  }, 2900));

  // Stage 8: Shimmer Beam Sweep & Crystallization (T = 3300ms)
  formationTimers.push(setTimeout(() => {
    if (finalLogo) finalLogo.classList.add("crystallized");
    if (shimmer) {
      shimmer.classList.remove("shimmering");
      void shimmer.offsetWidth; // trigger reflow
      shimmer.classList.add("shimmering");
    }
    if (progressFill) progressFill.style.width = "100%";
    if (statusLabel) {
      statusLabel.innerHTML = `<strong>Her • Handcrafted Emblem Perfected!</strong>`;
    }
    triggerSparkles();
    triggerSparkles();
  }, 3300));
}

// Spawn Ambient Floating Petals for Theater
function spawnFloatingPetals() {
  const container = document.getElementById("ambientPetalsContainer");
  if (!container) return;

  container.innerHTML = "";

  for (let i = 0; i < 22; i++) {
    const el = document.createElement("div");
    el.className = "floating-bokeh-petal";
    const size = 10 + Math.random() * 18;
    el.style.width = `${size}px`;
    el.style.height = `${size * 1.3}px`;
    el.style.left = `${Math.random() * 100}%`;
    el.style.top = `${Math.random() * 100}%`;
    el.style.animationDuration = `${6 + Math.random() * 8}s`;
    el.style.animationDelay = `${Math.random() * 4}s`;
    container.appendChild(el);
  }
}

// ========================================================
// SCROLL REVEAL TOPIC ANIMATIONS
// Smoothly triggers entrance animations as topics/sections scroll into view
// ========================================================
function initScrollReveal() {
  const revealElements = document.querySelectorAll(".scroll-reveal");
  if (!revealElements || revealElements.length === 0) return;

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          obs.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.1,
      rootMargin: "0px 0px -30px 0px"
    });

    revealElements.forEach(el => observer.observe(el));
  } else {
    // Fallback for browsers without IntersectionObserver
    revealElements.forEach(el => el.classList.add("revealed"));
  }
}
window.initScrollReveal = initScrollReveal;

// Floating Back to Top Button on Mobile Scroll
window.addEventListener("scroll", () => {
  const btn = document.getElementById("mobileBackToTopBtn");
  if (btn) {
    btn.classList.toggle("visible", window.scrollY > 350);
  }
}, { passive: true });
