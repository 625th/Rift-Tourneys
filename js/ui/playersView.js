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
                hint.innerHTML = `Auto-selected: <strong class="text-sky-400">${recommended} Swiss rounds</strong> for ${count} players.`;
            }
        }
    }

    function renderPlayers() {
        const { RIFTBOUND_LEGENDS, formatDeckLabel } = Riftbound.legends;
        const { getState, isReadOnly } = Riftbound.store;
        const { escapeHtml } = Riftbound.dom;
        const state = getState();
        const readOnly = isReadOnly();

        const tbody = document.getElementById('players-table-body');
        const countBadge = document.getElementById('player-count');
        const playerBadge = document.getElementById('player-badge');
        const startBtn = document.getElementById('start-swiss-btn');
        if (!tbody || !countBadge || !playerBadge) return;

        const activeCount = state.players.filter(p => p.active !== false).length;
        const swissStarted = state.swissRounds.length > 0;

        countBadge.textContent = state.players.length;
        playerBadge.textContent = activeCount < state.players.length
            ? `${activeCount} Active / ${state.players.length} Total`
            : `${state.players.length} Registered`;
        if (startBtn) {
            startBtn.disabled = readOnly || activeCount < 2;
        }

        updateRoundsInputUI();

        if (state.players.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${readOnly ? 3 : 4}" class="p-8 text-center text-slate-500 italic">${readOnly ? 'Loading tournament roster...' : 'No players registered yet. Add players or import a .txt list.'}</td></tr>`;
            return;
        }

        tbody.innerHTML = state.players.map((p, idx) => {
            const isActive = p.active !== false;
            const deckLabel = formatDeckLabel(p.deck);
            const isUnassigned = deckLabel === 'Unassigned';
            return `
            <tr class="border-b border-slate-800 last:border-b-0 hover:bg-slate-900/50 transition-colors ${!isActive ? 'opacity-60' : ''}">
                <td class="p-3.5 text-slate-500 font-mono">${idx + 1}</td>
                <td class="p-3.5 font-semibold text-[#F8FAFC]">
                    <span>${escapeHtml(p.name)}</span>
                    ${!isActive ? '<span class="ml-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-red-950/70 text-red-300 border border-[#DC2626]/50">Dropped</span>' : ''}
                </td>
                <td class="p-3.5">
                    ${readOnly
                        ? `<span class="text-xs font-medium ${isUnassigned ? 'text-slate-500 italic' : 'text-sky-400'}">${escapeHtml(deckLabel)}</span>`
                        : `<select data-action="update-deck" data-player-id="${escapeHtml(p.id)}"
                            class="theme-input w-full max-w-xs bg-[#111827] border ${p.deck ? 'border-slate-700 text-sky-400' : 'border-sky-700/50 text-[#94A3B8] italic'} rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-[#38BDF8] transition-colors cursor-pointer">
                            <option value="" ${!p.deck ? 'selected' : ''}>— Unassigned —</option>
                            ${RIFTBOUND_LEGENDS.map(legend => `
                                <option value="${escapeHtml(legend)}" ${p.deck === legend ? 'selected' : ''}>${escapeHtml(legend)}</option>
                            `).join('')}
                        </select>`
                    }
                </td>
                ${readOnly ? '' : `
                <td class="p-3.5 text-right">
                    ${swissStarted
                        ? `<button type="button" data-action="toggle-player-active" data-player-id="${escapeHtml(p.id)}" class="text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${isActive ? 'text-sky-300 hover:text-sky-200 bg-sky-950/40 border-sky-500/40' : 'text-emerald-300 hover:text-emerald-200 bg-emerald-950/40 border-emerald-700/50'}">${isActive ? 'Drop' : 'Reactivate'}</button>`
                        : `<button type="button" data-action="remove-player" data-player-id="${escapeHtml(p.id)}" class="text-red-300 hover:text-red-200 text-xs px-2.5 py-1 rounded-lg bg-red-950/40 border border-[#DC2626]/40 transition-colors cursor-pointer">Remove</button>`
                    }
                </td>
                `}
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
