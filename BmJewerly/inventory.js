(() => {
  const stockKey = 'bm_jewerly_stock';
  const cartKey = 'bm_jewerly_cart_final';
  const catalog = [
    'Colar Malha Torcida', 'Colar Género Terço', 'Colar Estilo Português',
    'Colar Geométrico Oval', 'Colar Sardinha', 'Colar Simples com Bolinhas',
    'Colar de Pérolas Brancas', 'Colar Nossa Senhora', 'Pulseira Malha Torcida',
    'Pulseira Ténis Brilhante', 'Anel Coroa Brilhante Ajustável',
    'Anel Geométrico Ajustável', 'Anel Oval Ajustável', 'Anel Colorido Ajustável',
    'Conjunto Colar e Pulseira Dourados', 'Colar Masculino com Pendente'
  ];

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value && typeof value === 'object' ? value : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function normalizeTitle(title) {
    const normalized = String(title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    return normalized === 'colar estilo terco' ? 'colar genero terco' : normalized;
  }

  function getStock(title) {
    const stock = readJson(stockKey, {});
    const value = stock[normalizeTitle(title)];
    return Number.isInteger(value) && value >= 0 ? value : null;
  }

  function saveStock(title, quantity) {
    const stock = readJson(stockKey, {});
    stock[normalizeTitle(title)] = quantity;
    localStorage.setItem(stockKey, JSON.stringify(stock));
    window.dispatchEvent(new CustomEvent('bm-stock-change'));
  }

  function readCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
      return Array.isArray(cart) ? cart : [];
    } catch (error) {
      return [];
    }
  }

  function synchronizeCart() {
    const cart = readCart();
    const available = cart.filter(item => {
      const stock = getStock(item.title);
      return stock === null || stock > 0;
    });
    if (JSON.stringify(cart) !== JSON.stringify(available)) {
      localStorage.setItem(cartKey, JSON.stringify(available));
    }
  }

  function renderCartStockNotes() {
    const cart = readCart();
    document.querySelectorAll('.cart-items-container').forEach(container => {
      container.querySelectorAll('.cart-item').forEach((row, index) => {
        const item = cart[index];
        const stock = item ? getStock(item.title) : null;
        let note = row.querySelector('.cart-stock-note');
        if (item && stock !== null && stock > 0 && Number(item.qty) > stock) {
          if (!note) {
            note = document.createElement('p');
            note.className = 'cart-stock-note';
            const info = row.querySelector('.cart-item-info');
            const quantity = info?.querySelector('.cart-qty-controls, .cart-item-qty');
            if (quantity) quantity.insertAdjacentElement('afterend', note);
            else (info || row).append(note);
          }
          note.textContent = `O stock está limitado a ${stock} ${stock === 1 ? 'peça' : 'peças'}.`;
        } else if (note) {
          note.remove();
        }
      });
    });
  }

  function showNotice(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.setTimeout(() => toast.classList.remove('is-visible'), 2800);
  }

  function renderStockOnProducts() {
    document.querySelectorAll('.product-card').forEach(card => {
      const title = card.querySelector('.product-title')?.textContent.trim();
      const buttons = card.querySelectorAll('.add-cart, .buy-now');
      if (!title || !buttons.length) return;
      let notice = card.querySelector('.stock-status');
      buttons.forEach(button => {
        if (!button.dataset.stockLabel) button.dataset.stockLabel = button.textContent.trim();
      });
      if (getStock(title) === 0) {
        buttons.forEach(button => {
          button.disabled = true;
          button.setAttribute('aria-disabled', 'true');
          button.textContent = 'Fora de stock';
        });
        if (!notice) {
          notice = document.createElement('p');
          notice.className = 'stock-status';
          notice.textContent = 'Fora de stock';
          buttons[0].closest('.action-buttons')?.before(notice);
        }
      } else {
        buttons.forEach(button => {
          button.disabled = false;
          button.removeAttribute('aria-disabled');
          button.textContent = button.dataset.stockLabel;
        });
        if (notice) notice.remove();
      }
    });
  }

  function showStaffEntry() {
    const page = window.location.pathname.split('/').pop();
    if (page && page !== 'index.html') return;
    const actions = document.querySelector('.header-actions');
    if (!actions || actions.querySelector('.staff-entry')) return;
    const link = document.createElement('a');
    link.className = 'staff-entry';
    link.href = 'staff.html';
    link.setAttribute('aria-label', 'Área reservada à equipa');
    link.title = 'Área reservada à equipa';
    link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path><path d="M12 14v3"></path></svg>';
    actions.prepend(link);
  }

  function guardCartActions(event) {
    const addButton = event.target.closest('.add-cart, .buy-now');
    if (addButton) {
      const card = addButton.closest('.product-card');
      const title = card?.querySelector('.product-title')?.textContent.trim();
      if (!title) return;
      const stock = getStock(title);
      if (stock === null) return;
      const cart = readCart();
      if (stock === 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showNotice('Este produto está fora de stock.');
        return;
      }
    }

    const increment = event.target.closest('.cart-qty-plus, [data-cart-change="1"]');
    if (increment) {
      const cart = readCart();
      const index = Number(increment.dataset.index ?? increment.dataset.cartIndex);
      const item = cart[index];
      if (!item) return;
      const stock = getStock(item.title);
      if (stock === 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showNotice('Este produto está fora de stock.');
      }
    }
  }

  window.BMJInventory = { catalog, getStock, saveStock, readCart, stockKey, cartKey };
  document.addEventListener('click', guardCartActions, true);
  document.addEventListener('DOMContentLoaded', () => {
    showStaffEntry();
    synchronizeCart();
    renderStockOnProducts();
    document.querySelectorAll('.cart-items-container').forEach(container => {
      new MutationObserver(renderCartStockNotes).observe(container, { childList: true, subtree: true });
    });
    renderCartStockNotes();
  });
  window.addEventListener('storage', event => {
    if (event.key === stockKey) {
      synchronizeCart();
      renderStockOnProducts();
      renderCartStockNotes();
    }
  });
  window.addEventListener('bm-stock-change', () => {
    synchronizeCart();
    renderStockOnProducts();
    renderCartStockNotes();
  });
})();
