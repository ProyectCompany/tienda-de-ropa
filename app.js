/**
 * AMELIE SHOWROOM SP - APPLICATION LOGIC
 * Cart management, WhatsApp integration, size selector and UI interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // Configuration
  // Número de WhatsApp con prefijo '36' (Chaco / Sáenz Peña: 3644733030)
  const WHATSAPP_NUMBER = '5493644733030';

  // State
  let cart = JSON.parse(localStorage.getItem('amelie_cart')) || [];
  
  // Elements
  const cartDrawer = document.getElementById('cart-drawer') || document.getElementById('cartDrawer');
  const cartOverlay = document.getElementById('cart-overlay') || document.getElementById('cartDrawerOverlay');
  const openCartBtn = document.getElementById('cart-btn') || document.getElementById('cartBtn');
  const closeCartBtn = document.getElementById('close-cart-btn') || document.getElementById('closeCartBtn');
  const cartBadge = document.getElementById('cart-counter') || document.querySelector('.cart-count');
  const cartItemsList = document.getElementById('cart-items-list') || document.getElementById('cartItemsList');
  const cartSubtotalEl = document.getElementById('cart-subtotal') || document.getElementById('cartSubtotal');
  const emptyCartMsg = document.getElementById('empty-cart-view') || document.getElementById('emptyCartMsg');
  const cartFooter = document.getElementById('cart-footer');
  const checkoutWhatsAppBtn = document.getElementById('btn-checkout-wa') || document.getElementById('checkoutWhatsAppBtn');
  const waCheckoutText = document.getElementById('wa-checkout-text');
  
  const searchModal = document.getElementById('search-modal') || document.getElementById('searchModal');
  const openSearchBtn = document.getElementById('search-btn') || document.getElementById('searchBtn');
  const closeSearchBtn = document.getElementById('close-search-btn') || document.getElementById('closeSearchBtn');
  const searchInput = document.getElementById('search-input') || document.getElementById('searchInput');
  const searchResults = document.getElementById('search-results') || document.getElementById('searchResults');
  
  const mobileToggle = document.getElementById('mobile-toggle') || document.getElementById('mobileToggle');
  const mainNav = document.getElementById('main-nav') || document.getElementById('mainNav');

  // Actualizar botón flotante con el número configurado
  const floatingWaBtn = document.querySelector('.whatsapp-float-btn');
  if (floatingWaBtn) {
    const floatMsg = '¡Hola Amelie Showroom! ✨ Quisiera hacerles una consulta.';
    floatingWaBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(floatMsg)}`;
  }

  // Initialize
  updateCartUI();

  // Helper para obtener URL absoluta de las fotos de los productos
  function getAbsoluteImageUrl(imgPath) {
    if (!imgPath) return '';
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
      return imgPath;
    }
    const cleanPath = imgPath.startsWith('/') ? imgPath.slice(1) : imgPath;
    return `${window.location.origin}/${cleanPath}`;
  }

  // Generador de mensaje personalizado para WhatsApp con fotos y consulta de stock
  // Soporta: 1 producto ("ESE producto") y múltiples productos ("ESOS productos")
  function generateStockWhatsAppUrl(items) {
    if (!items || items.length === 0) return '';

    let text = '';

    if (items.length === 1) {
      // Mensaje personalizado para ESE producto en particular
      const item = items[0];
      const imgUrl = getAbsoluteImageUrl(item.img);
      const priceStr = typeof item.price === 'number' 
        ? `$${item.price.toLocaleString('es-AR')}` 
        : item.price;
      const qtyStr = item.quantity && item.quantity > 1 ? `\n• *Cantidad:* ${item.quantity}` : '';

      text = `¡Hola Amelie Showroom! ✨\n` +
             `Quería consultarles si tienen stock disponible de este producto:\n\n` +
             `👗 *${item.name}*\n` +
             `• *Talle:* ${item.size || 'A coordinar'}` +
             `${qtyStr}\n` +
             `• *Precio:* ${priceStr}\n` +
             (imgUrl ? `📸 *Foto del producto:* ${imgUrl}\n\n` : '\n') +
             `¿Tienen disponibilidad para coordinar la compra y el envío? ¡Muchas gracias! 💕`;
    } else {
      // Mensaje personalizado para ESOS productos (varios ítems)
      let total = 0;
      text = `¡Hola Amelie Showroom! ✨\n` +
             `Quería consultarles si tienen stock disponible de los siguientes productos:\n\n`;

      items.forEach((item, index) => {
        const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
        const qty = item.quantity || 1;
        const itemSubtotal = itemPrice * qty;
        total += itemSubtotal;
        const imgUrl = getAbsoluteImageUrl(item.img);

        text += `${index + 1}️⃣ *${item.name}*\n` +
                `   • Talle: ${item.size || 'A coordinar'}\n` +
                `   • Cantidad: ${qty}\n` +
                `   • Subtotal: $${itemSubtotal.toLocaleString('es-AR')}\n` +
                (imgUrl ? `   📸 Foto: ${imgUrl}\n\n` : '\n');
      });

      text += `💰 *Total estimado: $${total.toLocaleString('es-AR')}*\n\n` +
              `¿Tienen disponibilidad de stock de estos artículos para coordinar la compra y el envío? ¡Muchas gracias! 💕`;
    }

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  }

  // 1. Selección de talle en tarjetas de productos
  document.querySelectorAll('.sizes-wrap').forEach(wrap => {
    const sizeBtns = wrap.querySelectorAll('.size-btn');
    sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sizeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  // Filtros de categoría en catálogo (Todas, Mujer, Kids)
  const catalogFilterBtns = document.querySelectorAll('.catalog-filter-btn');
  const allProductCards = document.querySelectorAll('.product-card');

  catalogFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catalogFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;

      allProductCards.forEach(card => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // 2. Consulta Directa por WhatsApp desde la tarjeta (ESE producto)
  document.querySelectorAll('.btn-consultar-wa').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.product-card');
      if (!card) return;

      const id = card.dataset.id;
      const name = card.dataset.name;
      const price = parseFloat(card.dataset.price);
      const img = card.dataset.img;
      const activeSizeBtn = card.querySelector('.size-btn.active');
      const size = activeSizeBtn ? activeSizeBtn.dataset.size : 'M';

      const singleItem = { id, name, price, img, size, quantity: 1 };
      const waUrl = generateStockWhatsAppUrl([singleItem]);
      window.open(waUrl, '_blank');
    });
  });

  // 3. Agregar al Carrito desde tarjetas de productos
  document.querySelectorAll('.btn-comprar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.product-card');
      if (!card) return;

      const id = card.dataset.id;
      const name = card.dataset.name;
      const price = parseFloat(card.dataset.price);
      const img = card.dataset.img;
      const activeSizeBtn = card.querySelector('.size-btn.active');
      const size = activeSizeBtn ? activeSizeBtn.dataset.size : 'M';

      addToCart({ id, name, price, img, size });
      showToast(`¡${name} (${size}) agregado al carrito!`);
      openCart();
    });
  });

  // 4. Funciones del Carrito
  function addToCart(item) {
    const existingIndex = cart.findIndex(i => i.id === item.id && i.size === item.size);
    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({ ...item, quantity: 1 });
    }
    saveCart();
    updateCartUI();
  }

  function removeFromCart(id, size) {
    cart = cart.filter(item => !(item.id === id && item.size === size));
    saveCart();
    updateCartUI();
  }

  function updateQuantity(id, size, delta) {
    const item = cart.find(i => i.id === id && i.size === size);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(id, size);
    } else {
      saveCart();
      updateCartUI();
    }
  }

  function saveCart() {
    localStorage.setItem('amelie_cart', JSON.stringify(cart));
  }

  function updateCartUI() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartBadge) cartBadge.textContent = totalCount;

    if (cart.length === 0) {
      if (emptyCartMsg) emptyCartMsg.style.display = 'flex';
      if (cartFooter) cartFooter.classList.add('hidden');
      if (cartItemsList) cartItemsList.innerHTML = '';
      if (cartSubtotalEl) cartSubtotalEl.textContent = '$0';
      return;
    }

    if (emptyCartMsg) emptyCartMsg.style.display = 'none';
    if (cartFooter) cartFooter.classList.remove('hidden');

    // Adaptar texto del botón según si es 1 o varios productos
    if (waCheckoutText) {
      if (cart.length === 1) {
        waCheckoutText.textContent = 'CONSULTAR STOCK DE ESTE PRODUCTO';
      } else {
        waCheckoutText.textContent = `CONSULTAR STOCK DE ESTOS PRODUCTOS (${totalCount})`;
      }
    }

    let subtotal = 0;
    cartItemsList.innerHTML = cart.map(item => {
      const itemSubtotal = item.price * item.quantity;
      subtotal += itemSubtotal;
      return `
        <li class="cart-item">
          <img src="${item.img}" alt="${item.name}" class="cart-item-img">
          <div class="cart-item-details">
            <h4 class="cart-item-name">${item.name}</h4>
            <div class="cart-item-size">Talle: <strong>${item.size}</strong></div>
            <div class="cart-item-price">$${itemSubtotal.toLocaleString('es-AR')}</div>
            <div class="cart-item-actions">
              <button class="qty-btn" onclick="window.amelieCart.updateQty('${item.id}', '${item.size}', -1)">-</button>
              <span class="qty-count">${item.quantity}</span>
              <button class="qty-btn" onclick="window.amelieCart.updateQty('${item.id}', '${item.size}', 1)">+</button>
              <button class="remove-btn" onclick="window.amelieCart.remove('${item.id}', '${item.size}')">Eliminar</button>
            </div>
          </div>
        </li>
      `;
    }).join('');

    cartSubtotalEl.textContent = `$${subtotal.toLocaleString('es-AR')}`;
  }

  // Expose methods for inline onclick handlers
  window.amelieCart = {
    updateQty: (id, size, delta) => updateQuantity(id, size, delta),
    remove: (id, size) => removeFromCart(id, size)
  };

  // 5. Controles del Carrito (Abrir / Cerrar)
  function openCart() {
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (openCartBtn) openCartBtn.addEventListener('click', openCart);
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  // 6. Consulta de Stock por WhatsApp desde el Carrito (ESOS o ESE producto)
  if (checkoutWhatsAppBtn) {
    checkoutWhatsAppBtn.addEventListener('click', () => {
      if (cart.length === 0) {
        showToast('Tu carrito está vacío');
        return;
      }

      const waUrl = generateStockWhatsAppUrl(cart);
      window.open(waUrl, '_blank');
    });
  }

  // 6. Search Overlay
  if (openSearchBtn && searchModal && closeSearchBtn) {
    openSearchBtn.addEventListener('click', () => {
      searchModal.classList.add('active');
      searchInput.focus();
    });

    closeSearchBtn.addEventListener('click', () => {
      searchModal.classList.remove('active');
      searchInput.value = '';
      searchResults.innerHTML = '';
    });

    searchModal.addEventListener('click', (e) => {
      if (e.target === searchModal) {
        searchModal.classList.remove('active');
      }
    });

    // Live search
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        searchResults.innerHTML = '';
        return;
      }

      const products = Array.from(document.querySelectorAll('.product-card')).map(card => ({
        id: card.dataset.id,
        name: card.dataset.name,
        price: card.dataset.price,
        img: card.dataset.img
      }));

      const filtered = products.filter(p => p.name.toLowerCase().includes(query));
      
      if (filtered.length === 0) {
        searchResults.innerHTML = '<p style="color:#888; font-size: 0.85rem; padding: 10px 0;">No se encontraron productos.</p>';
        return;
      }

      searchResults.innerHTML = filtered.map(item => `
        <div style="display:flex; align-items:center; gap:12px; padding:8px; border-bottom:1px solid #f0f0f0; cursor:pointer;" onclick="location.href='#coleccion'">
          <img src="${item.img}" style="width:45px; height:45px; object-fit:cover; border-radius:4px;">
          <div>
            <div style="font-size:0.85rem; font-weight:600;">${item.name}</div>
            <div style="font-size:0.8rem; color:#A34853; font-weight:700;">$${parseFloat(item.price).toLocaleString('es-AR')}</div>
          </div>
        </div>
      `).join('');
    });
  }

  // 7. Mobile Navigation Toggle & Touch Handling
  const mobileNavBackdrop = document.getElementById('mobile-nav-backdrop');
  
  function openMobileNav() {
    if (!mainNav || !mobileToggle) return;
    mainNav.classList.add('mobile-active');
    mobileToggle.classList.add('active');
    mobileToggle.setAttribute('aria-expanded', 'true');
    if (mobileNavBackdrop) mobileNavBackdrop.classList.add('active');
    document.body.classList.add('mobile-nav-open');
  }

  function closeMobileNav() {
    if (!mainNav || !mobileToggle) return;
    mainNav.classList.remove('mobile-active');
    mobileToggle.classList.remove('active');
    mobileToggle.setAttribute('aria-expanded', 'false');
    if (mobileNavBackdrop) mobileNavBackdrop.classList.remove('active');
    document.body.classList.remove('mobile-nav-open');
  }

  if (mobileToggle && mainNav) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (mainNav.classList.contains('mobile-active')) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });

    // Close when clicking backdrop
    if (mobileNavBackdrop) {
      mobileNavBackdrop.addEventListener('click', closeMobileNav);
    }

    // Close when clicking any navigation link
    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        closeMobileNav();
      });
    });

    // Mobile touch toggle for "PRENDAS" dropdown
    const dropdownToggle = document.getElementById('dropdown-prendas');
    if (dropdownToggle) {
      dropdownToggle.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
          e.preventDefault();
          dropdownToggle.closest('.dropdown').classList.toggle('mobile-dropdown-open');
        }
      });
    }

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMobileNav();
        closeCart();
        if (searchModal) searchModal.classList.remove('active');
      }
    });
  }

  // 8. Toast Helper
  function showToast(message) {
    let toast = document.querySelector('.toast-notification');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast-notification';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }
});
