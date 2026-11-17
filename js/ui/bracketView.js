(() => {
    const Riftbound = (window.Riftbound = window.Riftbound || {});

    function renderBracketDeckLabel(deck) {
        const { formatDeckLabel } = Riftbound.legends;
        const { escapeHtml } = Riftbound.dom;
        const label = formatDeckLabel(deck);
        const isUnassigned = label === 'Unassigned';
        return `<div class="text-[11px] truncate ${isUnassigned ? 'text-stone-500 italic' : 'text-amber-400/80'}">${escapeHtml(label)}</div>`;
    }

    function renderEliminationBracket() {
        const { formatDeckLabel } = Riftbound.legends;
        const { getState } = Riftbound.store;
        const { escapeHtml } = Riftbound.dom;
        const state = getState();

        const container = document.getElementById('elimination-bracket-container');
        if (!container) return;

        if (!state.eliminationBracket || !state.eliminationBracket.rounds) {
            container.innerHTML = '<p class="text-stone-500 italic text-center py-12">Complete Swiss rounds or click Build / Reset Bracket to populate playoffs.</p>';
            return;
        }

        const cutSelect = document.getElementById('cut-size-select');
        if (cutSelect && state.eliminationBracket.cutSize) {
            cutSelect.value = String(state.eliminationBracket.cutSize);
        }

        const { rounds } = state.eliminationBracket;
        const roundNames = rounds.length === 2
            ? ['Semifinals', 'Grand Finals']
            : rounds.length === 3
            ? ['Quarterfinals', 'Semifinals', 'Grand Finals']
            : ['Round of 16', 'Quarterfinals', 'Semifinals', 'Grand Finals'];

        const finalMatch = rounds[rounds.length - 1][0];
        const champion = finalMatch ? finalMatch.winner : null;

        container.innerHTML = `
            ${champion ? `
                <div class="mb-8 p-6 rounded-2xl bg-gradient-to-r from-amber-950/60 via-red-950/40 to-amber-950/60 border border-[#F59E0B]/50 text-center shadow-xl">
                    <div class="text-xs uppercase tracking-widest text-amber-400 font-bold mb-1">👑 Riftbound Tournament Champion</div>
                    <div class="text-2xl font-black font-arcane text-[#FAFAF9]">${escapeHtml(champion.name)}</div>
                    <div class="text-sm text-amber-400/90 mt-0.5">${escapeHtml(formatDeckLabel(champion.deck))}</div>
                </div>
            ` : ''}
            <div class="flex flex-col lg:flex-row gap-8 justify-start items-stretch min-w-max px-2">
                ${rounds.map((rMatches, rIdx) => `
                    <div class="flex flex-col justify-around space-y-6 w-72">
                        <h3 class="text-xs uppercase tracking-wider font-bold text-amber-400 text-center border-b border-stone-800 pb-2">
                            ${roundNames[rIdx] || `Round ${rIdx + 1}`}
                        </h3>
                        <div class="flex flex-col justify-around flex-grow space-y-4">
                            ${rMatches.map((m, mIdx) => {
                                const p1 = m.p1;
                                const p2 = m.p2;
                                const p1Won = m.winner && p1 && m.winner.id === p1.id;
                                const p2Won = m.winner && p2 && m.winner.id === p2.id;

                                return `
                                    <div class="bg-[#141210] border border-stone-800 rounded-xl p-3.5 shadow-md space-y-2">
                                        <div data-action="advance-elim" data-round-idx="${rIdx}" data-match-idx="${mIdx}" data-slot="p1" class="flex justify-between items-center p-2.5 rounded-lg border transition-all ${p1 && p1.id ? 'cursor-pointer hover:border-[#F59E0B]/50' : 'opacity-50'} ${p1Won ? 'border-[#F59E0B] bg-[#F59E0B]/10' : 'border-stone-800/80 bg-[#1C1917]'}">
                                            <div class="truncate pr-2">
                                                <div class="text-xs font-bold text-[#FAFAF9] truncate">
                                                    ${p1 ? `<span class="text-stone-500 font-mono mr-1">#${p1.seed || '-'}</span>${escapeHtml(p1.name)}` : '<span class="text-stone-600 italic">TBD</span>'}
                                                </div>
                                                ${p1 && p1.id ? renderBracketDeckLabel(p1.deck) : ''}
                                            </div>
                                            ${p1Won ? '<span class="text-amber-400 text-xs font-bold">✓</span>' : ''}
                                        </div>

                                        <div data-action="advance-elim" data-round-idx="${rIdx}" data-match-idx="${mIdx}" data-slot="p2" class="flex justify-between items-center p-2.5 rounded-lg border transition-all ${p2 && p2.id ? 'cursor-pointer hover:border-[#F59E0B]/50' : 'opacity-50'} ${p2Won ? 'border-[#F59E0B] bg-[#F59E0B]/10' : 'border-stone-800/80 bg-[#1C1917]'}">
                                            <div class="truncate pr-2">
                                                <div class="text-xs font-bold text-[#FAFAF9] truncate">
                                                    ${p2 ? `<span class="text-stone-500 font-mono mr-1">#${p2.seed || '-'}</span>${escapeHtml(p2.name)}` : '<span class="text-stone-600 italic">TBD</span>'}
                                                </div>
                                                ${p2 && p2.id ? renderBracketDeckLabel(p2.deck) : ''}
                                            </div>
                                            ${p2Won ? '<span class="text-amber-400 text-xs font-bold">✓</span>' : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    Riftbound.bracketView = {
        renderEliminationBracket
    };
})();
