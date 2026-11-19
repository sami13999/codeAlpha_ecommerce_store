/**
 * MAISON & CO. — CHECKOUT CLIENT SCRIPT
 */

let cartData = null;
let savedAddresses = [];
let appliedCouponCode = null;
let couponDiscount = 0;

async function initCheckoutPage() {
  const container = document.getElementById('checkout-page-grid');
  if (!container) return;

  if (!window.api.isAuthenticated()) {
    window.location.href = `/login?redirect=/checkout`;
    return;
  }

  try {
    const res = await window.api.get('/cart');
    if (!res.success || !res.data || !res.data.items || res.data.items.length === 0) {
      window.location.href = '/cart';
      return;
    }

    cartData = res.data;

    // Check query params for coupon
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('coupon');
    if (codeParam) {
      await validateAndApplyCoupon(codeParam.trim());
    }

    renderCheckoutSummary();
    await loadSavedAddresses();
    setupCheckoutForm();

  } catch (err) {
    showToast('Checkout Error', err.message, 'error');
  }
}

async function validateAndApplyCoupon(code) {
  try {
    const res = await window.api.post('/coupons/validate', {
      code,
      subtotal: cartData.summary.subtotal
    });
    if (res.success && res.data) {
      appliedCouponCode = res.data.code;
      couponDiscount = res.data.discount_amount;
      showToast('Coupon Applied', `Code "${appliedCouponCode}" applied! Saved Rs. ${couponDiscount}`, 'success');
      const couponBadge = document.getElementById('chk-coupon-badge');
      if (couponBadge) {
        couponBadge.style.display = 'inline-block';
        couponBadge.textContent = `Applied: ${appliedCouponCode} (-Rs. ${couponDiscount})`;
      }
    }
  } catch (err) {
    appliedCouponCode = null;
    couponDiscount = 0;
  }
}

async function loadSavedAddresses() {
  const picker = document.getElementById('saved-address-picker');
  if (!picker) return;

  try {
    const res = await window.api.get('/addresses');
    if (res.success && res.data && res.data.length > 0) {
      savedAddresses = res.data;
      let html = `<option value="">-- Choose a Saved Delivery Address --</option>`;
      savedAddresses.forEach(a => {
        html += `<option value="${a.id}">${escapeHTML(a.full_name)}: ${escapeHTML(a.address_line1)}, ${escapeHTML(a.city)} ${a.is_default ? '(Default)' : ''}</option>`;
      });
      picker.innerHTML = html;
      picker.style.display = 'block';
      const pickerWrap = document.getElementById('saved-address-picker-wrap');
      if (pickerWrap) pickerWrap.style.display = 'block';

      picker.addEventListener('change', () => {
        const selectedId = picker.value;
        if (selectedId) {
          const addr = savedAddresses.find(a => a.id == selectedId);
          if (addr) {
            document.getElementById('shipping_name').value = addr.full_name;
            document.getElementById('shipping_phone').value = addr.phone;
            document.getElementById('shipping_address_line1').value = addr.address_line1;
            document.getElementById('shipping_address_line2').value = addr.address_line2 || '';
            document.getElementById('shipping_city').value = addr.city;
            document.getElementById('shipping_state').value = addr.state || '';
            document.getElementById('shipping_postal_code').value = addr.postal_code || '';
          }
        }
      });

      // If there is a default address, prefill automatically
      const def = savedAddresses.find(a => a.is_default);
      if (def) {
        picker.value = def.id;
        picker.dispatchEvent(new Event('change'));
      }
    } else {
      // Prefill with user name & phone
      const user = window.api.getUser();
      if (user) {
        if (user.full_name) document.getElementById('shipping_name').value = user.full_name;
        if (user.phone) document.getElementById('shipping_phone').value = user.phone;
      }
    }
  } catch {
    // Ignore and let user type manual address
  }
}

function renderCheckoutSummary() {
  const itemsContainer = document.getElementById('checkout-items-list');
  const subtotalEl = document.getElementById('chk-subtotal');
  const deliveryEl = document.getElementById('chk-delivery');
  const discountRow = document.getElementById('chk-discount-row');
  const discountEl = document.getElementById('chk-discount');
  const totalEl = document.getElementById('chk-total');

  if (itemsContainer && cartData) {
    itemsContainer.innerHTML = cartData.items.map(item => `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-subtle);">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" style="width: 44px; height: 44px; border-radius: var(--radius-xs); object-fit: cover;" />
          <div>
            <div style="font-size: 0.9rem; font-weight: 600;">${escapeHTML(item.name)}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Qty: ${item.quantity} × Rs. ${item.price.toFixed(2)}</div>
          </div>
        </div>
        <div style="font-size: 0.95rem; font-weight: 700;">
          Rs. ${item.line_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      </div>
    `).join('');
  }

  if (cartData) {
    const subtotal = cartData.summary.subtotal;
    const delivery = cartData.summary.delivery_fee;
    const finalTotal = Math.max(0, subtotal - couponDiscount) + delivery;

    if (subtotalEl) subtotalEl.textContent = `Rs. ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (deliveryEl) deliveryEl.textContent = delivery === 0 ? 'Complimentary' : `Rs. ${delivery.toFixed(2)}`;

    if (discountRow && discountEl) {
      if (couponDiscount > 0) {
        discountRow.style.display = 'flex';
        discountEl.textContent = `-Rs. ${couponDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    if (totalEl) totalEl.textContent = `Rs. ${finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
}

function setupCheckoutForm() {
  const form = document.getElementById('checkout-form');
  const submitBtn = document.getElementById('place-order-btn');
  if (!form || !submitBtn) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const payload = {
      shipping_name: formData.get('shipping_name'),
      shipping_phone: formData.get('shipping_phone'),
      shipping_address_line1: formData.get('shipping_address_line1'),
      shipping_address_line2: formData.get('shipping_address_line2'),
      shipping_city: formData.get('shipping_city'),
      shipping_state: formData.get('shipping_state'),
      shipping_postal_code: formData.get('shipping_postal_code'),
      shipping_country: 'Pakistan',
      customer_note: formData.get('customer_note'),
      coupon_code: appliedCouponCode || null
    };

    submitBtn.disabled = true;
    const orig = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span class="spinner"></span> Confirming Acquisition...`;

    try {
      const res = await window.api.post('/orders/checkout', payload);
      if (res.success && res.data) {
        window.dispatchEvent(new CustomEvent('cart-updated'));
        sessionStorage.setItem('last_completed_order', JSON.stringify(res.data));
        window.location.href = `/order-success?order_number=${encodeURIComponent(res.data.order_number)}`;
      }
    } catch (err) {
      showToast('Checkout Failed', err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = orig;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('checkout-form')) {
    initCheckoutPage();
  }
});

