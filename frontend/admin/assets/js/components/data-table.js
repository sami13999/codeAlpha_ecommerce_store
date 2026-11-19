/**
 * Data Table & Pagination Utilities
 * E-Commerce Store Administration System
 */

const DataTableUtils = (() => {
  function debounce(fn, delay = 350) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function renderPagination(pagination, onPageChange) {
    if (!pagination) return '';

    const { page, totalPages, totalItems, limit } = pagination;
    const startItem = totalItems === 0 ? 0 : (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, totalItems);

    const container = document.createElement('div');
    container.className = 'admin-pagination';

    // Summary info
    const info = document.createElement('div');
    info.className = 'admin-pagination-info';
    info.textContent = `Showing ${startItem} to ${endItem} of ${totalItems} entries`;
    container.appendChild(info);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'admin-pagination-controls';

    // Prev button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '&lsaquo; Prev';
    prevBtn.disabled = page <= 1;
    prevBtn.addEventListener('click', () => {
      if (page > 1) onPageChange(page - 1);
    });
    controls.appendChild(prevBtn);

    // Page buttons
    const maxButtons = 5;
    let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      const firstBtn = document.createElement('button');
      firstBtn.className = 'pagination-btn';
      firstBtn.textContent = '1';
      firstBtn.addEventListener('click', () => onPageChange(1));
      controls.appendChild(firstBtn);

      if (startPage > 2) {
        const dots = document.createElement('span');
        dots.className = 'pagination-btn';
        dots.style.border = 'none';
        dots.textContent = '...';
        controls.appendChild(dots);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `pagination-btn ${i === page ? 'active' : ''}`;
      pageBtn.textContent = i;
      const targetPage = i;
      pageBtn.addEventListener('click', () => onPageChange(targetPage));
      controls.appendChild(pageBtn);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const dots = document.createElement('span');
        dots.className = 'pagination-btn';
        dots.style.border = 'none';
        dots.textContent = '...';
        controls.appendChild(dots);
      }

      const lastBtn = document.createElement('button');
      lastBtn.className = 'pagination-btn';
      lastBtn.textContent = totalPages;
      lastBtn.addEventListener('click', () => onPageChange(totalPages));
      controls.appendChild(lastBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = 'Next &rsaquo;';
    nextBtn.disabled = page >= totalPages;
    nextBtn.addEventListener('click', () => {
      if (page < totalPages) onPageChange(page + 1);
    });
    controls.appendChild(nextBtn);

    container.appendChild(controls);
    return container;
  }

  function getEmptyRowHtml(colspan, title = 'No records found', message = 'Try adjusting your filters or search criteria.') {
    return `
      <tr>
        <td colspan="${colspan}">
          <div class="admin-empty-state">
            <div class="empty-icon">🔍</div>
            <div class="empty-title">${title}</div>
            <div class="empty-desc">${message}</div>
          </div>
        </td>
      </tr>
    `;
  }

  function getLoadingRowHtml(colspan, message = 'Loading data...') {
    return `
      <tr>
        <td colspan="${colspan}" style="text-align: center; padding: 48px;">
          <div class="admin-spinner" style="margin: 0 auto 12px;"></div>
          <div style="color: var(--admin-text-secondary); font-size: var(--admin-font-sm);">${message}</div>
        </td>
      </tr>
    `;
  }

  return {
    debounce,
    renderPagination,
    getEmptyRowHtml,
    getLoadingRowHtml
  };
})();
