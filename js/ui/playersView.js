(() => {
    const Riftbound = (window.Riftbound = window.Riftbound || {});

    function populateLegendDropdown() {
        const { RIFTBOUND_LEGENDS } = Riftbound.legends;
        const select = document.getElementById('p-deck');
        if (!select) return;
        select.innerHTML = '<option value="" selected>No Legend Selected (Optional)</option>';
        RIFTBOUND_LEGENDS.forEach(legend => {
            const opt = document.createElement('option');
            opt.value = legend;
            opt.textContent = legend;
            select.appendChild(opt);
        });
    }

    function updateRoundsInputUI() {
        const { getState, getRecommendedSwissRounds, isReadOnly } = Riftbound.store;
        const state = getState();
        const readOnly = isReadOnly();
        const input = document.getElementById('custom-rounds-input');
        const hint = document.getElementById('recommended-rounds-hint');
        if (!input || !hint) return;

        input.disabled = readOnly;

        const count = state.players.length;
        const recommended = getRecommendedSwissRounds(count);

        if (document.activeElement !== input) {
            input.value = state.customMaxRounds ? String(state.customMaxRounds) : '';
        }

        if (count < 2) {
            input.placeholder = 'Auto (Add 2+ players)';
            hint.innerHTML = 'Leave empty for automatic Swiss calculation.';
        } else {
            input.placeholder = `Auto (${recommended} rounds for ${count} players)`;
            if (state.customMaxRounds) {
                hint.innerHTML = `Custom: <strong>${state.customMaxRounds} round(s)</strong> (Recommended for ${count} players: ${recommended})`;
            } else {
                hint.innerHTML = `Auto-selected: <strong class="text-amber-400">${recommended} Swiss rounds</strong> for ${count} players.`;
            }
        }
    }

    function renderPlayers() {
        const { RIFTBOUND_LEGENDS } = Riftbound.legends;
        const { getState, isReadOnly } = Riftbound.store;
        const { escapeHtml } = Riftbound.dom;
        const state = getState();
        const readOnly = isReadOnly();

        const tbody = document.getElementById('players-table-body');
        const countBadge = document.getElementById('player-count');
        const playerBadge = document.getElementById('player-badge');
        const startBtn = document.getElementById('start-swiss-btn');
        if (!tbody || !countBadge || !playerBadge || !startBtn) return;

        const activeCount = state.players.filter(p => p.active !== false).length;
        const swissStarted = state.swissRounds.length > 0;

        countBadge.textContent = state.players.length;
        playerBadge.textContent = activeCount < state.players.length
            ? `${activeCount} Active / ${state.players.length} Total`
            : `${state.players.length} Registered`;
        startBtn.disabled = readOnly || activeCount < 2;

        updateRoundsInputUI();

        if (state.players.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-stone-500 italic">${readOnly ? 'Loading tournament roster...' : 'No players registered yet. Add players or import a .txt list.'}</td></tr>`;
            return;
        }

        tbody.innerHTML = state.players.map((p, idx) => {
            const isActive = p.active !== false;
            return `
            <tr class="border-b border-stone-800 last:border-b-0 hover:bg-stone-900/50 transition-colors ${!isActive ? 'opacity-60' : ''}">
                <td class="p-3.5 text-stone-500 font-mono">${idx + 1}</td>
                <td class="p-3.5 font-semibold text-[#FAFAF9]">
                    <span>${escapeHtml(p.name)}</span>
                    ${!isActive ? '<span class="ml-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-red-950/70 text-red-300 border border-[#DC2626]/50">Dropped</span>' : ''}
                </td>
                <td class="p-3.5">
                    <select ${readOnly ? 'disabled' : ''} data-action="update-deck" data-player-id="${escapeHtml(p.id)}"
                        class="theme-input w-full max-w-xs bg-[#1C1917] border ${p.deck ? 'border-stone-700 text-amber-400' : 'border-amber-700/50 text-[#A8A29E] italic'} rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-[#F59E0B] transition-colors ${readOnly ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}">
                        <option value="" ${!p.deck ? 'selected' : ''}>— Unassigned —</option>
                        ${RIFTBOUND_LEGENDS.map(legend => `
                            <option value="${escapeHtml(legend)}" ${p.deck === legend ? 'selected' : ''}>${escapeHtml(legend)}</option>
                        `).join('')}
                    </select>
                </td>
                <td class="p-3.5 text-right">
                    ${swissStarted
                        ? `<button type="button" ${readOnly ? 'disabled' : ''} data-action="toggle-player-active" data-player-id="${escapeHtml(p.id)}" class="text-xs px-2.5 py-1 rounded-lg border transition-colors ${readOnly ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${isActive ? 'text-amber-300 hover:text-amber-200 bg-amber-950/40 border-amber-500/40' : 'text-emerald-300 hover:text-emerald-200 bg-emerald-950/40 border-emerald-700/50'}">${isActive ? 'Drop' : 'Reactivate'}</button>`
                        : `<button type="button" ${readOnly ? 'disabled' : ''} data-action="remove-player" data-player-id="${escapeHtml(p.id)}" class="text-red-300 hover:text-red-200 text-xs px-2.5 py-1 rounded-lg bg-red-950/40 border border-[#DC2626]/40 transition-colors ${readOnly ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}">Remove</button>`
                    }
                </td>
            </tr>
            `;
        }).join('');
    }

    Riftbound.playersView = {
        populateLegendDropdown,
        updateRoundsInputUI,
        renderPlayers
    };
})();
