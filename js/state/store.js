(() => {
    const Riftbound = (window.Riftbound = window.Riftbound || {});

    const STORAGE_KEY = 'riftbound_tournament_state';

    function createInitialState() {
        return {
            players: [],
            swissRounds: [],
            currentRoundIndex: 0,
            customMaxRounds: null,
            maxSwissRounds: null,
            eliminationBracket: null
        };
    }

    let state = createInitialState();
    let selectedSwapSlot = null; // { roundIdx, matchId, slot: 'p1' | 'p2' }
    let readOnlyMode = false;

    function isReadOnly() {
        return readOnlyMode;
    }

    function setReadOnly(val) {
        readOnlyMode = Boolean(val);
    }

    function getState() {
        return state;
    }

    function getSelectedSwapSlot() {
        return selectedSwapSlot;
    }

    function setSelectedSwapSlot(slotObj) {
        if (readOnlyMode) return;
        selectedSwapSlot = slotObj;
    }

    function saveState() {
        if (readOnlyMode) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function loadState() {
        if (readOnlyMode) return;
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        try {
            const parsed = JSON.parse(saved);
            state = {
                players: parsed.players || [],
                swissRounds: parsed.swissRounds || [],
                currentRoundIndex: typeof parsed.currentRoundIndex === 'number' ? parsed.currentRoundIndex : 0,
                customMaxRounds: parsed.customMaxRounds || null,
                maxSwissRounds: parsed.maxSwissRounds || null,
                eliminationBracket: parsed.eliminationBracket || null
            };
        } catch (e) {
            console.error('Failed to parse saved state', e);
        }
    }

    function resetState() {
        if (readOnlyMode) return;
        state = createInitialState();
        selectedSwapSlot = null;
        saveState();
    }

    function getRecommendedSwissRounds(playerCount) {
        if (playerCount < 2) return 0;
        if (playerCount <= 3) return 2;
        return Math.ceil(Math.log2(playerCount));
    }

    function getEffectiveMaxRounds() {
        if (state.customMaxRounds && state.customMaxRounds >= 1) {
            return state.customMaxRounds;
        }
        if (state.maxSwissRounds && state.maxSwissRounds >= 1) {
            return state.maxSwissRounds;
        }
        return getRecommendedSwissRounds(state.players.length);
    }

    function createSnapshotData() {
        if (!readOnlyMode) {
            saveState();
        }
        const playerMap = new Map(state.players.map(p => [p.id, p]));

        const serializedRounds = (state.swissRounds || []).map((r, rIdx) => {
            const matches = (r.matches || []).map((m, mIdx) => {
                const p1Obj = m.p1 ? playerMap.get(m.p1) : null;
                const p2Obj = m.p2 ? playerMap.get(m.p2) : null;
                return {
                    id: m.id || `m_${rIdx}_${mIdx}`,
                    table: mIdx + 1,
                    p1: m.p1 || null,
                    p1Name: p1Obj ? p1Obj.name : null,
                    p1Deck: p1Obj ? p1Obj.deck : null,
                    p2: m.p2 || null,
                    p2Name: p2Obj ? p2Obj.name : (m.bye ? 'BYE' : null),
                    p2Deck: p2Obj ? p2Obj.deck : null,
                    p1Points: typeof m.p1Points === 'number' ? m.p1Points : 0,
                    p2Points: typeof m.p2Points === 'number' ? m.p2Points : null,
                    winner: m.winner !== undefined ? m.winner : null,
                    p1Wins: typeof m.p1Wins === 'number' ? m.p1Wins : 0,
                    p2Wins: typeof m.p2Wins === 'number' ? m.p2Wins : 0,
                    draws: typeof m.draws === 'number' ? m.draws : 0,
                    bye: Boolean(m.bye),
                    forced: Boolean(m.forced),
                    status: m.winner !== null && m.winner !== undefined ? 'completed' : 'in_progress'
                };
            });

            const completedCount = matches.filter(m => m.status === 'completed').length;

            return {
                round: r.round || (rIdx + 1),
                status: completedCount === matches.length && matches.length > 0 ? 'completed' : 'in_progress',
                completedMatches: completedCount,
                totalMatches: matches.length,
                stale: Boolean(r.stale),
                forcedSpecs: Array.isArray(r.forcedSpecs) ? r.forcedSpecs : [],
                matches
            };
        });

        return {
            app: 'Riftbound Tournament Hub',
            version: 4,
            exportedAt: new Date().toISOString(),
            state: {
                players: (state.players || []).map(p => ({
                    id: p.id,
                    name: p.name,
                    deck: p.deck || '',
                    active: p.active !== false
                })),
                swissRounds: serializedRounds,
                currentRoundIndex: typeof state.currentRoundIndex === 'number'
                    ? state.currentRoundIndex
                    : Math.max(0, serializedRounds.length - 1),
                customMaxRounds: state.customMaxRounds || null,
                maxSwissRounds: state.maxSwissRounds || null,
                eliminationBracket: state.eliminationBracket
                    ? JSON.parse(JSON.stringify(state.eliminationBracket))
                    : null
            }
        };
    }

    function restoreFromSnapshotJson(jsonText, skipLocalStorage = false) {
        const { matchOfficialLegend } = Riftbound.legends;
        const parsed = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
        const loadedState = parsed && parsed.state ? parsed.state : parsed;

        if (!loadedState || !Array.isArray(loadedState.players) || !Array.isArray(loadedState.swissRounds)) {
            throw new Error('Invalid tournament snapshot structure.');
        }

        const restoredPlayers = loadedState.players.map((p, idx) => ({
            id: String(p.id || 'p_' + Math.random().toString(36).substring(2, 11) + '_' + idx),
            name: String(p.name || 'Unknown'),
            deck: matchOfficialLegend(p.deck) || (p.deck ? String(p.deck) : ''),
            active: p.active !== false
        }));

        const restoredRounds = loadedState.swissRounds.map((r, rIdx) => ({
            round: typeof r.round === 'number' ? r.round : (rIdx + 1),
            stale: Boolean(r.stale),
            forcedSpecs: Array.isArray(r.forcedSpecs) ? r.forcedSpecs : [],
            matches: Array.isArray(r.matches) ? r.matches.map((m, mIdx) => ({
                id: String(m.id || `m_${rIdx}_${mIdx}`),
                p1: m.p1 || null,
                p2: m.p2 || null,
                p1Points: typeof m.p1Points === 'number' ? m.p1Points : 0,
                p2Points: typeof m.p2Points === 'number' ? m.p2Points : null,
                winner: m.winner !== undefined && m.winner !== null ? m.winner : null,
                p1Wins: typeof m.p1Wins === 'number' ? m.p1Wins : 0,
                p2Wins: typeof m.p2Wins === 'number' ? m.p2Wins : 0,
                draws: typeof m.draws === 'number' ? m.draws : 0,
                bye: Boolean(m.bye),
                forced: Boolean(m.forced)
            })) : []
        }));

        const restoredRoundIdx = typeof loadedState.currentRoundIndex === 'number'
            ? Math.min(Math.max(0, loadedState.currentRoundIndex), Math.max(0, restoredRounds.length - 1))
            : Math.max(0, restoredRounds.length - 1);

        state = {
            players: restoredPlayers,
            swissRounds: restoredRounds,
            currentRoundIndex: restoredRoundIdx,
            customMaxRounds: loadedState.customMaxRounds || null,
            maxSwissRounds: loadedState.maxSwissRounds || null,
            eliminationBracket: loadedState.eliminationBracket || null
        };

        selectedSwapSlot = null;
        if (!skipLocalStorage && !readOnlyMode) {
            saveState();
        }
        return state;
    }

    Riftbound.store = {
        isReadOnly,
        setReadOnly,
        getState,
        getSelectedSwapSlot,
        setSelectedSwapSlot,
        saveState,
        loadState,
        resetState,
        getRecommendedSwissRounds,
        getEffectiveMaxRounds,
        createSnapshotData,
        restoreFromSnapshotJson
    };
})();
