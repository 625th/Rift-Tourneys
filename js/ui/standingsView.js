(() => {
    const Riftbound = (window.Riftbound = window.Riftbound || {});

    function renderStandings() {
        const { formatDeckLabel } = Riftbound.legends;
        const { getSortedStandings } = Riftbound.standings;
        const { getState, isReadOnly } = Riftbound.store;
        const { escapeHtml } = Riftbound.dom;
        const state = getState();
        const readOnly = isReadOnly();

        const tbody = document.getElementById('standings-table-body');
        const cutBtn = document.getElementById('generate-cut-btn');
        if (!tbody || !cutBtn) return;

        if (state.swissRounds.length === 0) {
            cutBtn.disabled = true;
            tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-stone-500 italic">No active Swiss tournament. Generate Round 1 Pairings on the Players tab to view standings.</td></tr>';
            return;
        }

        cutBtn.disabled = readOnly;
        const standings = getSortedStandings(state.players, state.swissRounds);

        tbody.innerHTML = standings.map((s, idx) => {
            const deckLabel = formatDeckLabel(s.player.deck);
            const isUnassigned = deckLabel === 'Unassigned';
            return `
                <tr class="border-b border-stone-800 last:border-b-0 hover:bg-stone-900/50 transition-colors ${s.player.active === false ? 'opacity-65' : ''}">
                    <td class="p-3.5 text-center font-mono font-bold text-amber-400">${idx + 1}</td>
                    <td class="p-3.5 font-semibold text-[#FAFAF9]">
                        <span>${escapeHtml(s.player.name)}</span>
                        ${s.player.active === false ? '<span class="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-950/70 text-red-300 border border-[#DC2626]/50">Dropped</span>' : ''}
                    </td>
                    <td class="p-3.5 ${isUnassigned ? 'text-stone-500 italic' : 'text-amber-400/90'}">${escapeHtml(deckLabel)}</td>
                    <td class="p-3.5 text-center font-mono">${s.wins}-${s.losses}-${s.draws}</td>
                    <td class="p-3.5 text-center font-mono font-bold text-amber-400">${s.points}</td>
                    <td class="p-3.5 text-center font-mono text-[#A8A29E]">${(s.omw * 100).toFixed(1)}%</td>
                    <td class="p-3.5 text-center font-mono text-[#A8A29E]">${(s.gw * 100).toFixed(1)}%</td>
                    <td class="p-3.5 text-center font-mono text-[#A8A29E]">${(s.ogw * 100).toFixed(1)}%</td>
                </tr>
            `;
        }).join('');
    }

    Riftbound.standingsView = {
        renderStandings
    };
})();
