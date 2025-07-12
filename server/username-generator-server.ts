// Server-side username generator with global language pools
// GPS-location-based username generation using words from languages worldwide

interface LanguagePool {
  adjectives: string[];
  nouns: string[];
  region: string;
}

// North America (English, Spanish, French)
const northAmericaPool: LanguagePool = {
  adjectives: [
    "swift", "bright", "calm", "bold", "wise", "gentle", "fierce", "brave", "quick", "strong",
    "rápido", "brillante", "tranquilo", "audaz", "sabio", "suave", "feroz", "valiente", "ágil", "fuerte",
    "rapide", "brillant", "calme", "audacieux", "sage", "doux", "féroce", "courageux", "vif", "fort"
  ],
  nouns: [
    "eagle", "mountain", "river", "forest", "star", "moon", "sun", "wolf", "bear", "falcon",
    "águila", "montaña", "río", "bosque", "estrella", "luna", "sol", "lobo", "oso", "halcón",
    "aigle", "montagne", "rivière", "forêt", "étoile", "lune", "soleil", "loup", "ours", "faucon"
  ],
  region: "North America"
};

// Europe (English, Spanish, French, German, Italian)
const europePool: LanguagePool = {
  adjectives: [
    "noble", "ancient", "golden", "silver", "mystical", "royal", "elegant", "proud", "graceful", "majestic",
    "noble", "antiguo", "dorado", "plateado", "místico", "real", "elegante", "orgulloso", "gracioso", "majestuoso",
    "noble", "ancien", "doré", "argenté", "mystique", "royal", "élégant", "fier", "gracieux", "majestueux",
    "edel", "alt", "golden", "silbern", "mystisch", "königlich", "elegant", "stolz", "anmutig", "majestätisch",
    "nobile", "antico", "dorato", "argentato", "mistico", "reale", "elegante", "orgoglioso", "grazioso", "maestoso"
  ],
  nouns: [
    "castle", "tower", "bridge", "garden", "cathedral", "palace", "fountain", "plaza", "abbey", "chapel",
    "castillo", "torre", "puente", "jardín", "catedral", "palacio", "fuente", "plaza", "abadía", "capilla",
    "château", "tour", "pont", "jardin", "cathédrale", "palais", "fontaine", "place", "abbaye", "chapelle",
    "schloss", "turm", "brücke", "garten", "kathedrale", "palast", "brunnen", "platz", "abtei", "kapelle",
    "castello", "torre", "ponte", "giardino", "cattedrale", "palazzo", "fontana", "piazza", "abbazia", "cappella"
  ],
  region: "Europe"
};

// Asia (English, Japanese romanized, Chinese pinyin, Hindi romanized)
const asiaPool: LanguagePool = {
  adjectives: [
    "serene", "flowing", "harmonious", "peaceful", "zen", "balanced", "pure", "sacred", "divine", "eternal",
    "shizuka", "nagare", "chowa", "heiwa", "zen", "baransu", "junsui", "shinsei", "kami", "eien",
    "jing", "liu", "he", "ping", "chan", "ping", "chun", "sheng", "shen", "yong",
    "shant", "pravah", "samanvay", "shanti", "dhyan", "santulan", "shuddh", "pavitra", "divya", "anant"
  ],
  nouns: [
    "lotus", "bamboo", "dragon", "phoenix", "temple", "pagoda", "cherry", "crane", "tiger", "jade",
    "hasu", "take", "ryu", "ho-o", "tera", "pagoda", "sakura", "tsuru", "tora", "hisui",
    "lian", "zhu", "long", "feng", "miao", "ta", "ying", "he", "hu", "yu",
    "kamal", "bans", "nag", "garuda", "mandir", "stupa", "phool", "saras", "bagh", "panna"
  ],
  region: "Asia"
};

// Africa (English, Swahili, Arabic romanized)
const africaPool: LanguagePool = {
  adjectives: [
    "vibrant", "mighty", "wild", "free", "proud", "strong", "bold", "fierce", "majestic", "powerful",
    "kali", "mkuu", "mwitu", "huru", "kiburi", "mkuu", "jasiri", "mkali", "fahari", "wenye nguvu",
    "nashit", "qawi", "barri", "hurr", "fakhur", "qawi", "jari", "sharas", "azim", "qudra"
  ],
  nouns: [
    "lion", "elephant", "cheetah", "zebra", "giraffe", "rhino", "hippo", "buffalo", "leopard", "antelope",
    "simba", "tembo", "duma", "punda", "twiga", "kifaru", "kiboko", "nyati", "chui", "paa",
    "asad", "fil", "fahd", "himar", "zarafa", "karkadan", "faras", "jamal", "nimr", "ghazal"
  ],
  region: "Africa"
};

