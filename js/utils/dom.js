(() => {
    const Riftbound = (window.Riftbound = window.Riftbound || {});

    let modalCallback = null;

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag));
    }

    function openModal(title, messageHtml, onConfirm = null, singleButton = false) {
        const titleEl = document.getElementById('modal-title');
        const messageEl = document.getElementById('modal-message');
        const cancelBtn = document.getElementById('modal-cancel-btn');
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const modal = document.getElementById('confirm-modal');

        if (!modal || !titleEl || !messageEl || !cancelBtn || !confirmBtn) return;

        titleEl.textContent = title;
        messageEl.innerHTML = messageHtml;

        if (singleButton) {
            cancelBtn.classList.add('hidden');
            confirmBtn.textContent = 'Close';
        } else {
            cancelBtn.classList.remove('hidden');
            confirmBtn.textContent = 'Confirm';
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modalCallback = onConfirm;

        confirmBtn.onclick = () => {
            const cb = modalCallback;
            closeModal();
            if (cb) cb();
        };
    }

    function closeModal() {
        const modal = document.getElementById('confirm-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modalCallback = null;
    }

    Riftbound.dom = {
        escapeHtml,
        openModal,
        closeModal
    };
})();
