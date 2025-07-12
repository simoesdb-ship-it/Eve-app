// Generate unique two-word fictitious usernames for anonymous users
// Uses global language pools based on GPS location

interface LanguagePool {
  adjectives: string[];
  nouns: string[];
  region: string;
}

// North America (English/Spanish/French)
const northAmericaPool: LanguagePool = {
  region: "North America",
  adjectives: [
    // English
    "Wandering", "Silent", "Bright", "Swift", "Gentle", "Bold", "Wise", "Calm", "Sharp", "Noble",
    "Ancient", "Modern", "Wild", "Pure", "Free", "Strong", "Deep", "High", "Clear", "Grand",
    // Spanish
    "Sereno", "Valiente", "Sabio", "Fuerte", "Libre", "Puro", "Brillante", "Rapido", "Tranquilo", "Noble",
    "Antiguo", "Moderno", "Salvaje", "Claro", "Grande", "Pequeno", "Alto", "Profundo", "Nuevo", "Fresco",
    // French
    "Calme", "Sage", "Fort", "Libre", "Pur", "Brillant", "Rapide", "Tranquille", "Noble", "Ancien",
    "Moderne", "Sauvage", "Clair", "Grand", "Petit", "Haut", "Profond", "Nouveau", "Frais", "Doux"
  ],
  nouns: [
    // English
    "Explorer", "Traveler", "Walker", "Builder", "Creator", "Designer", "Thinker", "Dreamer", "Seeker", "Guide",
    "Artist", "Writer", "Navigator", "Pioneer", "Scholar", "Architect", "Guardian", "Teacher", "Leader", "Healer",
    // Spanish
    "Explorador", "Viajero", "Caminante", "Constructor", "Creador", "Diseñador", "Pensador", "Soñador", "Buscador", "Guia",
    "Artista", "Escritor", "Navegante", "Pionero", "Sabio", "Arquitecto", "Guardian", "Maestro", "Lider", "Sanador",
    // French
    "Explorateur", "Voyageur", "Marcheur", "Constructeur", "Createur", "Concepteur", "Penseur", "Reveur", "Chercheur", "Guide",
    "Artiste", "Ecrivain", "Navigateur", "Pionnier", "Sage", "Architecte", "Gardien", "Maitre", "Leader", "Guerisseur"
  ]
};

// Europe (English/German/Italian/French/Spanish)
const europePool: LanguagePool = {
  region: "Europe",
  adjectives: [
    // German
    "Weise", "Stark", "Frei", "Rein", "Hell", "Schnell", "Ruhig", "Edel", "Alt", "Modern",
    "Wild", "Klar", "Gross", "Klein", "Hoch", "Tief", "Neu", "Frisch", "Sanft", "Mutig",
    // Italian
    "Saggio", "Forte", "Libero", "Puro", "Luminoso", "Veloce", "Calmo", "Nobile", "Antico", "Moderno",
    "Selvaggio", "Chiaro", "Grande", "Piccolo", "Alto", "Profondo", "Nuovo", "Fresco", "Gentile", "Coraggioso",
    // English/French/Spanish (subset)
    "Wise", "Strong", "Free", "Pure", "Bright", "Swift", "Calm", "Noble", "Ancient", "Wild",
    "Sage", "Fort", "Libre", "Pur", "Brillant", "Rapide", "Tranquille", "Ancien", "Sauvage", "Clair"
  ],
  nouns: [
    // German
    "Forscher", "Reisender", "Wanderer", "Baumeister", "Schopfer", "Gestalter", "Denker", "Traumer", "Sucher", "Fuhrer",
    "Kunstler", "Schreiber", "Navigator", "Pionier", "Gelehrter", "Architekt", "Wachter", "Lehrer", "Anfuhrer", "Heiler",
    // Italian
    "Esploratore", "Viaggiatore", "Camminatore", "Costruttore", "Creatore", "Designer", "Pensatore", "Sognatore", "Cercatore", "Guida",
    "Artista", "Scrittore", "Navigatore", "Pioniere", "Studioso", "Architetto", "Guardiano", "Insegnante", "Leader", "Guaritore",
    // English/French (subset)
    "Explorer", "Traveler", "Builder", "Creator", "Thinker", "Artist", "Navigator", "Pioneer", "Scholar", "Architect"
  ]
};

