(() => {
    const Riftbound = (window.Riftbound = window.Riftbound || {});

    function isRoundLocked(roundIdx, swissRounds) {
        return roundIdx < swissRounds.length - 2;
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
        const { calculateStandingsData } = Riftbound.standings;
        const standings = calculateStandingsData(playersList, priorRounds, targetRoundIdx);
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
        const pool = [];
        sortedPointValues.forEach(pts => {
            pool.push(...shuffleArray(pointBuckets.get(pts)));
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

    function findPlayerSlotInRound(roundObj, playerId) {
        for (let i = 0; i < roundObj.matches.length; i++) {
            const m = roundObj.matches[i];
            if (m.p1 === playerId) return { matchIdx: i, match: m, slot: 'p1' };
            if (m.p2 === playerId) return { matchIdx: i, match: m, slot: 'p2' };
        }
        return null;
    }

    function normalizeRoundMatchesAfterSwap(players, swissRounds, roundIdx) {
        const { calculateStandingsData } = Riftbound.standings;
        const roundObj = swissRounds[roundIdx];
        if (!roundObj) return;

        const enteringStandings = calculateStandingsData(players, swissRounds, roundIdx);
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
            } else if (m.bye) {
                m.bye = false;
                m.winner = null;
                m.p1Wins = 0;
                m.p2Wins = 0;
                m.draws = 0;
            }
        });
    }

    Riftbound.swiss = {
        isRoundLocked,
        buildSwissPairings,
        findPlayerSlotInRound,
        normalizeRoundMatchesAfterSwap
    };
})();
