(() => {
    const Riftbound = (window.Riftbound = window.Riftbound || {});

    function calculateMetaStats(players, swissRounds, eliminationBracket) {
        const { formatDeckLabel } = Riftbound.legends;
        const totalPlayers = players.length;
        const legendMap = new Map();
        const playerMap = new Map(players.map(p => [p.id, p]));

        const topCutPlayerIds = new Set();
        if (eliminationBracket && eliminationBracket.rounds && eliminationBracket.rounds[0]) {
            eliminationBracket.rounds[0].forEach(m => {
                if (m.p1 && m.p1.id) topCutPlayerIds.add(m.p1.id);
                if (m.p2 && m.p2.id) topCutPlayerIds.add(m.p2.id);
            });
        }

        players.forEach(p => {
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

        swissRounds.forEach(r => {
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

    function calculateWinrateMatrixData(players, swissRounds, eliminationBracket, includeElim) {
        const { formatDeckLabel } = Riftbound.legends;
        const playerMap = new Map(players.map(p => [p.id, p]));
        const legendPilotCounts = new Map();

        players.forEach(p => {
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

        swissRounds.forEach(r => {
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

        if (includeElim && eliminationBracket && eliminationBracket.rounds) {
            eliminationBracket.rounds.forEach(rMatches => {
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

        return { activeLegends, matrix };
    }

    Riftbound.analytics = {
        calculateMetaStats,
        calculateWinrateMatrixData
    };
})();
