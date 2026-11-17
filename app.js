// Official 58 Legends in Riftbound TCG (Source: riftwatch.gg/legends)
const RIFTBOUND_LEGENDS = [
    "Ahri, Nine-Tailed Fox",
    "Akali, Rogue Assassin",
    "Ambessa, Matriarch of War",
    "Annie, Dark Child",
    "Azir, Emperor of the Sands",
    "Darius, Hand of Noxus",
    "Diana, Scorn of the Moon",
    "Draven, Glorious Executioner",
    "Ekko, Boy Who Shattered Time",
    "Evelynn, Agony's Embrace",
    "Ezreal, Prodigal Explorer",
    "Fiora, Grand Duelist",
    "Garen, Might of Demacia",
    "Irelia, Blade Dancer",
    "Ivern, Green Father",
    "Jarvan IV, Exemplar of Demacia",
    "Jax, Grandmaster at Arms",
    "Jayce, Defender of Tomorrow",
    "Jhin, Virtuoso",
    "Jinx, Loose Cannon",
    "K'Sante, Pride of Nazumah",
    "Kai'Sa, Daughter of the Void",
    "Kennen, Heart of the Tempest",
    "Kha'Zix, Voidreaver",
    "LeBlanc, Deceiver",
    "Lee Sin, Blind Monk",
    "Leona, Radiant Dawn",
    "Lillia, Bashful Bloom",
    "Lucian, Purifier",
    "Lux, Lady of Luminosity",
    "Master Yi, Wuju Bladesman",
    "Master Yi, Wuju Master",
    "Mel, Soul's Reflection",
    "Miss Fortune, Bounty Hunter",
    "Mordekaiser, Iron Revenant",
    "Nasus, Curator of the Sands",
    "Orianna, Lady of Clockwork",
    "Ornn, Fire Below the Mountain",
    "Poppy, Keeper of the Hammer",
    "Pyke, Bloodharbor Ripper",
    "Rek'Sai, Void Burrower",
    "Renata Glasc, Chem-Baroness",
    "Renekton, Butcher of the Sands",
    "Rengar, Pridestalker",
    "Riven, The Exile",
    "Rumble, Mechanized Menace",
    "Seraphine, Starry-Eyed Songstress",
    "Sett, The Boss",
    "Shen, Eye of Twilight",
    "Sivir, Battle Mistress",
    "Teemo, Swift Scout",
    "Vex, Gloomist",
    "Vi, Piltover Enforcer",
    "Viktor, Herald of the Arcane",
    "Volibear, Relentless Storm",
    "Yasuo, Unforgiven",
    "Zed, Master of Shadows",
    "Ziggs, Hexplosives Expert"
];

// Application State
let state = {
    players: [],
    swissRounds: [],
    currentRoundIndex: 0,
    eliminationBracket: null
};

let modalCallback = null;
let selectedSwapSlot = null; // { roundIdx, matchId, slot: 'p1' | 'p2' }

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
    populateLegendDropdown();
    loadState();
    renderAll();
});

function populateLegendDropdown() {
    const select = document.getElementById('p-deck');
    select.innerHTML = '<option value="" selected>No Legend Selected (Optional)</option>';
    RIFTBOUND_LEGENDS.forEach(legend => {
        const opt = document.createElement('option');
        opt.value = legend;
        opt.textContent = legend;
        select.appendChild(opt);
    });
}

function saveState() {
    localStorage.setItem('riftbound_tournament_state', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('riftbound_tournament_state');
    if (saved) {
        try {
            state = JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse saved state", e);
        }
    }
}

function renderAll() {
    renderPlayers();
    renderSwissRounds();
    calculateStandings();
    renderEliminationBracket();
    renderMetaBreakdown();
    renderWinrateMatrix();
}

function formatDeckLabel(deck) {
    return deck && deck.trim() ? deck.trim() : 'Unassigned';
}

// Custom Modal Helpers
function openModal(title, messageHtml, onConfirm, singleButton = false) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').innerHTML = messageHtml;
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const confirmBtn = document.getElementById('modal-confirm-btn');

    if (singleButton) {
        cancelBtn.classList.add('hidden');
        confirmBtn.textContent = 'Close';
    } else {
        cancelBtn.classList.remove('hidden');
        confirmBtn.textContent = 'Confirm';
    }

    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modalCallback = onConfirm;

    confirmBtn.onclick = () => {
        if (modalCallback) modalCallback();
        closeModal();
    };
}

function closeModal() {
    const modal = document.getElementById('confirm-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modalCallback = null;
}

function promptResetTournament() {
    openModal(
        "Reset Entire Tournament",
        "Are you sure you want to clear all registered summoners, Swiss rounds, standings, and playoff brackets?",
        () => {
            state = { players: [], swissRounds: [], currentRoundIndex: 0, eliminationBracket: null };
            selectedSwapSlot = null;
            saveState();
            renderAll();
            switchTab('players');
        }
    );
}

// Navigation
function switchTab(tabId) {
    ['players', 'swiss', 'standings', 'elimination', 'meta', 'matrix'].forEach(id => {
        document.getElementById(`tab-${id}`).classList.add('hidden');
        document.getElementById(`nav-${id}`).classList.remove('bg-amber-500', 'text-slate-950', 'font-semibold', 'shadow');
        document.getElementById(`nav-${id}`).classList.add('text-slate-400');
    });
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    document.getElementById(`nav-${tabId}`).classList.add('bg-amber-500', 'text-slate-950', 'font-semibold', 'shadow');
    document.getElementById(`nav-${tabId}`).classList.remove('text-slate-400');

    if (tabId === 'standings') calculateStandings();
    if (tabId === 'swiss') renderSwissRounds();
    if (tabId === 'elimination') renderEliminationBracket();
    if (tabId === 'meta') renderMetaBreakdown();
    if (tabId === 'matrix') renderWinrateMatrix();
}

// ============================================================================
// PLAYER REGISTRATION, LEGEND EDITING & TXT BULK IMPORT
// ============================================================================

function addPlayer(e) {
    e.preventDefault();
    const nameInput = document.getElementById('p-name');
    const deckInput = document.getElementById('p-deck');

    if (!nameInput.value.trim()) return;

    const newPlayer = {
        id: 'p_' + Math.random().toString(36).substring(2, 11),
        name: nameInput.value.trim(),
        deck: deckInput.value || '',
        active: true
    };

    state.players.push(newPlayer);
    nameInput.value = '';
    deckInput.selectedIndex = 0;

    saveState();
    renderAll();
}

function updatePlayerDeck(playerId, newDeck) {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;
    player.deck = newDeck || '';

    // Sync player deck in elimination bracket if already generated
    if (state.eliminationBracket && state.eliminationBracket.rounds) {
        state.eliminationBracket.rounds.forEach(rMatches => {
            rMatches.forEach(m => {
                if (m.p1 && m.p1.id === playerId) m.p1.deck = player.deck;
                if (m.p2 && m.p2.id === playerId) m.p2.deck = player.deck;
                if (m.winner && m.winner.id === playerId) m.winner.deck = player.deck;
            });
        });
    }

    saveState();
    renderAll();
}

function removePlayer(id) {
    state.players = state.players.filter(p => p.id !== id);
    saveState();
    renderAll();
}

function matchOfficialLegend(rawLegendText) {
    if (!rawLegendText) return '';
    const cleaned = rawLegendText.trim();
    if (!cleaned) return '';

    const lower = cleaned.toLowerCase();

    // 1. Exact case-insensitive match
    const exact = RIFTBOUND_LEGENDS.find(l => l.toLowerCase() === lower);
    if (exact) return exact;

    // 2. Match by champion short name before comma (if unique)
    const byShortName = RIFTBOUND_LEGENDS.filter(l => l.split(',')[0].trim().toLowerCase() === lower);
    if (byShortName.length === 1) return byShortName[0];

    // 3. Partial / startsWith match
    const starts = RIFTBOUND_LEGENDS.filter(l => l.toLowerCase().startsWith(lower));
    if (starts.length === 1) return starts[0];

    return '';
}

function importPlayersFromTxt(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result || '';
        const lines = content.split(/\r?\n/);

        let addedCount = 0;
        let unmatchedLegends = [];

        lines.forEach((rawLine, idx) => {
            const line = rawLine.trim();
            if (!line) return;

            let namePart = line;
            let legendPart = '';

            // Support "Name - Legend" or "Name -"
            const dashMatch = line.match(/^(.*?)\s*-\s*(.*)$/);
            if (dashMatch) {
                namePart = dashMatch[1].trim();
                legendPart = dashMatch[2].trim();
            }

            if (!namePart) return;

            const matchedLegend = matchOfficialLegend(legendPart);
            if (legendPart && !matchedLegend) {
                unmatchedLegends.push(`Row ${idx + 1}: "${escapeHtml(legendPart)}" (assigned as empty)`);
            }

            state.players.push({
                id: 'p_' + Math.random().toString(36).substring(2, 11) + '_' + idx,
                name: namePart,
                deck: matchedLegend,
                active: true
            });
            addedCount++;
        });

        event.target.value = '';
        saveState();
        renderAll();

        if (unmatchedLegends.length > 0) {
            openModal(
                "Import Completed with Unrecognized Legends",
                `<p class="mb-2">Imported <strong>${addedCount}</strong> Summoner(s).</p>
                 <p class="text-xs text-amber-300 mb-2">The following Legend names did not match the 58 official Riftbound Legends and were left unassigned (you can select them in the Registered Roster table):</p>
                 <ul class="list-disc pl-5 text-xs text-slate-400 space-y-1">${unmatchedLegends.map(item => `<li>${item}</li>`).join('')}</ul>`,
                null,
                true
            );
        }
    };

    reader.readAsText(file);
}

