const checkoutModal = document.querySelector('#checkoutModal');
const sellerModal = document.querySelector('#sellerModal');
const toast = document.querySelector('#toast');
let toastTimer;

function openCheckout(product, price) {
  document.querySelector('#checkoutTitle').textContent = `${product} reservado`;
  document.querySelector('#checkoutPrice').textContent = price ? `$${price}` : 'Pago seguro';
  checkoutModal.showModal();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

document.querySelectorAll('.quick-add').forEach((button) => {
  button.addEventListener('click', () => openCheckout(button.dataset.product, button.dataset.price));
});

document.querySelectorAll('.buy-mini').forEach((button) => {
  button.addEventListener('click', () => openCheckout(button.dataset.product, '48.00'));
});

document.querySelectorAll('.seller-trigger, .dashboard-trigger').forEach((button) => {
  button.addEventListener('click', () => sellerModal.showModal());
});

document.querySelectorAll('.modal-close').forEach((button) => {
  button.addEventListener('click', () => button.closest('dialog').close());
});

document.querySelector('.modal-action').addEventListener('click', () => {
  checkoutModal.close();
  showToast('Tu reserva está lista. La pasarela segura se conectará aquí.');
});

document.querySelector('#sellerForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const storeName = event.currentTarget.querySelector('input').value.trim() || 'Tu negocio';
  sellerModal.close();
  event.currentTarget.reset();
  showToast(`${storeName}: comenzaremos tu verificación de negocio.`);
});

document.querySelector('#followButton').addEventListener('click', (event) => {
  const following = event.currentTarget.textContent === 'Siguiendo';
  event.currentTarget.textContent = following ? 'Seguir' : 'Siguiendo';
  showToast(following ? 'Dejaste de seguir a Casa Morena.' : 'Ahora sigues a Casa Morena.');
});