// Asia (Chinese/Japanese/Korean/Hindi/Arabic)
const asiaPool: LanguagePool = {
  region: "Asia",
  adjectives: [
    // Chinese (Pinyin)
    "Zhihui", "Qiangli", "Ziyou", "Chunliang", "Guangming", "Kuaisu", "Pingjing", "Gaogui", "Gudai", "Xiandai",
    "Yesheng", "Qingchu", "Weida", "Xiaoxiao", "Gaoda", "Shenshen", "Xinxian", "Wenrou", "Yonggan", "Meili",
    // Japanese (Romanji)
    "Kashikoi", "Tsuyoi", "Jiyuu", "Junsui", "Akarui", "Hayai", "Shizuka", "Takaki", "Furui", "Atarashii",
    "Yasei", "Akiraka", "Ookii", "Chiisai", "Takai", "Fukai", "Shinsen", "Yasashii", "Yuukan", "Utsukushii",
    // Korean (Romanized)
    "Hyeonmyeong", "Ganghada", "Jayu", "Sunsu", "Balkeun", "Ppareun", "Goyohan", "Gowihan", "Yetnal", "Hyeondae",
    "Yaseong", "Myeongbaek", "Keun", "Jageun", "Nopeu", "Gipeun", "Saerowun", "Budeureoun", "Yongmanghan", "Areumdaun"
  ],
  nouns: [
    // Chinese (Pinyin)
    "Tansuo", "Lvxing", "Xingzou", "Jianzao", "Chuangzao", "Sheji", "Sikao", "Mengxiang", "Xunzhao", "Lingdao",
    "Yishu", "Zuojia", "Hanghai", "Xianfeng", "Xuezhe", "Jianzhu", "Shouhu", "Laoshi", "Lingxiu", "Zhiliao",
    // Japanese (Romanji)
    "Tanken", "Ryokou", "Sanpo", "Kensetsu", "Souzou", "Dezain", "Shikou", "Yume", "Tansaku", "Gaido",
    "Geijutsu", "Sakka", "Koukai", "Kaitaku", "Gakusha", "Kenchiku", "Shugo", "Sensei", "Shidou", "Iyashi",
    // Korean (Romanized)
    "Tamheom", "Yeohaeng", "Geotgi", "Geonseol", "Changjo", "Dijaein", "Saegak", "Kkum", "Chatgi", "Gaid",
    "Yesul", "Jakga", "Hangae", "Gaeche", "Haksul", "Geonchuk", "Boho", "Seonsaeng", "Jidoja", "Chiyuja"
  ]
};

// Africa (Arabic/Swahili/Hausa/Amharic/French)
const africaPool: LanguagePool = {
  region: "Africa",
  adjectives: [
    // Arabic (Romanized)
    "Hakeem", "Qawi", "Hurr", "Nadhif", "Muneer", "Saree", "Haadi", "Kareem", "Qadeem", "Hadees",
    "Wahshi", "Waadih", "Kabeer", "Sagheer", "Aali", "Ameeq", "Jadeed", "Tareef", "Lateef", "Jameel",
    // Swahili
    "Busara", "Imara", "Huru", "Safi", "Mwanga", "Haraka", "Tulivu", "Heshima", "Zamani", "Mapya",
    "Mwitu", "Wazi", "Kubwa", "Ndogo", "Juu", "Kina", "Mpya", "Laini", "Jasiri", "Zuri",
    // Hausa
    "Hikima", "Karfi", "Yanci", "Tsabta", "Haske", "Sauri", "Natsuwa", "Daraja", "Tsoho", "Sabo",
    "Daji", "Bayyana", "Babba", "Karami", "Tsayi", "Zurfi", "Sabon", "Laushi", "Jarumi", "Kyau",
    // French (African context)
    "Sage", "Fort", "Libre", "Pur", "Lumineux", "Rapide", "Paisible", "Noble", "Ancien", "Nouveau"
  ],
  nouns: [
    // Arabic (Romanized)
    "Mustakshif", "Musafir", "Maashi", "Bani", "Khaliq", "Musammim", "Mufakkir", "Haalim", "Baahis", "Murshid",
    "Fannan", "Kaatib", "Mallaah", "Raaid", "Aalim", "Muhandis", "Haaris", "Muallim", "Qaid", "Shaafi",
    // Swahili
    "Mchunguzi", "Msafiri", "Mtembezi", "Mjenzi", "Muumba", "Mbunifu", "Mwazo", "Mlota", "Mtafuta", "Mwongozi",
    "Msanii", "Mwandishi", "Baharia", "Mpioni", "Mwalimu", "Mhandisi", "Mlinzi", "Profesa", "Kiongozi", "Mganga",
    // Hausa
    "Bincike", "Matafiya", "Matuuki", "Magini", "Mahalicci", "Masanyi", "Tunani", "Mafarki", "Mabugi", "Jagora",
    "Mawaƙi", "Marubuchi", "Matuƙi", "Magabata", "Malami", "Masanyi", "Mai-gadi", "Malami", "Shugaba", "Magani"
  ]
};