function renderPlayers() {
    const tbody = document.getElementById('players-table-body');
    const countBadge = document.getElementById('player-count');
    const playerBadge = document.getElementById('player-badge');
    const startBtn = document.getElementById('start-swiss-btn');

    countBadge.textContent = state.players.length;
    playerBadge.textContent = `${state.players.length} Registered`;
    startBtn.disabled = state.players.length < 2;

    if (state.players.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-500 italic">No summoners registered yet. Add players or import a .txt list.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.players.map((p, idx) => `
        <tr class="hover:bg-slate-900/50 transition-colors">
            <td class="p-3.5 text-slate-500 font-mono">${idx + 1}</td>
            <td class="p-3.5 font-semibold text-slate-200">${escapeHtml(p.name)}</td>
            <td class="p-3.5">
                <select onchange="updatePlayerDeck('${p.id}', this.value)"
                    class="w-full max-w-xs bg-slate-900 border ${p.deck ? 'border-slate-700 text-amber-400' : 'border-amber-700/50 text-slate-400 italic'} rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-amber-500 transition-colors cursor-pointer">
                    <option value="" ${!p.deck ? 'selected' : ''}>— Unassigned —</option>
                    ${RIFTBOUND_LEGENDS.map(legend => `
                        <option value="${escapeHtml(legend)}" ${p.deck === legend ? 'selected' : ''}>${escapeHtml(legend)}</option>
                    `).join('')}
                </select>
            </td>
            <td class="p-3.5 text-right">
                <button onclick="removePlayer('${p.id}')" class="text-rose-400 hover:text-rose-300 text-xs px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-900/50 transition-colors cursor-pointer">Remove</button>
            </td>
        </tr>
    `).join('');
}

// ============================================================================
// TCG SWISS PAIRING ENGINE (WITH BRACKET RANDOMIZATION, BACKTRACKING & FORCED PAIRS)
// ============================================================================

function isRoundLocked(roundIdx) {
    return roundIdx < state.swissRounds.length - 2;
}

function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function buildSwissPairings(playersList, priorRounds, targetRoundIdx, forcedSpecs = []) {
    const standings = calculateStandingsData(targetRoundIdx, playersList, priorRounds);
    const statById = new Map(standings.map(s => [s.player.id, s]));

    const playedMap = new Map();
    const byeCountMap = new Map();
    playersList.forEach(p => {
        playedMap.set(p.id, new Set());
        byeCountMap.set(p.id, 0);
    });

    priorRounds.forEach(r => {
        r.matches.forEach(m => {
            if (m.bye && m.p1) {
                byeCountMap.set(m.p1, (byeCountMap.get(m.p1) || 0) + 1);
            } else if (m.p1 && m.p2) {
                if (playedMap.has(m.p1)) playedMap.get(m.p1).add(m.p2);
                if (playedMap.has(m.p2)) playedMap.get(m.p2).add(m.p1);
            }
        });
    });

    const lockedIds = new Set();
    const lockedMatches = [];
    let forcedByeMatch = null;

    forcedSpecs.forEach(spec => {
        if (!spec.p1 || lockedIds.has(spec.p1)) return;
        const s1 = statById.get(spec.p1);
        if (!s1 || !s1.player.active) return;

        if (spec.p2 === 'BYE' || spec.p2 === null) {
            if (!forcedByeMatch) {
                lockedIds.add(spec.p1);
                forcedByeMatch = {
                    id: 'm_' + Math.random().toString(36).substring(2, 9),
                    p1: s1.player.id,
                    p2: null,
                    p1Points: s1.points,
                    p2Points: null,
                    winner: s1.player.id,
                    p1Wins: 2,
                    p2Wins: 0,
                    draws: 0,
                    bye: true,
                    forced: true
                };
            }
        } else if (spec.p2 && !lockedIds.has(spec.p2) && spec.p1 !== spec.p2) {
            const s2 = statById.get(spec.p2);
            if (s2 && s2.player.active) {
                lockedIds.add(spec.p1);
                lockedIds.add(spec.p2);
                lockedMatches.push({
                    id: 'm_' + Math.random().toString(36).substring(2, 9),
                    p1: s1.player.id,
                    p2: s2.player.id,
                    p1Points: s1.points,
                    p2Points: s2.points,
                    winner: null,
                    p1Wins: 0,
                    p2Wins: 0,
                    draws: 0,
                    bye: false,
                    forced: true
                });
            }
        }
    });

    const activeStandings = standings.filter(s => s.player.active && !lockedIds.has(s.player.id));
    const pointBuckets = new Map();
    activeStandings.forEach(s => {
        if (!pointBuckets.has(s.points)) {
            pointBuckets.set(s.points, []);
        }
        pointBuckets.get(s.points).push(s);
    });

    const sortedPointValues = Array.from(pointBuckets.keys()).sort((a, b) => b - a);
    let pool = [];
    sortedPointValues.forEach(pts => {
        const shuffledBucket = shuffleArray(pointBuckets.get(pts));
        pool.push(...shuffledBucket);
    });

    let byeMatch = forcedByeMatch;

    if (pool.length % 2 === 1) {
        let minByes = Infinity;
        for (let i = pool.length - 1; i >= 0; i--) {
            const bCount = byeCountMap.get(pool[i].player.id) || 0;
            if (bCount < minByes) minByes = bCount;
        }
        let byeIdx = pool.length - 1;
        for (let i = pool.length - 1; i >= 0; i--) {
            if ((byeCountMap.get(pool[i].player.id) || 0) === minByes) {
                byeIdx = i;
                break;
            }
        }
        const byeRecipient = pool.splice(byeIdx, 1)[0];
        byeMatch = {
            id: 'm_' + Math.random().toString(36).substring(2, 9),
            p1: byeRecipient.player.id,
            p2: null,
            p1Points: byeRecipient.points,
            p2Points: null,
            winner: byeRecipient.player.id,
            p1Wins: 2,
            p2Wins: 0,
            draws: 0,
            bye: true,
            forced: false
        };
    }

    const n = pool.length;
    const used = new Array(n).fill(false);
    let bestSolution = null;
    let bestPenalty = Infinity;
    let nodesVisited = 0;
    const MAX_NODES = 25000;

    function solveBacktrack(pairsSoFar, currentPenalty, allowRematches) {
        if (currentPenalty >= bestPenalty) return;
        if (nodesVisited > MAX_NODES) return;
        nodesVisited++;

        let firstIdx = -1;
        for (let i = 0; i < n; i++) {
            if (!used[i]) {
                firstIdx = i;
                break;
            }
        }

        if (firstIdx === -1) {
            bestPenalty = currentPenalty;
            bestSolution = [...pairsSoFar];
            return;
        }

        used[firstIdx] = true;
        const p1Stat = pool[firstIdx];
        const p1History = playedMap.get(p1Stat.player.id);

        const rawCandidates = [];
        for (let j = firstIdx + 1; j < n; j++) {
            if (used[j]) continue;
            const p2Stat = pool[j];
            const isRematch = p1History.has(p2Stat.player.id);
            if (!allowRematches && isRematch) continue;

            const pointDiff = Math.abs(p1Stat.points - p2Stat.points);
            const pairPenalty = (isRematch ? 1000000 : 0) + (pointDiff * pointDiff * 100);
            rawCandidates.push({ idx: j, penalty: pairPenalty });
        }

        const candidates = shuffleArray(rawCandidates).sort((a, b) => a.penalty - b.penalty);

        for (const cand of candidates) {
            used[cand.idx] = true;
            pairsSoFar.push([firstIdx, cand.idx]);

            solveBacktrack(pairsSoFar, currentPenalty + cand.penalty, allowRematches);

            pairsSoFar.pop();
            used[cand.idx] = false;

            if (bestPenalty === 0) break;
        }

        used[firstIdx] = false;
    }

    solveBacktrack([], 0, false);

    if (!bestSolution) {
        nodesVisited = 0;
        solveBacktrack([], 0, true);
    }

    const solvedPairings = (bestSolution || []).map(([idx1, idx2]) => {
        const s1 = pool[idx1];
        const s2 = pool[idx2];
        return {
            id: 'm_' + Math.random().toString(36).substring(2, 9),
            p1: s1.player.id,
            p2: s2.player.id,
            p1Points: s1.points,
            p2Points: s2.points,
            winner: null,
            p1Wins: 0,
            p2Wins: 0,
            draws: 0,
            bye: false,
            forced: false
        };
    });

    const pairings = [...lockedMatches, ...solvedPairings];
    if (byeMatch) {
        pairings.push(byeMatch);
    }

    return pairings;
}

function createPairingsForRound(targetRoundIdx, forcedSpecs = []) {
    const priorRounds = state.swissRounds.slice(0, targetRoundIdx);
    return buildSwissPairings(state.players, priorRounds, targetRoundIdx, forcedSpecs);
}

// ============================================================================
// FORCE PAIRINGS & DIRECT SEAT SWAP CONTROLS
// ============================================================================

function toggleForcePairingsPanel() {
    const panel = document.getElementById('force-pairings-panel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        populateForcePairSelects();
        renderPinnedPairsList();
    }
}

function populateForcePairSelects() {
    const p1Select = document.getElementById('force-p1-select');
    const p2Select = document.getElementById('force-p2-select');
    if (!p1Select || !p2Select) return;

    const activeIdx = state.currentRoundIndex;
    const enteringStandings = calculateStandingsData(activeIdx);
    const sortedPlayers = enteringStandings
        .filter(s => s.player.active)
        .sort((a, b) => b.points - a.points || a.player.name.localeCompare(b.player.name));

    const optionsHtml = sortedPlayers.map(s =>
        `<option value="${s.player.id}">${escapeHtml(s.player.name)} (${s.points} pts - ${escapeHtml(shortLegendName(s.player.deck))})</option>`
    ).join('');

    p1Select.innerHTML = `<option value="">Select Summoner 1...</option>` + optionsHtml;
    p2Select.innerHTML = `<option value="">Select Opponent or BYE...</option><option value="BYE">★ Assign Round BYE</option>` + optionsHtml;
}

function findPlayerSlotInRound(roundObj, playerId) {
    for (let i = 0; i < roundObj.matches.length; i++) {
        const m = roundObj.matches[i];
        if (m.p1 === playerId) return { matchIdx: i, match: m, slot: 'p1' };
        if (m.p2 === playerId) return { matchIdx: i, match: m, slot: 'p2' };
    }
    return null;
}

function normalizeRoundMatchesAfterSwap(roundIdx) {
    const roundObj = state.swissRounds[roundIdx];
    if (!roundObj) return;

    const enteringStandings = calculateStandingsData(roundIdx);
    const statMap = new Map(enteringStandings.map(s => [s.player.id, s]));

    roundObj.matches.forEach(m => {
        if (!m.p1 && m.p2) {
            m.p1 = m.p2;
            m.p2 = null;
        }
        const s1 = m.p1 ? statMap.get(m.p1) : null;
        const s2 = m.p2 ? statMap.get(m.p2) : null;
        m.p1Points = s1 ? s1.points : 0;
        m.p2Points = s2 ? s2.points : null;

        if (!m.p2) {
            m.bye = true;
            m.winner = m.p1;
            m.p1Wins = 2;
            m.p2Wins = 0;
            m.draws = 0;
        } else {
            if (m.bye) {
                m.bye = false;
                m.winner = null;
                m.p1Wins = 0;
                m.p2Wins = 0;
                m.draws = 0;
            }
        }
    });
}

function executeSeatSwap(roundIdx, matchIdA, slotA, matchIdB, slotB) {
    if (isRoundLocked(roundIdx)) return;
    const roundObj = state.swissRounds[roundIdx];
    if (!roundObj) return;

    const matchA = roundObj.matches.find(m => m.id === matchIdA);
    const matchB = roundObj.matches.find(m => m.id === matchIdB);
    if (!matchA || !matchB) return;

    const playerA = matchA[slotA];
    const playerB = matchB[slotB];

    matchA[slotA] = playerB;
    matchB[slotB] = playerA;

    [matchA, matchB].forEach(m => {
        m.forced = true;
        m.winner = null;
        m.p1Wins = 0;
        m.p2Wins = 0;
        m.draws = 0;
    });

    normalizeRoundMatchesAfterSwap(roundIdx);
    selectedSwapSlot = null;
    saveState();
    renderAll();
}

function handleSeatClick(roundIdx, matchId, slot) {
    if (isRoundLocked(roundIdx)) return;

    if (!selectedSwapSlot || selectedSwapSlot.roundIdx !== roundIdx) {
        selectedSwapSlot = { roundIdx, matchId, slot };
        renderSwissRounds();
        return;
    }

    if (selectedSwapSlot.matchId === matchId && selectedSwapSlot.slot === slot) {
        selectedSwapSlot = null;
        renderSwissRounds();
        return;
    }

    executeSeatSwap(roundIdx, selectedSwapSlot.matchId, selectedSwapSlot.slot, matchId, slot);
}

function cancelSeatSwap() {
    selectedSwapSlot = null;
    renderSwissRounds();
}

function applyDirectForcedPairing() {
    const activeIdx = state.currentRoundIndex;
    if (isRoundLocked(activeIdx)) return;

    const roundObj = state.swissRounds[activeIdx];
    if (!roundObj) return;

    const p1Id = document.getElementById('force-p1-select')?.value;
    const p2Val = document.getElementById('force-p2-select')?.value;

    if (!p1Id || !p2Val) {
        openModal("Select Summoners", "Please select both Summoner 1 and an Opponent (or BYE) to force a pairing.", null, true);
        return;
    }
    if (p1Id === p2Val) {
        openModal("Invalid Pairing", "A Summoner cannot be paired against themselves.", null, true);
        return;
    }

    const loc1 = findPlayerSlotInRound(roundObj, p1Id);
    if (!loc1) return;

    if (p2Val === 'BYE') {
        const byeMatch = roundObj.matches.find(m => m.bye || m.p2 === null);
        if (!byeMatch) {
            openModal("No BYE Table Available", "This round has an even number of active Summoners, so there is no BYE slot.", null, true);
            return;
        }
        executeSeatSwap(activeIdx, loc1.match.id, loc1.slot, byeMatch.id, 'p1');
        return;
    }

    const loc2 = findPlayerSlotInRound(roundObj, p2Val);
    if (!loc2) return;

    if (loc1.match.id === loc2.match.id) {
        loc1.match.forced = true;
        saveState();
        renderAll();
        return;
    }

    const targetSlotAtTable1 = loc1.slot === 'p1' ? 'p2' : 'p1';
    executeSeatSwap(activeIdx, loc1.match.id, targetSlotAtTable1, loc2.match.id, loc2.slot);
    loc1.match.forced = true;
    saveState();
    renderAll();
}

function addLockedPairToList() {
    const activeIdx = state.currentRoundIndex;
    if (isRoundLocked(activeIdx)) return;
    const roundObj = state.swissRounds[activeIdx];
    if (!roundObj) return;

    const p1Id = document.getElementById('force-p1-select')?.value;
    const p2Val = document.getElementById('force-p2-select')?.value;

    if (!p1Id || !p2Val || p1Id === p2Val) {
        openModal("Invalid Selection", "Please choose two distinct Summoners (or a Summoner and BYE) to pin.", null, true);
        return;
    }

    if (!roundObj.forcedSpecs) roundObj.forcedSpecs = [];

    roundObj.forcedSpecs = roundObj.forcedSpecs.filter(s =>
        s.p1 !== p1Id && s.p2 !== p1Id && (p2Val === 'BYE' ? s.p2 !== 'BYE' : (s.p1 !== p2Val && s.p2 !== p2Val))
    );

    roundObj.forcedSpecs.push({ p1: p1Id, p2: p2Val });

    roundObj.matches = createPairingsForRound(activeIdx, roundObj.forcedSpecs);
    roundObj.stale = false;
    saveState();
    renderAll();
}

function removePinnedPair(idx) {
    const activeIdx = state.currentRoundIndex;
    if (isRoundLocked(activeIdx)) return;
    const roundObj = state.swissRounds[activeIdx];
    if (!roundObj || !roundObj.forcedSpecs) return;

    roundObj.forcedSpecs.splice(idx, 1);
    roundObj.matches = createPairingsForRound(activeIdx, roundObj.forcedSpecs);
    saveState();
    renderAll();
}

function clearPinnedPairs() {
    const activeIdx = state.currentRoundIndex;
    if (isRoundLocked(activeIdx)) return;
    const roundObj = state.swissRounds[activeIdx];
    if (!roundObj) return;

    roundObj.forcedSpecs = [];
    roundObj.matches = createPairingsForRound(activeIdx, []);
    saveState();
    renderAll();
}

function renderPinnedPairsList() {
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
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-950/90 border border-indigo-600/50 text-xs text-indigo-200">
                <span>📌 <strong>${escapeHtml(p1 ? p1.name : 'Unknown')}</strong> vs <strong>${escapeHtml(p2Name)}</strong></span>
                <button onclick="removePinnedPair(${idx})" class="text-indigo-400 hover:text-rose-400 font-bold cursor-pointer" title="Remove pin">✕</button>
            </span>
        `;
    }).join('');
}

