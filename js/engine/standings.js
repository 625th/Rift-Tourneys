(() => {
    const Riftbound = (window.Riftbound = window.Riftbound || {});

    function calculateStandingsData(players, swissRounds, upToRoundIdx = swissRounds.length) {
        const stats = {};
        players.forEach(p => {
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

        const roundsSlice = swissRounds.slice(0, upToRoundIdx);

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
                        p1.wins++;
                        p1.points += 3;
                        p2.losses++;
                    } else if (m.winner === m.p2) {
                        p2.wins++;
                        p2.points += 3;
                        p1.losses++;
                    } else {
                        p1.draws++;
                        p1.points += 1;
                        p2.draws++;
                        p2.points += 1;
                    }
                } else if (p1 && m.bye) {
                    p1.matchesPlayed++;
                    p1.wins++;
                    p1.points += 3;
                    p1.gamesPlayed += 2;
                    p1.gameWins += 2;
                }
            });
        });

        const standingsArray = Object.values(stats);

        standingsArray.forEach(s => {
            s.mw = s.matchesPlayed > 0 ? Math.max(0.33, s.points / (s.matchesPlayed * 3)) : 0.33;
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

    function getSortedStandings(players, swissRounds, upToRoundIdx = swissRounds.length) {
        const standings = calculateStandingsData(players, swissRounds, upToRoundIdx);
        standings.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (Math.abs(b.omw - a.omw) > 1e-6) return b.omw - a.omw;
            if (Math.abs(b.gw - a.gw) > 1e-6) return b.gw - a.gw;
            return b.ogw - a.ogw;
        });
        return standings;
    }

    Riftbound.standings = {
        calculateStandingsData,
        getSortedStandings
    };
})();