// South America (Spanish/Portuguese/Quechua/Guarani)
const southAmericaPool: LanguagePool = {
  region: "South America",
  adjectives: [
    // Spanish
    "Sabio", "Fuerte", "Libre", "Puro", "Brillante", "Rapido", "Tranquilo", "Noble", "Antiguo", "Moderno",
    "Salvaje", "Claro", "Grande", "Pequeño", "Alto", "Profundo", "Nuevo", "Fresco", "Gentil", "Valiente",
    // Portuguese
    "Sabio", "Forte", "Livre", "Puro", "Brilhante", "Rapido", "Tranquilo", "Nobre", "Antigo", "Moderno",
    "Selvagem", "Claro", "Grande", "Pequeno", "Alto", "Profundo", "Novo", "Fresco", "Gentil", "Corajoso",
    // Quechua (Romanized)
    "Yachay", "Kallpa", "Qhespi", "Ch'uya", "K'anchay", "Utqay", "Thak", "Hatun", "Ñawpa", "Musuq",
    "Sallqa", "Sut'i", "Jatun", "Juch'uy", "Hanaq", "Ukhun", "Musuq", "Qhelli", "Sumaq", "Mana"
  ],
  nouns: [
    // Spanish
    "Explorador", "Viajero", "Caminante", "Constructor", "Creador", "Diseñador", "Pensador", "Soñador", "Buscador", "Guia",
    "Artista", "Escritor", "Navegante", "Pionero", "Sabio", "Arquitecto", "Guardian", "Maestro", "Lider", "Sanador",
    // Portuguese
    "Explorador", "Viajante", "Caminhante", "Construtor", "Criador", "Designer", "Pensador", "Sonhador", "Buscador", "Guia",
    "Artista", "Escritor", "Navegador", "Pioneiro", "Sabio", "Arquiteto", "Guardiao", "Mestre", "Lider", "Curador",
    // Quechua (Romanized)
    "Maskay", "Puriy", "Ruway", "Kamay", "Ruwaq", "Yachaq", "Musyaq", "Amauta", "Pusaq", "Qaway"
  ]
};

// Oceania (English/Maori/Aboriginal languages)
const oceaniaPool: LanguagePool = {
  region: "Oceania",
  adjectives: [
    // English
    "Wandering", "Silent", "Bright", "Swift", "Gentle", "Bold", "Wise", "Calm", "Ancient", "Free",
    "Wild", "Pure", "Strong", "Deep", "Clear", "Noble", "Modern", "New", "Fresh", "Beautiful",
    // Maori
    "Mohio", "Kaha", "Herekore", "Ma", "Marama", "Tere", "Marino", "Rangatira", "Tawhito", "Hou",
    "Taiao", "Atahua", "Nui", "Iti", "Roa", "Hohonu", "Hou", "Mata", "Ataahua", "Pai",
    // Australian Aboriginal (Various languages romanized)
    "Ngarru", "Tjandrawati", "Pulka", "Palya", "Nginda", "Wati", "Munta", "Kungka", "Tjuta", "Nyawa"
  ],
  nouns: [
    // English
    "Explorer", "Traveler", "Walker", "Builder", "Creator", "Designer", "Thinker", "Dreamer", "Seeker", "Guide",
    "Artist", "Writer", "Navigator", "Pioneer", "Scholar", "Teacher", "Guardian", "Leader", "Healer", "Keeper",
    // Maori
    "Kopikopiko", "Kaiwhakatere", "Kaihanga", "Ringatoi", "Kaituhi", "Kaiako", "Rangatira", "Tohunga", "Kaitiaki", "Matakite",
    // Australian Aboriginal
    "Wati", "Kungka", "Palya", "Nginda", "Munta", "Tjandrawati", "Pulka", "Ngarru", "Tjuta", "Nyawa"
  ]
};