// ============================================================================
// SWISS ROUND WORKFLOW & RENDERING
// ============================================================================

function generateSwissPairings() {
    if (state.players.length < 2) return;

    const doGenerate = () => {
        state.swissRounds = [];
        state.currentRoundIndex = 0;
        state.eliminationBracket = null;
        selectedSwapSlot = null;
        const pairings = createPairingsForRound(0, []);
        state.swissRounds.push({ round: 1, matches: pairings, stale: false, forcedSpecs: [] });
        saveState();
        renderAll();
        switchTab('swiss');
    };

    if (state.swissRounds.length > 0) {
        openModal(
            "Restart Swiss Rounds",
            "Generating Round 1 pairings will overwrite existing Swiss rounds. Continue?",
            doGenerate
        );
    } else {
        doGenerate();
    }
}

function nextSwissRound() {
    const latestRound = state.swissRounds[state.swissRounds.length - 1];
    if (!latestRound) return;

    const incomplete = latestRound.matches.some(m => m.winner === null);
    if (incomplete) {
        openModal(
            "Incomplete Round",
            `Please enter results for all matches in Round ${latestRound.round} before advancing to the next round.`,
            null,
            true
        );
        return;
    }

    const nextIdx = state.swissRounds.length;
    const pairings = createPairingsForRound(nextIdx, []);
    state.swissRounds.push({
        round: nextIdx + 1,
        matches: pairings,
        stale: false,
        forcedSpecs: []
    });
    state.currentRoundIndex = state.swissRounds.length - 1;
    selectedSwapSlot = null;
    saveState();
    renderAll();
}

