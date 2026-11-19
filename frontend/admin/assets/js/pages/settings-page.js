/**
 * Store Settings Page Controller
 * E-Commerce Store Administration System
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAPI.requireAuth()) return;

  AdminSidebar.init();
  AdminTopbar.init();

  const form = document.getElementById('settings-form');
  const saveTopBtn = document.getElementById('save-settings-top-btn');

  const storeNameInput = document.getElementById('setting-store-name');
  const supportEmailInput = document.getElementById('setting-support-email');
  const supportPhoneInput = document.getElementById('setting-support-phone');
  const shippingFeeInput = document.getElementById('setting-shipping-fee');
  const freeShippingInput = document.getElementById('setting-free-shipping');
  const currencyInput = document.getElementById('setting-currency');
  const taxRateInput = document.getElementById('setting-tax-rate');
  const lowStockInput = document.getElementById('setting-low-stock');

  if (saveTopBtn) {
    saveTopBtn.addEventListener('click', () => form.requestSubmit());
  }

  await loadSettings();

  async function loadSettings() {
    try {
      const res = await AdminAPI.request('/api/admin/settings');
      if (!res.success || !res.data) throw new Error('Failed to load settings');

      const s = res.data;
      if (s.store_name !== undefined) storeNameInput.value = s.store_name;
      if (s.support_email !== undefined) supportEmailInput.value = s.support_email;
      if (s.support_phone !== undefined) supportPhoneInput.value = s.support_phone;
      if (s.shipping_fee !== undefined) shippingFeeInput.value = s.shipping_fee;
      if (s.free_shipping_threshold !== undefined) freeShippingInput.value = s.free_shipping_threshold;
      if (s.currency !== undefined) currencyInput.value = s.currency;
      if (s.tax_rate !== undefined) taxRateInput.value = s.tax_rate;
      if (s.low_stock_threshold !== undefined) lowStockInput.value = s.low_stock_threshold;

    } catch (err) {
      AdminToast.error(err.message || 'Error loading store settings');
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const settings = {
      store_name: storeNameInput.value.trim(),
      support_email: supportEmailInput.value.trim(),
      support_phone: supportPhoneInput.value.trim(),
      shipping_fee: shippingFeeInput.value.trim(),
      free_shipping_threshold: freeShippingInput.value.trim(),
      currency: currencyInput.value.trim(),
      tax_rate: taxRateInput.value.trim(),
      low_stock_threshold: lowStockInput.value.trim()
    };

    try {
      const res = await AdminAPI.request('/api/admin/settings', {
        method: 'PUT',
        body: { settings }
      });

      AdminToast.success(res.message || 'Settings saved and applied successfully');
    } catch (err) {
      AdminToast.error(err.message || 'Failed to update settings');
    }
  });
});
