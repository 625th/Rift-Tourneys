(() => {
    const Riftbound = (window.Riftbound = window.Riftbound || {});

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

    function formatDeckLabel(deck) {
        return deck && deck.trim() ? deck.trim() : 'Unassigned';
    }

    function shortLegendName(fullName) {
        if (!fullName || !fullName.trim()) return 'Unassigned';
        return fullName.split(',')[0].trim();
    }

    function matchOfficialLegend(rawLegendText) {
        if (!rawLegendText) return '';
        const cleaned = String(rawLegendText).trim();
        if (!cleaned) return '';

        const lower = cleaned.toLowerCase();

        const exact = RIFTBOUND_LEGENDS.find(l => l.toLowerCase() === lower);
        if (exact) return exact;

        const byShortName = RIFTBOUND_LEGENDS.filter(
            l => l.split(',')[0].trim().toLowerCase() === lower
        );
        if (byShortName.length === 1) return byShortName[0];

        const starts = RIFTBOUND_LEGENDS.filter(l => l.toLowerCase().startsWith(lower));
        if (starts.length === 1) return starts[0];

        return '';
    }

    Riftbound.legends = {
        RIFTBOUND_LEGENDS,
        formatDeckLabel,
        shortLegendName,
        matchOfficialLegend
    };
})();