function promptRepairRound(targetIdx = state.currentRoundIndex) {
    if (targetIdx < 0 || isRoundLocked(targetIdx)) return;
    const roundObj = state.swissRounds[targetIdx];
    const roundNum = roundObj.round;
    const pinnedCount = roundObj.forcedSpecs ? roundObj.forcedSpecs.length : 0;

    const description = targetIdx === 0
        ? `Randomize and regenerate fresh pairings for Round 1${pinnedCount > 0 ? ` (keeping ${pinnedCount} pinned matchup(s))` : ''}? Any scores entered for Round 1 will be reset.`
        : `Recalculate standings from Rounds 1–${roundNum - 1} and randomly regenerate valid pairings within each score bracket for Round ${roundNum}${pinnedCount > 0 ? ` (keeping ${pinnedCount} pinned matchup(s))` : ''}? Current Round ${roundNum} match scores will be reset.`;

    openModal(
        `Re-Pair & Randomize Round ${roundNum}`,
        description,
        () => {
            const specs = roundObj.forcedSpecs || [];
            const newPairings = createPairingsForRound(targetIdx, specs);
            state.swissRounds[targetIdx].matches = newPairings;
            state.swissRounds[targetIdx].stale = false;
            state.currentRoundIndex = targetIdx;
            selectedSwapSlot = null;
            saveState();
            renderAll();
        }
    );
}

function setMatchResult(roundIdx, matchId, scoreType) {
    if (isRoundLocked(roundIdx)) return;

    const roundObj = state.swissRounds[roundIdx];
    if (!roundObj) return;
    const match = roundObj.matches.find(m => m.id === matchId);
    if (!match) return;

    if (scoreType === '2-0') {
        match.winner = match.p1;
        match.p1Wins = 2; match.p2Wins = 0; match.draws = 0;
    } else if (scoreType === '2-1') {
        match.winner = match.p1;
        match.p1Wins = 2; match.p2Wins = 1; match.draws = 0;
    } else if (scoreType === '0-2') {
        match.winner = match.p2;
        match.p1Wins = 0; match.p2Wins = 2; match.draws = 0;
    } else if (scoreType === '1-2') {
        match.winner = match.p2;
        match.p1Wins = 1; match.p2Wins = 2; match.draws = 0;
    } else if (scoreType === '1-1') {
        match.winner = 'draw';
        match.p1Wins = 1; match.p2Wins = 1; match.draws = 1;
    }

    if (roundIdx < state.swissRounds.length - 1) {
        for (let i = roundIdx + 1; i < state.swissRounds.length; i++) {
            state.swissRounds[i].stale = true;
        }
    }

    saveState();
    renderAll();
}

