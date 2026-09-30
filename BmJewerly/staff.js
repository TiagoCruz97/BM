(() => {
  const password = 'SexyWife';
  const sessionKey = 'bm_jewerly_staff_session';
  const loginView = document.getElementById('staffLogin');
  const dashboard = document.getElementById('staffDashboard');
  const loginForm = document.getElementById('staffLoginForm');
  const loginError = document.getElementById('staffLoginError');
  const ordersList = document.getElementById('staffOrders');
  const stockTable = document.getElementById('staffStock');
  const ordersPanel = document.getElementById('ordersPanel');
  const stockPanel = document.getElementById('stockPanel');
  const ordersTab = document.getElementById('ordersTab');
  const stockTab = document.getElementById('stockTab');

  function setAuthenticated(authenticated) {
    loginView.hidden = authenticated;
    dashboard.hidden = !authenticated;
    if (authenticated) {
      sessionStorage.setItem(sessionKey, '1');
      renderOrders();
      renderStock();
    } else {
      sessionStorage.removeItem(sessionKey);
    }
  }

  function readOrders() {
    try {
      const orders = JSON.parse(localStorage.getItem('bm_jewerly_orders') || '[]');
      return Array.isArray(orders) ? orders : [];
    } catch (error) {
      return [];
    }
  }

  function renderOrders() {
    const orders = readOrders().slice().reverse();
    ordersList.replaceChildren();
    if (!orders.length) {
      const empty = document.createElement('p');
      empty.className = 'order-empty';
      empty.textContent = 'Ainda não existem pedidos.';
      ordersList.append(empty);
      return;
    }

    orders.forEach(order => {
      const card = document.createElement('article');
      card.className = 'order-card';
      const heading = document.createElement('div');
      heading.className = 'order-heading';
      const title = document.createElement('h3');
      title.textContent = `Pedido ${order.id}`;
      const state = document.createElement('span');
      state.className = 'order-state';
      state.textContent = order.status === 'accepted' ? 'Aceite' : order.status === 'rejected' ? 'Recusado' : 'Pendente';
      heading.append(title, state);

      const customer = order.customer || {};
      const date = new Date(order.createdAt).toLocaleString('pt-PT');
      const details = document.createElement('div');
      details.className = 'order-details';
      const addDetail = (label, value) => {
        const section = document.createElement('div');
        section.className = 'order-detail';
        const heading = document.createElement('h4');
        heading.textContent = label;
        const text = document.createElement('p');
        text.textContent = value || '—';
        section.append(heading, text);
        details.append(section);
      };
      const address = [customer.address, [customer.postal, customer.city].filter(Boolean).join(' '), customer.country]
        .filter(Boolean)
        .join(', ');
      addDetail('Cliente', customer.name || 'Cliente');
      addDetail('Contacto', [customer.email, customer.phone].filter(Boolean).join(' · '));
      addDetail('Entrega', address);
      addDetail('Pagamento e data', `${customer.payment || '—'} · ${date}`);

      const itemsHeading = document.createElement('h4');
      itemsHeading.className = 'order-section-title';
      itemsHeading.textContent = 'Artigos';

      const lines = document.createElement('ul');
      lines.className = 'order-lines';
      (order.items || []).forEach(item => {
        const line = document.createElement('li');
        line.textContent = `${item.title} × ${item.qty} · ${(item.price * item.qty).toFixed(2).replace('.', ',')}€`;
        lines.append(line);
      });
      const total = document.createElement('div');
      total.className = 'order-total';
      const totalLabel = document.createElement('span');
      totalLabel.textContent = 'Total da encomenda';
      const totalValue = document.createElement('strong');
      totalValue.textContent = `${Number(order.total || 0).toFixed(2).replace('.', ',')}€`;
      const shipping = document.createElement('small');
      shipping.textContent = `Portes: ${Number(order.shipping || 0).toFixed(2).replace('.', ',')}€`;
      total.append(totalLabel, totalValue, shipping);
      card.append(heading, details, itemsHeading, lines, total);

      if (order.status === 'pending') {
        const actions = document.createElement('div');
        actions.className = 'order-actions';
        const accept = document.createElement('button');
        accept.className = 'staff-button primary';
        accept.type = 'button';
        accept.textContent = 'Aceitar';
        accept.addEventListener('click', () => updateOrder(order.id, 'accepted'));
        const reject = document.createElement('button');
        reject.className = 'staff-button';
        reject.type = 'button';
        reject.textContent = 'Recusar';
        reject.addEventListener('click', () => updateOrder(order.id, 'rejected'));
        actions.append(accept, reject);
        card.append(actions);
      }
      ordersList.append(card);
    });
  }

  function updateOrder(id, status) {
    const orders = readOrders();
    const order = orders.find(item => String(item.id) === String(id));
    if (!order || order.status !== 'pending') return;
    if (status === 'accepted') {
      const insufficient = (order.items || []).find(item => {
        const available = window.BMJInventory.getStock(item.title);
        return available !== null && available < item.qty;
      });
      if (insufficient) {
        window.alert(`Stock insuficiente para aceitar: ${insufficient.title}.`);
        return;
      }
      (order.items || []).forEach(item => {
        const available = window.BMJInventory.getStock(item.title);
        if (available !== null) window.BMJInventory.saveStock(item.title, available - item.qty);
      });
    }
    order.status = status;
    order.updatedAt = new Date().toISOString();
    localStorage.setItem('bm_jewerly_orders', JSON.stringify(orders));
    renderOrders();
  }

  function renderStock() {
    stockTable.replaceChildren();
    window.BMJInventory.catalog.forEach(title => {
      const row = document.createElement('tr');
      const name = document.createElement('td');
      name.textContent = title;
      const quantityCell = document.createElement('td');
      const quantity = document.createElement('input');
      quantity.className = 'stock-quantity';
      quantity.type = 'number';
      quantity.min = '0';
      quantity.step = '1';
      quantity.inputMode = 'numeric';
      quantity.setAttribute('aria-label', `Quantidade em stock: ${title}`);
      const current = window.BMJInventory.getStock(title);
      quantity.value = current === null ? '' : String(current);
      quantity.placeholder = 'Por definir';
      quantityCell.append(quantity);
      const stateCell = document.createElement('td');
      const state = document.createElement('span');
      state.className = 'stock-state';
      state.textContent = current === null ? 'Por definir' : current === 0 ? 'Fora de stock' : 'Disponível';
      stateCell.append(state);
      const actionCell = document.createElement('td');
      const save = document.createElement('button');
      save.className = 'staff-button stock-save';
      save.type = 'button';
      save.textContent = 'Guardar';
      save.addEventListener('click', () => {
        const value = quantity.value.trim();
        if (!/^\d+$/.test(value)) {
          quantity.focus();
          return;
        }
        const count = Number(value);
        if (!Number.isSafeInteger(count)) return;
        window.BMJInventory.saveStock(title, count);
        state.textContent = count === 0 ? 'Fora de stock' : 'Disponível';
      });
      actionCell.append(save);
      row.append(name, quantityCell, stateCell, actionCell);
      stockTable.append(row);
    });
  }

  loginForm.addEventListener('submit', event => {
    event.preventDefault();
    const input = document.getElementById('staffPassword');
    if (input.value === password) {
      loginError.textContent = '';
      input.value = '';
      setAuthenticated(true);
    } else {
      loginError.textContent = 'Palavra-passe incorreta.';
      input.select();
    }
  });

  document.getElementById('staffLogout').addEventListener('click', () => setAuthenticated(false));
  ordersTab.addEventListener('click', () => {
    ordersTab.setAttribute('aria-selected', 'true');
    stockTab.setAttribute('aria-selected', 'false');
    ordersPanel.hidden = false;
    stockPanel.hidden = true;
  });
  stockTab.addEventListener('click', () => {
    ordersTab.setAttribute('aria-selected', 'false');
    stockTab.setAttribute('aria-selected', 'true');
    ordersPanel.hidden = true;
    stockPanel.hidden = false;
  });

  if (sessionStorage.getItem(sessionKey) === '1') setAuthenticated(true);
})();
