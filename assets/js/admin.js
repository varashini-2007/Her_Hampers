/**
 * Her Hampers - Host Admin Management Logic
 * Strict authentication, inventory CRUD, order tracking, and custom hamper fulfillment.
 */

let adminProducts = [];
let adminOrders = [];
let adminAppRatings = [];

const ADMIN_CAT_LABELS = {
  "boys accessories": "Boys Accessories (Kaapu & Chains)",
  "lighting toys": "Lighting Toys",
  "kids": "Kids (Bubbles & Cars)",
  "mehandhi": "Mehandhi & Stickers",
  "keychains": "Camera & Keychains",
  "clips": "Clips & Hairpins",
  "scrunchies": "Silk Scrunchies",
  "chain": "Chains & Chokers",
  "jimmiki": "Temple Jimmiki",
  "cute earrings": "Cute Earrings",
  "kolusu": "Silver Kolusu",
  "evil eye kolusu": "Evil Eye Kolusu",
  "ring for boys": "Rings for Boys",
  "ring for girls": "Rings for Girls",
  "nail polish": "Salon Gloss Nail Polish",
  "glass bangles": "Glass Bangles",
  "raindrop bangles": "Raindrop Bangles",
  "hampers": "Pre-made Gift Hampers"
};

document.addEventListener("DOMContentLoaded", () => {
  checkHostAuth();
});

// Check if current user is verified host
function checkHostAuth() {
  const lockoutScreen = document.getElementById("hostLockoutScreen");
  const adminPortal = document.getElementById("hostAdminPortal");
  const hostUserDisplay = document.getElementById("currentHostUserDisplay");

  if (isHostAuthenticated()) {
    // User is the Host!
    lockoutScreen.style.display = "none";
    adminPortal.style.display = "block";
    const creds = getHostCredentials();
    if (hostUserDisplay) hostUserDisplay.textContent = creds.username;
    
    // Load data
    loadAdminData();
    setupAdminListeners();
  } else {
    // User is NOT authenticated! Lock screen
    lockoutScreen.style.display = "flex";
    adminPortal.style.display = "none";
    document.getElementById("adminUsername").focus();
  }
}

// Direct Admin Login on Lockout screen
window.handleDirectAdminLogin = function(e) {
  e.preventDefault();
  const username = document.getElementById("adminUsername").value.trim();
  const password = document.getElementById("adminPassword").value.trim();
  const errorAlert = document.getElementById("adminPageErrorAlert");
  const lockoutBox = document.querySelector(".host-lockout-box");

  const creds = getHostCredentials();

  if ((username === "admin" && password === "pinkpassword123") || 
      (username === creds.username && password === creds.password)) {
    // Correct Host Member credentials!
    setHostSession(true);
    errorAlert.style.display = "none";
    lockoutBox.classList.remove("error-shake");
    showAdminToast("Welcome Host! Dashboard Unlocked", "success");
    checkHostAuth();
  } else {
    // Access Denied!
    setHostSession(false);
    errorAlert.style.display = "block";
    errorAlert.textContent = "Access Denied: Invalid Host Member ID or Password!";
    lockoutBox.classList.remove("error-shake");
    void lockoutBox.offsetWidth;
    lockoutBox.classList.add("error-shake");
    document.getElementById("adminPassword").value = "";
    document.getElementById("adminPassword").focus();
    showAdminToast("Host authentication failed", "error");
  }
};

// Host Logout
window.handleHostLogout = function() {
  setHostSession(false);
  showAdminToast("Host logged out safely", "info");
  setTimeout(() => {
    window.location.href = "index.html";
  }, 500);
};

// Load and Render Admin Data
function loadAdminData() {
  adminProducts = getStoredProducts();
  adminOrders = getStoredOrders();
  adminAppRatings = (typeof getStoredAppRatings === 'function') ? getStoredAppRatings() : [];

  renderAdminStats();
  renderAdminProductsTable();
  renderAdminOrdersTable();
  renderCustomHamperRequests();
  renderAdminAppRatings();
  renderAdminProductReviews();

  // Populate settings username
  const creds = getHostCredentials();
  const newHostUser = document.getElementById("newHostUsername");
  if (newHostUser) newHostUser.value = creds.username;
}

function setupAdminListeners() {
  // Product Search & Filter
  const prodSearch = document.getElementById("adminProductSearch");
  const catFilter = document.getElementById("adminCategoryFilter");

  if (prodSearch) prodSearch.addEventListener("input", renderAdminProductsTable);
  if (catFilter) catFilter.addEventListener("change", renderAdminProductsTable);

  // Order Search & Filter
  const orderSearch = document.getElementById("adminOrderSearch");
  const orderStatusFilter = document.getElementById("adminOrderStatusFilter");

  if (orderSearch) orderSearch.addEventListener("input", renderAdminOrdersTable);
  if (orderStatusFilter) orderStatusFilter.addEventListener("change", renderAdminOrdersTable);

  // Listen for background server disk synchronization
  window.addEventListener("catalogUpdated", () => {
    adminProducts = getStoredProducts();
    renderAdminProductsTable();
    renderAdminStats();
    renderAdminProductReviews();
    updateDiskStatusBadge();
  });

  window.addEventListener("ordersUpdated", () => {
    adminOrders = getStoredOrders();
    renderAdminOrdersTable();
    renderAdminStats();
    updateDiskStatusBadge();
  });

  window.addEventListener("appRatingsUpdated", () => {
    adminAppRatings = (typeof getStoredAppRatings === 'function') ? getStoredAppRatings() : [];
    renderAdminAppRatings();
    renderAdminStats();
    updateDiskStatusBadge();
  });

  window.addEventListener("storage", (e) => {
    if (e.key === "herhampers_app_ratings_v1") {
      adminAppRatings = (typeof getStoredAppRatings === 'function') ? getStoredAppRatings() : [];
      renderAdminAppRatings();
      renderAdminStats();
    } else if (e.key === "herhampers_products_v3") {
      adminProducts = getStoredProducts();
      renderAdminProductsTable();
      renderAdminProductReviews();
      renderAdminStats();
    }
  });

  updateDiskStatusBadge();

  // Setup drag and drop for image upload dropzones
  setupDropZones();

  // Live update color tags on photo gallery when typing colors
  const quickColorsInput = document.getElementById("quickProdColors");
  if (quickColorsInput) {
    quickColorsInput.addEventListener("input", () => renderProductGallery('quick'));
  }
  const editColorsInput = document.getElementById("prodColorsInput");
  const editSizesInput = document.getElementById("prodSizesInput");
  const editOutColorsInput = document.getElementById("prodOutOfStockColorsInput");
  const editOutSizesInput = document.getElementById("prodOutOfStockSizesInput");

  if (editColorsInput) {
    editColorsInput.addEventListener("input", () => {
      renderProductGallery('edit');
      if (typeof renderModalVariantToggles === 'function') renderModalVariantToggles();
    });
  }
  if (editSizesInput) {
    editSizesInput.addEventListener("input", () => {
      if (typeof renderModalVariantToggles === 'function') renderModalVariantToggles();
    });
  }
  if (editOutColorsInput) {
    editOutColorsInput.addEventListener("input", () => {
      if (typeof renderModalVariantToggles === 'function') renderModalVariantToggles();
    });
  }
  if (editOutSizesInput) {
    editOutSizesInput.addEventListener("input", () => {
      if (typeof renderModalVariantToggles === 'function') renderModalVariantToggles();
    });
  }
}

// Switch between Admin Tabs
window.switchAdminTab = function(tabId, btn) {
  const contents = document.querySelectorAll(".admin-tab-content");
  contents.forEach(c => c.style.display = "none");

  const target = document.getElementById(tabId);
  if (target) target.style.display = "block";

  const tabButtons = document.querySelectorAll(".admin-tab-btn");
  tabButtons.forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
};