function renderSwissRounds() {
    const roundTabsContainer = document.getElementById('round-tabs');
    const bannersContainer = document.getElementById('swiss-banners-container');
    const container = document.getElementById('swiss-rounds-container');
    const nextRoundBtn = document.getElementById('next-round-btn');
    const repairRoundBtn = document.getElementById('repair-round-btn');
    const forcePairBtn = document.getElementById('force-pair-btn');
    const forcePanel = document.getElementById('force-pairings-panel');

    if (state.swissRounds.length === 0) {
        roundTabsContainer.innerHTML = '';
        bannersContainer.innerHTML = '';
        repairRoundBtn.classList.add('hidden');
        forcePairBtn.classList.add('hidden');
        if (forcePanel) forcePanel.classList.add('hidden');
        container.innerHTML = `
            <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
                <p class="mb-4">No Swiss rounds generated yet.</p>
                <button onclick="switchTab('players')" class="px-5 py-2.5 bg-amber-600 text-slate-950 font-bold rounded-xl cursor-pointer">Go to Summoners &amp; Start</button>
            </div>`;
        nextRoundBtn.disabled = true;
        return;
    }

    if (state.currentRoundIndex >= state.swissRounds.length) {
        state.currentRoundIndex = state.swissRounds.length - 1;
    }

    const activeIdx = state.currentRoundIndex;
    const activeRound = state.swissRounds[activeIdx];
    const locked = isRoundLocked(activeIdx);

    if (!locked) {
        repairRoundBtn.classList.remove('hidden');
        repairRoundBtn.textContent = `↻ Re-Pair Round ${activeRound.round}`;
        forcePairBtn.classList.remove('hidden');
        populateForcePairSelects();
        renderPinnedPairsList();
    } else {
        repairRoundBtn.classList.add('hidden');
        forcePairBtn.classList.add('hidden');
        if (forcePanel) forcePanel.classList.add('hidden');
    }

    roundTabsContainer.innerHTML = state.swissRounds.map((r, idx) => {
        const rLocked = isRoundLocked(idx);
        const isCurrent = idx === activeIdx;
        return `
            <button onclick="state.currentRoundIndex = ${idx}; selectedSwapSlot = null; renderSwissRounds();" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${isCurrent ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}">
                <span>Round ${r.round}</span>
                ${rLocked ? '<span title="Locked (2+ rounds passed)">🔒</span>' : ''}
                ${r.stale ? '<span title="Previous round results changed — Re-pair recommended" class="text-amber-300">⚠️</span>' : ''}
            </button>
        `;
    }).join('');

    const playerMap = new Map(state.players.map(p => [p.id, p]));

    let bannersHtml = '';
    if (locked) {
        bannersHtml += `
            <div class="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 flex items-center justify-between text-xs text-slate-300">
                <div class="flex items-center gap-2.5">
                    <span class="text-base">🔒</span>
                    <span><strong>Round ${activeRound.round} is locked.</strong> Results and pairings cannot be modified because 2 or more subsequent rounds have already started.</span>
                </div>
            </div>
        `;
    }
    if (selectedSwapSlot && selectedSwapSlot.roundIdx === activeIdx && !locked) {
        const selMatch = activeRound.matches.find(m => m.id === selectedSwapSlot.matchId);
        const selPlayerId = selMatch ? selMatch[selectedSwapSlot.slot] : null;
        const selName = selPlayerId ? (playerMap.get(selPlayerId)?.name || 'Summoner') : 'BYE Slot';
        bannersHtml += `
            <div class="bg-indigo-950/80 border border-indigo-500/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-200">
                <div class="flex items-center gap-2.5">
                    <span class="text-base">⇄</span>
                    <span><strong>Swap Mode Active:</strong> Selected <strong>${escapeHtml(selName)}</strong>. Click any other Summoner (or BYE slot) on the tables below to swap their seats immediately.</span>
                </div>
                <button onclick="cancelSeatSwap()" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg cursor-pointer shrink-0">
                    Cancel Swap
                </button>
            </div>
        `;
    }
    if (activeRound.stale && !locked) {
        bannersHtml += `
            <div class="bg-amber-950/60 border border-amber-600/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
                <div class="flex items-center gap-2.5">
                    <span class="text-base">⚠️</span>
                    <span><strong>Previous round results were updated!</strong> Round ${activeRound.round} pairings may no longer reflect current standings.</span>
                </div>
                <button onclick="promptRepairRound(${activeIdx})" class="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg uppercase tracking-wider cursor-pointer shrink-0 transition-colors">
                    ↻ Re-Pair Round ${activeRound.round} Now
                </button>
            </div>
        `;
    }
    bannersContainer.innerHTML = bannersHtml;

    const enteringStandings = calculateStandingsData(activeIdx);
    const statMap = new Map(enteringStandings.map(s => [s.player.id, s]));

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${activeRound.matches.map((m, mIdx) => {
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
                    <div class="bg-slate-900/60 border ${isComplete ? 'border-emerald-500/30' : 'border-slate-800'} rounded-2xl p-5 shadow-lg backdrop-blur-sm relative">
                        <div class="flex justify-between items-center mb-3">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-mono uppercase tracking-wider text-slate-400">Table #${mIdx + 1}</span>
                                ${m.forced ? '<span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold" title="Manually forced or swapped pairing">📌 Forced</span>' : ''}
                                ${isFloat ? '<span class="text-[10px] px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50" title="Pair down/up between adjacent point groups">Float Match</span>' : ''}
                            </div>
                            <div class="flex items-center gap-2">
                                ${locked ? '<span class="text-[11px] text-slate-500 flex items-center gap-1">🔒 Locked</span>' : ''}
                                <span class="text-xs px-2.5 py-0.5 rounded-full font-medium ${isComplete ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50' : 'bg-amber-950/60 text-amber-300 border border-amber-800/50'}">
                                    ${isComplete ? `Final (${m.p1Wins}-${m.p2Wins})` : 'In Progress'}
                                </span>
                            </div>
                        </div>

                        <div class="space-y-3">
                            <!-- Player 1 -->
                            <div class="flex justify-between items-center p-3 rounded-xl bg-slate-950/60 border transition-all ${isP1Selected ? 'border-indigo-400 ring-2 ring-indigo-500/40 bg-indigo-950/30' : m.winner === m.p1 ? 'border-amber-500/60 bg-amber-500/5' : 'border-slate-800/80'}">
                                <div class="flex items-center gap-2 min-w-0 pr-2">
                                    ${!locked ? `<button onclick="handleSeatClick(${activeIdx}, '${m.id}', 'p1')" title="Click to swap this Summoner with another seat" class="px-1.5 py-1 rounded bg-slate-900 hover:bg-indigo-900/80 text-slate-400 hover:text-indigo-200 border border-slate-800 text-xs cursor-pointer shrink-0 transition-colors">⇄</button>` : ''}
                                    <div class="truncate">
                                        <div class="flex items-center gap-2">
                                            <span class="font-bold text-slate-200 truncate">${p1 ? escapeHtml(p1.name) : 'Unknown'}</span>
                                            ${s1 ? `<span class="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 shrink-0">${s1.points} pts (${s1.wins}-${s1.losses}-${s1.draws})</span>` : ''}
                                        </div>
                                        <div class="text-xs text-amber-400/90 mt-0.5 truncate">${p1 ? escapeHtml(formatDeckLabel(p1.deck)) : ''}</div>
                                    </div>
                                </div>
                                ${!m.bye ? `
                                    <div class="flex gap-1.5 shrink-0">
                                        <button ${locked ? 'disabled' : ''} onclick="setMatchResult(${activeIdx}, '${m.id}', '2-0')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${currentScore === '2-0' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">2-0</button>
                                        <button ${locked ? 'disabled' : ''} onclick="setMatchResult(${activeIdx}, '${m.id}', '2-1')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${currentScore === '2-1' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">2-1</button>
                                    </div>
                                ` : `<span class="text-xs font-bold text-emerald-400 px-2.5 py-1 bg-emerald-950/50 rounded-lg border border-emerald-800/40 shrink-0">2-0 (BYE)</span>`}
                            </div>

                            <!-- Player 2 or BYE -->
                            ${p2 ? `
                                <div class="flex justify-between items-center p-3 rounded-xl bg-slate-950/60 border transition-all ${isP2Selected ? 'border-indigo-400 ring-2 ring-indigo-500/40 bg-indigo-950/30' : m.winner === m.p2 ? 'border-amber-500/60 bg-amber-500/5' : 'border-slate-800/80'}">
                                    <div class="flex items-center gap-2 min-w-0 pr-2">
                                        ${!locked ? `<button onclick="handleSeatClick(${activeIdx}, '${m.id}', 'p2')" title="Click to swap this Summoner with another seat" class="px-1.5 py-1 rounded bg-slate-900 hover:bg-indigo-900/80 text-slate-400 hover:text-indigo-200 border border-slate-800 text-xs cursor-pointer shrink-0 transition-colors">⇄</button>` : ''}
                                        <div class="truncate">
                                            <div class="flex items-center gap-2">
                                                <span class="font-bold text-slate-200 truncate">${escapeHtml(p2.name)}</span>
                                                ${s2 ? `<span class="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 shrink-0">${s2.points} pts (${s2.wins}-${s2.losses}-${s2.draws})</span>` : ''}
                                            </div>
                                            <div class="text-xs text-amber-400/90 mt-0.5 truncate">${escapeHtml(formatDeckLabel(p2.deck))}</div>
                                        </div>
                                    </div>
                                    <div class="flex gap-1.5 shrink-0">
                                        <button ${locked ? 'disabled' : ''} onclick="setMatchResult(${activeIdx}, '${m.id}', '1-2')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${currentScore === '1-2' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">2-1</button>
                                        <button ${locked ? 'disabled' : ''} onclick="setMatchResult(${activeIdx}, '${m.id}', '0-2')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${currentScore === '0-2' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">2-0</button>
                                    </div>
                                </div>
                            ` : `
                                <div class="p-3 rounded-xl bg-slate-950/40 border border-slate-800/40 text-center text-slate-500 text-xs italic">
                                    Lowest-ranked eligible Summoner receives Round BYE (+3 Match Points, 2-0 Games)
                                </div>
                            `}
                        </div>

                        ${!m.bye ? `
                            <div class="mt-3 flex justify-end">
                                <button ${locked ? 'disabled' : ''} onclick="setMatchResult(${activeIdx}, '${m.id}', '1-1')" class="text-xs px-3 py-1 rounded-lg border transition-all ${locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${m.winner === 'draw' ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'}">
                                    1-1 Draw
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;

    const latestRound = state.swissRounds[state.swissRounds.length - 1];
    const allComplete = latestRound.matches.every(m => m.winner !== null);
    nextRoundBtn.disabled = !allComplete;
}

// Standings & Tiebreakers
function calculateStandingsData(upToRoundIdx = state.swissRounds.length, customPlayers = state.players, customRounds = state.swissRounds) {
    const stats = {};
    customPlayers.forEach(p => {
        stats[p.id] = {
            player: p,
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            points: 0,
            gamesPlayed: 0,
            gameWins: 0,
            gameLosses: 0,
            opponents: []
        };
    });

    const roundsSlice = customRounds.slice(0, upToRoundIdx);

    roundsSlice.forEach(r => {
        r.matches.forEach(m => {
            if (m.winner === null) return;
            const p1 = stats[m.p1];
            const p2 = m.p2 ? stats[m.p2] : null;

            if (p1 && p2) {
                p1.matchesPlayed++;
                p2.matchesPlayed++;
                p1.opponents.push(m.p2);
                p2.opponents.push(m.p1);

                const totalGames = m.p1Wins + m.p2Wins;
                p1.gamesPlayed += totalGames;
                p2.gamesPlayed += totalGames;
                p1.gameWins += m.p1Wins;
                p1.gameLosses += m.p2Wins;
                p2.gameWins += m.p2Wins;
                p2.gameLosses += m.p1Wins;

                if (m.winner === m.p1) {
                    p1.wins++; p1.points += 3;
                    p2.losses++;
                } else if (m.winner === m.p2) {
                    p2.wins++; p2.points += 3;
                    p1.losses++;
                } else {
                    p1.draws++; p1.points += 1;
                    p2.draws++; p2.points += 1;
                }
            } else if (p1 && m.bye) {
                p1.matchesPlayed++;
                p1.wins++; p1.points += 3;
                p1.gamesPlayed += 2;
                p1.gameWins += 2;
            }
        });
    });

    const standingsArray = Object.values(stats);

    standingsArray.forEach(s => {
        s.mw = s.matchesPlayed > 0 ? Math.max(0.33, (s.points / (s.matchesPlayed * 3))) : 0.33;
        s.gw = s.gamesPlayed > 0 ? Math.max(0.33, s.gameWins / s.gamesPlayed) : 0.33;
    });

    standingsArray.forEach(s => {
        if (s.opponents.length === 0) {
            s.omw = 0.33;
            s.ogw = 0.33;
        } else {
            let omwSum = 0;
            let ogwSum = 0;
            s.opponents.forEach(oppId => {
                const opp = stats[oppId];
                if (opp) {
                    omwSum += opp.mw;
                    ogwSum += opp.gw;
                }
            });
            s.omw = omwSum / s.opponents.length;
            s.ogw = ogwSum / s.opponents.length;
        }
    });

    return standingsArray;
}

function calculateStandings() {
    const tbody = document.getElementById('standings-table-body');
    const cutBtn = document.getElementById('generate-cut-btn');

    if (state.swissRounds.length === 0) {
        cutBtn.disabled = true;
        tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-500 italic">No active Swiss tournament. Generate Round 1 Pairings on the Summoners tab to view standings.</td></tr>`;
        return;
    }

    cutBtn.disabled = false;
    const standings = calculateStandingsData();

    standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (Math.abs(b.omw - a.omw) > 1e-6) return b.omw - a.omw;
        if (Math.abs(b.gw - a.gw) > 1e-6) return b.gw - a.gw;
        return b.ogw - a.ogw;
    });

    tbody.innerHTML = standings.map((s, idx) => `
        <tr class="hover:bg-slate-900/50 transition-colors">
            <td class="p-3.5 text-center font-mono font-bold text-amber-400">${idx + 1}</td>
            <td class="p-3.5 font-semibold text-slate-200">${escapeHtml(s.player.name)}</td>
            <td class="p-3.5 text-amber-400/90">${escapeHtml(formatDeckLabel(s.player.deck))}</td>
            <td class="p-3.5 text-center font-mono">${s.wins}-${s.losses}-${s.draws}</td>
            <td class="p-3.5 text-center font-mono font-bold text-amber-400">${s.points}</td>
            <td class="p-3.5 text-center font-mono text-slate-400">${(s.omw * 100).toFixed(1)}%</td>
            <td class="p-3.5 text-center font-mono text-slate-400">${(s.gw * 100).toFixed(1)}%</td>
            <td class="p-3.5 text-center font-mono text-slate-400">${(s.ogw * 100).toFixed(1)}%</td>
        </tr>
    `).join('');
}

// ============================================================================
// META BREAKDOWN ENGINE (FIELD SHARE, WIN RATES & TOP CUT CONVERSION)
// ============================================================================
function calculateMetaStats() {
    const totalPlayers = state.players.length;
    const legendMap = new Map();
    const playerMap = new Map(state.players.map(p => [p.id, p]));

    const topCutPlayerIds = new Set();
    if (state.eliminationBracket && state.eliminationBracket.rounds && state.eliminationBracket.rounds[0]) {
        state.eliminationBracket.rounds[0].forEach(m => {
            if (m.p1 && m.p1.id) topCutPlayerIds.add(m.p1.id);
            if (m.p2 && m.p2.id) topCutPlayerIds.add(m.p2.id);
        });
    }

    state.players.forEach(p => {
        const deckKey = formatDeckLabel(p.deck);
        if (!legendMap.has(deckKey)) {
            legendMap.set(deckKey, {
                legend: deckKey,
                pilots: 0,
                pilotNames: [],
                topCutCount: 0,
                matchesPlayed: 0,
                matchWins: 0,
                matchLosses: 0,
                matchDraws: 0,
                gamesPlayed: 0,
                gameWins: 0,
                gameLosses: 0
            });
        }
        const entry = legendMap.get(deckKey);
        entry.pilots++;
        entry.pilotNames.push(p.name);
        if (topCutPlayerIds.has(p.id)) {
            entry.topCutCount++;
        }
    });

    state.swissRounds.forEach(r => {
        r.matches.forEach(m => {
            if (m.winner === null || m.bye) return;
            const p1 = playerMap.get(m.p1);
            const p2 = m.p2 ? playerMap.get(m.p2) : null;
            if (!p1 || !p2) return;

            const L1 = legendMap.get(formatDeckLabel(p1.deck));
            const L2 = legendMap.get(formatDeckLabel(p2.deck));
            const games = m.p1Wins + m.p2Wins;

            if (L1) {
                L1.matchesPlayed++;
                L1.gamesPlayed += games;
                L1.gameWins += m.p1Wins;
                L1.gameLosses += m.p2Wins;
                if (m.winner === m.p1) L1.matchWins++;
                else if (m.winner === m.p2) L1.matchLosses++;
                else L1.matchDraws++;
            }

            if (L2) {
                L2.matchesPlayed++;
                L2.gamesPlayed += games;
                L2.gameWins += m.p2Wins;
                L2.gameLosses += m.p1Wins;
                if (m.winner === m.p2) L2.matchWins++;
                else if (m.winner === m.p1) L2.matchLosses++;
                else L2.matchDraws++;
            }
        });
    });

    const statsList = Array.from(legendMap.values()).map(item => {
        const metaShare = totalPlayers > 0 ? (item.pilots / totalPlayers) * 100 : 0;
        const matchWinRate = item.matchesPlayed > 0 ? (item.matchWins / item.matchesPlayed) * 100 : 0;
        const gameWinRate = item.gamesPlayed > 0 ? (item.gameWins / item.gamesPlayed) * 100 : 0;
        const conversionRate = item.pilots > 0 ? (item.topCutCount / item.pilots) * 100 : 0;
        return {
            ...item,
            metaShare,
            matchWinRate,
            gameWinRate,
            conversionRate
        };
    });

    return { totalPlayers, statsList, hasTopCut: topCutPlayerIds.size > 0 };
}

function renderMetaBreakdown() {
    const kpiContainer = document.getElementById('meta-kpi-container');
    const barsContainer = document.getElementById('meta-bars-container');
    const tbody = document.getElementById('meta-table-body');
    const sortSelect = document.getElementById('meta-sort-select');

    if (!kpiContainer || !barsContainer || !tbody) return;

    const { totalPlayers, statsList, hasTopCut } = calculateMetaStats();

    if (totalPlayers === 0) {
        kpiContainer.innerHTML = `
            <div class="col-span-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-500 italic">
                No Summoners registered yet. Add players on the Summoners tab to generate the Meta Breakdown.
            </div>
        `;
        barsContainer.innerHTML = `<p class="text-slate-500 italic text-center py-8 text-sm">No Legend representation data.</p>`;
        tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-500 italic">Register summoners to view Legend analytics.</td></tr>`;
        return;
    }

    const byPopularity = [...statsList].sort((a, b) => b.pilots - a.pilots || b.matchWinRate - a.matchWinRate);
    const mostPopular = byPopularity[0];

    const withMatches = statsList.filter(s => s.matchesPlayed > 0);
    const byWinRate = [...withMatches].sort((a, b) => b.matchWinRate - a.matchWinRate || b.matchesPlayed - a.matchesPlayed);
    const bestPerforming = byWinRate[0] || null;

    kpiContainer.innerHTML = `
        <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
            <div class="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Summoners</div>
            <div class="text-3xl font-black font-arcane text-slate-100 mt-1">${totalPlayers}</div>
            <div class="text-xs text-slate-500 mt-1">${state.swissRounds.length} Swiss Round(s) Tracked</div>
        </div>
        <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
            <div class="text-xs uppercase tracking-wider text-slate-400 font-semibold">Unique Legends</div>
            <div class="text-3xl font-black font-arcane text-amber-400 mt-1">${statsList.length} <span class="text-sm font-normal text-slate-500">/ 58</span></div>
            <div class="text-xs text-slate-500 mt-1">Diversity Index: ${((statsList.length / totalPlayers) * 100).toFixed(0)}%</div>
        </div>
        <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
            <div class="text-xs uppercase tracking-wider text-slate-400 font-semibold">Most Played Legend</div>
            <div class="text-base font-bold text-amber-300 mt-1 truncate" title="${escapeHtml(mostPopular.legend)}">${escapeHtml(mostPopular.legend)}</div>
            <div class="text-xs text-slate-400 mt-1 font-mono">${mostPopular.pilots} Pilot(s) • ${mostPopular.metaShare.toFixed(1)}% of Field</div>
        </div>
        <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
            <div class="text-xs uppercase tracking-wider text-slate-400 font-semibold">Highest Match Win %</div>
            <div class="text-base font-bold text-emerald-400 mt-1 truncate" title="${bestPerforming ? escapeHtml(bestPerforming.legend) : 'N/A'}">
                ${bestPerforming ? escapeHtml(bestPerforming.legend) : 'Awaiting Results'}
            </div>
            <div class="text-xs text-slate-400 mt-1 font-mono">
                ${bestPerforming ? `${bestPerforming.matchWinRate.toFixed(1)}% (${bestPerforming.matchWins}-${bestPerforming.matchLosses}-${bestPerforming.matchDraws})` : 'Complete Swiss matches'}
            </div>
        </div>
    `;

    barsContainer.innerHTML = byPopularity.map(item => `
        <div class="space-y-1.5">
            <div class="flex justify-between items-center text-xs">
                <span class="font-semibold text-slate-200 truncate pr-2">${escapeHtml(item.legend)}</span>
                <span class="font-mono text-amber-400 shrink-0">${item.pilots} (${item.metaShare.toFixed(1)}%)</span>
            </div>
            <div class="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                <div class="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300" style="width: ${Math.max(item.metaShare, 3)}%"></div>
            </div>
            <div class="text-[11px] text-slate-500 truncate">Pilots: ${item.pilotNames.map(n => escapeHtml(n)).join(', ')}</div>
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
            ? 'text-slate-500'
            : item.matchWinRate >= 60
            ? 'text-emerald-400 font-bold'
            : item.matchWinRate < 40
            ? 'text-rose-400'
            : 'text-slate-200';

        return `
            <tr class="hover:bg-slate-900/50 transition-colors">
                <td class="p-3.5">
                    <div class="font-semibold text-amber-400/90">${escapeHtml(item.legend)}</div>
                    <div class="text-[11px] text-slate-500 truncate max-w-xs">${item.pilotNames.map(n => escapeHtml(n)).join(', ')}</div>
                </td>
                <td class="p-3.5 text-center font-mono font-bold text-slate-200">${item.pilots}</td>
                <td class="p-3.5 text-center font-mono text-slate-400">${item.metaShare.toFixed(1)}%</td>
                <td class="p-3.5 text-center font-mono text-slate-300">${item.matchWins}-${item.matchLosses}-${item.matchDraws}</td>
                <td class="p-3.5 text-center font-mono ${mwBadgeColor}">
                    ${item.matchesPlayed > 0 ? `${item.matchWinRate.toFixed(1)}%` : '—'}
                </td>
                <td class="p-3.5 text-center font-mono text-slate-400">
                    ${item.gamesPlayed > 0 ? `${item.gameWinRate.toFixed(1)}% <span class="text-[11px] text-slate-500">(${item.gameWins}-${item.gameLosses})</span>` : '—'}
                </td>
                <td class="p-3.5 text-center font-mono">
                    ${hasTopCut
                        ? `<span class="px-2 py-0.5 rounded text-xs ${item.topCutCount > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' : 'text-slate-500'}">${item.topCutCount} / ${item.pilots} (${item.conversionRate.toFixed(0)}%)</span>`
                        : '<span class="text-xs text-slate-600 italic">Pending Cut</span>'
                    }
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================================================
// HEAD-TO-HEAD WINRATE MATRIX ENGINE
// ============================================================================
function shortLegendName(fullName) {
    if (!fullName || !fullName.trim()) return 'Unassigned';
    return fullName.split(',')[0].trim();
}

function renderWinrateMatrix() {
    const container = document.getElementById('winrate-matrix-container');
    if (!container) return;

    if (state.players.length === 0) {
        container.innerHTML = `<div class="p-12 text-center text-slate-500 italic">No Summoners registered yet. Add players and record match results to populate the Winrate Matrix.</div>`;
        return;
    }

    const includeElim = document.getElementById('matrix-include-elim')?.checked ?? true;
    const metric = document.getElementById('matrix-metric-select')?.value || 'match';

    const playerMap = new Map(state.players.map(p => [p.id, p]));
    const legendPilotCounts = new Map();
    state.players.forEach(p => {
        const key = formatDeckLabel(p.deck);
        legendPilotCounts.set(key, (legendPilotCounts.get(key) || 0) + 1);
    });

    const activeLegends = Array.from(legendPilotCounts.keys()).sort((a, b) => {
        const countDiff = legendPilotCounts.get(b) - legendPilotCounts.get(a);
        if (countDiff !== 0) return countDiff;
        return a.localeCompare(b);
    });

    const matrix = {};
    activeLegends.forEach(l1 => {
        matrix[l1] = {};
        activeLegends.forEach(l2 => {
            matrix[l1][l2] = {
                matches: 0,
                mWins: 0,
                mLosses: 0,
                mDraws: 0,
                games: 0,
                gWins: 0,
                gLosses: 0
            };
        });
    });

    state.swissRounds.forEach(r => {
        r.matches.forEach(m => {
            if (m.winner === null || m.bye) return;
            const p1 = playerMap.get(m.p1);
            const p2 = m.p2 ? playerMap.get(m.p2) : null;
            if (!p1 || !p2) return;

            const d1 = formatDeckLabel(p1.deck);
            const d2 = formatDeckLabel(p2.deck);
            if (!matrix[d1] || !matrix[d2]) return;

            if (d1 === d2) {
                const cell = matrix[d1][d2];
                cell.matches++;
                if (m.winner === 'draw') {
                    cell.mDraws++;
                } else {
                    cell.mWins++;
                    cell.mLosses++;
                }
                const totalG = m.p1Wins + m.p2Wins;
                cell.games += totalG;
                cell.gWins += Math.max(m.p1Wins, m.p2Wins);
                cell.gLosses += Math.min(m.p1Wins, m.p2Wins);
                return;
            }

            const cell12 = matrix[d1][d2];
            const cell21 = matrix[d2][d1];
            const totalGames = m.p1Wins + m.p2Wins;

            cell12.matches++;
            cell21.matches++;
            cell12.games += totalGames;
            cell21.games += totalGames;

            cell12.gWins += m.p1Wins;
            cell12.gLosses += m.p2Wins;
            cell21.gWins += m.p2Wins;
            cell21.gLosses += m.p1Wins;

            if (m.winner === m.p1) {
                cell12.mWins++;
                cell21.mLosses++;
            } else if (m.winner === m.p2) {
                cell12.mLosses++;
                cell21.mWins++;
            } else {
                cell12.mDraws++;
                cell21.mDraws++;
            }
        });
    });

    if (includeElim && state.eliminationBracket && state.eliminationBracket.rounds) {
        state.eliminationBracket.rounds.forEach(rMatches => {
            rMatches.forEach(m => {
                if (!m.winner || !m.p1 || !m.p2 || !m.p1.id || !m.p2.id) return;
                const d1 = formatDeckLabel(m.p1.deck);
                const d2 = formatDeckLabel(m.p2.deck);
                if (!matrix[d1] || !matrix[d2]) return;

                if (d1 === d2) {
                    matrix[d1][d2].matches++;
                    matrix[d1][d2].mWins++;
                    matrix[d1][d2].mLosses++;
                    return;
                }

                const cell12 = matrix[d1][d2];
                const cell21 = matrix[d2][d1];
                cell12.matches++;
                cell21.matches++;

                if (m.winner.id === m.p1.id) {
                    cell12.mWins++;
                    cell21.mLosses++;
                } else if (m.winner.id === m.p2.id) {
                    cell12.mLosses++;
                    cell21.mWins++;
                }
            });
        });
    }

    container.innerHTML = `
        <table class="w-full text-left border-collapse text-xs">
            <thead>
                <tr class="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                    <th class="p-3.5 font-semibold sticky left-0 bg-slate-900 z-10 border-r border-slate-800 min-w-[180px]">
                        Row vs. Column
                    </th>
                    <th class="p-3 font-semibold text-center bg-slate-900/60 border-r border-slate-800 min-w-[95px]">
                        Overall (Non-Mirror)
                    </th>
                    ${activeLegends.map(colLegend => `
                        <th class="p-3 font-semibold text-center border-r border-slate-800/60 min-w-[105px]" title="${escapeHtml(colLegend)}">
                            <div class="text-amber-400 font-bold truncate">${escapeHtml(shortLegendName(colLegend))}</div>
                            <div class="text-[10px] text-slate-500 font-normal truncate">${escapeHtml(colLegend.split(',')[1] || '')}</div>
                        </th>
                    `).join('')}
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-900">
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
                        <tr class="hover:bg-slate-900/30 transition-colors">
                            <td class="p-3.5 font-semibold sticky left-0 bg-slate-950 z-10 border-r border-slate-800" title="${escapeHtml(rowLegend)}">
                                <div class="text-slate-200 truncate">${escapeHtml(shortLegendName(rowLegend))}</div>
                                <div class="text-[10px] text-amber-400/80 font-normal truncate">${escapeHtml(rowLegend.split(',')[1] || '')}</div>
                            </td>
                            <td class="p-3 text-center font-mono border-r border-slate-800 bg-slate-900/30">
                                ${overallWinPct !== null ? `
                                    <div class="font-bold ${overallWinPct > 55 ? 'text-emerald-400' : overallWinPct < 45 ? 'text-rose-400' : 'text-amber-300'}">${overallWinPct.toFixed(0)}%</div>
                                    <div class="text-[10px] text-slate-400">(${overallRecordStr})</div>
                                ` : `<span class="text-slate-600">—</span>`}
                            </td>
                            ${activeLegends.map(colLegend => {
                                const cell = matrix[rowLegend][colLegend];

                                if (rowLegend === colLegend) {
                                    return `
                                        <td class="p-3 text-center font-mono bg-slate-900/40 border-r border-slate-800/60 text-slate-500" title="Mirror Match (${escapeHtml(shortLegendName(rowLegend))})">
                                            <div class="text-[10px] uppercase tracking-wider">Mirror</div>
                                            <div class="text-[10px] text-slate-600">${cell.matches > 0 ? `${cell.matches} played` : '—'}</div>
                                        </td>
                                    `;
                                }

                                const sample = metric === 'game' ? cell.games : cell.matches;
                                if (sample === 0) {
                                    return `
                                        <td class="p-3 text-center font-mono border-r border-slate-800/60 text-slate-700">
                                            —
                                        </td>
                                    `;
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
                                    cellStyle = 'bg-rose-950/50 text-rose-300';
                                }

                                return `
                                    <td class="p-3 text-center font-mono border-r border-slate-800/60 ${cellStyle}" title="${escapeHtml(shortLegendName(rowLegend))} vs ${escapeHtml(shortLegendName(colLegend))}: ${recordText} (${winPct.toFixed(1)}%)">
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

// Single Elimination Bracket Engine
function getBracketSeedOrder(size) {
    if (size === 4) return [0, 3, 1, 2];
    if (size === 8) return [0, 7, 3, 4, 1, 6, 2, 5];
    if (size === 16) return [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];
    return [];
}

function proceedToElimination() {
    switchTab('elimination');
    generateEliminationBracket();
}

function generateEliminationBracket() {
    const cutSize = parseInt(document.getElementById('cut-size-select').value, 10);
    const standings = calculateStandingsData();

    standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (Math.abs(b.omw - a.omw) > 1e-6) return b.omw - a.omw;
        if (Math.abs(b.gw - a.gw) > 1e-6) return b.gw - a.gw;
        return b.ogw - a.ogw;
    });

    const container = document.getElementById('elimination-bracket-container');
    if (state.players.length < 2) {
        container.innerHTML = `<p class="text-amber-400/80 italic text-center py-12">Register summoners first to build an elimination bracket.</p>`;
        return;
    }

    const seedOrder = getBracketSeedOrder(cutSize);
    const totalRounds = Math.log2(cutSize);
    const rounds = [];

    const round1Matches = [];
    for (let i = 0; i < seedOrder.length; i += 2) {
        const s1 = seedOrder[i];
        const s2 = seedOrder[i + 1];
        const p1 = standings[s1] ? { ...standings[s1].player, seed: s1 + 1 } : { id: null, name: 'BYE', deck: '', seed: '-' };
        const p2 = standings[s2] ? { ...standings[s2].player, seed: s2 + 1 } : { id: null, name: 'BYE', deck: '', seed: '-' };

        let winner = null;
        if (p1.id && !p2.id) winner = p1;
        if (!p1.id && p2.id) winner = p2;

        round1Matches.push({
            id: `elim_r0_m${i / 2}`,
            p1,
            p2,
            winner
        });
    }
    rounds.push(round1Matches);

    for (let r = 1; r < totalRounds; r++) {
        const prevMatches = rounds[r - 1];
        const currMatches = [];
        for (let m = 0; m < prevMatches.length; m += 2) {
            const p1 = prevMatches[m].winner || null;
            const p2 = prevMatches[m + 1].winner || null;
            currMatches.push({
                id: `elim_r${r}_m${m / 2}`,
                p1,
                p2,
                winner: null
            });
        }
        rounds.push(currMatches);
    }

    state.eliminationBracket = { cutSize, rounds };
    saveState();
    renderEliminationBracket();
    renderMetaBreakdown();
    renderWinrateMatrix();
}

function advanceEliminationWinner(roundIdx, matchIdx, playerSlot) {
    const bracket = state.eliminationBracket;
    if (!bracket) return;

    const match = bracket.rounds[roundIdx][matchIdx];
    const chosen = playerSlot === 'p1' ? match.p1 : match.p2;
    if (!chosen || !chosen.id) return;

    match.winner = chosen;

    if (roundIdx + 1 < bracket.rounds.length) {
        const nextMatchIdx = Math.floor(matchIdx / 2);
        const nextMatch = bracket.rounds[roundIdx + 1][nextMatchIdx];
        if (matchIdx % 2 === 0) {
            nextMatch.p1 = chosen;
        } else {
            nextMatch.p2 = chosen;
        }
        clearDownstreamBracket(roundIdx + 1, nextMatchIdx);
    }

    saveState();
    renderEliminationBracket();
    renderWinrateMatrix();
}

function clearDownstreamBracket(roundIdx, matchIdx) {
    const bracket = state.eliminationBracket;
    if (!bracket || roundIdx >= bracket.rounds.length) return;

    const match = bracket.rounds[roundIdx][matchIdx];
    match.winner = null;

    if (roundIdx + 1 < bracket.rounds.length) {
        const nextMatchIdx = Math.floor(matchIdx / 2);
        const nextMatch = bracket.rounds[roundIdx + 1][nextMatchIdx];
        if (matchIdx % 2 === 0) {
            nextMatch.p1 = null;
        } else {
            nextMatch.p2 = null;
        }
        clearDownstreamBracket(roundIdx + 1, nextMatchIdx);
    }
}

function renderEliminationBracket() {
    const container = document.getElementById('elimination-bracket-container');
    if (!state.eliminationBracket || !state.eliminationBracket.rounds) {
        container.innerHTML = `<p class="text-slate-500 italic text-center py-12">Complete Swiss rounds or click Build / Reset Bracket to populate playoffs.</p>`;
        return;
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
            <div class="mb-8 p-6 rounded-2xl bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 border border-amber-500/50 text-center shadow-xl">
                <div class="text-xs uppercase tracking-widest text-amber-400 font-bold mb-1">👑 Riftbound Tournament Champion</div>
                <div class="text-2xl font-black font-arcane text-amber-200">${escapeHtml(champion.name)}</div>
                <div class="text-sm text-amber-400/90 mt-0.5">${escapeHtml(formatDeckLabel(champion.deck))}</div>
            </div>
        ` : ''}
        <div class="flex flex-col lg:flex-row gap-8 justify-start items-stretch min-w-max px-2">
            ${rounds.map((rMatches, rIdx) => `
                <div class="flex flex-col justify-around space-y-6 w-72">
                    <h3 class="text-xs uppercase tracking-wider font-bold text-amber-400 text-center border-b border-slate-800 pb-2">
                        ${roundNames[rIdx] || `Round ${rIdx + 1}`}
                    </h3>
                    <div class="flex flex-col justify-around flex-grow space-y-4">
                        ${rMatches.map((m, mIdx) => {
                            const p1 = m.p1;
                            const p2 = m.p2;
                            const p1Won = m.winner && p1 && m.winner.id === p1.id;
                            const p2Won = m.winner && p2 && m.winner.id === p2.id;

                            return `
                                <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5 shadow-md space-y-2">
                                    <div onclick="advanceEliminationWinner(${rIdx}, ${mIdx}, 'p1')" class="flex justify-between items-center p-2.5 rounded-lg border transition-all ${p1 && p1.id ? 'cursor-pointer hover:border-amber-500/50' : 'opacity-50'} ${p1Won ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800/80 bg-slate-900/60'}">
                                        <div class="truncate pr-2">
                                            <div class="text-xs font-bold text-slate-200 truncate">
                                                ${p1 ? `<span class="text-slate-500 font-mono mr-1">#${p1.seed || '-'}</span>${escapeHtml(p1.name)}` : '<span class="text-slate-600 italic">TBD</span>'}
                                            </div>
                                            <div class="text-[11px] text-amber-400/80 truncate">${p1 && p1.id ? escapeHtml(formatDeckLabel(p1.deck)) : ''}</div>
                                        </div>
                                        ${p1Won ? '<span class="text-amber-400 text-xs font-bold">✓</span>' : ''}
                                    </div>

                                    <div onclick="advanceEliminationWinner(${rIdx}, ${mIdx}, 'p2')" class="flex justify-between items-center p-2.5 rounded-lg border transition-all ${p2 && p2.id ? 'cursor-pointer hover:border-amber-500/50' : 'opacity-50'} ${p2Won ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800/80 bg-slate-900/60'}">
                                        <div class="truncate pr-2">
                                            <div class="text-xs font-bold text-slate-200 truncate">
                                                ${p2 ? `<span class="text-slate-500 font-mono mr-1">#${p2.seed || '-'}</span>${escapeHtml(p2.name)}` : '<span class="text-slate-600 italic">TBD</span>'}
                                            </div>
                                            <div class="text-[11px] text-amber-400/80 truncate">${p2 && p2.id ? escapeHtml(formatDeckLabel(p2.deck)) : ''}</div>
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

// Utility Escaping
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
