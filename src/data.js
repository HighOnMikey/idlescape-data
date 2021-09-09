class IdlescapeDatabase {
    DEFAULT_URL_BASE = "https://raw.githubusercontent.com/HighOnMikey/idlescape-extraction/main/data";

    static createDefault() {
        if (typeof window.IdlescapeData === "undefined") {
            window.IdlescapeData = new IdlescapeDatabase();
            window.IdlescapeData.loadDefault();
        }
    }

    loadDefault() {
        this.loadJSON(`${this.DEFAULT_URL_BASE}/enchantments.json`).then((data) => (this.enchantments = new EnchantmentMap(data)));
        this.loadJSON(`${this.DEFAULT_URL_BASE}/items.json`).then((data) => (this.items = new ItemMap(data)));
        this.loadJSON(`${this.DEFAULT_URL_BASE}/locations.json`).then((data) => (this.locations = new LocationMap(data)));
    }

    async loadJSON(url) {
        return await fetch(url)
            .then((res) => res.json())
            .catch(console.error);
    }
}

class IdlescapeItem {
    static AUG_STATS_TYPE_RE = /([a-zA-Z]+)\s?(\(([a-zA-Z]+)\)|Skill)?:/;

    constructor(properties) {
        for (let k in properties) {
            this[k] = properties[k];
        }
    }

    getAugmentCost() {
        if (!this.hasOwnProperty("augmentationCost")) return undefined;

        let cost = {};
        for (const resourceId in this.augmentationCost) {
            let resource = window.IdlescapeData.items.get(resourceId);
            cost[resourceId] = {
                id: resourceId,
                cost: this.augmentationCost[resourceId],
                name: resource ? resource.name : undefined,
            };
        }

        return cost;
    }

    getAugmentStats() {
        if (!this.hasOwnProperty("augmentationStats")) return undefined;

        let isScroll = this.hasOwnProperty("isChampScroll") ? this.isChampScroll : false;
        let stats = { isScroll: isScroll, stats: {} };

        for (const i in this.augmentationStats) {
            if (!this.augmentationStats.hasOwnProperty(i)) continue;
            let statsEntry = this.augmentationStats[i];

            if (isScroll && this.hasOwnProperty("champEncounter")) {
                let location = window.IdlescapeData.locations.get(this.champEncounter).name;
                if (!stats.stats.hasOwnProperty(location)) {
                    stats.stats[location] = [];
                }
                stats.stats[location].push({
                    stat: statsEntry.description.replace(":", ""),
                    value: statsEntry.value,
                });
                continue;
            }

            let typeMatch = statsEntry.description.match(IdlescapeItem.AUG_STATS_TYPE_RE);
            if (typeMatch === null || typeMatch.length < 4) continue;
            let type = typeMatch[1];
            let stat = typeof typeMatch[3] === "undefined" ? typeMatch[2] : typeMatch[3];
            if (typeMatch[2] === "Skills") {
                type = "Skills";
                stat = typeMatch[1];
            }

            if (!stats.stats.hasOwnProperty(type)) {
                stats.stats[type] = [];
            }
            stats.stats[type].push({
                stat: stat,
                value: statsEntry.value,
            });
        }

        return stats;
    }
}

class ISDataMap extends Map {
    constructor(data) {
        super();
        if (typeof data !== "object") {
            return;
        }
        for (let k in data) {
            this.set(parseInt(k, 10), data[k]);
        }
    }

    get(id) {
        if (typeof id !== "number") id = parseInt(id, 10);
        return super.get(id);
    }

    getByName(name) {
        for (const v of this.values()) {
            if (typeof v === "object" && v.hasOwnProperty("name") && v.name.toLocaleLowerCase() === name.toLocaleLowerCase()) {
                return v;
            }
        }

        return undefined;
    }

    searchByPropertyValue(value, ...properties) {
        let found = [];
        for (const v of this.values()) {
            for (const property of properties) {
                if (property in v && v[property] === value) {
                    found.push(v);
                }
            }
        }
        return found;
    }
}

class EnchantmentMap extends ISDataMap {
    static DESTRUCTIVE_IDS = [3, 7];
    constructor(data) {
        super(data);
        this.forEach((v, k, m) => {
            if (EnchantmentMap.DESTRUCTIVE_IDS.includes(v.id)) v.destructive = true;
            m.set(k, v);
        });
    }
}

class ItemMap extends ISDataMap {
    constructor(data) {
        super(data);
        this.forEach((v, k, m) => {
            m.set(k, new IdlescapeItem(v));
        });
    }
}

class LocationMap extends ISDataMap {}
