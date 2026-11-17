(() => {
    const Riftbound = (window.Riftbound = window.Riftbound || {});

    function getBracketSeedOrder(size) {
        if (size === 4) return [0, 3, 1, 2];
        if (size === 8) return [0, 7, 3, 4, 1, 6, 2, 5];
        if (size === 16) return [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];
        return [];
    }

    function buildEliminationBracket(cutSize, players, swissRounds) {
        if (players.length < 2) return null;

        const { getSortedStandings } = Riftbound.standings;
        const standings = getSortedStandings(players, swissRounds);
        const seedOrder = getBracketSeedOrder(cutSize);
        const totalRounds = Math.log2(cutSize);
        const rounds = [];

        const round1Matches = [];
        for (let i = 0; i < seedOrder.length; i += 2) {
            const s1 = seedOrder[i];
            const s2 = seedOrder[i + 1];
            const p1 = standings[s1]
                ? { ...standings[s1].player, seed: s1 + 1 }
                : { id: null, name: 'BYE', deck: '', seed: '-' };
            const p2 = standings[s2]
                ? { ...standings[s2].player, seed: s2 + 1 }
                : { id: null, name: 'BYE', deck: '', seed: '-' };

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

        return { cutSize, rounds };
    }

    function clearDownstreamBracket(bracket, roundIdx, matchIdx) {
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
            clearDownstreamBracket(bracket, roundIdx + 1, nextMatchIdx);
        }
    }

    function advanceEliminationWinnerInBracket(bracket, roundIdx, matchIdx, playerSlot) {
        if (!bracket) return false;

        const match = bracket.rounds[roundIdx][matchIdx];
        const chosen = playerSlot === 'p1' ? match.p1 : match.p2;
        if (!chosen || !chosen.id) return false;

        match.winner = chosen;

        if (roundIdx + 1 < bracket.rounds.length) {
            const nextMatchIdx = Math.floor(matchIdx / 2);
            const nextMatch = bracket.rounds[roundIdx + 1][nextMatchIdx];
            if (matchIdx % 2 === 0) {
                nextMatch.p1 = chosen;
            } else {
                nextMatch.p2 = chosen;
            }
            clearDownstreamBracket(bracket, roundIdx + 1, nextMatchIdx);
        }

        return true;
    }

    Riftbound.bracket = {
        getBracketSeedOrder,
        buildEliminationBracket,
        advanceEliminationWinnerInBracket
    };
})();
