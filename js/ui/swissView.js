(() => {
    const Riftbound = (window.Riftbound = window.Riftbound || {});

    function renderLegendSubtext(deck) {
        const { formatDeckLabel } = Riftbound.legends;
        const { escapeHtml } = Riftbound.dom;
        const label = formatDeckLabel(deck);
        const isUnassigned = label === 'Unassigned';
        return `<div class="text-xs mt-0.5 truncate ${isUnassigned ? 'text-slate-500 italic' : 'text-sky-400/90'}">${escapeHtml(label)}</div>`;
    }

    function populateForcePairSelects() {
        const { shortLegendName } = Riftbound.legends;
        const { calculateStandingsData } = Riftbound.standings;
        const { getState } = Riftbound.store;
        const { escapeHtml } = Riftbound.dom;
        const state = getState();

        const p1Select = document.getElementById('force-p1-select');
        const p2Select = document.getElementById('force-p2-select');
        if (!p1Select || !p2Select) return;

        const prevP1 = p1Select.value;
        const prevP2 = p2Select.value;

        const activeIdx = state.currentRoundIndex;
        const enteringStandings = calculateStandingsData(state.players, state.swissRounds, activeIdx);
        const sortedPlayers = enteringStandings
            .filter(s => s.player.active)
            .sort((a, b) => b.points - a.points || a.player.name.localeCompare(b.player.name));

        const optionsHtml = sortedPlayers.map(s =>
            `<option value="${escapeHtml(s.player.id)}">${escapeHtml(s.player.name)} (${s.points} pts - ${escapeHtml(shortLegendName(s.player.deck))})</option>`
        ).join('');

        p1Select.innerHTML = '<option value="">Select Player 1...</option>' + optionsHtml;
        p2Select.innerHTML = '<option value="">Select Opponent or BYE...</option><option value="BYE">★ Assign Round BYE</option>' + optionsHtml;

        if (prevP1 && sortedPlayers.some(s => s.player.id === prevP1)) {
            p1Select.value = prevP1;
        }
        if (prevP2 === 'BYE' || (prevP2 && sortedPlayers.some(s => s.player.id === prevP2))) {
            p2Select.value = prevP2;
        }
    }

    function renderPinnedPairsList() {
        const { getState } = Riftbound.store;
        const { escapeHtml } = Riftbound.dom;
        const state = getState();

        const container = document.getElementById('pinned-pairs-container');
        const listEl = document.getElementById('pinned-pairs-list');
        if (!container || !listEl) return;

        const roundObj = state.swissRounds[state.currentRoundIndex];
        const specs = roundObj && roundObj.forcedSpecs ? roundObj.forcedSpecs : [];

        if (specs.length === 0) {
            container.classList.add('hidden');
            listEl.innerHTML = '';
            return;
        }

        const playerMap = new Map(state.players.map(p => [p.id, p]));
        container.classList.remove('hidden');
        listEl.innerHTML = specs.map((spec, idx) => {
            const p1 = playerMap.get(spec.p1);
            const p2Name = spec.p2 === 'BYE' ? 'BYE' : (playerMap.get(spec.p2)?.name || 'Unknown');
            return `
                <span class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-950/70 border border-[#DC2626]/50 text-xs text-red-200">
                    <span>📌 <strong>${escapeHtml(p1 ? p1.name : 'Unknown')}</strong> vs <strong>${escapeHtml(p2Name)}</strong></span>
                    <button type="button" data-action="remove-pin" data-pin-idx="${idx}" class="text-red-300 hover:text-white font-bold cursor-pointer" title="Remove pin" aria-label="Remove pin">✕</button>
                </span>
            `;
        }).join('');
    }

    function toggleForcePairingsPanel() {
        if (Riftbound.store.isReadOnly()) return;
        const panel = document.getElementById('force-pairings-panel');
        if (!panel) return;
        panel.classList.toggle('hidden');
        if (!panel.classList.contains('hidden')) {
            populateForcePairSelects();
            renderPinnedPairsList();
        }
    }

    function renderBannersHtml(activeIdx, activeRound, locked, readOnly, maxRounds, isFinalSwissRound, allComplete, playerMap, selectedSwapSlot) {
        const { escapeHtml } = Riftbound.dom;
        let html = '';

        if (isFinalSwissRound && allComplete) {
            html += `
                <div class="bg-sky-950/60 border border-[#38BDF8]/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-sky-200">
                    <div class="flex items-center gap-2.5">
                        <span class="text-base">🏁</span>
                        <span><strong>All ${maxRounds} Swiss Rounds Completed!</strong> Final standings and tiebreakers are ready for the Top Cut.</span>
                    </div>
                    <button type="button" data-action="switch-tab" data-tab="standings" class="px-3.5 py-1.5 bg-[#38BDF8] text-[#082F49] font-bold rounded-lg uppercase tracking-wider cursor-pointer shrink-0 transition-colors">
                        View Final Standings ➔
                    </button>
                </div>
            `;
        }

        if (locked && !readOnly) {
            html += `
                <div class="theme-card bg-[#111827] border border-slate-700/80 rounded-xl p-4 flex items-center justify-between text-xs text-[#94A3B8]">
                    <div class="flex items-center gap-2.5">
                        <span class="text-base">🔒</span>
                        <span><strong>Round ${activeRound.round} is locked.</strong> Results and pairings cannot be modified because 2 or more subsequent rounds have already started.</span>
                    </div>
                </div>
            `;
        }

        if (selectedSwapSlot && selectedSwapSlot.roundIdx === activeIdx && !locked && !readOnly) {
            const selMatch = activeRound.matches.find(m => m.id === selectedSwapSlot.matchId);
            const selPlayerId = selMatch ? selMatch[selectedSwapSlot.slot] : null;
            const selName = selPlayerId ? (playerMap.get(selPlayerId)?.name || 'Player') : 'BYE Slot';
            html += `
                <div class="bg-red-950/80 border border-[#DC2626]/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-red-200">
                    <div class="flex items-center gap-2.5">
                        <span class="text-base">⇄</span>
                        <span><strong>Swap Mode Active:</strong> Selected <strong>${escapeHtml(selName)}</strong>. Click any other Player (or BYE slot) on the tables below to swap their seats immediately.</span>
                    </div>
                    <button type="button" data-action="cancel-swap" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[#F8FAFC] font-semibold rounded-lg cursor-pointer shrink-0">
                        Cancel Swap
                    </button>
                </div>
            `;
        }

        if (activeRound.stale && !locked && !readOnly) {
            html += `
                <div class="bg-sky-950/60 border border-sky-500/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-sky-200">
                    <div class="flex items-center gap-2.5">
                        <span class="text-base">⚠️</span>
                        <span><strong>Previous round results were updated!</strong> Round ${activeRound.round} pairings may no longer reflect current standings.</span>
                    </div>
                    <button type="button" data-action="repair-round" data-round-idx="${activeIdx}" class="px-3.5 py-1.5 bg-[#38BDF8] text-[#082F49] font-bold rounded-lg uppercase tracking-wider cursor-pointer shrink-0 transition-colors">
                        ↻ Re-Pair Round ${activeRound.round} Now
                    </button>
                </div>
            `;
        }

        return html;
    }

    function renderMatchCard(m, mIdx, activeIdx, locked, readOnly, playerMap, statMap, selectedSwapSlot) {
        const { escapeHtml } = Riftbound.dom;
        const controlsDisabled = locked || readOnly;

        const p1 = playerMap.get(m.p1);
        const p2 = m.p2 ? playerMap.get(m.p2) : null;
        const s1 = statMap.get(m.p1);
        const s2 = m.p2 ? statMap.get(m.p2) : null;
        const isComplete = m.winner !== null;
        const currentScore = isComplete ? `${m.p1Wins}-${m.p2Wins}` : null;
        const isFloat = s1 && s2 && s1.points !== s2.points;

        const isP1Selected = selectedSwapSlot && selectedSwapSlot.roundIdx === activeIdx && selectedSwapSlot.matchId === m.id && selectedSwapSlot.slot === 'p1';
        const isP2Selected = selectedSwapSlot && selectedSwapSlot.roundIdx === activeIdx && selectedSwapSlot.matchId === m.id && selectedSwapSlot.slot === 'p2';

        return `
            <div class="theme-card bg-[#111827] border ${isComplete ? 'border-[#38BDF8]/40' : 'border-slate-800'} rounded-2xl p-4 sm:p-5 relative">
                <div class="flex flex-wrap justify-between items-center gap-2 mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-mono font-semibold uppercase tracking-wider text-[#94A3B8]">Table #${mIdx + 1}</span>
                        ${m.forced ? '<span class="text-[10px] px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-[#DC2626]/40 font-semibold" title="Manually forced or swapped pairing">📌 Forced</span>' : ''}
                        ${isFloat ? '<span class="text-[10px] px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-500/40" title="Pair down/up between adjacent point groups">Float Match</span>' : ''}
                    </div>
                    <div class="flex items-center gap-1.5">
                        ${!m.bye ? `
                            ${isComplete && !controlsDisabled ? `
                                <button type="button" data-action="clear-score" data-round-idx="${activeIdx}" data-match-id="${escapeHtml(m.id)}" title="Reset match score" class="text-[11px] px-2 py-0.5 rounded-lg border border-slate-800 text-[#94A3B8] hover:text-red-300 hover:border-[#DC2626]/60 transition-all cursor-pointer">
                                    Clear
                                </button>
                            ` : ''}
                            <button type="button" ${controlsDisabled ? 'disabled' : ''} data-action="set-score" data-round-idx="${activeIdx}" data-match-id="${escapeHtml(m.id)}" data-score="1-1" class="text-[11px] px-2.5 py-0.5 rounded-lg border transition-all ${controlsDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${m.winner === 'draw' ? 'bg-[#38BDF8] text-[#082F49] border-[#38BDF8] font-bold shadow' : 'border-slate-800 text-[#94A3B8] hover:text-[#F8FAFC] hover:border-slate-700'}">
                                1-1 Draw
                            </button>
                        ` : ''}
                        ${locked && !readOnly ? '<span class="text-[11px] text-slate-500 flex items-center gap-1">🔒</span>' : ''}
                        <span class="text-[11px] px-2.5 py-0.5 rounded-full font-medium ${isComplete ? 'bg-sky-950/60 text-sky-300 border border-[#38BDF8]/40' : 'bg-slate-800 text-[#94A3B8] border border-slate-700'}">
                            ${isComplete ? `Final (${m.p1Wins}-${m.p2Wins})` : 'In Progress'}
                        </span>
                    </div>
                </div>

                <div class="space-y-2.5">
                    <div class="flex justify-between items-center p-3 rounded-xl bg-[#0D1320] border transition-all ${isP1Selected ? 'border-[#DC2626] ring-2 ring-[#DC2626]/40 bg-red-950/30' : m.winner === m.p1 ? 'border-[#38BDF8]/70 bg-[#38BDF8]/10' : 'border-slate-800'}">
                        <div class="flex items-center gap-2 min-w-0 pr-2">
                            ${!controlsDisabled ? `<button type="button" data-action="swap-seat" data-round-idx="${activeIdx}" data-match-id="${escapeHtml(m.id)}" data-slot="p1" title="Click to swap this Player with another seat" aria-label="Swap seat" class="px-1.5 py-1 rounded bg-[#111827] hover:bg-red-950/80 text-[#94A3B8] hover:text-red-200 border border-slate-800 text-xs cursor-pointer shrink-0 transition-colors">⇄</button>` : ''}
                            <div class="truncate">
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-[#F8FAFC] truncate">${p1 ? escapeHtml(p1.name) : 'Unknown'}</span>
                                    ${s1 ? `<span class="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 shrink-0">${s1.points} pts (${s1.wins}-${s1.losses}-${s1.draws})</span>` : ''}
                                </div>
                                ${p1 ? renderLegendSubtext(p1.deck) : ''}
                            </div>
                        </div>
                        ${!m.bye ? `
                            <div class="flex gap-1.5 shrink-0">
                                <button type="button" ${controlsDisabled ? 'disabled' : ''} data-action="set-score" data-round-idx="${activeIdx}" data-match-id="${escapeHtml(m.id)}" data-score="2-0" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${controlsDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${currentScore === '2-0' ? 'bg-[#38BDF8] text-[#082F49] shadow' : 'bg-slate-800 text-[#F8FAFC] hover:bg-slate-700'}">2-0</button>
                                <button type="button" ${controlsDisabled ? 'disabled' : ''} data-action="set-score" data-round-idx="${activeIdx}" data-match-id="${escapeHtml(m.id)}" data-score="2-1" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${controlsDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${currentScore === '2-1' ? 'bg-[#38BDF8] text-[#082F49] shadow' : 'bg-slate-800 text-[#F8FAFC] hover:bg-slate-700'}">2-1</button>
                            </div>
                        ` : '<span class="text-xs font-bold text-sky-400 px-2.5 py-1 bg-sky-950/50 rounded-lg border border-sky-500/40 shrink-0">2-0 (BYE)</span>'}
                    </div>

                    ${p2 ? `
                        <div class="flex justify-between items-center p-3 rounded-xl bg-[#0D1320] border transition-all ${isP2Selected ? 'border-[#DC2626] ring-2 ring-[#DC2626]/40 bg-red-950/30' : m.winner === m.p2 ? 'border-[#38BDF8]/70 bg-[#38BDF8]/10' : 'border-slate-800'}">
                            <div class="flex items-center gap-2 min-w-0 pr-2">
                                ${!controlsDisabled ? `<button type="button" data-action="swap-seat" data-round-idx="${activeIdx}" data-match-id="${escapeHtml(m.id)}" data-slot="p2" title="Click to swap this Player with another seat" aria-label="Swap seat" class="px-1.5 py-1 rounded bg-[#111827] hover:bg-red-950/80 text-[#94A3B8] hover:text-red-200 border border-slate-800 text-xs cursor-pointer shrink-0 transition-colors">⇄</button>` : ''}
                                <div class="truncate">
                                    <div class="flex items-center gap-2">
                                        <span class="font-bold text-[#F8FAFC] truncate">${escapeHtml(p2.name)}</span>
                                        ${s2 ? `<span class="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 shrink-0">${s2.points} pts (${s2.wins}-${s2.losses}-${s2.draws})</span>` : ''}
                                    </div>
                                    ${renderLegendSubtext(p2.deck)}
                                </div>
                            </div>
                            <div class="flex gap-1.5 shrink-0">
                                <button type="button" ${controlsDisabled ? 'disabled' : ''} data-action="set-score" data-round-idx="${activeIdx}" data-match-id="${escapeHtml(m.id)}" data-score="0-2" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${controlsDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${currentScore === '0-2' ? 'bg-[#38BDF8] text-[#082F49] shadow' : 'bg-slate-800 text-[#F8FAFC] hover:bg-slate-700'}">2-0</button>
                                <button type="button" ${controlsDisabled ? 'disabled' : ''} data-action="set-score" data-round-idx="${activeIdx}" data-match-id="${escapeHtml(m.id)}" data-score="1-2" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${controlsDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${currentScore === '1-2' ? 'bg-[#38BDF8] text-[#082F49] shadow' : 'bg-slate-800 text-[#F8FAFC] hover:bg-slate-700'}">2-1</button>
                            </div>
                        </div>
                    ` : `
                        <div class="p-3 rounded-xl bg-[#0D1320] border border-slate-800/60 text-center text-slate-500 text-xs italic">
                            Lowest-ranked eligible Player receives Round BYE (+3 Match Points, 2-0 Games)
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    function renderSwissRounds() {
        const { calculateStandingsData } = Riftbound.standings;
        const { isRoundLocked } = Riftbound.swiss;
        const { getState, getSelectedSwapSlot, getEffectiveMaxRounds, isReadOnly } = Riftbound.store;
        const state = getState();
        const selectedSwapSlot = getSelectedSwapSlot();
        const readOnly = isReadOnly();

        const controlsRow = document.getElementById('swiss-controls-row');
        const roundTabsContainer = document.getElementById('round-tabs');
        const bannersContainer = document.getElementById('swiss-banners-container');
        const container = document.getElementById('swiss-rounds-container');
        const nextRoundBtn = document.getElementById('next-round-btn');
        const repairRoundBtn = document.getElementById('repair-round-btn');
        const forcePairBtn = document.getElementById('force-pair-btn');
        const forcePanel = document.getElementById('force-pairings-panel');
        const counterBadge = document.getElementById('swiss-round-counter-badge');
        const progressBadge = document.getElementById('swiss-progress-badge');
        const searchInput = document.getElementById('swiss-search-input');
        const filterSelect = document.getElementById('swiss-filter-select');

        if (!roundTabsContainer || !bannersContainer || !container || !nextRoundBtn || !repairRoundBtn || !forcePairBtn) return;

        if (state.swissRounds.length === 0) {
            roundTabsContainer.innerHTML = '';
            bannersContainer.innerHTML = '';
            repairRoundBtn.classList.add('hidden');
            forcePairBtn.classList.add('hidden');
            if (controlsRow) controlsRow.classList.add('hidden');
            if (counterBadge) counterBadge.classList.add('hidden');
            if (progressBadge) progressBadge.classList.add('hidden');
            if (forcePanel) forcePanel.classList.add('hidden');
            container.innerHTML = `
                <div class="theme-card bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                    <p class="mb-4">No Swiss rounds generated yet.</p>
                    <button type="button" data-action="switch-tab" data-tab="players" class="px-5 py-2.5 bg-[#38BDF8] text-[#082F49] font-bold rounded-xl cursor-pointer">Go to Players</button>
                </div>`;
            nextRoundBtn.disabled = true;
            nextRoundBtn.textContent = 'Next Round ➔';
            return;
        }

        if (controlsRow) controlsRow.classList.remove('hidden');

        if (state.currentRoundIndex >= state.swissRounds.length) {
            state.currentRoundIndex = state.swissRounds.length - 1;
        }

        const activeIdx = state.currentRoundIndex;
        const activeRound = state.swissRounds[activeIdx];
        const locked = isRoundLocked(activeIdx, state.swissRounds);
        const maxRounds = getEffectiveMaxRounds();

        const completedInActive = activeRound.matches.filter(m => m.winner !== null).length;
        const totalInActive = activeRound.matches.length;

        if (counterBadge) {
            counterBadge.classList.remove('hidden');
            counterBadge.textContent = `Round ${activeRound.round} of ${maxRounds}`;
        }

        if (progressBadge) {
            progressBadge.classList.remove('hidden');
            progressBadge.textContent = `${completedInActive} / ${totalInActive} Scored`;
        }

        if (!locked && !readOnly) {
            repairRoundBtn.classList.remove('hidden');
            repairRoundBtn.disabled = false;
            repairRoundBtn.textContent = `↻ Re-Pair Round ${activeRound.round}`;
            forcePairBtn.classList.remove('hidden');
            forcePairBtn.disabled = false;
            populateForcePairSelects();
            renderPinnedPairsList();
        } else if (readOnly) {
            repairRoundBtn.classList.remove('hidden');
            repairRoundBtn.disabled = true;
            repairRoundBtn.textContent = `↻ Re-Pair Round ${activeRound.round}`;
            forcePairBtn.classList.remove('hidden');
            forcePairBtn.disabled = true;
            if (forcePanel) forcePanel.classList.add('hidden');
        } else {
            repairRoundBtn.classList.add('hidden');
            forcePairBtn.classList.add('hidden');
            if (forcePanel) forcePanel.classList.add('hidden');
        }

        roundTabsContainer.innerHTML = state.swissRounds.map((r, idx) => {
            const rLocked = isRoundLocked(idx, state.swissRounds);
            const isCurrent = idx === activeIdx;
            const rDone = r.matches.length > 0 && r.matches.every(m => m.winner !== null);
            return `
                <button type="button" data-action="select-round" data-round-idx="${idx}" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${isCurrent ? 'bg-[#38BDF8] text-[#082F49] shadow' : 'text-[#94A3B8] hover:text-[#F8FAFC]'}">
                    <span>Round ${r.round}</span>
                    ${rLocked && !readOnly ? '<span title="Locked (2+ rounds passed)">🔒</span>' : rDone ? '<span title="All matches scored">✓</span>' : ''}
                    ${r.stale && !readOnly ? '<span title="Previous round results changed — Re-pair recommended" class="text-sky-300">⚠️</span>' : ''}
                </button>
            `;
        }).join('');

        const playerMap = new Map(state.players.map(p => [p.id, p]));
        const latestRound = state.swissRounds[state.swissRounds.length - 1];
        const allComplete = latestRound.matches.every(m => m.winner !== null);
        const isFinalSwissRound = state.swissRounds.length >= maxRounds;

        bannersContainer.innerHTML = renderBannersHtml(
            activeIdx,
            activeRound,
            locked,
            readOnly,
            maxRounds,
            isFinalSwissRound,
            allComplete,
            playerMap,
            selectedSwapSlot
        );

        const enteringStandings = calculateStandingsData(state.players, state.swissRounds, activeIdx);
        const statMap = new Map(enteringStandings.map(s => [s.player.id, s]));

        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        const statusFilter = filterSelect ? filterSelect.value : 'all';

        const filteredMatches = activeRound.matches
            .map((m, mIdx) => ({ m, mIdx }))
            .filter(({ m, mIdx }) => {
                if (statusFilter === 'pending' && m.winner !== null) return false;
                if (statusFilter === 'completed' && m.winner === null) return false;
                if (!query) return true;

                const tableStr = `table #${mIdx + 1} ${mIdx + 1}`;
                const p1Name = (playerMap.get(m.p1)?.name || '').toLowerCase();
                const p2Name = (m.p2 ? playerMap.get(m.p2)?.name || '' : 'bye').toLowerCase();
                return tableStr.includes(query) || p1Name.includes(query) || p2Name.includes(query);
            });

        if (filteredMatches.length === 0) {
            container.innerHTML = `
                <div class="theme-card bg-[#111827] border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm italic">
                    No tables match the current search or filter.
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${filteredMatches.map(({ m, mIdx }) => renderMatchCard(m, mIdx, activeIdx, locked, readOnly, playerMap, statMap, selectedSwapSlot)).join('')}
                </div>
            `;
        }

        nextRoundBtn.disabled = readOnly || !allComplete;
        nextRoundBtn.textContent = isFinalSwissRound
            ? 'Finish Swiss (Standings) ➔'
            : `Next Round (${state.swissRounds.length + 1}/${maxRounds}) ➔`;
    }

    Riftbound.swissView = {
        populateForcePairSelects,
        renderPinnedPairsList,
        toggleForcePairingsPanel,
        renderSwissRounds
    };
})();
