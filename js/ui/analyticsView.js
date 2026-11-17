(() => {
    const Riftbound = (window.Riftbound = window.Riftbound || {});

    function renderMetaBreakdown() {
        const { calculateMetaStats } = Riftbound.analytics;
        const { getState, getEffectiveMaxRounds } = Riftbound.store;
        const { escapeHtml } = Riftbound.dom;
        const state = getState();

        const kpiContainer = document.getElementById('meta-kpi-container');
        const barsContainer = document.getElementById('meta-bars-container');
        const tbody = document.getElementById('meta-table-body');
        const sortSelect = document.getElementById('meta-sort-select');

        if (!kpiContainer || !barsContainer || !tbody) return;

        const { totalPlayers, statsList, hasTopCut } = calculateMetaStats(
            state.players,
            state.swissRounds,
            state.eliminationBracket
        );

        if (totalPlayers === 0) {
            kpiContainer.innerHTML = `
                <div class="theme-card col-span-full bg-[#1C1917] border border-stone-800 rounded-2xl p-8 text-center text-stone-500 italic">
                    No Players registered yet. Add players on the Players tab to generate the Meta Breakdown.
                </div>
            `;
            barsContainer.innerHTML = '<p class="text-stone-500 italic text-center py-8 text-sm">No Legend representation data.</p>';
            tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-stone-500 italic">Register players to view Legend analytics.</td></tr>';
            return;
        }

        const byPopularity = [...statsList].sort((a, b) => b.pilots - a.pilots || b.matchWinRate - a.matchWinRate);
        const mostPopular = byPopularity[0];

        const withMatches = statsList.filter(s => s.matchesPlayed > 0);
        const byWinRate = [...withMatches].sort((a, b) => b.matchWinRate - a.matchWinRate || b.matchesPlayed - a.matchesPlayed);
        const bestPerforming = byWinRate[0] || null;

        kpiContainer.innerHTML = `
            <div class="theme-card bg-[#1C1917] border border-stone-800 rounded-2xl p-5">
                <div class="text-xs uppercase tracking-wider text-[#A8A29E] font-semibold">Total Players</div>
                <div class="text-3xl font-black font-arcane text-[#FAFAF9] mt-1">${totalPlayers}</div>
                <div class="text-xs text-stone-500 mt-1">${state.swissRounds.length} / ${getEffectiveMaxRounds()} Swiss Round(s)</div>
            </div>
            <div class="theme-card bg-[#1C1917] border border-stone-800 rounded-2xl p-5">
                <div class="text-xs uppercase tracking-wider text-[#A8A29E] font-semibold">Unique Legends</div>
                <div class="text-3xl font-black font-arcane text-amber-400 mt-1">${statsList.length} <span class="text-sm font-normal text-stone-500">/ 58</span></div>
                <div class="text-xs text-stone-500 mt-1">Diversity Index: ${((statsList.length / totalPlayers) * 100).toFixed(0)}%</div>
            </div>
            <div class="theme-card bg-[#1C1917] border border-stone-800 rounded-2xl p-5">
                <div class="text-xs uppercase tracking-wider text-[#A8A29E] font-semibold">Most Played Legend</div>
                <div class="text-base font-bold text-amber-300 mt-1 truncate" title="${escapeHtml(mostPopular.legend)}">${escapeHtml(mostPopular.legend)}</div>
                <div class="text-xs text-[#A8A29E] mt-1 font-mono">${mostPopular.pilots} Pilot(s) • ${mostPopular.metaShare.toFixed(1)}% of Field</div>
            </div>
            <div class="theme-card bg-[#1C1917] border border-stone-800 rounded-2xl p-5">
                <div class="text-xs uppercase tracking-wider text-[#A8A29E] font-semibold">Highest Match Win %</div>
                <div class="text-base font-bold text-amber-400 mt-1 truncate" title="${bestPerforming ? escapeHtml(bestPerforming.legend) : 'N/A'}">
                    ${bestPerforming ? escapeHtml(bestPerforming.legend) : 'Awaiting Results'}
                </div>
                <div class="text-xs text-[#A8A29E] mt-1 font-mono">
                    ${bestPerforming ? `${bestPerforming.matchWinRate.toFixed(1)}% (${bestPerforming.matchWins}-${bestPerforming.matchLosses}-${bestPerforming.matchDraws})` : 'Complete Swiss matches'}
                </div>
            </div>
        `;

        barsContainer.innerHTML = byPopularity.map(item => `
            <div class="space-y-1.5">
                <div class="flex justify-between items-center text-xs">
                    <span class="font-semibold text-[#FAFAF9] truncate pr-2">${escapeHtml(item.legend)}</span>
                    <span class="font-mono text-amber-400 shrink-0">${item.pilots} (${item.metaShare.toFixed(1)}%)</span>
                </div>
                <div class="w-full h-2.5 bg-[#141210] rounded-full overflow-hidden border border-stone-800">
                    <div class="h-full bg-gradient-to-r from-[#DC2626] via-amber-600 to-[#F59E0B] rounded-full transition-all duration-300" style="width: ${Math.max(item.metaShare, 3)}%"></div>
                </div>
                <div class="text-[11px] text-stone-500 truncate">Players: ${item.pilotNames.map(n => escapeHtml(n)).join(', ')}</div>
            </div>
        `).join('');

        const sortMode = sortSelect ? sortSelect.value : 'pilots';
        const sortedTable = [...statsList].sort((a, b) => {
            if (sortMode === 'winrate') {
                if (b.matchWinRate !== a.matchWinRate) return b.matchWinRate - a.matchWinRate;
                return b.matchesPlayed - a.matchesPlayed;
            }
            if (sortMode === 'gamewinrate') {
                if (b.gameWinRate !== a.gameWinRate) return b.gameWinRate - a.gameWinRate;
                return b.gamesPlayed - a.gamesPlayed;
            }
            if (sortMode === 'topcut') {
                if (b.topCutCount !== a.topCutCount) return b.topCutCount - a.topCutCount;
                return b.conversionRate - a.conversionRate;
            }
            if (b.pilots !== a.pilots) return b.pilots - a.pilots;
            return b.matchWinRate - a.matchWinRate;
        });

        tbody.innerHTML = sortedTable.map(item => {
            const mwBadgeColor = item.matchesPlayed === 0
                ? 'text-stone-500'
                : item.matchWinRate >= 60
                ? 'text-amber-400 font-bold'
                : item.matchWinRate < 40
                ? 'text-red-400'
                : 'text-[#FAFAF9]';

            return `
                <tr class="hover:bg-stone-900/50 transition-colors">
                    <td class="p-3.5">
                        <div class="font-semibold text-amber-400/90">${escapeHtml(item.legend)}</div>
                        <div class="text-[11px] text-stone-500 truncate max-w-xs">${item.pilotNames.map(n => escapeHtml(n)).join(', ')}</div>
                    </td>
                    <td class="p-3.5 text-center font-mono font-bold text-[#FAFAF9]">${item.pilots}</td>
                    <td class="p-3.5 text-center font-mono text-[#A8A29E]">${item.metaShare.toFixed(1)}%</td>
                    <td class="p-3.5 text-center font-mono text-[#FAFAF9]">${item.matchWins}-${item.matchLosses}-${item.matchDraws}</td>
                    <td class="p-3.5 text-center font-mono ${mwBadgeColor}">
                        ${item.matchesPlayed > 0 ? `${item.matchWinRate.toFixed(1)}%` : '—'}
                    </td>
                    <td class="p-3.5 text-center font-mono text-[#A8A29E]">
                        ${item.gamesPlayed > 0 ? `${item.gameWinRate.toFixed(1)}% <span class="text-[11px] text-stone-500">(${item.gameWins}-${item.gameLosses})</span>` : '—'}
                    </td>
                    <td class="p-3.5 text-center font-mono">
                        ${hasTopCut
                            ? `<span class="px-2 py-0.5 rounded text-xs ${item.topCutCount > 0 ? 'bg-[#F59E0B]/20 text-amber-300 border border-[#F59E0B]/40 font-bold' : 'text-stone-500'}">${item.topCutCount} / ${item.pilots} (${item.conversionRate.toFixed(0)}%)</span>`
                            : '<span class="text-xs text-stone-600 italic">Pending Cut</span>'
                        }
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderWinrateMatrix() {
        const { shortLegendName } = Riftbound.legends;
        const { calculateWinrateMatrixData } = Riftbound.analytics;
        const { getState } = Riftbound.store;
        const { escapeHtml } = Riftbound.dom;
        const state = getState();

        const container = document.getElementById('winrate-matrix-container');
        if (!container) return;

        if (state.players.length === 0) {
            container.innerHTML = '<div class="p-12 text-center text-stone-500 italic">No Players registered yet. Add players and record match results to populate the Winrate Matrix.</div>';
            return;
        }

        const includeElim = document.getElementById('matrix-include-elim')?.checked ?? true;
        const metric = document.getElementById('matrix-metric-select')?.value || 'match';

        const { activeLegends, matrix } = calculateWinrateMatrixData(
            state.players,
            state.swissRounds,
            state.eliminationBracket,
            includeElim
        );

        container.innerHTML = `
            <table class="w-full text-left border-collapse text-xs">
                <thead>
                    <tr class="bg-stone-900/90 text-[#A8A29E] border-b border-stone-800">
                        <th class="p-3.5 font-semibold sticky left-0 bg-stone-900 z-10 border-r border-stone-800 min-w-[180px]">
                            Row vs. Column
                        </th>
                        <th class="p-3 font-semibold text-center bg-stone-900/60 border-r border-stone-800 min-w-[95px]">
                            Overall (Non-Mirror)
                        </th>
                        ${activeLegends.map(colLegend => `
                            <th class="p-3 font-semibold text-center border-r border-stone-800/60 min-w-[105px]" title="${escapeHtml(colLegend)}">
                                <div class="text-amber-400 font-bold truncate">${escapeHtml(shortLegendName(colLegend))}</div>
                                <div class="text-[10px] text-stone-500 font-normal truncate">${escapeHtml(colLegend.split(',')[1] || '')}</div>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody class="divide-y divide-stone-800/70">
                    ${activeLegends.map(rowLegend => {
                        let totalM = 0, totalMW = 0, totalML = 0, totalMD = 0;
                        let totalG = 0, totalGW = 0, totalGL = 0;

                        activeLegends.forEach(colLegend => {
                            if (rowLegend === colLegend) return;
                            const c = matrix[rowLegend][colLegend];
                            totalM += c.matches;
                            totalMW += c.mWins;
                            totalML += c.mLosses;
                            totalMD += c.mDraws;
                            totalG += c.games;
                            totalGW += c.gWins;
                            totalGL += c.gLosses;
                        });

                        const overallSample = metric === 'game' ? totalG : totalM;
                        const overallWinPct = overallSample > 0
                            ? ((metric === 'game' ? totalGW : totalMW) / overallSample) * 100
                            : null;
                        const overallRecordStr = metric === 'game'
                            ? `${totalGW}-${totalGL}`
                            : `${totalMW}-${totalML}${totalMD > 0 ? `-${totalMD}` : ''}`;

                        return `
                            <tr class="hover:bg-stone-900/30 transition-colors">
                                <td class="p-3.5 font-semibold sticky left-0 bg-[#141210] z-10 border-r border-stone-800" title="${escapeHtml(rowLegend)}">
                                    <div class="text-[#FAFAF9] truncate">${escapeHtml(shortLegendName(rowLegend))}</div>
                                    <div class="text-[10px] text-amber-400/80 font-normal truncate">${escapeHtml(rowLegend.split(',')[1] || '')}</div>
                                </td>
                                <td class="p-3 text-center font-mono border-r border-stone-800 bg-stone-900/30">
                                    ${overallWinPct !== null ? `
                                        <div class="font-bold ${overallWinPct > 55 ? 'text-emerald-400' : overallWinPct < 45 ? 'text-red-400' : 'text-amber-300'}">${overallWinPct.toFixed(0)}%</div>
                                        <div class="text-[10px] text-[#A8A29E]">(${overallRecordStr})</div>
                                    ` : '<span class="text-stone-600">—</span>'}
                                </td>
                                ${activeLegends.map(colLegend => {
                                    const cell = matrix[rowLegend][colLegend];

                                    if (rowLegend === colLegend) {
                                        return `
                                            <td class="p-3 text-center font-mono bg-stone-900/40 border-r border-stone-800/60 text-stone-500" title="Mirror Match (${escapeHtml(shortLegendName(rowLegend))})">
                                                <div class="text-[10px] uppercase tracking-wider">Mirror</div>
                                                <div class="text-[10px] text-stone-600">${cell.matches > 0 ? `${cell.matches} played` : '—'}</div>
                                            </td>
                                        `;
                                    }

                                    const sample = metric === 'game' ? cell.games : cell.matches;
                                    if (sample === 0) {
                                        return '<td class="p-3 text-center font-mono border-r border-stone-800/60 text-stone-700">—</td>';
                                    }

                                    const wins = metric === 'game' ? cell.gWins : cell.mWins;
                                    const losses = metric === 'game' ? cell.gLosses : cell.mLosses;
                                    const winPct = (wins / sample) * 100;
                                    const recordText = metric === 'game'
                                        ? `${wins}-${losses}`
                                        : `${wins}-${losses}${cell.mDraws > 0 ? `-${cell.mDraws}` : ''}`;

                                    let cellStyle = 'bg-amber-950/30 text-amber-300';
                                    if (winPct > 55) {
                                        cellStyle = 'bg-emerald-950/50 text-emerald-300';
                                    } else if (winPct < 45) {
                                        cellStyle = 'bg-red-950/50 text-red-300';
                                    }

                                    return `
                                        <td class="p-3 text-center font-mono border-r border-stone-800/60 ${cellStyle}" title="${escapeHtml(shortLegendName(rowLegend))} vs ${escapeHtml(shortLegendName(colLegend))}: ${recordText} (${winPct.toFixed(1)}%)">
                                            <div class="font-bold">${winPct.toFixed(0)}%</div>
                                            <div class="text-[10px] opacity-80">(${recordText})</div>
                                        </td>
                                    `;
                                }).join('')}
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    Riftbound.analyticsView = {
        renderMetaBreakdown,
        renderWinrateMatrix
    };
})();