// Default fallback pool (Global mix)
const globalPool: LanguagePool = {
  region: "Global",
  adjectives: [
    "Wise", "Strong", "Free", "Pure", "Bright", "Swift", "Calm", "Noble", "Ancient", "Modern",
    "Wild", "Clear", "Grand", "Deep", "High", "New", "Fresh", "Gentle", "Bold", "Beautiful",
    "Sereno", "Valiente", "Sage", "Fort", "Weise", "Stark", "Zhihui", "Qiangli", "Hakeem", "Qawi"
  ],
  nouns: [
    "Explorer", "Traveler", "Builder", "Creator", "Designer", "Thinker", "Artist", "Navigator", "Pioneer", "Scholar",
    "Teacher", "Guardian", "Leader", "Healer", "Guide", "Seeker", "Dreamer", "Walker", "Keeper", "Master",
    "Explorador", "Viajero", "Explorateur", "Forscher", "Tansuo", "Lvxing", "Mustakshif", "Msafiri"
  ]
};

// GPS-based regional assignment
function getLanguagePoolByLocation(lat: number, lng: number): LanguagePool {
  // North America: Roughly lat 25-80, lng -180 to -50
  if (lat >= 25 && lat <= 80 && lng >= -180 && lng <= -50) {
    return northAmericaPool;
  }
  
  // South America: Roughly lat -60 to 15, lng -85 to -30
  if (lat >= -60 && lat <= 15 && lng >= -85 && lng <= -30) {
    return southAmericaPool;
  }
  
  // Europe: Roughly lat 35-75, lng -10 to 50
  if (lat >= 35 && lat <= 75 && lng >= -10 && lng <= 50) {
    return europePool;
  }
  
  // Africa: Roughly lat -35 to 40, lng -20 to 55
  if (lat >= -35 && lat <= 40 && lng >= -20 && lng <= 55) {
    return africaPool;
  }
  
  // Asia: Roughly lat 5-80, lng 25 to 180
  if (lat >= 5 && lat <= 80 && lng >= 25 && lng <= 180) {
    return asiaPool;
  }
  
  // Oceania: Roughly lat -50 to 0, lng 110 to 180
  if (lat >= -50 && lat <= 0 && lng >= 110 && lng <= 180) {
    return oceaniaPool;
  }
  
  // Default to global pool for any edge cases
  return globalPool;
}

// Generate a consistent username based on a seed and GPS location
export function generateUsername(seed: string, lat?: number, lng?: number): string {
  // Choose language pool based on GPS location
  const languagePool = (lat !== undefined && lng !== undefined) 
    ? getLanguagePoolByLocation(lat, lng)
    : globalPool;
  
  // Simple hash function to convert seed to numbers
  let hash1 = 0;
  let hash2 = 0;
  
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash1 = ((hash1 << 5) - hash1) + char;
    hash1 = hash1 & hash1; // Convert to 32-bit integer
    
    hash2 = ((hash2 << 3) - hash2) + char + i;
    hash2 = hash2 & hash2; // Convert to 32-bit integer
  }
  
  // Ensure positive indices
  const adjectiveIndex = Math.abs(hash1) % languagePool.adjectives.length;
  const nounIndex = Math.abs(hash2) % languagePool.nouns.length;
  
  return `${languagePool.adjectives[adjectiveIndex]} ${languagePool.nouns[nounIndex]}`;
}

// Generate display name from anonymous user ID with GPS coordinates
export function getUserDisplayName(userId: string, lat?: number, lng?: number): string {
  // Extract the hash part from user ID (e.g., "user_device_abc123" -> "abc123")
  const hashPart = userId.split('_').pop() || userId;
  return generateUsername(hashPart, lat, lng);
}

// Get region name for display purposes
export function getRegionName(lat: number, lng: number): string {
  const languagePool = getLanguagePoolByLocation(lat, lng);
  return languagePool.region;
}

// Generate username with stored GPS location (for backward compatibility)
export function generateUsernameFromId(userId: string): string {
  const hashPart = userId.split('_').pop() || userId;
  return generateUsername(hashPart);
}

// Get initials from username for avatar display
export function getUserInitials(username: string): string {
  const words = username.split(' ');
  return words.map(word => word.charAt(0)).join('').toUpperCase();
}

// Generate a unique color for the user based on their username
export function getUserColor(username: string): string {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
    '#06B6D4', '#EAB308', '#DC2626', '#059669', '#7C3AED',
    '#DB2777', '#0D9488', '#EA580C', '#4F46E5', '#65A30D'
  ];
  
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = ((hash << 5) - hash) + username.charCodeAt(i);
    hash = hash & hash;
  }
  
  return colors[Math.abs(hash) % colors.length];
}