// Calculate and render stats & live order notifications
function renderAdminStats() {
  const totalRevenue = adminOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = adminOrders.length;
  const totalProducts = adminProducts.length;
  const pendingOrders = adminOrders.filter(o => o.status === "Packed" || o.status === "Pending").length;

  const revEl = document.getElementById("statRevenue");
  if (revEl) revEl.textContent = `₹${totalRevenue.toLocaleString()}`;
  const ordEl = document.getElementById("statOrdersCount");
  if (ordEl) ordEl.textContent = totalOrders;
  const prodEl = document.getElementById("statProductsCount");
  if (prodEl) prodEl.textContent = totalProducts;
  const pendEl = document.getElementById("statPendingCount");
  if (pendEl) pendEl.textContent = pendingOrders;

  // Live Orders Notification Updates
  const headerBadge = document.getElementById("adminHeaderNotifBadge");
  if (headerBadge) {
    headerBadge.textContent = pendingOrders;
    headerBadge.style.display = "inline-flex";
    if (pendingOrders > 0) {
      headerBadge.style.background = "#e11d48";
    } else {
      headerBadge.style.background = "#be185d";
    }
  }

  const tabBadge = document.getElementById("adminOrdersTabBadge");
  if (tabBadge) {
    tabBadge.textContent = pendingOrders > 0 ? `${pendingOrders} Pending` : "0";
    tabBadge.className = `admin-tab-badge ${pendingOrders > 0 ? 'has-pending' : ''}`;
  }

  const highlightCount = document.getElementById("notifPendingCountHighlight");
  if (highlightCount) {
    highlightCount.textContent = `${pendingOrders} pending order${pendingOrders === 1 ? '' : 's'}`;
  }

  const pendingPill = document.getElementById("ordersNotifPendingPill");
  if (pendingPill) {
    pendingPill.textContent = `${pendingOrders} Orders To Pack`;
  }

  const totalPill = document.getElementById("ordersNotifTotalPill");
  if (totalPill) {
    totalPill.textContent = `${totalOrders} Total Orders`;
  }

  const notifDesc = document.getElementById("adminOrdersNotifDesc");
  if (notifDesc) {
    if (pendingOrders > 0) {
      notifDesc.innerHTML = `🔔 <strong>Urgent Attention:</strong> You have <strong>${pendingOrders} new/pending orders</strong> requiring packaging, ribbon sealing, and dispatch verification.`;
    } else {
      notifDesc.innerHTML = `✓ <strong>All Caught Up:</strong> All ${totalOrders} customer orders are fulfilled and dispatched!`;
    }
  }

  const reviewsTabBadge = document.getElementById("adminReviewsTabBadge");
  if (reviewsTabBadge) {
    const totalAppRatings = adminAppRatings ? adminAppRatings.length : 0;
    const totalProdReviews = adminProducts.reduce((sum, p) => sum + (Array.isArray(p.reviews) ? p.reviews.length : 0), 0);
    reviewsTabBadge.textContent = totalAppRatings + totalProdReviews;
  }
}