// South America (Spanish, Portuguese)
const southAmericaPool: LanguagePool = {
  adjectives: [
    "tropical", "vibrant", "lush", "colorful", "rhythmic", "passionate", "warm", "joyful", "spirited", "lively",
    "tropical", "vibrante", "exuberante", "colorido", "rítmico", "apasionado", "cálido", "alegre", "animado", "vivo",
    "tropical", "vibrante", "exuberante", "colorido", "rítmico", "apaixonado", "quente", "alegre", "animado", "vivo"
  ],
  nouns: [
    "jaguar", "toucan", "condor", "macaw", "dolphin", "sloth", "capybara", "anaconda", "iguana", "flamingo",
    "jaguar", "tucán", "cóndor", "guacamayo", "delfín", "perezoso", "capibara", "anaconda", "iguana", "flamenco",
    "onça", "tucano", "condor", "arara", "golfinho", "preguiça", "capivara", "sucuri", "iguana", "flamingo"
  ],
  region: "South America"
};

// Oceania (English, some Maori, Pacific island words)
const oceaniaPool: LanguagePool = {
  adjectives: [
    "coastal", "pacific", "island", "marine", "coral", "tropical", "azure", "pristine", "crystal", "turquoise",
    "moana", "rangi", "tapu", "mauri", "whakapapa", "aroha", "mana", "kai", "whenua", "tangata"
  ],
  nouns: [
    "wave", "reef", "pearl", "shell", "turtle", "whale", "shark", "ray", "fish", "seabird",
    "ngaru", "repo", "rou", "anga", "honu", "tohorā", "mangō", "whai", "ika", "manu"
  ],
  region: "Oceania"
};

// Global fallback pool (mix of common English and international words)
const globalPool: LanguagePool = {
  adjectives: [
    "cosmic", "stellar", "radiant", "luminous", "infinite", "quantum", "digital", "virtual", "global", "universal",
    "creative", "innovative", "dynamic", "adaptive", "resilient", "brilliant", "magnificent", "spectacular", "amazing", "wonderful"
  ],
  nouns: [
    "nexus", "matrix", "vertex", "prism", "spectrum", "cosmos", "galaxy", "nebula", "quasar", "pulsar",
    "beacon", "cipher", "vector", "portal", "dimension", "essence", "harmony", "symphony", "rhythm", "melody"
  ],
  region: "Global"
};

function getLanguagePoolByLocation(lat: number, lng: number): LanguagePool {
  // North America: roughly 20°N to 80°N, 170°W to 50°W
  if (lat >= 20 && lat <= 80 && lng >= -170 && lng <= -50) {
    return northAmericaPool;
  }
  
  // Europe: roughly 35°N to 75°N, 10°W to 60°E
  if (lat >= 35 && lat <= 75 && lng >= -10 && lng <= 60) {
    return europePool;
  }
  
  // Asia: roughly 5°N to 80°N, 60°E to 180°E
  if (lat >= 5 && lat <= 80 && lng >= 60 && lng <= 180) {
    return asiaPool;
  }
  
  // Africa: roughly 35°S to 35°N, 20°W to 55°E
  if (lat >= -35 && lat <= 35 && lng >= -20 && lng <= 55) {
    return africaPool;
  }
  
  // South America: roughly 55°S to 15°N, 90°W to 30°W
  if (lat >= -55 && lat <= 15 && lng >= -90 && lng <= -30) {
    return southAmericaPool;
  }
  
  // Oceania: roughly 50°S to 25°N, 110°E to 180°E and 180°W to 120°W
  if ((lat >= -50 && lat <= 25 && lng >= 110 && lng <= 180) ||
      (lat >= -50 && lat <= 25 && lng >= -180 && lng <= -120)) {
    return oceaniaPool;
  }
  
  // Default to global pool
  return globalPool;
}

export function generateUsernameServer(seed: string, lat?: number, lng?: number): string {
  // Use global pool if no coordinates provided
  const pool = (lat !== undefined && lng !== undefined) ? getLanguagePoolByLocation(lat, lng) : globalPool;
  
  // Create a simple hash from the seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Ensure positive hash
  hash = Math.abs(hash);
  
  // Select adjective and noun based on hash
  const adjIndex = hash % pool.adjectives.length;
  const nounIndex = Math.floor(hash / pool.adjectives.length) % pool.nouns.length;
  
  const adjective = pool.adjectives[adjIndex];
  const noun = pool.nouns[nounIndex];
  
  // Capitalize first letter of each word
  const capitalizedAdj = adjective.charAt(0).toUpperCase() + adjective.slice(1);
  const capitalizedNoun = noun.charAt(0).toUpperCase() + noun.slice(1);
  
  return `${capitalizedAdj} ${capitalizedNoun}`;
}

export function getRegionNameServer(lat: number, lng: number): string {
  const pool = getLanguagePoolByLocation(lat, lng);
  return pool.region;
}

export function generateUsernameFromIdServer(userId: string): string {
  return generateUsernameServer(userId);
}

export function getUserInitialsServer(username: string): string {
  const words = username.split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

export function getUserColorServer(username: string): string {
  // Generate a consistent color based on username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert to HSL color with good saturation and lightness
  const hue = Math.abs(hash % 360);
  const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
  const lightness = 45 + (Math.abs(hash) % 15);  // 45-60%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}