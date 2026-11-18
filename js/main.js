(() => {
    const Riftbound = (window.Riftbound = window.Riftbound || {});

    const TABS = ['players', 'swiss', 'standings', 'elimination', 'meta', 'matrix'];
    const THEME_STORAGE_KEY = 'riftbound_theme';
    let activeTab = 'players';

    function applyTheme(theme) {
        const isLight = theme === 'light';
        const html = document.documentElement;
        html.classList.toggle('light', isLight);
        html.classList.toggle('dark', !isLight);

        const iconEl = document.getElementById('theme-toggle-icon');
        const labelEl = document.getElementById('theme-toggle-label');
        if (iconEl) iconEl.textContent = isLight ? '🌙' : '☀️';
        if (labelEl) labelEl.textContent = isLight ? 'Dark' : 'Light';
    }

    function initTheme() {
        const saved = localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
        applyTheme(saved);
    }

    function handleToggleTheme() {
        const nextTheme = document.documentElement.classList.contains('light') ? 'dark' : 'light';
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        applyTheme(nextTheme);
    }

    function renderActiveView() {
        const { getState } = Riftbound.store;
        const state = getState();

        const countBadge = document.getElementById('player-count');
        if (countBadge) countBadge.textContent = state.players.length;

        switch (activeTab) {
            case 'players':
                Riftbound.playersView.renderPlayers();
                break;
            case 'swiss':
                Riftbound.swissView.renderSwissRounds();
                break;
            case 'standings':
                Riftbound.standingsView.renderStandings();
                break;
            case 'elimination':
                Riftbound.bracketView.renderEliminationBracket();
                break;
            case 'meta':
                Riftbound.analyticsView.renderMetaBreakdown();
                break;
            case 'matrix':
                Riftbound.analyticsView.renderWinrateMatrix();
                break;
        }
    }

    function switchTab(tabId) {
        if (!TABS.includes(tabId)) return;
        activeTab = tabId;

        TABS.forEach(id => {
            const tabEl = document.getElementById(`tab-${id}`);
            const navEl = document.getElementById(`nav-${id}`);
            if (tabEl) tabEl.classList.add('hidden');
            if (navEl) {
                navEl.classList.remove('bg-[#38BDF8]', 'text-[#082F49]', 'font-semibold', 'shadow');
                navEl.classList.add('text-[#94A3B8]');
            }
        });

        const activeTabEl = document.getElementById(`tab-${tabId}`);
        const activeNavEl = document.getElementById(`nav-${tabId}`);
        if (activeTabEl) activeTabEl.classList.remove('hidden');
        if (activeNavEl) {
            activeNavEl.classList.add('bg-[#38BDF8]', 'text-[#082F49]', 'font-semibold', 'shadow');
            activeNavEl.classList.remove('text-[#94A3B8]');
        }

        renderActiveView();
    }

    function createPairingsForRound(targetRoundIdx, forcedSpecs = []) {
        const state = Riftbound.store.getState();
        const priorRounds = state.swissRounds.slice(0, targetRoundIdx);
        return Riftbound.swiss.buildSwissPairings(state.players, priorRounds, targetRoundIdx, forcedSpecs);
    }

    // --- Player Actions ---
    function handleAddPlayer(e) {
        e.preventDefault();
        if (Riftbound.store.isReadOnly()) return;
        const state = Riftbound.store.getState();
        const nameInput = document.getElementById('p-name');
        const deckInput = document.getElementById('p-deck');
        if (!nameInput || !nameInput.value.trim()) return;

        state.players.push({
            id: 'p_' + Math.random().toString(36).substring(2, 11),
            name: nameInput.value.trim(),
            deck: deckInput ? deckInput.value || '' : '',
            active: true
        });

        nameInput.value = '';
        if (deckInput) deckInput.selectedIndex = 0;

        Riftbound.store.saveState();
        renderActiveView();
    }

    function handleUpdatePlayerDeck(playerId, newDeck) {
        if (Riftbound.store.isReadOnly()) return;
        const state = Riftbound.store.getState();
        const player = state.players.find(p => p.id === playerId);
        if (!player) return;
        player.deck = newDeck || '';

        if (state.eliminationBracket && state.eliminationBracket.rounds) {
            state.eliminationBracket.rounds.forEach(rMatches => {
                rMatches.forEach(m => {
                    if (m.p1 && m.p1.id === playerId) m.p1.deck = player.deck;
                    if (m.p2 && m.p2.id === playerId) m.p2.deck = player.deck;
                    if (m.winner && m.winner.id === playerId) m.winner.deck = player.deck;
                });
            });
        }

        Riftbound.store.saveState();
        renderActiveView();
    }

    function handleRemovePlayer(id) {
        if (Riftbound.store.isReadOnly()) return;
        const state = Riftbound.store.getState();
        state.players = state.players.filter(p => p.id !== id);
        Riftbound.store.saveState();
        renderActiveView();
    }

    function handleTogglePlayerActive(playerId) {
        if (Riftbound.store.isReadOnly()) return;
        const state = Riftbound.store.getState();
        const player = state.players.find(p => p.id === playerId);
        if (!player) return;
        player.active = player.active === false;
        Riftbound.store.saveState();
        renderActiveView();
    }

    function handleImportPlayersFromTxt(event) {
        if (Riftbound.store.isReadOnly()) return;
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const { matchOfficialLegend } = Riftbound.legends;
        const { escapeHtml, openModal } = Riftbound.dom;
        const state = Riftbound.store.getState();

        const reader = new FileReader();
        reader.onload = function (e) {
            const content = e.target.result || '';
            const lines = content.split(/\r?\n/);

            let addedCount = 0;
            const unmatchedLegends = [];

            lines.forEach((rawLine, idx) => {
                const line = rawLine.trim();
                if (!line) return;

                let namePart = line;
                let legendPart = '';

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
            Riftbound.store.saveState();
            renderActiveView();

            if (unmatchedLegends.length > 0) {
                openModal(
                    'Import Completed with Unrecognized Legends',
                    `<p class="mb-2">Imported <strong>${addedCount}</strong> Player(s).</p>
                     <p class="text-xs text-sky-300 mb-2">The following Legend names did not match the 58 official Riftbound Legends and were left unassigned (you can select them in the Registered Roster table):</p>
                     <ul class="list-disc pl-5 text-xs text-[#94A3B8] space-y-1">${unmatchedLegends.map(item => `<li>${item}</li>`).join('')}</ul>`,
                    null,
                    true
                );
            }
        };

        reader.readAsText(file);
    }

    function handleUpdateCustomRounds(val) {
        if (Riftbound.store.isReadOnly()) return;
        const { getState, getRecommendedSwissRounds, saveState } = Riftbound.store;
        const state = getState();
        const trimmed = String(val).trim();
        if (!trimmed) {
            state.customMaxRounds = null;
        } else {
            const parsed = parseInt(trimmed, 10);
            state.customMaxRounds = (!isNaN(parsed) && parsed >= 1) ? parsed : null;
        }

        if (state.swissRounds.length > 0) {
            state.maxSwissRounds = state.customMaxRounds || getRecommendedSwissRounds(state.players.length);
        }

        saveState();
        Riftbound.playersView.updateRoundsInputUI();
        Riftbound.swissView.renderSwissRounds();
    }

    // --- Snapshot & Reset Actions ---
    function handleDownloadSnapshot() {
        const snapshot = Riftbound.store.createSnapshotData();
        const jsonString = JSON.stringify(snapshot, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const dateStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const a = document.createElement('a');
        a.href = url;
        a.download = `riftbound-tournament-${dateStamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function handleLoadSnapshot(event) {
        if (Riftbound.store.isReadOnly()) return;
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const { escapeHtml, openModal } = Riftbound.dom;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const restored = Riftbound.store.restoreFromSnapshotJson(e.target.result);

                if (restored.eliminationBracket && restored.eliminationBracket.cutSize) {
                    const cutSelect = document.getElementById('cut-size-select');
                    if (cutSelect) cutSelect.value = String(restored.eliminationBracket.cutSize);
                }

                if (restored.swissRounds.length > 0) {
                    switchTab('swiss');
                } else if (restored.eliminationBracket) {
                    switchTab('elimination');
                } else {
                    switchTab('players');
                }

                const activeRoundObj = restored.swissRounds[restored.currentRoundIndex];
                const activeRoundSummary = activeRoundObj
                    ? `Active on <strong>Round ${activeRoundObj.round}</strong> (${activeRoundObj.matches.filter(m => m.winner !== null).length}/${activeRoundObj.matches.length} matches scored).`
                    : '';

                openModal(
                    'Tournament Snapshot Loaded',
                    `Successfully restored <strong>${restored.players.length}</strong> Player(s), <strong>${restored.swissRounds.length}</strong> Swiss Round(s), and ${restored.eliminationBracket ? 'the Elimination Bracket' : 'no Elimination Bracket'}.<br>${activeRoundSummary}`,
                    null,
                    true
                );
            } catch (err) {
                openModal(
                    'Failed to Load Tournament',
                    `The selected file could not be parsed as a valid Riftbound Tournament snapshot.<br><br><span class="text-xs text-red-400 font-mono">${escapeHtml(err.message)}</span>`,
                    null,
                    true
                );
            } finally {
                event.target.value = '';
            }
        };

        reader.readAsText(file);
    }

    function handlePromptResetTournament() {
        if (Riftbound.store.isReadOnly()) return;
        Riftbound.dom.openModal(
            'Reset Entire Tournament',
            'Are you sure you want to clear all registered players, Swiss rounds, standings, and playoff brackets?',
            () => {
                Riftbound.store.resetState();
                switchTab('players');
            }
        );
    }

    // --- Swiss Actions ---
    function handleGenerateSwissPairings() {
        if (Riftbound.store.isReadOnly()) return;
        const { getState, getRecommendedSwissRounds, setSelectedSwapSlot, saveState } = Riftbound.store;
        const state = getState();
        if (state.players.filter(p => p.active !== false).length < 2) return;

        const doGenerate = () => {
            state.swissRounds = [];
            state.currentRoundIndex = 0;
            state.eliminationBracket = null;
            state.maxSwissRounds = state.customMaxRounds || getRecommendedSwissRounds(state.players.length);
            setSelectedSwapSlot(null);
            const pairings = createPairingsForRound(0, []);
            state.swissRounds.push({ round: 1, matches: pairings, stale: false, forcedSpecs: [] });
            saveState();
            switchTab('swiss');
        };

        if (state.swissRounds.length > 0) {
            Riftbound.dom.openModal(
                'Restart Swiss Rounds',
                'Generating Round 1 pairings will overwrite existing Swiss rounds. Continue?',
                doGenerate
            );
        } else {
            doGenerate();
        }
    }

    function handleNextSwissRound() {
        if (Riftbound.store.isReadOnly()) return;
        const { getState, getEffectiveMaxRounds, setSelectedSwapSlot, saveState } = Riftbound.store;
        const state = getState();
        const latestRound = state.swissRounds[state.swissRounds.length - 1];
        if (!latestRound) return;

        const incomplete = latestRound.matches.some(m => m.winner === null);
        if (incomplete) {
            Riftbound.dom.openModal(
                'Incomplete Round',
                `Please enter results for all matches in Round ${latestRound.round} before advancing to the next round.`,
                null,
                true
            );
            return;
        }

        const maxRounds = getEffectiveMaxRounds();
        if (state.swissRounds.length >= maxRounds) {
            switchTab('standings');
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
        setSelectedSwapSlot(null);
        saveState();
        renderActiveView();
    }

    function handlePromptRepairRound(targetIdx = Riftbound.store.getState().currentRoundIndex) {
        if (Riftbound.store.isReadOnly()) return;
        const { getState, setSelectedSwapSlot, saveState } = Riftbound.store;
        const state = getState();
        if (targetIdx < 0 || Riftbound.swiss.isRoundLocked(targetIdx, state.swissRounds)) return;
        const roundObj = state.swissRounds[targetIdx];
        const roundNum = roundObj.round;
        const pinnedCount = roundObj.forcedSpecs ? roundObj.forcedSpecs.length : 0;

        const description = targetIdx === 0
            ? `Randomize and regenerate fresh pairings for Round 1${pinnedCount > 0 ? ` (keeping ${pinnedCount} pinned matchup(s))` : ''}? Any scores entered for Round 1 will be reset.`
            : `Recalculate standings from Rounds 1–${roundNum - 1} and randomly regenerate valid pairings within each score bracket for Round ${roundNum}${pinnedCount > 0 ? ` (keeping ${pinnedCount} pinned matchup(s))` : ''}? Current Round ${roundNum} match scores will be reset.`;

        Riftbound.dom.openModal(
            `Re-Pair & Randomize Round ${roundNum}`,
            description,
            () => {
                const specs = roundObj.forcedSpecs || [];
                state.swissRounds[targetIdx].matches = createPairingsForRound(targetIdx, specs);
                state.swissRounds[targetIdx].stale = false;
                state.currentRoundIndex = targetIdx;
                setSelectedSwapSlot(null);
                saveState();
                renderActiveView();
            }
        );
    }

    function handleSetMatchResult(roundIdx, matchId, scoreType) {
        if (Riftbound.store.isReadOnly()) return;
        const state = Riftbound.store.getState();
        if (Riftbound.swiss.isRoundLocked(roundIdx, state.swissRounds)) return;

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

        Riftbound.store.saveState();
        renderActiveView();
    }

    function handleClearMatchResult(roundIdx, matchId) {
        if (Riftbound.store.isReadOnly()) return;
        const state = Riftbound.store.getState();
        if (Riftbound.swiss.isRoundLocked(roundIdx, state.swissRounds)) return;

        const roundObj = state.swissRounds[roundIdx];
        if (!roundObj) return;
        const match = roundObj.matches.find(m => m.id === matchId);
        if (!match || match.bye) return;

        match.winner = null;
        match.p1Wins = 0;
        match.p2Wins = 0;
        match.draws = 0;

        if (roundIdx < state.swissRounds.length - 1) {
            for (let i = roundIdx + 1; i < state.swissRounds.length; i++) {
                state.swissRounds[i].stale = true;
            }
        }

        Riftbound.store.saveState();
        renderActiveView();
    }

    function executeSeatSwap(roundIdx, matchIdA, slotA, matchIdB, slotB) {
        if (Riftbound.store.isReadOnly()) return;
        const { getState, setSelectedSwapSlot, saveState } = Riftbound.store;
        const state = getState();
        if (Riftbound.swiss.isRoundLocked(roundIdx, state.swissRounds)) return;
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

        Riftbound.swiss.normalizeRoundMatchesAfterSwap(state.players, state.swissRounds, roundIdx);
        setSelectedSwapSlot(null);
        saveState();
        renderActiveView();
    }

    function handleSeatClick(roundIdx, matchId, slot) {
        if (Riftbound.store.isReadOnly()) return;
        const { getState, getSelectedSwapSlot, setSelectedSwapSlot } = Riftbound.store;
        const state = getState();
        const selectedSwapSlot = getSelectedSwapSlot();
        if (Riftbound.swiss.isRoundLocked(roundIdx, state.swissRounds)) return;

        if (!selectedSwapSlot || selectedSwapSlot.roundIdx !== roundIdx) {
            setSelectedSwapSlot({ roundIdx, matchId, slot });
            Riftbound.swissView.renderSwissRounds();
            return;
        }

        if (selectedSwapSlot.matchId === matchId && selectedSwapSlot.slot === slot) {
            setSelectedSwapSlot(null);
            Riftbound.swissView.renderSwissRounds();
            return;
        }

        executeSeatSwap(roundIdx, selectedSwapSlot.matchId, selectedSwapSlot.slot, matchId, slot);
    }

    function handleApplyDirectForcedPairing() {
        if (Riftbound.store.isReadOnly()) return;
        const state = Riftbound.store.getState();
        const activeIdx = state.currentRoundIndex;
        if (Riftbound.swiss.isRoundLocked(activeIdx, state.swissRounds)) return;

        const roundObj = state.swissRounds[activeIdx];
        if (!roundObj) return;

        const p1Id = document.getElementById('force-p1-select')?.value;
        const p2Val = document.getElementById('force-p2-select')?.value;

        if (!p1Id || !p2Val) {
            Riftbound.dom.openModal('Select Players', 'Please select both Player 1 and an Opponent (or BYE) to force a pairing.', null, true);
            return;
        }
        if (p1Id === p2Val) {
            Riftbound.dom.openModal('Invalid Pairing', 'A Player cannot be paired against themselves.', null, true);
            return;
        }

        const loc1 = Riftbound.swiss.findPlayerSlotInRound(roundObj, p1Id);
        if (!loc1) return;

        if (p2Val === 'BYE') {
            const byeMatch = roundObj.matches.find(m => m.bye || m.p2 === null);
            if (!byeMatch) {
                Riftbound.dom.openModal('No BYE Table Available', 'This round has an even number of active Players, so there is no BYE slot.', null, true);
                return;
            }
            executeSeatSwap(activeIdx, loc1.match.id, loc1.slot, byeMatch.id, 'p1');
            return;
        }

        const loc2 = Riftbound.swiss.findPlayerSlotInRound(roundObj, p2Val);
        if (!loc2) return;

        if (loc1.match.id === loc2.match.id) {
            loc1.match.forced = true;
            Riftbound.store.saveState();
            renderActiveView();
            return;
        }

        const targetSlotAtTable1 = loc1.slot === 'p1' ? 'p2' : 'p1';
        executeSeatSwap(activeIdx, loc1.match.id, targetSlotAtTable1, loc2.match.id, loc2.slot);
        loc1.match.forced = true;
        Riftbound.store.saveState();
        renderActiveView();
    }

    function handleAddLockedPair() {
        if (Riftbound.store.isReadOnly()) return;
        const state = Riftbound.store.getState();
        const activeIdx = state.currentRoundIndex;
        if (Riftbound.swiss.isRoundLocked(activeIdx, state.swissRounds)) return;
        const roundObj = state.swissRounds[activeIdx];
        if (!roundObj) return;

        const p1Id = document.getElementById('force-p1-select')?.value;
        const p2Val = document.getElementById('force-p2-select')?.value;

        if (!p1Id || !p2Val || p1Id === p2Val) {
            Riftbound.dom.openModal('Invalid Selection', 'Please choose two distinct Players (or a Player and BYE) to pin.', null, true);
            return;
        }

        if (!roundObj.forcedSpecs) roundObj.forcedSpecs = [];

        roundObj.forcedSpecs = roundObj.forcedSpecs.filter(s =>
            s.p1 !== p1Id && s.p2 !== p1Id && (p2Val === 'BYE' ? s.p2 !== 'BYE' : (s.p1 !== p2Val && s.p2 !== p2Val))
        );

        roundObj.forcedSpecs.push({ p1: p1Id, p2: p2Val });
        roundObj.matches = createPairingsForRound(activeIdx, roundObj.forcedSpecs);
        roundObj.stale = false;
        Riftbound.store.saveState();
        renderActiveView();
    }

    function handleRemovePinnedPair(idx) {
        if (Riftbound.store.isReadOnly()) return;
        const state = Riftbound.store.getState();
        const activeIdx = state.currentRoundIndex;
        if (Riftbound.swiss.isRoundLocked(activeIdx, state.swissRounds)) return;
        const roundObj = state.swissRounds[activeIdx];
        if (!roundObj || !roundObj.forcedSpecs) return;

        roundObj.forcedSpecs.splice(idx, 1);
        roundObj.matches = createPairingsForRound(activeIdx, roundObj.forcedSpecs);
        Riftbound.store.saveState();
        renderActiveView();
    }

    function handleClearPinnedPairs() {
        if (Riftbound.store.isReadOnly()) return;
        const state = Riftbound.store.getState();
        const activeIdx = state.currentRoundIndex;
        if (Riftbound.swiss.isRoundLocked(activeIdx, state.swissRounds)) return;
        const roundObj = state.swissRounds[activeIdx];
        if (!roundObj) return;

        roundObj.forcedSpecs = [];
        roundObj.matches = createPairingsForRound(activeIdx, []);
        Riftbound.store.saveState();
        renderActiveView();
    }

    // --- Elimination Actions ---
    function handleGenerateEliminationBracket() {
        if (Riftbound.store.isReadOnly()) return;
        const state = Riftbound.store.getState();
        const cutSelect = document.getElementById('cut-size-select');
        const cutSize = cutSelect ? parseInt(cutSelect.value, 10) : 8;
        const container = document.getElementById('elimination-bracket-container');

        if (state.players.length < 2) {
            if (container) {
                container.innerHTML = '<p class="text-sky-400/80 italic text-center py-12">Register players first to build an elimination bracket.</p>';
            }
            return;
        }

        state.eliminationBracket = Riftbound.bracket.buildEliminationBracket(cutSize, state.players, state.swissRounds);
        Riftbound.store.saveState();
        renderActiveView();
    }

    function handleProceedToElimination() {
        if (Riftbound.store.isReadOnly()) return;
        switchTab('elimination');
        handleGenerateEliminationBracket();
    }

    function handleAdvanceEliminationWinner(roundIdx, matchIdx, playerSlot) {
        if (Riftbound.store.isReadOnly()) return;
        const state = Riftbound.store.getState();
        if (!Riftbound.bracket.advanceEliminationWinnerInBracket(state.eliminationBracket, roundIdx, matchIdx, playerSlot)) {
            return;
        }
        Riftbound.store.saveState();
        renderActiveView();
    }

    // --- Remote Gist Tournament Loader (Read-Only Showcase Mode) ---
    async function loadTournamentFromGist(gistId, gistUser = '625th') {
        const rawUrl = `https://gist.githubusercontent.com/${gistUser}/${gistId}/raw`;
        const apiUrl = `https://api.github.com/gists/${gistId}`;

        try {
            let jsonText = null;
            try {
                const rawRes = await fetch(rawUrl, { cache: 'no-store' });
                if (rawRes.ok) {
                    jsonText = await rawRes.text();
                }
            } catch (_) {
                // Fallback to GitHub Gist API below
            }

            if (!jsonText) {
                const apiRes = await fetch(apiUrl, { cache: 'no-store' });
                if (!apiRes.ok) {
                    throw new Error(`GitHub Gist request failed (${apiRes.status})`);
                }
                const gistData = await apiRes.json();
                const files = gistData && gistData.files ? Object.values(gistData.files) : [];
                if (files.length === 0) {
                    throw new Error('No files found in the specified GitHub Gist.');
                }
                if (files[0].content) {
                    jsonText = files[0].content;
                } else if (files[0].raw_url) {
                    const fileRes = await fetch(files[0].raw_url, { cache: 'no-store' });
                    jsonText = await fileRes.text();
                }
            }

            const restored = Riftbound.store.restoreFromSnapshotJson(jsonText, true);

            if (restored.eliminationBracket && restored.eliminationBracket.cutSize) {
                const cutSelect = document.getElementById('cut-size-select');
                if (cutSelect) cutSelect.value = String(restored.eliminationBracket.cutSize);
            }

            renderActiveView();
        } catch (err) {
            const { escapeHtml, openModal } = Riftbound.dom;
            openModal(
                'Failed to Load Ukraine Open Data',
                `Could not fetch tournament data from GitHub Gist.<br><br><span class="text-xs text-red-400 font-mono">${escapeHtml(err.message)}</span>`,
                null,
                true
            );
        }
    }

    function handleOpenUkraineOpen() {
        const isFileProtocol = window.location.protocol === 'file:';
        window.location.href = isFileProtocol ? 'ukraineopen.html' : 'ukraineopen';
    }

    function handleOpenMainHub() {
        const isFileProtocol = window.location.protocol === 'file:';
        const cleanPath = window.location.pathname.replace(/\/+$/, '');
        const strippedPath = cleanPath.replace(/\/ukraineopen(?:\.html)?$/i, '') || '';
        if (isFileProtocol) {
            window.location.href = `${strippedPath}/index.html`;
        } else {
            window.location.href = `${strippedPath}/`;
        }
    }

    // --- Event Binding ---
    function bindEvents() {
        document.getElementById('player-form')?.addEventListener('submit', handleAddPlayer);
        document.getElementById('txt-file-input')?.addEventListener('change', handleImportPlayersFromTxt);
        document.getElementById('snapshot-file-input')?.addEventListener('change', handleLoadSnapshot);
        document.getElementById('custom-rounds-input')?.addEventListener('input', e => handleUpdateCustomRounds(e.target.value));
        document.getElementById('cut-size-select')?.addEventListener('change', handleGenerateEliminationBracket);
        document.getElementById('meta-sort-select')?.addEventListener('change', () => Riftbound.analyticsView.renderMetaBreakdown());
        document.getElementById('matrix-include-elim')?.addEventListener('change', () => Riftbound.analyticsView.renderWinrateMatrix());
        document.getElementById('matrix-metric-select')?.addEventListener('change', () => Riftbound.analyticsView.renderWinrateMatrix());
        document.getElementById('swiss-search-input')?.addEventListener('input', () => Riftbound.swissView.renderSwissRounds());
        document.getElementById('swiss-filter-select')?.addEventListener('change', () => Riftbound.swissView.renderSwissRounds());
        document.getElementById('modal-cancel-btn')?.addEventListener('click', () => Riftbound.dom.closeModal());

        document.getElementById('players-table-body')?.addEventListener('change', e => {
            const select = e.target.closest('select[data-action="update-deck"]');
            if (!select) return;
            handleUpdatePlayerDeck(select.dataset.playerId, select.value);
        });

        document.addEventListener('click', e => {
            const trigger = e.target.closest('[data-action]');
            if (!trigger || trigger.disabled) return;

            const { action } = trigger.dataset;
            const state = Riftbound.store.getState();

            switch (action) {
                case 'toggle-theme':
                    handleToggleTheme();
                    break;
                case 'open-ukraine-open':
                    handleOpenUkraineOpen();
                    break;
                case 'open-main-hub':
                    handleOpenMainHub();
                    break;
                case 'switch-tab':
                    switchTab(trigger.dataset.tab);
                    break;
                case 'trigger-file-input':
                    if (!Riftbound.store.isReadOnly()) {
                        document.getElementById(trigger.dataset.target)?.click();
                    }
                    break;
                case 'download-snapshot':
                    handleDownloadSnapshot();
                    break;
                case 'reset-tournament':
                    handlePromptResetTournament();
                    break;
                case 'remove-player':
                    handleRemovePlayer(trigger.dataset.playerId);
                    break;
                case 'toggle-player-active':
                    handleTogglePlayerActive(trigger.dataset.playerId);
                    break;
                case 'start-swiss':
                    handleGenerateSwissPairings();
                    break;
                case 'toggle-force-panel':
                    Riftbound.swissView.toggleForcePairingsPanel();
                    break;
                case 'repair-round':
                    handlePromptRepairRound(
                        trigger.dataset.roundIdx !== undefined ? Number(trigger.dataset.roundIdx) : state.currentRoundIndex
                    );
                    break;
                case 'next-round':
                    handleNextSwissRound();
                    break;
                case 'apply-forced-pair':
                    handleApplyDirectForcedPairing();
                    break;
                case 'pin-forced-pair':
                    handleAddLockedPair();
                    break;
                case 'clear-pins':
                    handleClearPinnedPairs();
                    break;
                case 'remove-pin':
                    handleRemovePinnedPair(Number(trigger.dataset.pinIdx));
                    break;
                case 'select-round':
                    state.currentRoundIndex = Number(trigger.dataset.roundIdx);
                    Riftbound.store.setSelectedSwapSlot(null);
                    Riftbound.store.saveState();
                    Riftbound.swissView.renderSwissRounds();
                    break;
                case 'cancel-swap':
                    Riftbound.store.setSelectedSwapSlot(null);
                    Riftbound.swissView.renderSwissRounds();
                    break;
                case 'swap-seat':
                    handleSeatClick(Number(trigger.dataset.roundIdx), trigger.dataset.matchId, trigger.dataset.slot);
                    break;
                case 'set-score':
                    handleSetMatchResult(Number(trigger.dataset.roundIdx), trigger.dataset.matchId, trigger.dataset.score);
                    break;
                case 'clear-score':
                    handleClearMatchResult(Number(trigger.dataset.roundIdx), trigger.dataset.matchId);
                    break;
                case 'proceed-elimination':
                    handleProceedToElimination();
                    break;
                case 'build-bracket':
                    handleGenerateEliminationBracket();
                    break;
                case 'advance-elim':
                    handleAdvanceEliminationWinner(
                        Number(trigger.dataset.roundIdx),
                        Number(trigger.dataset.matchIdx),
                        trigger.dataset.slot
                    );
                    break;
            }
        });
    }

    function initApp() {
        initTheme();
        Riftbound.playersView.populateLegendDropdown();

        const isReadOnlyPage = document.body.dataset.readonly === 'true';
        const gistId = document.body.dataset.gistId;
        const gistUser = document.body.dataset.gistUser || '625th';

        if (isReadOnlyPage) {
            Riftbound.store.setReadOnly(true);
            bindEvents();
            switchTab('swiss');
            if (gistId) {
                loadTournamentFromGist(gistId, gistUser);
            }
        } else {
            Riftbound.store.setReadOnly(false);
            Riftbound.store.loadState();
            bindEvents();
            renderActiveView();
        }
    }

    Riftbound.main = {
        initApp
    };
})();