// Render Products Table
function renderAdminProductsTable() {
  const tbody = document.getElementById("adminProductsTableBody");
  if (!tbody) return;

  const searchQuery = (document.getElementById("adminProductSearch")?.value || "").toLowerCase().trim();
  const categoryFilter = document.getElementById("adminCategoryFilter")?.value || "all";

  let filtered = adminProducts.filter(item => {
    const matchesCat = categoryFilter === "all" || item.category === categoryFilter;
    const matchesQuery = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery) || 
      item.category.toLowerCase().includes(searchQuery);
    return matchesCat && matchesQuery;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">No products found in this filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const isHamperActive = p.inHamperBuilder !== false && p.category !== 'hampers';

    return `
      <tr>
        <td>
          <img src="${p.image}" alt="${p.name}" class="table-thumb">
        </td>
        <td>
          <strong>${p.name}</strong>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 3px;">${p.id}</div>
          ${(p.colors && p.colors.length > 0) ? `
            <div style="margin-top: 3px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: var(--pink-950); display: block; margin-bottom: 2px;">🎨 Colours (Click to Strike-Out):</span>
              <div style="display: flex; flex-wrap: wrap; gap: 3px; align-items: center;">
                ${p.colors.map(col => {
                  const isOut = (p.outOfStockColors || []).includes(col);
                  const hex = (typeof getColorHex === 'function') ? getColorHex(col) : '#f472b6';
                  return `
                    <button type="button" onclick="toggleVariantStockInline('${p.id}', 'color', '${col.replace(/'/g, "\\'")}')" 
                      title="${col}: ${isOut ? 'Currently OUT OF STOCK (Click to Restock)' : 'Currently IN STOCK (Click to Strike-out)'}"
                      style="display: inline-flex; align-items: center; gap: 3px; font-size: 0.68rem; font-weight: 700; padding: 1.5px 5px; border-radius: 4px; border: 1px solid ${isOut ? '#ef4444' : 'var(--pink-200)'}; background: ${isOut ? '#fee2e2' : '#fff'}; color: ${isOut ? '#b91c1c' : 'var(--pink-950)'}; cursor: pointer; text-decoration: ${isOut ? 'line-through' : 'none'};">
                      <span style="width: 7px; height: 7px; border-radius: 50%; background: ${hex}; display: inline-block;"></span>
                      ${col} <span style="font-size: 0.62rem; margin-left: 2px;">${isOut ? '🚫' : '✓'}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}
          ${(p.sizes && p.sizes.length > 0) ? `
            <div style="margin-top: 3px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: var(--pink-950); display: block; margin-bottom: 2px;">📏 Sizes (Click to Strike-Out):</span>
              <div style="display: flex; flex-wrap: wrap; gap: 3px; align-items: center;">
                ${p.sizes.map(sz => {
                  const isOut = (p.outOfStockSizes || []).includes(sz);
                  return `
                    <button type="button" onclick="toggleVariantStockInline('${p.id}', 'size', '${sz.replace(/'/g, "\\'")}')" 
                      title="${sz}: ${isOut ? 'Currently OUT OF STOCK (Click to Restock)' : 'Currently IN STOCK (Click to Strike-out)'}"
                      style="font-size: 0.68rem; font-weight: 700; padding: 1.5px 5px; border-radius: 4px; border: 1px solid ${isOut ? '#ef4444' : 'var(--pink-200)'}; background: ${isOut ? '#fee2e2' : '#fff'}; color: ${isOut ? '#b91c1c' : 'var(--pink-950)'}; cursor: pointer; text-decoration: ${isOut ? 'line-through' : 'none'};">
                      ${sz} <span style="font-size: 0.62rem; margin-left: 2px;">${isOut ? '🚫' : '✓'}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}
        </td>
        <td>
          <span class="product-badge pink" style="position: static; font-size: 0.72rem;">${ADMIN_CAT_LABELS[p.category] || p.category}</span>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <span style="font-weight: 700; color: var(--pink-900);">₹</span>
            <input type="number" id="inlinePrice-${p.id}" value="${p.price}" min="1" 
              style="width: 75px; padding: 0.3rem 0.4rem; font-size: 0.88rem; font-weight: 700; border: 1.5px solid var(--pink-300); border-radius: 6px; background: #fffdfd;"
              title="Change amount / price in ₹">
            <button class="btn-action" style="padding: 0.3rem 0.55rem; background: var(--pink-100); border-color: var(--pink-300); font-weight: 700;" 
              onclick="quickUpdateProductPrice('${p.id}')" title="Save new amount">
              Save
            </button>
          </div>
        </td>
        <td style="color: var(--text-muted);">${p.originalPrice ? `₹${p.originalPrice}` : '-'}</td>
        <td>
          ${p.stock <= 0 ? `
            <span style="background: #fee2e2; color: #b91c1c; padding: 0.2rem 0.55rem; border-radius: 999px; font-weight: 700; font-size: 0.72rem; border: 1px solid #fca5a5; display: inline-block;">
              0 (Stock Out)
            </span>
          ` : `
            <span style="font-weight: 700; color: ${p.stock < 10 ? '#f59e0b' : '#10b981'};">
              ${p.stock} units
            </span>
          `}
        </td>
        <td>${p.badge ? `<span class="product-badge gold" style="position: static; font-size: 0.7rem;">${p.badge}</span>` : '-'}</td>
        <td>
          ${p.stock <= 0 ? `
            <span style="color: #b91c1c; font-size: 0.73rem; font-weight: 700; background: #fff1f2; padding: 0.2rem 0.5rem; border-radius: 6px; border: 1px dashed #fca5a5; display: inline-block;" title="Auto-hidden from custom hamper builder due to 0 stock">
              Hidden (0 Stock)
            </span>
          ` : `
            <button class="btn-action" style="background: ${isHamperActive ? '#ecfdf5' : '#f3f4f6'}; color: ${isHamperActive ? '#065f46' : '#6b7280'}; border-color: ${isHamperActive ? '#a7f3d0' : '#d1d5db'}; font-weight: 700; font-size: 0.74rem;" 
              onclick="toggleProductHamperStatus('${p.id}')" title="Click to toggle availability in custom hamper builder">
              ${isHamperActive ? 'Active' : 'Disabled'}
            </button>
          `}
        </td>
        <td>
          <div class="action-btn-group">
            <button class="btn-action" style="background: var(--pink-600); color: white; border-color: transparent;" onclick="openEditProductModal('${p.id}')" title="Alter product details & amount">
              Alter / Edit
            </button>
            <button class="btn-action delete" onclick="deleteProduct('${p.id}')" title="Remove product from store">
              Remove
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Toggle product in Hamper Builder
window.toggleProductHamperStatus = function(id) {
  const p = adminProducts.find(item => item.id === id);
  if (!p) return;
  p.inHamperBuilder = !(p.inHamperBuilder !== false);
  saveStoredProducts(adminProducts);
  renderAdminProductsTable();
  showAdminToast(`Hamper Builder: "${p.name}" is now ${p.inHamperBuilder ? 'Active' : 'Disabled'}`, "success");
};

// Quick alter product price / amount directly from table
window.quickUpdateProductPrice = function(id) {
  const input = document.getElementById(`inlinePrice-${id}`);
  if (!input) return;
  const newPrice = parseInt(input.value, 10);
  if (isNaN(newPrice) || newPrice <= 0) {
    showAdminToast("Please enter a valid amount greater than 0", "error");
    return;
  }
  const p = adminProducts.find(item => item.id === id);
  if (p) {
    const oldPrice = p.price;
    p.price = newPrice;
    saveStoredProducts(adminProducts);
    renderAdminProductsTable();
    renderAdminStats();
    showAdminToast(`Amount for "${p.name}" updated to ₹${newPrice}`, "success");
  }
};

// Toggle color or size stock status inline directly from admin products table
window.toggleVariantStockInline = function(productId, type, value) {
  const p = adminProducts.find(item => item.id === productId);
  if (!p) return;

  if (type === 'color') {
    if (!Array.isArray(p.outOfStockColors)) p.outOfStockColors = [];
    const idx = p.outOfStockColors.indexOf(value);
    if (idx > -1) {
      p.outOfStockColors.splice(idx, 1);
      showAdminToast(`"${value}" restocked (In Stock) for "${p.name}"!`, "success");
    } else {
      p.outOfStockColors.push(value);
      showAdminToast(`"${value}" marked OUT OF STOCK (Striked Out) for "${p.name}"!`, "info");
    }
  } else if (type === 'size') {
    if (!Array.isArray(p.outOfStockSizes)) p.outOfStockSizes = [];
    const idx = p.outOfStockSizes.indexOf(value);
    if (idx > -1) {
      p.outOfStockSizes.splice(idx, 1);
      showAdminToast(`Size "${value}" restocked (In Stock) for "${p.name}"!`, "success");
    } else {
      p.outOfStockSizes.push(value);
      showAdminToast(`Size "${value}" marked OUT OF STOCK (Striked Out) for "${p.name}"!`, "info");
    }
  }

  saveStoredProducts(adminProducts);
  renderAdminProductsTable();
};

// Render modal variant stock toggles
window.renderModalVariantToggles = function() {
  const container = document.getElementById("modalVariantStockToggles");
  if (!container) return;

  const colorsInput = document.getElementById("prodColorsInput");
  const sizesInput = document.getElementById("prodSizesInput");
  const outColorsInput = document.getElementById("prodOutOfStockColorsInput");
  const outSizesInput = document.getElementById("prodOutOfStockSizesInput");

  const colors = colorsInput && colorsInput.value ? colorsInput.value.split(',').map(c => c.trim()).filter(Boolean) : [];
  const sizes = sizesInput && sizesInput.value ? sizesInput.value.split(',').map(s => s.trim()).filter(Boolean) : [];
  const outColors = outColorsInput && outColorsInput.value ? outColorsInput.value.split(',').map(c => c.trim()).filter(Boolean) : [];
  const outSizes = outSizesInput && outSizesInput.value ? outSizesInput.value.split(',').map(s => s.trim()).filter(Boolean) : [];

  if (colors.length === 0 && sizes.length === 0) {
    container.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted);">Enter colours or sizes above to toggle their stock status.</span>`;
    return;
  }

  let html = '';
  if (colors.length > 0) {
    html += `
      <div style="margin-bottom: 6px;">
        <span style="font-size: 0.72rem; font-weight: 700; color: #7f1d1d; display: block; margin-bottom: 3px;">Colours (Click to Strike-Out):</span>
        <div style="display:flex; flex-wrap:wrap; gap:4px;">
          ${colors.map(col => {
            const isOut = outColors.includes(col);
            const hex = (typeof getColorHex === 'function') ? getColorHex(col) : '#f472b6';
            return `
              <button type="button" onclick="toggleModalVariantStock('color', '${col.replace(/'/g, "\\'")}')"
                style="display:inline-flex; align-items:center; gap:4px; font-size:0.72rem; font-weight:700; padding:2px 7px; border-radius:4px; border:1.5px solid ${isOut ? '#ef4444' : '#10b981'}; background:${isOut ? '#fee2e2' : '#ecfdf5'}; color:${isOut ? '#b91c1c' : '#065f46'}; cursor:pointer; text-decoration:${isOut ? 'line-through' : 'none'};">
                <span style="width:8px; height:8px; border-radius:50%; background:${hex}; display:inline-block;"></span>
                <span>${col}</span>
                <span>${isOut ? '🚫 Out' : '✓ In'}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  if (sizes.length > 0) {
    html += `
      <div>
        <span style="font-size: 0.72rem; font-weight: 700; color: #7f1d1d; display: block; margin-bottom: 3px;">Sizes (Click to Strike-Out):</span>
        <div style="display:flex; flex-wrap:wrap; gap:4px;">
          ${sizes.map(sz => {
            const isOut = outSizes.includes(sz);
            return `
              <button type="button" onclick="toggleModalVariantStock('size', '${sz.replace(/'/g, "\\'")}')"
                style="font-size:0.72rem; font-weight:700; padding:2px 7px; border-radius:4px; border:1.5px solid ${isOut ? '#ef4444' : '#10b981'}; background:${isOut ? '#fee2e2' : '#ecfdf5'}; color:${isOut ? '#b91c1c' : '#065f46'}; cursor:pointer; text-decoration:${isOut ? 'line-through' : 'none'};">
                <span>${sz}</span>
                <span>${isOut ? '🚫 Out' : '✓ In'}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
};

window.toggleModalVariantStock = function(type, value) {
  if (type === 'color') {
    const input = document.getElementById("prodOutOfStockColorsInput");
    if (!input) return;
    let list = input.value ? input.value.split(',').map(c => c.trim()).filter(Boolean) : [];
    const idx = list.indexOf(value);
    if (idx > -1) {
      list.splice(idx, 1);
    } else {
      list.push(value);
    }
    input.value = list.join(', ');
  } else if (type === 'size') {
    const input = document.getElementById("prodOutOfStockSizesInput");
    if (!input) return;
    let list = input.value ? input.value.split(',').map(s => s.trim()).filter(Boolean) : [];
    const idx = list.indexOf(value);
    if (idx > -1) {
      list.splice(idx, 1);
    } else {
      list.push(value);
    }
    input.value = list.join(', ');
  }
  renderModalVariantToggles();
};

// Render Customer Orders Table
function renderAdminOrdersTable() {
  const tbody = document.getElementById("adminOrdersTableBody");
  if (!tbody) return;

  const searchQuery = (document.getElementById("adminOrderSearch")?.value || "").toLowerCase().trim();
  const statusFilter = document.getElementById("adminOrderStatusFilter")?.value || "all";

  let filtered = adminOrders.filter(order => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesQuery = !searchQuery || 
      order.id.toLowerCase().includes(searchQuery) ||
      order.customerName.toLowerCase().includes(searchQuery) ||
      order.phone.toLowerCase().includes(searchQuery);
    return matchesStatus && matchesQuery;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No customer orders found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(order => {
    const itemsDetailHtml = order.items.map(i => {
      let customPhotosHtml = '';
      if (i.isCustom && i.details && i.details.customRequestedItems) {
        customPhotosHtml = i.details.customRequestedItems.map(ci => {
          const photoUrl = typeof ci === 'object' ? ci.photo : null;
          const ciName = typeof ci === 'object' ? ci.name : ci;
          if (photoUrl) {
            return `
              <div style="display:inline-flex; align-items:center; gap:5px; margin-top:3px; background:#fff; padding:2px 6px; border-radius:4px; border:1px solid #fbcfe8;">
                <img src="${photoUrl}" alt="${ciName}" style="width:26px; height:26px; object-fit:cover; border-radius:3px; cursor:pointer;" onclick="openAdminPhotoModal('${photoUrl}', '${encodeURIComponent(ciName)}')">
                <span style="font-size:0.72rem; color:#be185d; cursor:pointer; font-weight:700;" onclick="openAdminPhotoModal('${photoUrl}', '${encodeURIComponent(ciName)}')">📸 Photo (${ciName})</span>
              </div>
            `;
          }
          return '';
        }).join('');
      }

      let variantBadge = '';
      if (i.color || i.size) {
        const rawShort = i.shortName || (i.name.toLowerCase().includes('bangle') ? 'Bangles' : i.name.split(' ')[0]);
        const shortFormat = (i.shortName ? i.shortName.replace(/\s*\(/g, '(') : `${rawShort}${i.color ? '(' + i.color + ')' : ''}`).toLowerCase();
        variantBadge = `
          <div style="margin-top: 3px;">
            <span style="display:inline-block; background:#ffe4e6; color:#9f1239; border:1.5px solid #fda4af; padding:2px 8px; border-radius:6px; font-size:0.76rem; font-weight:800; letter-spacing:0.3px;">
              🏷️ ${shortFormat}
            </span>
            <span style="display:inline-block; background:#fce7f3; color:#9d174d; border:1px solid #fbcfe8; padding:1px 6px; border-radius:4px; font-size:0.72rem; font-weight:700; margin-left:3px;">
              ${i.color ? `🎨 ${i.color}` : ''}${i.color && i.size ? ' • ' : ''}${i.size ? `📏 ${i.size}` : ''}
            </span>
          </div>
        `;
      }

      return `<div style="margin-bottom:6px; line-height:1.45;">• <strong>${i.name}</strong> <span style="color:#64748b; font-size:0.75rem;">(x${i.qty})</span> ${variantBadge}${customPhotosHtml}</div>`;
    }).join('');

    return `
      <tr>
        <td>
          <strong style="color: var(--pink-800);">#${order.id}</strong>
        </td>
        <td>
          <div style="font-weight: 700;">${order.customerName}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${order.phone}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${order.email}</div>
        </td>
        <td style="max-width: 220px; font-size: 0.82rem;">
          ${order.state ? `<div style="margin-bottom:4px;"><span style="background:#fce7f3; color:#9d174d; font-size:0.72rem; font-weight:700; padding:2px 7px; border-radius:4px; border:1px solid #fbcfe8;">📍 ${order.state} (Ship: ₹${order.shippingFee !== undefined ? order.shippingFee : (order.state.toLowerCase().includes('tamil') ? 70 : 100)})</span></div>` : ''}
          <div>${order.address}</div>
        </td>
        <td style="max-width: 260px; font-size: 0.82rem;">${itemsDetailHtml}</td>
        <td>
          <strong style="color: var(--pink-900);">₹${order.total}</strong>
          ${order.discountAmount ? `<div style="font-size:0.7rem; color:#15803d; font-weight:600;">Saved ₹${order.discountAmount} (${order.discountCode || 'PROMO'})</div>` : ''}
        </td>
        <td>
          ${(() => {
            const pm = order.paymentMethod || 'UPI';
            let badgeStyle = 'background: #fdf2f8; color: #db2777; border: 1px solid #fbcfe8;';
            let icon = '⚡';
            if (pm.toLowerCase().includes('razorpay')) {
              badgeStyle = 'background: #0c2340; color: #38ef7d; border: 1px solid #1e3a5f;';
              icon = '⚡';
            } else if (pm.toLowerCase().includes('card')) {
              badgeStyle = 'background: #ede9fe; color: #5b21b6; border: 1px solid #ddd6fe;';
              icon = '💳';
            } else if (pm.toLowerCase().includes('netbank')) {
              badgeStyle = 'background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;';
              icon = '🏦';
            } else {
              badgeStyle = 'background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;';
              icon = '📱';
            }
            return `
              <span style="font-size: 0.74rem; font-weight: 700; ${badgeStyle} padding: 0.2rem 0.55rem; border-radius: 4px; display:inline-flex; align-items:center; gap:3px;">
                <span>${icon}</span>
                <span>${pm}</span>
              </span>
              ${order.upiRef ? `<div style="font-size:0.68rem; font-family:monospace; color:var(--text-muted); margin-top:3px; word-break:break-all;">Ref: <strong>${order.upiRef}</strong></div>` : ''}
            `;
          })()}
        </td>
        <td style="font-size: 0.78rem; color: var(--text-muted);">${order.date}</td>
        <td>
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <select class="status-select" onchange="updateOrderStatus('${order.id}', this.value)">
              <option value="Packed" ${order.status === 'Packed' ? 'selected' : ''}>Packed</option>
              <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
            <button class="btn-primary" onclick="openAdminOrderInvoice('${order.id}')" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; white-space:nowrap;" title="Print Packing Slip & Tax Invoice">
              📄 Invoice
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Update Order Status
window.updateOrderStatus = function(orderId, newStatus) {
  const order = adminOrders.find(o => o.id === orderId);
  if (order) {
    order.status = newStatus;
    saveStoredOrders(adminOrders);
    renderAdminStats();
    showAdminToast(`Order #${orderId} status updated to "${newStatus}"`, "success");
  }
};

// Host Tax Invoice Viewer & Printer
window.openAdminOrderInvoice = function(orderId) {
  const order = adminOrders.find(o => o.id === orderId);
  if (!order) {
    showAdminToast("Order not found", "error");
    return;
  }

  const area = document.getElementById("adminInvoicePrintableArea");
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
    let varInfo = '';
    if (it.color || it.size) {
      const shortBadge = it.shortName ? `<span style="background:#ffe4e6; color:#9f1239; border:1px solid #fda4af; padding:1px 6px; border-radius:4px; margin-right:4px;">🏷️ ${it.shortName}</span>` : '';
      varInfo = `<div style="font-size:0.75rem; color:#be185d; font-weight:700; margin-top:2px;">
        ${shortBadge}${it.color ? '🎨 Colour: ' + it.color : ''}${it.color && it.size ? ' &nbsp;|&nbsp; ' : ''}${it.size ? '📏 Size: ' + it.size : ''}
      </div>`;
    }
    return `
      <tr>
        <td style="width: 35px; text-align: center;">${idx + 1}</td>
        <td>
          <strong>${it.name}</strong>
          ${varInfo}
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
        <span class="invoice-tag">DISPATCH & PACKING SLIP</span>
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
        <div style="font-size:0.75rem; font-weight:700; color:var(--pink-800); text-transform:uppercase; margin-bottom:4px;">Payment & Fulfillment:</div>
        <div style="font-size:0.85rem;">Payment Method: <strong>${order.paymentMethod}</strong></div>
        <div style="font-size:0.85rem; font-family:monospace; margin-top:2px;">Txn Ref / UTR: <strong>${order.upiRef || 'PAID-OK'}</strong></div>
        <div style="font-size:0.85rem; margin-top:2px;">Estimated Delivery: <strong>3 - 7 Working Days</strong></div>
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
        <strong>Dispatch Notes:</strong>
        <p style="margin-top:4px; font-size:0.8rem; line-height:1.4;">
          Customer Notes: "${order.notes || 'Handle with luxury care'}"
        </p>
        <div style="margin-top:8px; font-size:0.75rem; color:var(--text-muted);">
          Verified for dispatch from Her Hampers Central Boutique Fulfillment Studio.
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
        <span>BOUTIQUE DISPATCH</span>
      </div>
      <div style="text-align: right;">
        <div style="font-family:'Great Vibes',cursive; font-size:1.8rem; color:var(--pink-700);">Host Member</div>
        <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Authorized Store Manager Verification</div>
      </div>
    </div>
  `;

  document.getElementById("adminInvoiceModal").classList.add("open");
};

window.closeAdminInvoiceModal = function() {
  const modal = document.getElementById("adminInvoiceModal");
  if (modal) modal.classList.remove("open");
};

// Render Custom Hamper Requests
function renderCustomHamperRequests() {
  const container = document.getElementById("customHamperCardsList");
  if (!container) return;

  const customOrders = [];
  adminOrders.forEach(o => {
    o.items.forEach(item => {
      if (item.isCustom || (item.name && item.name.includes("Custom Hamper"))) {
        customOrders.push({
          orderId: o.id,
          customer: o.customerName,
          phone: o.phone,
          date: o.date,
          status: o.status,
          item: item
        });
      }
    });
  });

  if (customOrders.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">
        No bespoke hamper orders yet. Custom hampers curated by customers will appear here!
      </div>
    `;
    return;
  }

  container.innerHTML = customOrders.map(c => {
    const details = c.item.details || {};
    const itemsList = details.items ? details.items.map(i => `<li>• ${i}</li>`).join('') : '<li>Assorted Accessories</li>';
    const customItemsList = details.customRequestedItems && details.customRequestedItems.length ? details.customRequestedItems.map(ci => {
      const ciName = typeof ci === 'object' ? ci.name : ci;
      const ciDetails = typeof ci === 'object' ? ci.details : '';
      const ciPrice = typeof ci === 'object' ? ci.price : '';
      const ciPhoto = typeof ci === 'object' ? ci.photo : null;

      return `
        <li style="color: #b91c1c; font-weight: 600; margin-top: 6px;">
          <div>[User Request] ${ciName} ${ciPrice ? `(+₹${ciPrice})` : ''} ${ciDetails ? `- <em>"${ciDetails}"</em>` : ''}</div>
          ${ciPhoto ? `
            <div style="margin-top: 5px; display: flex; align-items: center; gap: 8px;">
              <img src="${ciPhoto}" alt="${ciName}" style="width: 52px; height: 52px; object-fit: cover; border-radius: 6px; border: 1.5px solid #f472b6; cursor: pointer;" onclick="openAdminPhotoModal('${ciPhoto}', '${encodeURIComponent(ciName)}')">
              <button type="button" class="btn-primary" style="padding: 3px 8px; font-size: 0.72rem; cursor: pointer;" onclick="openAdminPhotoModal('${ciPhoto}', '${encodeURIComponent(ciName)}')">🔍 View / Zoom Customer Photo</button>
            </div>
          ` : ''}
        </li>
      `;
    }).join('') : '';
    const addonsList = details.addons && details.addons.length ? details.addons.join(', ') : 'None';

    return `
      <div style="background: var(--pink-50); border: 1.5px solid var(--pink-200); border-radius: var(--radius-md); padding: 1.4rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
          <strong style="color: var(--pink-900);">Order #${c.orderId}</strong>
          <span class="product-badge pink" style="position: static; font-size: 0.72rem;">${c.status}</span>
        </div>
        <div style="font-size: 0.85rem; margin-bottom: 0.4rem;"><strong>Customer:</strong> ${c.customer} (${c.phone})</div>
        <div style="font-size: 0.85rem; margin-bottom: 0.4rem;"><strong>Packaging Style:</strong> ${details.boxStyle || details.box || 'Corrugated Box'}</div>
        <div style="font-size: 0.85rem; margin-bottom: 0.4rem;"><strong>Packaging Size:</strong> ${details.boxSize || 'Standard'}</div>
        <div style="font-size: 0.85rem; margin-bottom: 0.4rem;"><strong>Chocolates & Addons:</strong> ${addonsList} ${details.hasLights ? '✨ (Fairy Lights Ambiance)' : ''}</div>
        <div style="font-size: 0.85rem; margin-bottom: 0.6rem;">
          <strong>Hamper Contents (Curated Items):</strong>
          <ul style="padding-left: 1.2rem; margin-top: 0.2rem; font-size: 0.82rem; color: var(--pink-900);">
            ${itemsList}
            ${customItemsList}
          </ul>
        </div>
        <div style="background: white; border: 1px dashed var(--pink-300); border-radius: 8px; padding: 0.8rem; font-size: 0.82rem; color: var(--pink-900); font-style: italic;">
          <strong>Personal Note:</strong> "${details.note || 'No note'}"
        </div>
      </div>
    `;
  }).join('');
}

window.openAdminPhotoModal = function(photoUrl, encodedName) {
  const modal = document.getElementById("adminPhotoModal");
  const img = document.getElementById("adminPhotoModalImg");
  const title = document.getElementById("adminPhotoModalTitle");
  const desc = document.getElementById("adminPhotoModalDesc");
  const dlBtn = document.getElementById("adminPhotoDownloadBtn");
  if (!modal || !img) return;

  const itemName = decodeURIComponent(encodedName || "Custom Item");
  img.src = photoUrl;
  if (title) title.textContent = `📸 Reference Photo: ${itemName}`;
  if (desc) desc.textContent = `Customer photo uploaded for "${itemName}". Ready for printing or crafting.`;
  if (dlBtn) {
    dlBtn.href = photoUrl;
    dlBtn.download = `her_hampers_${itemName.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
  }
  modal.classList.add("open");
};

window.closeAdminPhotoModal = function() {
  const modal = document.getElementById("adminPhotoModal");
  if (modal) modal.classList.remove("open");
};

// ========================================================
// 1 TO 10 PRODUCT IMAGES GALLERY MANAGEMENT
// ========================================================
let quickProductImages = [];
let editProductImages = [];

window.handleProductMultiImageUpload = function(inputEl, formType) {
  if (!inputEl.files || inputEl.files.length === 0) return;
  const targetArray = formType === 'quick' ? quickProductImages : editProductImages;
  const statusEl = document.getElementById(formType === 'quick' ? 'quickUploadStatus' : 'editUploadStatus');

  const availableSlots = 10 - targetArray.length;
  if (availableSlots <= 0) {
    showAdminToast("Maximum 10 images allowed per product!", "warning");
    return;
  }

  const filesToProcess = Array.from(inputEl.files).slice(0, availableSlots);

  if (statusEl) {
    statusEl.innerHTML = `<span style="color: var(--pink-700); font-weight: 600;">Processing ${filesToProcess.length} image(s)...</span>`;
  }

  let processedCount = 0;

  filesToProcess.forEach(file => {
    if (!file.type.startsWith("image/")) {
      processedCount++;
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.82);

        if (targetArray.length < 10) {
          targetArray.push(optimizedDataUrl);
        }

        processedCount++;
        if (processedCount === filesToProcess.length) {
          renderProductGallery(formType);
          if (statusEl) {
            statusEl.innerHTML = `<span style="color: #15803d; font-weight: 700;">✓ Attached ${targetArray.length} of 10 photos</span>`;
          }
          showAdminToast(`Attached photo(s) (${targetArray.length}/10)`, "success");
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

window.addUrlToProductGallery = function(inputId, formType) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const url = input.value.trim();
  if (!url) {
    showAdminToast("Please enter an image URL or file path first", "info");
    return;
  }
  const targetArray = formType === 'quick' ? quickProductImages : editProductImages;
  if (targetArray.length >= 10) {
    showAdminToast("Maximum 10 images allowed per product!", "warning");
    return;
  }
  targetArray.push(url);
  input.value = "";
  renderProductGallery(formType);
  showAdminToast(`Photo added (${targetArray.length}/10)`, "success");
};

window.removeProductGalleryImage = function(index, formType) {
  const targetArray = formType === 'quick' ? quickProductImages : editProductImages;
  targetArray.splice(index, 1);
  renderProductGallery(formType);
};

window.setPrimaryProductImage = function(index, formType) {
  const targetArray = formType === 'quick' ? quickProductImages : editProductImages;
  if (index > 0 && index < targetArray.length) {
    const chosen = targetArray.splice(index, 1)[0];
    targetArray.unshift(chosen);
    renderProductGallery(formType);
    showAdminToast("Set as primary cover photo 💖", "success");
  }
};

window.renderProductGallery = function(formType) {
  const targetArray = formType === 'quick' ? quickProductImages : editProductImages;
  const wrap = document.getElementById(formType === 'quick' ? 'quickImageGalleryWrap' : 'editImageGalleryWrap');
  const mainInput = document.getElementById(formType === 'quick' ? 'quickProdImage' : 'prodImageInput');
  const mainPreview = document.getElementById(formType === 'quick' ? 'quickImagePreview' : 'editImagePreview');

  if (!wrap) return;

  if (targetArray.length === 0) {
    wrap.style.display = "none";
    wrap.innerHTML = "";
    if (mainPreview) mainPreview.src = "assets/images/logo.png";
    return;
  }

  wrap.style.display = "block";
  if (mainPreview && targetArray[0]) mainPreview.src = targetArray[0];
  if (mainInput && targetArray[0]) mainInput.value = targetArray[0];

  const colorsInput = document.getElementById(formType === 'quick' ? 'quickProdColors' : 'prodColorsInput');
  const colorsList = colorsInput && colorsInput.value ? colorsInput.value.split(',').map(c => c.trim()).filter(Boolean) : [];

  wrap.innerHTML = `
    <div class="gallery-thumbs-header">
      <span>📷 Attached Photos (${targetArray.length} of 10 max)</span>
      <span style="font-weight: 500; font-size: 0.72rem; color: var(--pink-700);">Click photo to set as Cover (#1)</span>
    </div>
    <div class="gallery-thumbs-grid">
      ${targetArray.map((imgUrl, i) => {
        const assignedColor = colorsList[i];
        const colorTag = assignedColor ? `<div style="position: absolute; bottom: 2px; left: 2px; right: 2px; background: rgba(0,0,0,0.75); color: #fff; font-size: 0.62rem; font-weight: 700; border-radius: 3px; padding: 1px 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;" title="Color: ${assignedColor}">🎨 ${assignedColor}</div>` : '';
        return `
        <div class="gallery-thumb-item ${i === 0 ? 'is-cover' : ''}" onclick="setPrimaryProductImage(${i}, '${formType}')" title="${i === 0 ? 'Main Cover Photo' : 'Click to set as main photo'}${assignedColor ? ' (' + assignedColor + ')' : ''}">
          <img src="${imgUrl}" alt="Photo ${i + 1}" onerror="this.src='assets/images/logo.png'">
          ${i === 0 ? '<div class="thumb-cover-tag">Cover</div>' : ''}
          ${colorTag}
          <button type="button" class="thumb-remove-btn" onclick="event.stopPropagation(); removeProductGalleryImage(${i}, '${formType}')" title="Remove photo">&times;</button>
        </div>
      `;
      }).join('')}
    </div>
  `;
};

// Legacy fallback helper for image uploads
window.handleProductImageUpload = function(inputEl, targetInputId, previewImgId, statusElementId) {
  handleProductMultiImageUpload(inputEl, targetInputId.includes('quick') ? 'quick' : 'edit');
};

// Setup Drag & Drop on Image Dropzones
function setupDropZones() {
  ['quickDropZone', 'editDropZone'].forEach(zoneId => {
    const zone = document.getElementById(zoneId);
    if (!zone) return;

    ['dragenter', 'dragover'].forEach(evt => {
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(evt => {
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('dragover');
      });
    });

    zone.addEventListener('drop', (e) => {
      const files = e.dataTransfer?.files;
      if (files && files[0]) {
        if (zoneId === 'quickDropZone') {
          const input = document.getElementById('quickProdFileInput');
          if (input) {
            input.files = files;
            handleProductImageUpload(input, 'quickProdImage', 'quickImagePreview', 'quickUploadStatus');
          }
        } else if (zoneId === 'editDropZone') {
          const input = document.getElementById('editProdFileInput');
          if (input) {
            input.files = files;
            handleProductImageUpload(input, 'prodImageInput', 'editImagePreview', 'editUploadStatus');
          }
        }
      }
    });
  });
}

// Preset image picker helper (fallback)
window.handlePresetImageSelect = function(selectEl, inputId, previewId) {
  if (selectEl.value) {
    const input = document.getElementById(inputId);
    if (input) input.value = selectEl.value;
    updateImagePreview(selectEl.value, previewId);
  }
};

window.updateImagePreview = function(url, previewId) {
  const preview = document.getElementById(previewId);
  if (preview && url) {
    preview.src = url;
  }
};

// Direct On-Page Add New Product with Price
window.handleDirectAddProduct = function(e) {
  e.preventDefault();
  const name = document.getElementById("quickProdName").value.trim();
  const category = document.getElementById("quickProdCategory").value;
  const badge = document.getElementById("quickProdBadge").value.trim();
  const price = parseInt(document.getElementById("quickProdPrice").value, 10);
  const origPrice = document.getElementById("quickProdOrigPrice").value ? parseInt(document.getElementById("quickProdOrigPrice").value, 10) : null;
  const stock = parseInt(document.getElementById("quickProdStock").value, 10);
  const image = document.getElementById("quickProdImage").value.trim() || "assets/images/logo.png";
  const desc = document.getElementById("quickProdDesc").value.trim();

  if (isNaN(price) || price <= 0) {
    showAdminToast("Please enter a valid price / amount greater than 0", "error");
    return;
  }

  const newId = category.replace(/\s+/g, '-') + "-" + Date.now();
  const inHamper = document.getElementById("quickProdInHamper") ? document.getElementById("quickProdInHamper").checked : true;
  
  const colorsVal = document.getElementById("quickProdColors") ? document.getElementById("quickProdColors").value.trim() : "";
  const sizesVal = document.getElementById("quickProdSizes") ? document.getElementById("quickProdSizes").value.trim() : "";
  const quickOutColorsVal = document.getElementById("quickProdOutOfStockColors") ? document.getElementById("quickProdOutOfStockColors").value.trim() : "";
  const quickOutSizesVal = document.getElementById("quickProdOutOfStockSizes") ? document.getElementById("quickProdOutOfStockSizes").value.trim() : "";
  // If user entered no colours or sizes, keep them completely blank ([])
  const colors = colorsVal ? colorsVal.split(",").map(c => c.trim()).filter(Boolean) : [];
  const sizes = sizesVal ? sizesVal.split(",").map(s => s.trim()).filter(Boolean) : [];
  const outOfStockColors = quickOutColorsVal ? quickOutColorsVal.split(",").map(c => c.trim()).filter(Boolean) : [];
  const outOfStockSizes = quickOutSizesVal ? quickOutSizesVal.split(",").map(s => s.trim()).filter(Boolean) : [];

  const images = quickProductImages.length > 0 ? [...quickProductImages] : [image];
  const colorImageMap = {};
  if (colors.length > 0 && images.length > 0) {
    colors.forEach((col, idx) => {
      if (images[idx]) {
        colorImageMap[col] = images[idx];
      }
    });
  }

  const newProduct = {
    id: newId,
    name,
    category,
    categoryLabel: ADMIN_CAT_LABELS[category] || category.toUpperCase(),
    price,
    originalPrice: origPrice,
    rating: 5.0,
    reviewsCount: 1,
    badge: badge || "New",
    badgeType: "pink",
    stock: isNaN(stock) ? 20 : stock,
    image,
    images: images,
    colors: colors,
    sizes: sizes,
    colorImageMap: colorImageMap,
    outOfStockColors: outOfStockColors,
    outOfStockSizes: outOfStockSizes,
    inHamperBuilder: inHamper,
    description: desc || `Exquisite handcrafted ${category} piece from the Her Hampers collection.`,
    details: ["Handcrafted boutique quality", "Authentic Her Hampers curation", "Safe & anti-tarnish finish"]
  };

  adminProducts.unshift(newProduct);
  saveStoredProducts(adminProducts);
  renderAdminProductsTable();
  renderAdminStats();

  showAdminToast(`Added "${name}" with price ₹${price} to catalog!`, "success");

  // Reset form
  document.getElementById("directAddProductForm").reset();
  quickProductImages = [];
  renderProductGallery('quick');
  const preview = document.getElementById("quickImagePreview");
  if (preview) preview.src = "assets/images/logo.png";
  const statusEl = document.getElementById("quickUploadStatus");
  if (statusEl) statusEl.textContent = "Choose any JPG, PNG, WEBP photo from your device";
};

// Add/Edit Product Modal Logic
window.openAddProductModal = function() {
  document.getElementById("productModalTitle").textContent = "Add New Product to Catalog";
  document.getElementById("editProductId").value = "";
  document.getElementById("productForm").reset();
  if (document.getElementById("prodColorsInput")) document.getElementById("prodColorsInput").value = "";
  if (document.getElementById("prodSizesInput")) document.getElementById("prodSizesInput").value = "";
  if (document.getElementById("prodOutOfStockColorsInput")) document.getElementById("prodOutOfStockColorsInput").value = "";
  if (document.getElementById("prodOutOfStockSizesInput")) document.getElementById("prodOutOfStockSizesInput").value = "";
  editProductImages = [];
  renderProductGallery('edit');
  renderModalVariantToggles();
  const editPreview = document.getElementById("editImagePreview");
  if (editPreview) editPreview.src = "assets/images/logo.png";
  const editStatus = document.getElementById("editUploadStatus");
  if (editStatus) editStatus.textContent = "Choose 1 to 10 JPG, PNG, WEBP photos together";
  document.getElementById("productEditModal").classList.add("open");
};

window.openEditProductModal = function(id) {
  const p = adminProducts.find(item => item.id === id);
  if (!p) return;

  document.getElementById("productModalTitle").textContent = "Edit Product Details & Price";
  document.getElementById("editProductId").value = p.id;
  document.getElementById("prodNameInput").value = p.name;
  document.getElementById("prodCategorySelect").value = p.category;
  document.getElementById("prodBadgeInput").value = p.badge || "";
  document.getElementById("prodPriceInput").value = p.price;
  document.getElementById("prodOrigPriceInput").value = p.originalPrice || "";
  document.getElementById("prodStockInput").value = p.stock || 0;
  document.getElementById("prodImageInput").value = p.image || "";
  document.getElementById("prodDescInput").value = p.description || "";
  if (document.getElementById("prodColorsInput")) document.getElementById("prodColorsInput").value = (p.colors && p.colors.length > 0) ? p.colors.join(", ") : "";
  if (document.getElementById("prodSizesInput")) document.getElementById("prodSizesInput").value = (p.sizes && p.sizes.length > 0) ? p.sizes.join(", ") : "";
  if (document.getElementById("prodOutOfStockColorsInput")) {
    document.getElementById("prodOutOfStockColorsInput").value = (p.outOfStockColors && p.outOfStockColors.length > 0) ? p.outOfStockColors.join(", ") : "";
  }
  if (document.getElementById("prodOutOfStockSizesInput")) {
    document.getElementById("prodOutOfStockSizesInput").value = (p.outOfStockSizes && p.outOfStockSizes.length > 0) ? p.outOfStockSizes.join(", ") : "";
  }

  editProductImages = (p.images && p.images.length > 0) ? [...p.images] : [p.image || "assets/images/hero.jpg"];
  renderProductGallery('edit');
  renderModalVariantToggles();

  const editPreview = document.getElementById("editImagePreview");
  if (editPreview) editPreview.src = p.image || "assets/images/logo.png";

  const editHamperCb = document.getElementById("prodInHamperInput");
  if (editHamperCb) editHamperCb.checked = (p.inHamperBuilder !== false);

  const editStatus = document.getElementById("editUploadStatus");
  if (editStatus) {
    editStatus.innerHTML = `<span class="upload-success-badge"><svg class="icon-svg sm" style="width:12px;height:12px;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg> ${editProductImages.length} Photo(s) Attached</span>`;
  }

  document.getElementById("productEditModal").classList.add("open");
};

window.closeProductEditModal = function() {
  document.getElementById("productEditModal").classList.remove("open");
};

window.handleSaveProduct = function(e) {
  e.preventDefault();
  const id = document.getElementById("editProductId").value;
  const name = document.getElementById("prodNameInput").value.trim();
  const category = document.getElementById("prodCategorySelect").value;
  const badge = document.getElementById("prodBadgeInput").value.trim();
  const price = parseInt(document.getElementById("prodPriceInput").value, 10);
  const origPrice = document.getElementById("prodOrigPriceInput").value ? parseInt(document.getElementById("prodOrigPriceInput").value, 10) : null;
  const stock = parseInt(document.getElementById("prodStockInput").value, 10);
  const images = editProductImages.length > 0 ? [...editProductImages] : [document.getElementById("prodImageInput").value.trim() || "assets/images/hero.jpg"];
  const image = images[0];
  const desc = document.getElementById("prodDescInput").value.trim();
  const inHamper = document.getElementById("prodInHamperInput") ? document.getElementById("prodInHamperInput").checked : true;

  const colorsVal = document.getElementById("prodColorsInput") ? document.getElementById("prodColorsInput").value.trim() : "";
  const sizesVal = document.getElementById("prodSizesInput") ? document.getElementById("prodSizesInput").value.trim() : "";
  const outColorsVal = document.getElementById("prodOutOfStockColorsInput") ? document.getElementById("prodOutOfStockColorsInput").value.trim() : "";
  const outSizesVal = document.getElementById("prodOutOfStockSizesInput") ? document.getElementById("prodOutOfStockSizesInput").value.trim() : "";
  // If user entered no colours or sizes, keep them completely blank ([])
  const colors = colorsVal ? colorsVal.split(",").map(c => c.trim()).filter(Boolean) : [];
  const sizes = sizesVal ? sizesVal.split(",").map(s => s.trim()).filter(Boolean) : [];
  const outOfStockColors = outColorsVal ? outColorsVal.split(",").map(c => c.trim()).filter(Boolean) : [];
  const outOfStockSizes = outSizesVal ? outSizesVal.split(",").map(s => s.trim()).filter(Boolean) : [];

  if (isNaN(price) || price <= 0) {
    showAdminToast("Please enter a valid price / amount greater than 0", "error");
    return;
  }

  const colorImageMap = {};
  if (colors.length > 0 && images.length > 0) {
    colors.forEach((col, idx) => {
      if (images[idx]) {
        colorImageMap[col] = images[idx];
      }
    });
  }

  if (id) {
    // Edit existing product
    const index = adminProducts.findIndex(p => p.id === id);
    if (index !== -1) {
      const existing = adminProducts[index];
      const mergedColorImageMap = Object.keys(colorImageMap).length > 0 
        ? colorImageMap 
        : (existing.colorImageMap || {});

      adminProducts[index] = {
        ...adminProducts[index],
        name, category, badge, price, originalPrice: origPrice, stock, image, images, description: desc, inHamperBuilder: inHamper,
        colors: colors.length > 0 ? colors : (adminProducts[index].colors || []),
        sizes: sizes.length > 0 ? sizes : (adminProducts[index].sizes || []),
        colorImageMap: mergedColorImageMap,
        outOfStockColors: outOfStockColors,
        outOfStockSizes: outOfStockSizes
      };
      showAdminToast(`Updated "${name}" (${images.length} photos) successfully!`, "success");
    }
  } else {
    // Add new product
    const newId = category.replace(/\s+/g, '-') + "-" + Date.now();
    adminProducts.unshift({
      id: newId,
      name,
      category,
      categoryLabel: ADMIN_CAT_LABELS[category] || category.toUpperCase(),
      price,
      originalPrice: origPrice,
      rating: 5.0,
      reviewsCount: 1,
      badge: badge || "New",
      badgeType: "pink",
      stock: isNaN(stock) ? 20 : stock,
      image,
      images,
      colors: colors,
      sizes: sizes,
      colorImageMap: colorImageMap,
      outOfStockColors: outOfStockColors,
      outOfStockSizes: outOfStockSizes,
      inHamperBuilder: inHamper,
      description: desc || `Exquisite handcrafted ${category} piece from the Her Hampers collection.`,
    });
    showAdminToast(`Created new product "${name}" in catalog!`, "success");
  }

  saveStoredProducts(adminProducts);
  renderAdminProductsTable();
  renderAdminStats();
  closeProductEditModal();
};

window.deleteProduct = function(id) {
  const p = adminProducts.find(item => item.id === id);
  if (!p) return;

  if (confirm(`Are you sure you want to delete "${p.name}" from the store catalog?`)) {
    adminProducts = adminProducts.filter(item => item.id !== id);
    saveStoredProducts(adminProducts);
    renderAdminProductsTable();
    renderAdminStats();
    showAdminToast(`Deleted "${p.name}"`, "info");
  }
};

// Host Settings update
window.handleUpdateHostCreds = function(e) {
  e.preventDefault();
  const newUser = document.getElementById("newHostUsername").value.trim();
  const newPass = document.getElementById("newHostPassword").value.trim();

  if (!newUser || !newPass) {
    showAdminToast("Please provide both username and password", "error");
    return;
  }

  const newCreds = { username: newUser, password: newPass };
  localStorage.setItem("her_hampers_host_creds", JSON.stringify(newCreds));
  document.getElementById("currentHostUserDisplay").textContent = newUser;
  showAdminToast("Host credentials successfully updated!", "success");
};

window.handleResetCatalogDefaults = function() {
  if (confirm("Reset catalog back to all default items (Clips, Scrunchies, Jimmikis, Kolusu, Bangles, etc.)?")) {
    localStorage.removeItem("her_hampers_products");
    adminProducts = getStoredProducts();
    renderAdminProductsTable();
    renderAdminStats();
    showAdminToast("Store catalog reset to default items!", "success");
  }
};

// Export Orders to JSON
window.exportOrdersJSON = function() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(adminOrders, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `her_hampers_orders_backup_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showAdminToast("Orders exported successfully!", "success");
};

// Export Products to JSON (Backup to Disk)
window.exportProductsJSON = function() {
  const prods = getStoredProducts();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(prods, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `her_hampers_products_backup_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showAdminToast(`Catalog backup downloaded (${prods.length} products)!`, "success");
};

// Import Products from JSON (Restore from Backup)
window.importProductsJSON = function() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported) && imported.length > 0) {
          saveStoredProducts(imported);
          adminProducts = imported;
          renderAdminProductsTable();
          renderAdminStats();
          showAdminToast(`Successfully restored ${imported.length} products to catalog and saved to server disk!`, "success");
        } else {
          showAdminToast("Invalid backup file: Expected an array of products", "error");
        }
      } catch (err) {
        showAdminToast("Could not parse JSON file: " + err.message, "error");
      }
    };
    reader.readAsText(file);
  };
  fileInput.click();
};

// Update Disk Status Indicator Badge
window.updateDiskStatusBadge = function() {
  const badge = document.getElementById("serverDiskStatusPill");
  if (!badge) return;
  if (typeof fetch === "function") {
    fetch("/api/status").then(r => r.json()).then(s => {
      if (s && s.status === "online") {
        badge.style.display = "inline-flex";
        badge.innerHTML = `<span style="width:7px; height:7px; background:#10b981; border-radius:50%; display:inline-block;"></span> Server Disk Synced (${s.productsCount} items, ${s.ordersCount || 0} orders, ${s.appRatingsCount || 0} app ratings)`;
      }
    }).catch(() => {
      badge.style.display = "none";
    });
  }
};

// Safe HTML Escape for Admin UI
function escapeHtmlAdmin(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Render Customer App Ratings (Post-Order Completed Prompt)
function renderAdminAppRatings() {
  const container = document.getElementById("adminAppRatingsList");
  const scoreEl = document.getElementById("adminAppRatingScore");
  const subtextEl = document.getElementById("adminAppRatingsSubtext");
  const badgeCountEl = document.getElementById("appRatingsBadgeCount");

  adminAppRatings = (typeof getStoredAppRatings === 'function') ? getStoredAppRatings() : [];
  const total = adminAppRatings.length;

  if (badgeCountEl) badgeCountEl.textContent = `${total} rating${total === 1 ? '' : 's'}`;

  if (total > 0) {
    const avgScore = (adminAppRatings.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / total).toFixed(1);
    if (scoreEl) scoreEl.textContent = `${avgScore} of 5`;
    if (subtextEl) subtextEl.textContent = `Based on ${total} customer app rating${total === 1 ? '' : 's'}`;
  } else {
    if (scoreEl) scoreEl.textContent = `5.0 of 5`;
    if (subtextEl) subtextEl.textContent = `No ratings received yet`;
  }

  if (!container) return;

  if (total === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
        <span style="font-size: 2.2rem; display: block; margin-bottom: 0.5rem;">📱</span>
        <p style="font-weight: 600; margin-bottom: 0.25rem;">No customer app ratings yet</p>
        <p style="font-size: 0.8rem;">When customers finish placing an order, their feedback will appear here instantly.</p>
      </div>
    `;
    return;
  }

  // Show newest ratings first
  const sorted = [...adminAppRatings].reverse();
  container.innerHTML = sorted.map(ratingItem => {
    const num = Math.max(1, Math.min(5, Math.round(Number(ratingItem.rating) || 5)));
    const stars = "★".repeat(num) + "☆".repeat(5 - num);
    const tagsHtml = Array.isArray(ratingItem.tags) && ratingItem.tags.length > 0
      ? ratingItem.tags.map(t => `<span class="admin-rating-tag">#${escapeHtmlAdmin(t)}</span>`).join('')
      : '';
    const dateStr = ratingItem.date ? new Date(ratingItem.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recently";
    const commentHtml = ratingItem.comment ? `<p style="font-size: 0.85rem; color: #475569; margin: 0.5rem 0 0 0; font-style: italic; background: #fff5f8; padding: 0.5rem 0.75rem; border-radius: 6px; border-left: 3px solid #f472b6;">"${escapeHtmlAdmin(ratingItem.comment)}"</p>` : '';

    return `
      <div class="admin-review-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.8rem; margin-bottom: 0.4rem;">
          <div>
            <strong style="color: var(--pink-950); font-size: 0.95rem;">${escapeHtmlAdmin(ratingItem.userName || 'Verified Patron')}</strong>
            <span style="display: block; font-size: 0.76rem; color: var(--text-muted);">Order #${escapeHtmlAdmin(ratingItem.orderId || 'N/A')} • ${dateStr}</span>
          </div>
          <span class="admin-rating-badge">
            <span style="color: #f59e0b; font-size: 0.95rem;">${stars}</span>
            <span>${ratingItem.rating} of 5</span>
          </span>
        </div>
        ${tagsHtml ? `<div style="margin-top: 0.35rem;">${tagsHtml}</div>` : ''}
        ${commentHtml}
      </div>
    `;
  }).join('');
}

// Render Delivered Product Reviews (Prompted After Order Delivered)
function renderAdminProductReviews() {
  const container = document.getElementById("adminProductReviewsList");
  const countEl = document.getElementById("adminProductReviewsCount");
  const badgeCountEl = document.getElementById("productReviewsBadgeCount");

  const allReviews = [];
  adminProducts.forEach(prod => {
    if (Array.isArray(prod.reviews)) {
      prod.reviews.forEach(rev => {
        allReviews.push({
          ...rev,
          productId: prod.id,
          productName: prod.name,
          productImage: (Array.isArray(prod.images) && prod.images[0]) || prod.image || 'assets/images/logo.png',
          productRating: prod.rating
        });
      });
    }
  });

  const totalReviews = allReviews.length;
  if (countEl) countEl.textContent = `${totalReviews} Review${totalReviews === 1 ? '' : 's'}`;
  if (badgeCountEl) badgeCountEl.textContent = `${totalReviews} review${totalReviews === 1 ? '' : 's'}`;

  // Update reviews tab badge
  const tabBadge = document.getElementById("adminReviewsTabBadge");
  if (tabBadge) {
    const totalAll = (adminAppRatings ? adminAppRatings.length : 0) + totalReviews;
    tabBadge.textContent = totalAll;
  }

  if (!container) return;

  if (totalReviews === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
        <span style="font-size: 2.2rem; display: block; margin-bottom: 0.5rem;">🌸</span>
        <p style="font-weight: 600; margin-bottom: 0.25rem;">No delivered product reviews yet</p>
        <p style="font-size: 0.8rem;">When delivered orders are reviewed by customers, their feedback will show here.</p>
      </div>
    `;
    return;
  }

  // Sort newest first
  const sorted = [...allReviews].reverse();
  container.innerHTML = sorted.map(rev => {
    const numRating = Number(rev.rating) || 5;
    const stars = "★".repeat(Math.max(1, Math.min(5, Math.round(numRating)))) +
                  "☆".repeat(Math.max(0, 5 - Math.round(numRating)));
    const ratingDisplay = rev.ratingText || `${rev.rating || 5} of 5`;
    const author = escapeHtmlAdmin(rev.author || rev.userName || 'Delivered Customer');
    const comment = escapeHtmlAdmin(rev.comment || rev.text || '');

    return `
      <div class="admin-review-card">
        <div style="display: flex; gap: 0.8rem; align-items: flex-start;">
          <img src="${escapeHtmlAdmin(rev.productImage)}" alt="${escapeHtmlAdmin(rev.productName)}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover; border: 1px solid var(--pink-200); flex-shrink: 0;">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.2rem;">
              <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--pink-950); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtmlAdmin(rev.productName)}
              </h4>
              <span class="admin-rating-badge" style="background: #fffbeb; border-color: #fde68a; color: #b45309; flex-shrink: 0;">
                <span style="color: #f59e0b;">${stars}</span>
                <span>${escapeHtmlAdmin(ratingDisplay)}</span>
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.4rem;">
              <strong style="color: var(--pink-900);">${author}</strong>
              <span>•</span>
              <span style="background: #ecfdf5; color: #047857; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 4px; border: 1px solid #a7f3d0;">✓ Verified Delivered Buyer</span>
              <span>•</span>
              <span>${escapeHtmlAdmin(rev.date || 'Recent')}</span>
            </div>
            ${comment ? `<p style="font-size: 0.84rem; color: #334155; margin: 0; line-height: 1.4; background: #fafafa; padding: 0.5rem 0.7rem; border-radius: 6px; border-left: 3px solid #fb7185;">"${comment}"</p>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Admin Toast
function showAdminToast(msg, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";

  let statusBadge = `<svg class="icon-svg sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle></svg>`;
  if (type === "success") statusBadge = `<svg class="icon-svg sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  if (type === "error") statusBadge = `<svg class="icon-svg sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  toast.innerHTML = `<span style="display:inline-flex; align-items:center; color: var(--pink-600);">${statusBadge}</span><span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
