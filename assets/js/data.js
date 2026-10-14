/**
 * Her Hampers - Product Catalog & Initial Store Data
 * Contains all requested categories with dedicated, isolated product photography:
 * clips, scrunchies, chain, jimmiki, cute earrings, kolusu,
 * evil eye kolusu, ring for boys, ring for girls, nail polish,
 * glass bangles, raindrop bangles, luxury gift hampers.
 */

// Global Boutique Color Hex Palette for Visual Swatches
const COLOR_HEX_MAP = {
  "red": "#dc2626",
  "velvet red": "#b91c1c",
  "cherry red": "#991b1b",
  "red crystal": "#ef4444",
  "red dewdrop": "#dc2626",
  "ruby red kemp": "#b91c1c",
  "ruby pink kemp": "#be123c",
  "royal maroon": "#831843",
  "rose pink": "#f472b6",
  "baby pink": "#fbcfe8",
  "baby pink & gold": "#f9a8d4",
  "blush pink": "#f472b6",
  "pastel blush": "#f9a8d4",
  "strawberry cream": "#fbcfe8",
  "emerald green": "#059669",
  "emerald green kemp": "#047857",
  "sage mint": "#6ee7b7",
  "golden shimmer": "#f59e0b",
  "gold": "#eab308",
  "yellow gold": "#eab308",
  "18k yellow gold": "#eab308",
  "champagne gold": "#fde047",
  "champagne ivory": "#fef9c3",
  "buttercup yellow": "#fef08a",
  "royal blue": "#2563eb",
  "sky blue": "#38bdf8",
  "matte black": "#1f2937",
  "classic black": "#111827",
  "silver": "#94a3b8",
  "classic silver": "#cbd5e1",
  "sterling silver": "#cbd5e1",
  "925 silver": "#cbd5e1",
  "silver mirror polish": "#cbd5e1",
  "brushed silver": "#94a3b8",
  "tungsten gray": "#475569",
  "rose gold": "#fb7185",
  "18k rose gold plated": "#fb7185",
  "rose gold tone": "#fb7185",
  "rose gold eye": "#fb7185",
  "platinum silver": "#e2e8f0",
  "prismatic crystal": "#e0e7ff",
  "lavender": "#c084fc",
  "lavender shimmer": "#d8b4fe",
  "lilac": "#d8b4fe",
  "lilac dew": "#c084fc",
  "lilac blossom": "#d8b4fe",
  "soft mauve": "#c084fc",
  "dusty mauve": "#a855f7",
  "milky cream": "#fef3c7",
  "cloud white": "#f8fafc",
  "white": "#ffffff",
  "sparkling diamond white": "#f8fafc",
  "blue nazar & silver": "#3b82f6",
  "black bead nazariya": "#1e293b",
  "neon pink & cyan": "#ec4899",
  "electric rainbow": "#a855f7",
  "laser green": "#10b981",
  "natural dark brown": "#78350f",
  "instant cherry red": "#991b1b",
  "vintage pink": "#f472b6",
  "retro mint": "#5eead4"
};

function getColorHex(colorName) {
  if (!colorName) return "#f472b6";
  const clean = String(colorName).toLowerCase().trim();

  // Multi-color & Rainbow gradients
  if (clean.includes("dark multicolour") || clean.includes("dark multicolor")) {
    return "linear-gradient(135deg, #7f1d1d 0%, #78350f 25%, #064e3b 50%, #1e3a8a 75%, #4c1d95 100%)";
  }
  if (clean.includes("light multicolour") || clean.includes("light multicolor") || clean.includes("pastel multicolour") || clean.includes("pastel multicolor")) {
    return "linear-gradient(135deg, #fecaca 0%, #fde68a 25%, #a7f3d0 50%, #bae6fd 75%, #ddd6fe 100%)";
  }
  if (clean.includes("multicolour") || clean.includes("multicolor") || clean.includes("rainbow") || clean.includes("iridescent")) {
    return "linear-gradient(135deg, #ef4444 0%, #f59e0b 20%, #10b981 40%, #06b6d4 60%, #8b5cf6 80%, #ec4899 100%)";
  }
  if (clean.includes("two tone") || clean.includes("dual tone") || clean.includes("bicolor")) {
    return "linear-gradient(135deg, #f472b6 0%, #f472b6 50%, #38bdf8 50%, #38bdf8 100%)";
  }

  if (COLOR_HEX_MAP[clean]) return COLOR_HEX_MAP[clean];
  for (const [k, v] of Object.entries(COLOR_HEX_MAP)) {
    if (clean.includes(k) || k.includes(clean)) return v;
  }
  return "#f472b6";
}

// Identify which photo/image matches a given color for a product
function getProductImageForColor(product, colorName) {
  if (!product) return "assets/images/logo.png";
  if (!colorName) return product.image || (product.images && product.images[0]) || "assets/images/logo.png";

  const cleanColor = String(colorName).trim().toLowerCase();

  // 1. Direct match in explicit colorImageMap
  if (product.colorImageMap && typeof product.colorImageMap === "object") {
    if (product.colorImageMap[colorName]) return product.colorImageMap[colorName];
    for (const [k, v] of Object.entries(product.colorImageMap)) {
      if (k.toLowerCase().trim() === cleanColor && v) return v;
    }
  }

  // 2. Check if product.images has objects with { url, color }
  if (Array.isArray(product.images) && product.images.length > 0) {
    const objMatch = product.images.find(img => typeof img === "object" && img.color && img.color.toLowerCase().trim() === cleanColor);
    if (objMatch && objMatch.url) return objMatch.url;

    // 3. Keyword / filename matching (e.g. if url contains "red" or "multicolour")
    const keyMatch = product.images.find(img => {
      const urlStr = typeof img === "string" ? img.toLowerCase() : (img.url ? img.url.toLowerCase() : "");
      if (cleanColor.length >= 3 && urlStr.includes(cleanColor)) return true;
      const parts = cleanColor.split(/[\s\-_]+/);
      return parts.length > 1 && parts.every(p => p.length >= 3 && urlStr.includes(p));
    });
    if (keyMatch) return typeof keyMatch === "string" ? keyMatch : keyMatch.url;

    // 4. Sequential index alignment: 1st color -> 1st image, 2nd color -> 2nd image
    if (Array.isArray(product.colors) && product.colors.length > 0) {
      const colorIdx = product.colors.findIndex(c => String(c).toLowerCase().trim() === cleanColor);
      if (colorIdx !== -1 && product.images[colorIdx]) {
        const item = product.images[colorIdx];
        return typeof item === "string" ? item : item.url;
      }
    }

    const first = product.images[0];
    return typeof first === "string" ? first : (first.url || product.image);
  }

  return product.image || "assets/images/logo.png";
}

window.COLOR_HEX_MAP = COLOR_HEX_MAP;
window.getColorHex = getColorHex;
window.getProductImageForColor = getProductImageForColor;

const DEFAULT_PRODUCTS = [
  // 1. CLIPS
  {
    id: "clip-01",
    name: "Pastel Cloud Matte Claw Clip Set (Trio)",
    category: "clips",
    categoryLabel: "Clips & Hairpins",
    price: 249,
    originalPrice: 399,
    rating: 4.9,
    reviewsCount: 84,
    badge: "Bestseller",
    badgeType: "pink",
    stock: 25,
    image: "assets/images/clips.jpg",
    description: "Ultra-matte aesthetic French claw clips in blush pink, baby cream, and mauve. Non-slip grip suitable for all hair textures. Designed to hold your hair effortlessly without pulling.",
    details: ["Pack of 3 pastel shades", "Eco-friendly durable resin", "Teeth grip technology", "Rust-free golden spring"]
  },
  {
    id: "clip-02",
    name: "Vintage Pearl & Crystal Barrette Hairpin Duo",
    category: "clips",
    categoryLabel: "Clips & Hairpins",
    price: 199,
    originalPrice: 349,
    rating: 4.8,
    reviewsCount: 52,
    badge: "Handcrafted",
    badgeType: "gold",
    stock: 0,
    image: "assets/images/clips.jpg",
    description: "Opulent simulated freshwater pearl hair clips hand-wired on gold-tone alloy pins. Perfect for weddings, parties, or everyday glam.",
    details: ["Set of 2 luxury hairpins", "Anti-tarnish gold plating", "Comfortable snap-on hold"]
  },

  // 2. SCRUNCHIES
  {
    id: "scrunch-01",
    name: "Mulberry Silk Satin Scrunchies (Pack of 3)",
    category: "scrunchies",
    categoryLabel: "Scrunchies",
    price: 299,
    originalPrice: 499,
    rating: 5.0,
    reviewsCount: 112,
    badge: "Trending",
    badgeType: "pink",
    stock: 30,
    image: "assets/images/scrunchies.jpg",
    description: "Premium pure 22-Momme mulberry silk scrunchies in strawberry cream, blush pink, and ivory champagne. Zero hair breakage, prevents frizz and split ends while you sleep or style.",
    details: ["100% Grade 6A Mulberry Silk", "Soft wide inner elastic band", "Gentle on curls & straight hair"]
  },
  {
    id: "scrunch-02",
    name: "Organza Cloud Dream Scrunchie with Pearl Accents",
    category: "scrunchies",
    categoryLabel: "Scrunchies",
    price: 179,
    originalPrice: 299,
    rating: 4.7,
    reviewsCount: 43,
    badge: "Cute Pick",
    badgeType: "gold",
    stock: 22,
    image: "assets/images/scrunchies.jpg",
    description: "Oversized ethereal organza scrunchie with floating tiny glass pearls inside. Creates a fluffy, princess-worthy ponytail or messy bun look.",
    details: ["Jumbo cloud diameter (15cm)", "Lightweight translucent organza", "Hand-stitched finish"]
  },

  // 3. CHAINS
  {
    id: "chain-01",
    name: "Dainty 18K Rose Gold Layered Chain with Rose Quartz",
    category: "chain",
    categoryLabel: "Chains & Necklaces",
    price: 499,
    originalPrice: 799,
    rating: 4.9,
    reviewsCount: 68,
    badge: "Bestseller",
    badgeType: "gold",
    stock: 15,
    image: "assets/images/chain.jpg",
    description: "Delicate double-layered necklace in romantic rose gold finish. Features a dainty raw natural pink rose quartz crystal heart pendant symbolizing unconditional love.",
    details: ["Anti-tarnish e-coating", "Adjustable 16-18 inch length", "Hypoallergenic nickel-free lead-free", "Spring ring clasp"]
  },
  {
    id: "chain-02",
    name: "Shimmer Butterfly Silver Choker Chain",
    category: "chain",
    categoryLabel: "Chains & Necklaces",
    price: 399,
    originalPrice: 650,
    rating: 4.8,
    reviewsCount: 41,
    badge: "New",
    badgeType: "pink",
    stock: 12,
    image: "assets/images/chain.jpg",
    description: "Minimalist Italian link silver chain highlighted with dainty shimmering pavé butterfly charms that catch the light effortlessly.",
    details: ["925 Sterling Silver Plated", "High-reflectivity link chain", "Includes velvet pouch"]
  },

  // 4. JIMMIKI (Traditional & Modern Jhumkas)
  {
    id: "jimmiki-01",
    name: "Royal Kemp Temple Heritage Jimmiki with Pearl Drops",
    category: "jimmiki",
    categoryLabel: "Jimmiki & Jhumkas",
    price: 599,
    originalPrice: 999,
    rating: 5.0,
    reviewsCount: 145,
    badge: "Must-Have",
    badgeType: "gold",
    stock: 20,
    image: "assets/images/jimmiki.jpg",
    description: "Exquisite traditional South Indian temple jimmiki earrings handcrafted with ruby red kemp stones, goddess motifs, and cascades of tiny pearl seed beads.",
    details: ["Matte gold antique finish", "Cluster seed pearls", "Lightweight comfort wear", "Push-back closure with security stopper"]
  },
  {
    id: "jimmiki-02",
    name: "Pastel Pink Meenakari Floral Jimmiki",
    category: "jimmiki",
    categoryLabel: "Jimmiki & Jhumkas",
    price: 449,
    originalPrice: 699,
    rating: 4.9,
    reviewsCount: 88,
    badge: "Handmade",
    badgeType: "pink",
    stock: 16,
    image: "assets/images/jimmiki.jpg",
    description: "Delightful hand-painted Jaipur Meenakari bell jimmiki in soft baby pink and pearl white enameling. Beautifully complements sarees, lehengas, and kurtis.",
    details: ["Authentic Meenakari enamel craft", "Dainty dangling ghungroos", "Gold-toned brass alloy"]
  },

  // 5. CUTE EARRINGS
  {
    id: "earring-01",
    name: "Sweet Korean Heart & Crystal Bow Dangle Earrings",
    category: "cute earrings",
    categoryLabel: "Cute Earrings",
    price: 249,
    originalPrice: 399,
    rating: 4.8,
    reviewsCount: 76,
    badge: "Cute Pick",
    badgeType: "pink",
    stock: 25,
    image: "assets/images/cute_earrings.jpg",
    description: "Adorable Korean-style aesthetic earrings featuring crystal bows with dangling rose pink faceted heart crystals. Adds an enchanting fairy-tale touch to any outfit.",
    details: ["925 Silver needle posts", "Cubic zirconia micro pavé", "Ultra-lightweight (4g per pair)"]
  },
  {
    id: "earring-02",
    name: "Pastel Strawberry Blossom Handcrafted Studs",
    category: "cute earrings",
    categoryLabel: "Cute Earrings",
    price: 189,
    originalPrice: 299,
    rating: 4.9,
    reviewsCount: 57,
    badge: "Handmade",
    badgeType: "gold",
    stock: 30,
    image: "assets/images/cute_earrings.jpg",
    description: "Playful glossy resin strawberry studs with golden leaf caps. Hand-poured with love for everyday sweetness.",
    details: ["Glossy resin glaze", "Comfort silicone ear backs", "Non-allergic titanium posts"]
  },

  // 6. KOLUSU (Traditional Silver Anklets)
  {
    id: "kolusu-01",
    name: "Traditional Ghungroo Bell Silver Kolusu (Pair)",
    category: "kolusu",
    categoryLabel: "Kolusu & Anklets",
    price: 549,
    originalPrice: 899,
    rating: 5.0,
    reviewsCount: 160,
    badge: "Bestseller",
    badgeType: "gold",
    stock: 14,
    image: "assets/images/kolusu.jpg",
    description: "Classic Indian Kolusu (payal) adorned with sweet musical silver ghungroo bells and filigree floral link work. Emits a gentle melodious chime with every step.",
    details: ["Set of 2 anklets (Pair)", "925 Pure Silver German finish", "Durable S-hook lock", "Length: 10.5 inches with extender"]
  },
  {
    id: "kolusu-02",
    name: "Dainty Cubic Zirconia Daily Wear Silver Kolusu",
    category: "kolusu",
    categoryLabel: "Kolusu & Anklets",
    price: 429,
    originalPrice: 699,
    rating: 4.9,
    reviewsCount: 92,
    badge: "Daily Glam",
    badgeType: "pink",
    stock: 22,
    image: "assets/images/kolusu.jpg",
    description: "Modern minimalist single-strand silver anklet studded with sparkling CZ stones at delicate intervals. Sleek, silent, and effortlessly chic for modern wear.",
    details: ["Tarnish-resistant coating", "Comfortable for sneakers & heels", "Single anklet with lobster clasp"]
  },

  // 7. EVIL EYE KOLUSU
  {
    id: "evileye-01",
    name: "Rose Gold Turkish Evil Eye Protection Kolusu",
    category: "evil eye kolusu",
    categoryLabel: "Evil Eye Kolusu",
    price: 399,
    originalPrice: 649,
    rating: 5.0,
    reviewsCount: 134,
    badge: "Hot Trend",
    badgeType: "pink",
    stock: 20,
    image: "assets/images/evil_eye_kolusu.jpg",
    description: "Sacred talisman Turkish blue evil eye beads strung delicately on an 18K rose gold chain with golden orb accents. Protects your aura while radiating modern boutique elegance.",
    details: ["Genuine lampwork blue evil eye glass beads", "Rose gold dipped stainless steel", "Water-resistant daily wear", "Adjustable clasp fit"]
  },
  {
    id: "evileye-02",
    name: "Nazariya Black Bead & Silver Evil Eye Payal",
    category: "evil eye kolusu",
    categoryLabel: "Evil Eye Kolusu",
    price: 329,
    originalPrice: 520,
    rating: 4.8,
    reviewsCount: 65,
    badge: "Protection",
    badgeType: "gold",
    stock: 0,
    image: "assets/images/evil_eye_kolusu.jpg",
    description: "Traditional Nazariya protection beads paired with a shimmering sapphire-blue center evil eye charm. Designed to ward off negative energy with grace.",
    details: ["Black onyx style beads", "Anti-fade silver chain", "Lightweight and secure"]
  },

  // 8. RING FOR BOYS
  {
    id: "ring-boy-01",
    name: "Sleek Matte Black Titanium Band for Him",
    category: "ring for boys",
    categoryLabel: "Rings for Boys",
    price: 349,
    originalPrice: 599,
    rating: 4.9,
    reviewsCount: 98,
    badge: "For Him",
    badgeType: "gold",
    stock: 24,
    image: "assets/images/ring_boy.jpg",
    description: "Sophisticated brushed matte black titanium ring with beveled center line. Scratch-resistant, masculine, and extremely comfortable for daily wear.",
    details: ["Comfort-fit rounded interior", "Aircraft grade titanium alloy", "Water & sweat proof", "Available in sizes 7, 8, 9, 10, 11"]
  },
  {
    id: "ring-boy-02",
    name: "Minimalist Silver Shield Signet Ring for Men",
    category: "ring for boys",
    categoryLabel: "Rings for Boys",
    price: 399,
    originalPrice: 699,
    rating: 4.8,
    reviewsCount: 71,
    badge: "Trending",
    badgeType: "pink",
    stock: 19,
    image: "assets/images/ring_boy.jpg",
    description: "Vintage-inspired polished silver signet ring with an embossed minimalist emblem. Bold, timeless, and perfectly styled for both casual and festive looks.",
    details: ["Heavy stainless steel base", "Non-fade silver rhodium plating", "Smooth rounded edges"]
  },

  // 9. RING FOR GIRLS
  {
    id: "ring-girl-01",
    name: "Dainty Rose Gold Bow Solitaire Ring (Adjustable)",
    category: "ring for girls",
    categoryLabel: "Rings for Girls",
    price: 299,
    originalPrice: 499,
    rating: 5.0,
    reviewsCount: 182,
    badge: "Bestseller",
    badgeType: "pink",
    stock: 35,
    image: "assets/images/ring_girl.jpg",
    description: "A sparkling pavé crystal bow centered on an adjustable rose gold band. The ultimate symbol of feminine charm and delicate beauty. Fits all finger sizes!",
    details: ["Adjustable free-size band", "AAA+ Austrian crystals", "18K Rose Gold Plated", "Smooth snag-free design"]
  },
  {
    id: "ring-girl-02",
    name: "Butterfly Opal Twinkle Stacking Ring for Girls",
    category: "ring for girls",
    categoryLabel: "Rings for Girls",
    price: 269,
    originalPrice: 449,
    rating: 4.9,
    reviewsCount: 89,
    badge: "Dreamy",
    badgeType: "gold",
    stock: 28,
    image: "assets/images/ring_girl.jpg",
    description: "Glowing iridescent simulated pink opal butterfly resting on a dainty twisted band. Shifts colors under sunlight from blush to lilac.",
    details: ["Hypoallergenic copper core", "Iridescent lab-created opal", "Adjustable open ring back"]
  },

  // 10. NAIL POLISH
  {
    id: "polish-01",
    name: "Rose All Day Gel-Shine Nail Polish (Blush Pink)",
    category: "nail polish",
    categoryLabel: "Nail Polish",
    price: 199,
    originalPrice: 320,
    rating: 4.8,
    reviewsCount: 104,
    badge: "Toxin-Free",
    badgeType: "pink",
    stock: 40,
    image: "assets/images/nail_polish.jpg",
    description: "Salon-grade high-gloss gel finish without UV lamp needed! A soft milky blush pink shade that gives clean girl aesthetic nails in a single stroke.",
    details: ["15ml big bottle", "10-free non-toxic vegan formula", "Chip-resistant up to 10 days", "Quick-drying in 90 seconds"]
  },
  {
    id: "polish-02",
    name: "Glitterati Rose Gold Holographic Shimmer Polish",
    category: "nail polish",
    categoryLabel: "Nail Polish",
    price: 229,
    originalPrice: 350,
    rating: 4.9,
    reviewsCount: 78,
    badge: "Party Glam",
    badgeType: "gold",
    stock: 32,
    image: "assets/images/nail_polish.jpg",
    description: "Densely packed rose gold and diamond-dust holographic micro-glitter polish. Wear alone or layer as an eye-catching topper.",
    details: ["Ultra-sparkle suspended glitter", "Smooth peel-off friendly formula", "Flat wide brush for easy salon coats"]
  },

  // 11. GLASS BANGLES
  {
    id: "bangles-glass-01",
    name: "Jaipur Velvet Touch Pink Glass Bangles (Set of 24)",
    shortName: "Bangles",
    category: "glass bangles",
    categoryLabel: "Glass Bangles",
    price: 349,
    originalPrice: 550,
    rating: 4.9,
    reviewsCount: 126,
    badge: "Handmade",
    badgeType: "pink",
    stock: 20,
    image: "assets/images/glass_bangles.jpg",
    description: "Authentic Firozabad-Jaipur handcrafted glass bangles wrapped with velvety soft flocking in shades of ruby and baby pink with golden lining. Gentle on wrists and melodious when worn.",
    details: ["Full set of 24 bangles", "Available in sizes: 2.2, 2.4, 2.6, 2.8", "Vibrant non-chipping colors"],
    sizes: ["2.2", "2.4", "2.6", "2.8"],
    outOfStockSizes: ["2.6"],
    colors: ["Red", "Velvet Rose Pink", "Baby Pink", "Emerald Green", "Royal Blue", "Golden Shimmer", "Royal Maroon"],
    outOfStockColors: []
  },
  {
    id: "bangles-glass-02",
    name: "Pastel Rainbow Ombré Glass Bangles Stack (Set of 18)",
    shortName: "Bangles",
    category: "glass bangles",
    categoryLabel: "Glass Bangles",
    price: 299,
    originalPrice: 480,
    rating: 4.8,
    reviewsCount: 64,
    badge: "Festive",
    badgeType: "gold",
    stock: 18,
    image: "assets/images/glass_bangles.jpg",
    description: "Dreamy gradient glass bangles featuring iridescent pastels blending from baby pink to champagne gold and sky shimmer.",
    details: ["18 pieces stack", "High-durability tempered glass", "Smooth rounded rim"],
    sizes: ["2.2", "2.4", "2.6", "2.8"],
    outOfStockSizes: ["2.2"],
    colors: ["Red", "Velvet Rose Pink", "Baby Pink & Gold", "Emerald Green", "Royal Blue", "Golden Shimmer"],
    outOfStockColors: []
  },

  // 12. RAINDROP BANGLES
  {
    id: "bangles-raindrop-01",
    name: "Iridescent Crystal Raindrop Glass Bangles (Stack of 12)",
    shortName: "Raindrop Bangles",
    category: "raindrop bangles",
    categoryLabel: "Raindrop Bangles",
    price: 499,
    originalPrice: 799,
    rating: 5.0,
    reviewsCount: 153,
    badge: "Exclusive",
    badgeType: "gold",
    stock: 15,
    image: "assets/images/raindrop_bangles.jpg",
    description: "Signature 'Raindrop Bangles' featuring teardrop faceted crystal beads that catch and refract every ray of light like morning dewdrops on rose petals. Truly mesmerizing in real life!",
    details: ["Stack of 12 raindrop beaded bangles", "Prismatic crystal refraction", "Flexible comfortable sizing", "Signature Her Hampers specialty"],
    sizes: ["2.2", "2.4", "2.6", "2.8"],
    outOfStockSizes: ["2.4"],
    colors: ["Red", "Prismatic Crystal", "Blush Pink", "Lilac Dew", "Sky Blue", "Emerald Green"],
    outOfStockColors: ["Lilac Dew"]
  },
  {
    id: "bangles-raindrop-02",
    name: "Blush Pink Faceted Dewdrop Shimmer Bangles",
    shortName: "Raindrop Bangles",
    category: "raindrop bangles",
    categoryLabel: "Raindrop Bangles",
    price: 399,
    originalPrice: 650,
    rating: 4.9,
    reviewsCount: 91,
    badge: "Hot Trend",
    badgeType: "pink",
    stock: 17,
    image: "assets/images/raindrop_bangles.jpg",
    description: "Soft rose-tinted crystal raindrops lined with micro-cut beads. Perfect for festive celebrations, sangeet nights, or gifting in bridal hampers.",
    details: ["Delicate rose hue", "Premium cut-glass facets", "Hypoallergenic inner core"],
    sizes: ["2.2", "2.4", "2.6", "2.8"],
    outOfStockSizes: ["2.8"],
    colors: ["Red", "Blush Pink", "Rose Gold Shimmer", "Crystal Clear"],
    outOfStockColors: []
  },

  // 13. PRE-CURATED LUXURY HAMPERS
  {
    id: "hamper-01",
    name: "The Royal Queen All-in-One Luxury Gift Hamper",
    category: "hampers",
    categoryLabel: "Gift Hampers",
    price: 1899,
    originalPrice: 2899,
    rating: 5.0,
    reviewsCount: 210,
    badge: "Ultimate Gift",
    badgeType: "gold",
    stock: 10,
    image: "assets/images/hero.jpg",
    description: "The complete Her Hampers experience! Includes: Royal Kemp Jimmikis, Silver Bell Kolusu, Silk Scrunchies trio, Raindrop Bangles stack, Nail Polish duo, Dainty Rose Ring, scented peony candle, and fairy lights packed in a luxury pink magnetic ribbon box.",
    details: ["Magnetic pink keepsake box with satin bow", "Custom handwritten calligraphy note included", "Includes 7 luxury items + aroma candle", "Ready to gift package"]
  },
  {
    id: "hamper-02",
    name: "Bestie Birthday Pamper Box",
    category: "hampers",
    categoryLabel: "Gift Hampers",
    price: 1299,
    originalPrice: 1999,
    rating: 4.9,
    reviewsCount: 148,
    badge: "Best Seller",
    badgeType: "pink",
    stock: 15,
    image: "assets/images/builder.jpg",
    description: "Curated specially for your best friend! Contains: Pastel Claw Clips, 2 Silk Scrunchies, Rose Gold Evil Eye Kolusu, Bow Solitaire Ring, and Rose All Day Nail Polish.",
    details: ["Pastel floral gift box", "Personalized greeting postcard", "Free shipping across India"]
  },
  {
    id: "hamper-03",
    name: "Couple Connection Keepsake Hamper",
    category: "hampers",
    categoryLabel: "Gift Hampers",
    price: 1499,
    originalPrice: 2299,
    rating: 5.0,
    reviewsCount: 119,
    badge: "For Couples",
    badgeType: "pink",
    stock: 12,
    image: "assets/images/builder.jpg",
    description: "Thoughtfully paired for him & her: Sleek Titanium Ring for Him, Dainty Rose Bow Ring for Her, Evil Eye Kolusu, Shimmer Silver Chain, and luxury ribbon gift packaging.",
    details: ["His & Her matching theme", "Double ring luxury velvet box", "Includes custom promise card"]
  },

  // 13. BOYS ACCESSORIES (Kaapu, Men's Chains, etc.)
  {
    id: "boys-kaapu-01",
    name: "Classic Stainless Steel Polished Kaapu / Kada for Boys",
    category: "boys accessories",
    categoryLabel: "Boys Accessories",
    price: 299,
    originalPrice: 499,
    rating: 4.9,
    reviewsCount: 64,
    badge: "Trending",
    badgeType: "gold",
    stock: 25,
    image: "assets/images/boys_kaapu.jpg",
    description: "Premium high-grade 316L solid stainless steel Kaapu / Kada with mirror-polished silver finish. Heavyweight masculine feel, smooth beveled inner edge for all-day comfort.",
    details: ["316L Surgical grade stainless steel", "Rust-proof, water-resistant & anti-tarnish", "Classic smooth Kada silhouette", "Comfort curve fit (2.6 & 2.8 size compatible)"]
  },
  {
    id: "boys-chain-01",
    name: "Cuban Link Silver Finish Heavy Curb Chain for Boys",
    category: "boys accessories",
    categoryLabel: "Boys Accessories",
    price: 399,
    originalPrice: 699,
    rating: 4.8,
    reviewsCount: 47,
    badge: "Popular",
    badgeType: "pink",
    stock: 20,
    image: "assets/images/chain.jpg",
    description: "Bold 6mm diamond-cut Cuban curb chain in gleaming rhodium silver polish. Masculine street-luxe chain that elevates any casual or festive boys outfit.",
    details: ["6mm diamond-cut curb links", "Heavy durable lobster claw lock", "Length: 22 inches (standard boys/men length)", "Sweat & hypoallergenic safe"]
  },

  // 14. LIGHTING TOYS
  {
    id: "toy-light-01",
    name: "Magical Fiber Optic LED Glow Wand & Neon Spinner Toy",
    category: "lighting toys",
    categoryLabel: "Lighting Toys",
    price: 199,
    originalPrice: 349,
    rating: 4.9,
    reviewsCount: 92,
    badge: "Glowing Magic",
    badgeType: "gold",
    stock: 35,
    image: "assets/images/lighting_toy.jpg",
    description: "Mesmerizing multi-color LED fiber optic wand accompanied by a high-speed LED spinning gyro disc. Vibrant flashing rainbow patterns bring pure joy to kids and night parties.",
    details: ["Multi-mode glowing LEDs (strobe, pulse, steady)", "Safe flexible optical fiber strands", "Batteries included and installed", "Child-safe rounded plastic body"]
  },
  {
    id: "toy-light-02",
    name: "Illuminated Flash Ring & Night Glow Wristband Set",
    category: "lighting toys",
    categoryLabel: "Lighting Toys",
    price: 149,
    originalPrice: 249,
    rating: 4.7,
    reviewsCount: 38,
    badge: "Party Hit",
    badgeType: "pink",
    stock: 40,
    image: "assets/images/lighting_toy.jpg",
    description: "Soft silicone stretchable LED flash rings and dual-glow wristbands. Lights up dynamically with motion and touch.",
    details: ["Pack of 2 glow accessories", "Soft BPA-free silicone", "Vibrant neon glow"]
  },

  // 15. KIDS COLLECTION (Bubbles, Pullback Car, Kids Bangles)
  {
    id: "kids-bubble-01",
    name: "Magic Pastel Bubble Wand & Non-Toxic Solution Kit",
    category: "kids",
    categoryLabel: "Kids Collection",
    price: 149,
    originalPrice: 249,
    rating: 5.0,
    reviewsCount: 110,
    badge: "Kids Favorite",
    badgeType: "pink",
    stock: 30,
    image: "assets/images/kids_toys.jpg",
    description: "Pastel ergonomic bubble blower wand that produces dozens of shimmering giant soap bubbles with a gentle wave. Includes child-safe non-toxic refill solution.",
    details: ["Tear-free non-toxic bubble mixture", "Multi-ring wand for hundreds of bubbles", "Ergonomic pastel handle", "Safe for toddlers & kids 3+"]
  },
  {
    id: "kids-car-01",
    name: "Speed Racer Die-Cast Pullback Turbo Sports Car Duo",
    category: "kids",
    categoryLabel: "Kids Collection",
    price: 249,
    originalPrice: 399,
    rating: 4.9,
    reviewsCount: 75,
    badge: "Bestseller",
    badgeType: "gold",
    stock: 25,
    image: "assets/images/kids_toys.jpg",
    description: "Twin pack of premium die-cast metal pullback racing cars with opening doors and friction-powered turbo drive. Fast, durable, and packed with realistic racing decals.",
    details: ["High-torque pullback friction motor", "Heavy-duty alloy metal body", "Rubber grip tires", "Set of 2 bright sporty cars"]
  },
  {
    id: "kids-bangles-01",
    name: "Pastel Velvet & Gold Charm Kids Bangles Set (Pack of 6)",
    category: "kids",
    categoryLabel: "Kids Collection",
    price: 199,
    originalPrice: 349,
    rating: 4.8,
    reviewsCount: 56,
    badge: "Cute Little Charms",
    badgeType: "pink",
    stock: 24,
    image: "assets/images/kids_bangles.jpg",
    description: "Super-cute miniature soft velvet bangles in pastel baby pink, canary yellow, and sky blue adorned with tiny dangling gold stars and flower charms. Sized specially for little girls.",
    details: ["Pack of 6 pastel charm bangles", "Soft velvet lining gentle on delicate wrists", "Kids size: 1.12 to 2.0 (fits ages 3-10)", "Dangling miniature charms"]
  },

  // 16. MEHANDHI & HENNA (Stickers & Cones - Normal, Red)
  {
    id: "mehandhi-01",
    name: "Natural Herbal Brown Mehandhi Cone (100% Pure Sojat Henna)",
    category: "mehandhi",
    categoryLabel: "Mehandhi & Henna",
    price: 49,
    originalPrice: 80,
    rating: 5.0,
    reviewsCount: 168,
    badge: "Natural Herbal",
    badgeType: "gold",
    stock: 60,
    image: "assets/images/mehandhi.jpg",
    description: "Authentic pure Rajasthani herbal henna cone infused with eucalyptus and nilgiri oils. Delivers an intense rich mahogany brown stain that darkens naturally over 48 hours.",
    details: ["100% Natural organic henna powder", "Fine precision applicator nozzle tip", "Rich dark long-lasting color", "Chemical-free & skin safe"]
  },
  {
    id: "mehandhi-02",
    name: "Rich Instant Cherry Red Mehandhi Cone",
    category: "mehandhi",
    categoryLabel: "Mehandhi & Henna",
    price: 69,
    originalPrice: 110,
    rating: 4.8,
    reviewsCount: 94,
    badge: "Fast Red Stain",
    badgeType: "pink",
    stock: 50,
    image: "assets/images/mehandhi.jpg",
    description: "Instant dye rich cherry red henna cone for quick festive applications. Yields a vibrant, eye-catching deep red stain within 15 minutes of application without waiting.",
    details: ["Instant rich red color payoff in 15 mins", "Smooth flowing non-clogging formula", "Perfect for festival rush, nail tips & designs", "Packaged in gold-foil cone"]
  },
  {
    id: "mehandhi-stickers-01",
    name: "Intricate Henna Stencil Tattoo Stickers (Pack of 4 Sheets)",
    category: "mehandhi",
    categoryLabel: "Mehandhi & Henna",
    price: 149,
    originalPrice: 250,
    rating: 4.9,
    reviewsCount: 82,
    badge: "Easy Henna Art",
    badgeType: "gold",
    stock: 35,
    image: "assets/images/mehandhi.jpg",
    description: "Laser-cut adhesive mehandhi stencils with intricate floral mandalas, wrist cuffs, and finger bands. Just peel, stick on your hand, apply mehandhi over it, and peel off for salon-grade perfection.",
    details: ["Pack of 4 sheets (hands, wrists & fingers)", "Self-adhesive & skin-friendly medical grade film", "Reusable up to 3 times", "Flawless symmetric designs for beginners"]
  },

  // 17. KEYCHAINS & CHARMS (Camera Keychains, etc.)
  {
    id: "keychain-cam-01",
    name: "Retro Mini Camera Keychain with Real Flash & Sound",
    category: "keychains",
    categoryLabel: "Keychains & Charms",
    price: 179,
    originalPrice: 299,
    rating: 5.0,
    reviewsCount: 132,
    badge: "Aesthetic Viral",
    badgeType: "pink",
    stock: 45,
    image: "assets/images/camera_keychain.jpg",
    description: "Adorable vintage miniature SLR camera keychain! Press the top shutter button to hear a realistic camera click sound and trigger a blinding white LED flash from the lens. A viral favorite for backpacks and keys.",
    details: ["Working LED flash + authentic shutter click sound", "Matte pastel blush body with gold hardware", "Includes gold keyring, lobster clasp, and wrist strap", "Pre-installed batteries included"]
  },
  {
    id: "keychain-star-01",
    name: "Floating Star Quicksand Liquid Glow Keychain",
    category: "keychains",
    categoryLabel: "Keychains & Charms",
    price: 149,
    originalPrice: 249,
    rating: 4.8,
    reviewsCount: 65,
    badge: "Cute Pick",
    badgeType: "gold",
    stock: 30,
    image: "assets/images/camera_keychain.jpg",
    description: "Clear acrylic shaker capsule filled with shimmering pastel fluid, holographic stars, and floating cute micro-charms that swirl gracefully when moved.",
    details: ["Leak-proof sealed acrylic capsule", "Mesmerizing floating quicksand effect", "Heavy-duty anti-tarnish gold clasp"]
  }
];

// Curated Boutique Promotional Coupons - WELCOME10 First-Time Exclusive
const BOUTIQUE_COUPONS = [
  {
    code: "WELCOME10",
    label: "10% OFF",
    type: "percent",
    value: 10,
    minOrder: 0,
    desc: "10% OFF Welcome Discount (Valid once per email)",
    firstOrderOnly: true
  }
];

// Verification for WELCOME10 one-time-per-email rule
function isEmailUsedForWelcome10(email) {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  
  // 1. Check persistent list in localStorage
  try {
    const usedList = JSON.parse(localStorage.getItem("her_hampers_welcome10_used_emails") || "[]");
    if (usedList.includes(cleanEmail)) return true;
  } catch (e) {}

  // 2. Cross-reference all completed orders
  try {
    const orders = getStoredOrders();
    const match = orders.find(o => 
      o.email && o.email.trim().toLowerCase() === cleanEmail && 
      (o.couponCode === "WELCOME10" || (o.notes && o.notes.includes("WELCOME10")))
    );
    if (match) return true;
  } catch (e) {}

  return false;
}

function recordEmailUsedForWelcome10(email) {
  if (!email) return;
  const cleanEmail = email.trim().toLowerCase();
  try {
    const usedList = JSON.parse(localStorage.getItem("her_hampers_welcome10_used_emails") || "[]");
    if (!usedList.includes(cleanEmail)) {
      usedList.push(cleanEmail);
      localStorage.setItem("her_hampers_welcome10_used_emails", JSON.stringify(usedList));
    }
  } catch (e) {}
}

const BOUTIQUE_CONTACT = {
  whatsappNumber: "9994977734",
  whatsappFormatted: "+91 99949 77734",
  whatsappLink: "https://wa.me/919994977734",
  instagramUrl: "https://www.instagram.com/her._hampers?stkn=eHprZjU3Y2FhOHdi",
  instagramHandle: "@her._hampers"
};

window.BOUTIQUE_CONTACT = BOUTIQUE_CONTACT;
window.isEmailUsedForWelcome10 = isEmailUsedForWelcome10;
window.recordEmailUsedForWelcome10 = recordEmailUsedForWelcome10;

// Initial Customer Orders Data (for demonstration, invoicing, and tracking)
const DEFAULT_ORDERS = [
  {
    id: "HH-10495",
    customerName: "Meera Subramanian",
    phone: "+91 94441 55678",
    email: "meera.subbu@gmail.com",
    state: "Tamil Nadu",
    address: "Plot 18, 4th Main Road, Anna Nagar West, Chennai, Tamil Nadu - 600040",
    items: [
      { 
        name: "Jaipur Velvet Touch Pink Glass Bangles (Red, Size: 2.6)", 
        shortName: "Bangles (Red)", 
        color: "Red", 
        size: "2.6", 
        qty: 2, 
        price: 349,
        image: "assets/images/glass_bangles.jpg"
      },
      { 
        name: "Mulberry Silk Satin Scrunchies (Strawberry Cream, Jumbo)", 
        shortName: "Scrunchies (Strawberry Cream)", 
        color: "Strawberry Cream", 
        size: "Jumbo", 
        qty: 1, 
        price: 299,
        image: "assets/images/scrunchies.jpg"
      }
    ],
    subtotal: 997,
    discountCode: "PINKLOVE10",
    discountAmount: 100,
    shippingFee: 70,
    total: 967,
    status: "Packed",
    paymentMethod: "UPI",
    upiRef: "UPI-662910398412",
    estimatedDelivery: "Expected in 3 - 7 working days",
    date: "2026-09-30 11:20",
    notes: "Please pack bangles safely in bubble wrap!"
  },
  {
    id: "HH-10492",
    customerName: "Aadhya Sharma",
    phone: "+91 98451 22890",
    email: "aadhya.s@gmail.com",
    state: "Maharashtra",
    address: "Flat 402, Lotus Residency, Baner, Pune, Maharashtra - 411045",
    items: [
      { name: "Royal Kemp Temple Heritage Jimmiki (Ruby Red Kemp, Medium)", shortName: "Jimmiki (Ruby Red Kemp)", color: "Ruby Red Kemp", size: "Medium", qty: 1, price: 599, image: "assets/images/jimmiki.jpg" },
      { name: "Traditional Ghungroo Bell Silver Kolusu (Classic Silver, 10 Inch)", shortName: "Kolusu (Classic Silver)", color: "Classic Silver", size: "10 Inch", qty: 1, price: 549, image: "assets/images/kolusu.jpg" },
      { name: "Pastel Cloud Matte Claw Clip Set (Pastel Blush, Medium)", shortName: "Claw Clip (Pastel Blush)", color: "Pastel Blush", size: "Medium", qty: 1, price: 249, image: "assets/images/clips.jpg" }
    ],
    subtotal: 1397,
    discountCode: "WELCOME50",
    discountAmount: 50,
    shippingFee: 100,
    total: 1447,
    status: "Delivered",
    paymentMethod: "UPI",
    upiRef: "UPI-940212389104",
    estimatedDelivery: "Delivered (3 - 7 working days)",
    date: "2026-09-28 14:32",
    notes: "Please pack with extra pink shredded paper!"
  },
  {
    id: "HH-10493",
    customerName: "Rohan & Sneha Patel",
    phone: "+91 99203 44102",
    email: "sneha.patel@outlook.com",
    state: "Gujarat",
    address: "B-12, Green Villa, Satellite, Ahmedabad, Gujarat - 380015",
    items: [
      { name: "Couple Connection Keepsake Hamper", qty: 1, price: 1499, isCustom: true, details: { box: "Luxury Ribbon Keepsake Box", size: "Medium", note: "Forever and always my queen ❤️", items: ["Sleek Matte Black Titanium Band (Matte Black, US 9)", "Dainty Rose Gold Bow Ring (Rose Gold)", "Mulberry Silk Scrunchies (Blush Pink)", "Warm Fairy Lights"] } },
      { name: "Iridescent Crystal Raindrop Glass Bangles (Red Crystal, Size: 2.4)", shortName: "Bangles (Red)", color: "Red", size: "2.4", qty: 1, price: 499, image: "assets/images/raindrop_bangles.jpg" }
    ],
    subtotal: 1998,
    discountCode: "WELCOME10",
    discountAmount: 200,
    shippingFee: 100,
    total: 1898,
    status: "Shipped",
    paymentMethod: "UPI",
    upiRef: "UPI-884102947113",
    estimatedDelivery: "Expected in 3 - 7 working days",
    date: "2026-09-28 19:15",
    notes: "Anniversary gift for my wife!"
  },
  {
    id: "HH-10494",
    customerName: "Pooja Krishnan",
    phone: "+91 97890 11234",
    email: "pooja.k@yahoo.in",
    state: "Tamil Nadu",
    address: "New No 45, Gandhi Road, T Nagar, Chennai, Tamil Nadu - 600017",
    items: [
      { name: "Rose Gold Turkish Evil Eye Protection Kolusu (Rose Gold Eye, 10 Inch)", shortName: "Evil Eye Kolusu (Rose Gold)", color: "Rose Gold Eye", size: "10 Inch", qty: 2, price: 798, image: "assets/images/evil_eye_kolusu.jpg" },
      { name: "Dainty Rose Gold Bow Solitaire Ring (Rose Gold, Free Size)", shortName: "Bow Ring (Rose Gold)", color: "Rose Gold", size: "Free Size", qty: 1, price: 299, image: "assets/images/ring_girl.jpg" },
      { name: "Rose All Day Gel-Shine Nail Polish (Blush Pink)", shortName: "Nail Polish (Blush Pink)", color: "Blush Pink", qty: 1, price: 199, image: "assets/images/nail_polish.jpg" }
    ],
    subtotal: 1296,
    discountCode: null,
    discountAmount: 0,
    shippingFee: 70,
    total: 1366,
    status: "Packed",
    paymentMethod: "UPI",
    upiRef: "UPI-774102981045",
    estimatedDelivery: "Expected in 3 - 7 working days",
    date: "2026-09-29 08:45",
    notes: "Call before delivery."
  }
];

// Customer Testimonials
const CUSTOMER_REVIEWS = [
  {
    name: "Ananya Deshmukh",
    city: "Mumbai",
    rating: 5,
    avatar: "AD",
    comment: "The Raindrop Bangles and Jimmikis are beyond gorgeous! The quality feels so luxurious and the pink ribbon packaging made me feel like royalty opening it. Ordering another hamper for my sister!"
  },
  {
    name: "Priya Sundaram",
    city: "Chennai",
    rating: 5,
    avatar: "PS",
    comment: "I was searching everywhere for authentic silver kolusu and evil eye anklets that don't tarnish. Her Hampers nailed both! The sweet bells on the kolusu are so soothing."
  },
  {
    name: "Tanvi Verma",
    city: "Delhi",
    rating: 5,
    avatar: "TV",
    comment: "Built a custom hamper for my bestie's birthday with silk scrunchies, claw clips, and the boy & girl ring set. She literally cried happy tears! Best boutique online hands down."
  }
];

// Custom Hamper Packaging Styles & Sizing
const HAMPER_BOX_STYLES = [
  {
    id: "box-ribbon",
    name: "Luxury Ribbon Keepsake Box",
    image: "assets/images/box_ribbon.png",
    badge: "Boutique Ribbon Wrap",
    description: "Signature pastel pink luxury gift box adorned with a lavish handcrafted satin ribbon bow wrap.",
    hasSizes: true,
    sizes: [
      { id: "size-ribbon-s", label: "Small", dimensions: "Small Box", price: 250, description: "Small luxury ribbon box (fits 3-5 items)" },
      { id: "size-ribbon-m", label: "Medium", dimensions: "Medium Box", price: 350, isDefault: true, description: "Popular medium ribbon box (fits 4-7 items)" },
      { id: "size-ribbon-l", label: "Large", dimensions: "Large Box", price: 450, description: "Grand party ribbon box (fits 6-10 items)" }
    ]
  },
  {
    id: "box-corrugated",
    name: "Corrugated Gift Packing Box",
    image: "assets/images/box_corrugated.png",
    badge: "Eco-Friendly Mint",
    description: "Sturdy corrugated mailer box in soothing pastel mint green, lined with shredded craft paper and greeting wrap.",
    hasSizes: true,
    sizes: [
      { id: "size-2x6", label: "Small (2 x 6)", dimensions: "2 x 6", price: 149, description: "Compact gift size (fits 3-5 items)" },
      { id: "size-2x8", label: "Medium (2 x 8)", dimensions: "2 x 8", price: 199, isDefault: true, description: "Popular medium size (fits 4-7 items)" },
      { id: "size-3x10", label: "Large (3 x 10)", dimensions: "3 x 10", price: 249, description: "Grand party size (fits 6-10 items)" }
    ]
  },
  {
    id: "bag-acrylic",
    name: "Transparent Acrylic Luxury Bag",
    image: "assets/images/bag_acrylic.png",
    badge: "Modern Crystal Aesthetic",
    description: "Modern crystal-clear aesthetic acrylic tote gift bag with reinforced golden cord rope handles and brass frame.",
    hasSizes: false,
    price: 249,
    sizeNote: "Universal Luxury Dimensions (fits 3-10 accessories beautifully - no size selection required)"
  }
];

// Curated Hamper Add-on Delights (Local chocolates & cute fairy lights)
const HAMPER_ADDONS = [
  { id: "addon-choc-silk", name: "Cadbury Dairy Milk Silk", category: "chocolate", price: 95, image: "assets/images/dairy_milk_silk.jpg", description: "Velvety smooth, melt-in-mouth creamy milk chocolate bar" },
  { id: "addon-choc-kitkat", name: "Nestle KitKat Crisp Share Pack", category: "chocolate", price: 45, image: "assets/images/kitkat.jpg", description: "Crisp wafer fingers coated in decadent milk chocolate" },
  { id: "addon-choc-5star", name: "Cadbury 5 Star Chocolate Bar", category: "chocolate", price: 30, image: "assets/images/5star.jpg", description: "Caramel & nougat blend smothered in rich chocolate" },
  { id: "addon-lights", name: "Mini Cute Warm Fairy Lights", category: "decor", price: 79, image: "assets/images/fairy_lights.jpg", description: "Warm glowing micro fairy string lights to light up the hamper inside with cute ambiance", isLights: true }
];

// Standard Sizes & Colors Catalog Configuration
const CATEGORY_VARIANT_DEFAULTS = {
  "glass bangles": {
    sizes: ["2.2", "2.4", "2.6", "2.8"],
    outOfStockSizes: ["2.6"],
    colors: ["Red", "Velvet Rose Pink", "Baby Pink", "Emerald Green", "Royal Blue", "Golden Shimmer", "Royal Maroon"],
    outOfStockColors: []
  },
  "raindrop bangles": {
    sizes: ["2.2", "2.4", "2.6", "2.8"],
    outOfStockSizes: ["2.4"],
    colors: ["Red", "Prismatic Crystal", "Blush Pink", "Lilac Dew", "Sky Blue", "Emerald Green"],
    outOfStockColors: ["Lilac Dew"]
  },
  "ring for boys": {
    sizes: ["US 7", "US 8", "US 9", "US 10", "US 11"],
    outOfStockSizes: ["US 8", "US 11"],
    colors: ["Matte Black", "Brushed Silver", "Tungsten Gray"],
    outOfStockColors: ["Tungsten Gray"]
  },
  "ring for girls": {
    sizes: ["Free Size (Adjustable)", "Size 6", "Size 7", "Size 8"],
    outOfStockSizes: ["Size 7"],
    colors: ["Rose Gold", "Platinum Silver", "Champagne Gold"],
    outOfStockColors: ["Platinum Silver"]
  },
  "boys accessories": {
    sizes: ["2.4 (Small)", "2.6 (Medium)", "2.8 (Large)"],
    outOfStockSizes: ["2.4 (Small)"],
    colors: ["Silver Mirror Polish", "Matte Black", "Royal Gold"],
    outOfStockColors: ["Royal Gold"]
  },
  "nail polish": {
    sizes: [],
    outOfStockSizes: [],
    colors: ["Blush Pink", "Cherry Red", "Nude Almond", "Wine Plum"],
    outOfStockColors: ["Cherry Red"]
  },
  "scrunchies": {
    sizes: ["Regular (Classic)", "Jumbo Oversized"],
    outOfStockSizes: ["Jumbo Oversized"],
    colors: ["Strawberry Cream", "Blush Pink", "Champagne Ivory", "Dusty Mauve"],
    outOfStockColors: ["Dusty Mauve"]
  },
  "clips": {
    sizes: ["Medium (8cm)", "Large (11cm)"],
    outOfStockSizes: [],
    colors: ["Pastel Blush", "Milky Cream", "Soft Mauve", "Sage Mint"],
    outOfStockColors: ["Sage Mint"]
  },
  "kolusu": {
    sizes: ["10 Inch (Standard)", "10.5 Inch", "11 Inch"],
    outOfStockSizes: ["11 Inch"],
    colors: ["Classic Silver", "Rose Gold Tone", "Oxidized Silver"],
    outOfStockColors: ["Oxidized Silver"]
  },
  "evil eye kolusu": {
    sizes: ["9.5 Inch", "10 Inch (Standard)", "10.5 Inch"],
    outOfStockSizes: ["9.5 Inch"],
    colors: ["Blue Nazar & Silver", "Rose Gold Eye", "Black Bead Nazariya"],
    outOfStockColors: ["Rose Gold Eye"]
  },
  "jimmiki": {
    sizes: ["Medium (3cm)", "Grand Temple (5cm)"],
    outOfStockSizes: ["Grand Temple (5cm)"],
    colors: ["Ruby Pink Kemp", "Emerald Green Kemp", "Multicolor Kemp"],
    outOfStockColors: ["Emerald Green Kemp"]
  },
  "cute earrings": {
    sizes: [],
    outOfStockSizes: [],
    colors: ["Blush Pink Crystal", "Sparkling Diamond White", "Lilac Blossom"],
    outOfStockColors: ["Lilac Blossom"]
  },
  "chain": {
    sizes: ["16 Inch (Choker)", "18 Inch (Princess)", "22 Inch (Matinee)"],
    outOfStockSizes: ["16 Inch (Choker)"],
    colors: ["18K Rose Gold Plated", "Sterling Silver", "Yellow Gold"],
    outOfStockColors: ["Yellow Gold"]
  },
  "kids": {
    sizes: ["1.12 (Ages 3-5)", "1.14 (Ages 6-8)", "2.0 (Ages 9-11)"],
    outOfStockSizes: ["1.14 (Ages 6-8)"],
    colors: ["Pastel Mix Trio", "Baby Pink & Gold", "Buttercup Yellow"],
    outOfStockColors: ["Buttercup Yellow"]
  },
  "lighting toys": {
    sizes: [],
    outOfStockSizes: [],
    colors: ["Neon Pink & Cyan", "Electric Rainbow", "Laser Green"],
    outOfStockColors: ["Laser Green"]
  },
  "mehandhi": {
    sizes: [],
    outOfStockSizes: [],
    colors: ["Natural Dark Brown", "Instant Cherry Red"],
    outOfStockColors: []
  },
  "keychains": {
    sizes: [],
    outOfStockSizes: [],
    colors: ["Vintage Pink", "Retro Mint", "Classic Black", "Lavender Shimmer"],
    outOfStockColors: ["Retro Mint"]
  }
};

function getStoredProducts() {
  const data = localStorage.getItem("her_hampers_products");
  if (!data) {
    const initialized = DEFAULT_PRODUCTS.map(p => {
      const def = CATEGORY_VARIANT_DEFAULTS[p.category] || {};
      return {
        ...p,
        sizes: p.sizes || (def.sizes ? [...def.sizes] : []),
        outOfStockSizes: p.outOfStockSizes || (def.outOfStockSizes ? [...def.outOfStockSizes] : []),
        colors: p.colors || (def.colors ? [...def.colors] : []),
        outOfStockColors: p.outOfStockColors || (def.outOfStockColors ? [...def.outOfStockColors] : []),
        inHamperBuilder: p.category !== "hampers"
      };
    });
    localStorage.setItem("her_hampers_products", JSON.stringify(initialized));
    return initialized;
  }
  try {
    const parsed = JSON.parse(data);
    let needsUpdate = false;
    parsed.forEach(item => {
      if (item.images === undefined || !Array.isArray(item.images) || item.images.length === 0) {
        item.images = [item.image || "assets/images/hero.jpg"];
        needsUpdate = true;
      }
      if (item.inHamperBuilder === undefined) {
        item.inHamperBuilder = item.category !== "hampers";
        needsUpdate = true;
      }
      const match = DEFAULT_PRODUCTS.find(dp => dp.id === item.id);
      const def = CATEGORY_VARIANT_DEFAULTS[item.category] || {};

      // Sizes & colours: Preserve empty arrays if user entered no colours or sizes (must remain blank!)
      if (item.sizes === undefined) {
        item.sizes = (match && match.sizes && match.sizes.length > 0) ? [...match.sizes] : [];
        needsUpdate = true;
      }
      if (item.outOfStockSizes === undefined) {
        item.outOfStockSizes = (match && match.outOfStockSizes) ? [...match.outOfStockSizes] : [];
      }
      if (item.colors === undefined) {
        item.colors = (match && match.colors && match.colors.length > 0) ? [...match.colors] : [];
        needsUpdate = true;
      }
      if (item.outOfStockColors === undefined) {
        item.outOfStockColors = (match && match.outOfStockColors) ? [...match.outOfStockColors] : [];
      }
      if (match && match.colorImageMap && !item.colorImageMap) {
        item.colorImageMap = { ...match.colorImageMap };
        needsUpdate = true;
      }

      if (match) {
        if (match.stock === 0 && item.stock !== 0) {
          item.stock = 0;
          needsUpdate = true;
        }
        if (item.stock === undefined || typeof item.stock !== "number") {
          item.stock = typeof match.stock === "number" ? match.stock : 20;
          needsUpdate = true;
        }
        if (match.shortName && !item.shortName) {
          item.shortName = match.shortName;
          needsUpdate = true;
        }
        if (item.image && (item.image.includes('bangles_rings.jpg') || item.image.includes('scrunchies_clips.jpg') || item.image.includes('jimmiki_kolusu.jpg') || item.image.includes('chain_boy.jpg'))) {
          item.image = match.image;
          needsUpdate = true;
        }
      } else if (item.stock === undefined || typeof item.stock !== "number") {
        item.stock = 20;
        needsUpdate = true;
      }
    });

    // Auto-merge new categories/products (Boys accessories, lighting toys, kids, mehandhi, keychains)
    DEFAULT_PRODUCTS.forEach(dp => {
      if (!parsed.some(p => p.id === dp.id)) {
        const def = CATEGORY_VARIANT_DEFAULTS[dp.category] || {};
        parsed.push({
          ...dp,
          sizes: dp.sizes || (def.sizes ? [...def.sizes] : []),
          outOfStockSizes: dp.outOfStockSizes || (def.outOfStockSizes ? [...def.outOfStockSizes] : []),
          colors: dp.colors || (def.colors ? [...def.colors] : []),
          outOfStockColors: dp.outOfStockColors || (def.outOfStockColors ? [...def.outOfStockColors] : []),
          inHamperBuilder: dp.category !== "hampers"
        });
        needsUpdate = true;
      }
    });

function getSampleReviewsForProduct(product) {
  const cat = (product.category || "").toLowerCase();
  const name = (product.name || "").toLowerCase();
  if (cat.includes("bangle") || name.includes("bangle")) {
    return [
      { id: "rev-bg-1", name: "Ananya Deshmukh", avatar: "AD", rating: 5, date: "3 Oct 2026", variant: "Raindrop Glass / 2.4", title: "Mesmerizing raindrop shimmer!", comment: "The light reflects through these raindrop glass bangles so beautifully! Arrived cushioned in pink satin ribbons with zero damage. Truly luxury quality.", verified: true },
      { id: "rev-bg-2", name: "Ritu Kulkarni", avatar: "RK", rating: 5, date: "29 Sep 2026", variant: "Light Multicolour / 2.6", title: "Perfect fit & lovely chimes", comment: "The clinking sound of these glass bangles is so melodious. Sizing is 100% accurate and looks stunning for festivals.", verified: true }
    ];
  } else if (cat.includes("jimmiki") || cat.includes("earring") || name.includes("jimmiki")) {
    return [
      { id: "rev-jm-1", name: "Priya Sundaram", avatar: "PS", rating: 5, date: "2 Oct 2026", variant: "Ruby Red Kemp / Medium", title: "Authentic royal temple look", comment: "The ruby kemp stones and tiny hanging pearls are so intricately detailed! Surprisingly lightweight on the ears even after wearing them for 8 hours.", verified: true },
      { id: "rev-jm-2", name: "Kavya Menon", avatar: "KM", rating: 5, date: "27 Sep 2026", variant: "Classic Gold / Traditional", title: "Exquisite craftsmanship!", comment: "Boutique quality is miles ahead of regular store jewelry. Loved the handwritten card that came inside the box.", verified: true }
    ];
  } else if (cat.includes("kolusu") || cat.includes("anklet") || name.includes("kolusu")) {
    return [
      { id: "rev-kl-1", name: "Harini R.", avatar: "HR", rating: 5, date: "1 Oct 2026", variant: "Classic Silver / 10 Inch", title: "Sweet chiming bells, zero tarnish!", comment: "I wear this kolusu every single day and the anti-tarnish coating keeps it sparkling like brand new. The sweet bells are musical and soothing.", verified: true },
      { id: "rev-kl-2", name: "Meera Krishnan", avatar: "MK", rating: 5, date: "25 Sep 2026", variant: "Evil Eye Silver / 9.5 Inch", title: "So delicate & protective", comment: "The blue nazar bead is vibrant and polished. Fits my ankle comfortably without snagging clothes.", verified: true }
    ];
  } else if (cat.includes("clip") || cat.includes("hair") || name.includes("clip")) {
    return [
      { id: "rev-cl-1", name: "Sneha Nair", avatar: "SN", rating: 5, date: "4 Oct 2026", variant: "Pastel Blush / Medium", title: "Best claw clips I own!", comment: "Super strong grip that doesn't slip even with long thick hair. The pastel matte velvet touch feels so premium.", verified: true },
      { id: "rev-cl-2", name: "Aarushi Jain", avatar: "AJ", rating: 4.8, date: "28 Sep 2026", variant: "Baby Cream / Standard", title: "Aesthetic pastel dreams", comment: "Very cute and gentle on the scalp, zero headaches. Holds messy buns effortlessly all day long.", verified: true }
    ];
  } else if (cat.includes("scrunch") || name.includes("scrunch")) {
    return [
      { id: "rev-sc-1", name: "Divya Balan", avatar: "DB", rating: 5, date: "30 Sep 2026", variant: "Strawberry Cream / Pure Silk", title: "Zero hair breakage!", comment: "Pure mulberry silk that feels like clouds. Doesn't leave any creases in my hair after taking it down.", verified: true }
    ];
  } else if (cat.includes("hamper") || name.includes("hamper")) {
    return [
      { id: "rev-hm-1", name: "Rohan & Sneha Patel", avatar: "RP", rating: 5, date: "28 Sep 2026", variant: "Ribbon Keepsake Box", title: "The ultimate unboxing experience!", comment: "Gave this to my fiancée and she was moved to tears! The double-satin ribbon bow, calligraphy note and fairy lights were pure magic.", verified: true }
    ];
  } else {
    return [
      { id: "rev-gen-1", name: "Tanvi Saxena", avatar: "TS", rating: 5, date: "2 Oct 2026", variant: "Standard Boutique", title: "Exceeded all expectations!", comment: "Every little accessory from Her Hampers feels custom-made with so much warmth and care. Will definitely order again!", verified: true }
    ];
  }
}
window.getSampleReviewsForProduct = getSampleReviewsForProduct;

    // Ensure reviews and (__ of 5) ratings are initialized for all products
    parsed.forEach(item => {
      if (!item.reviews || !Array.isArray(item.reviews) || item.reviews.length === 0) {
        item.reviews = getSampleReviewsForProduct(item);
        item.reviewsCount = item.reviews.length;
        const sum = item.reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0);
        item.rating = Number((sum / item.reviews.length).toFixed(1));
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      localStorage.setItem("her_hampers_products", JSON.stringify(parsed));
    }
    return parsed;
  } catch (e) {
    const initialized = DEFAULT_PRODUCTS.map(p => {
      const def = CATEGORY_VARIANT_DEFAULTS[p.category] || {};
      const revs = getSampleReviewsForProduct(p);
      const sum = revs.reduce((acc, r) => acc + Number(r.rating || 5), 0);
      return {
        ...p,
        sizes: p.sizes || (def.sizes ? [...def.sizes] : []),
        outOfStockSizes: p.outOfStockSizes || (def.outOfStockSizes ? [...def.outOfStockSizes] : []),
        colors: p.colors || (def.colors ? [...def.colors] : []),
        outOfStockColors: p.outOfStockColors || (def.outOfStockColors ? [...def.outOfStockColors] : []),
        inHamperBuilder: p.category !== "hampers",
        reviews: revs,
        reviewsCount: revs.length,
        rating: Number((sum / revs.length).toFixed(1))
      };
    });
    localStorage.setItem("her_hampers_products", JSON.stringify(initialized));
    return initialized;
  }
}

// ========================================================
// PERSISTENT STORAGE SYNC (Disk File + Browser Storage)
// Prevents products and orders from ever being erased when link/port changes
// ========================================================

window.syncWithServerStorage = async function() {
  if (typeof fetch !== "function") return;

  // 1. Sync Products from Server Disk (data/products.json)
  try {
    const res = await fetch("/api/products");
    if (res.ok) {
      const serverProds = await res.json();
      if (Array.isArray(serverProds) && serverProds.length > 0) {
        serverProds.forEach(item => {
          if (!item.reviews || !Array.isArray(item.reviews) || item.reviews.length === 0) {
            item.reviews = getSampleReviewsForProduct(item);
            item.reviewsCount = item.reviews.length;
            const sum = item.reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0);
            item.rating = Number((sum / item.reviews.length).toFixed(1));
          }
        });
        localStorage.setItem("her_hampers_products", JSON.stringify(serverProds));
        window.dispatchEvent(new Event("catalogUpdated"));
      }
    }
  } catch (err) {
    // Graceful offline fallback
  }

  // 2. Sync Orders from Server Disk (data/orders.json)
  try {
    const resO = await fetch("/api/orders");
    if (resO.ok) {
      const serverOrders = await resO.json();
      if (Array.isArray(serverOrders) && serverOrders.length > 0) {
        const localOrdersRaw = localStorage.getItem("her_hampers_orders");
        let localOrders = null;
        try { localOrders = localOrdersRaw ? JSON.parse(localOrdersRaw) : null; } catch(e){}

        if (!localOrders || serverOrders.length >= localOrders.length) {
          localStorage.setItem("her_hampers_orders", JSON.stringify(serverOrders));
          window.dispatchEvent(new Event("ordersUpdated"));
        } else if (localOrders && localOrders.length > serverOrders.length) {
          saveStoredOrders(localOrders);
        }
      }
    }
  } catch (err) {}

  // 3. Sync App Ratings from Server Disk (data/app-ratings.json)
  try {
    const resA = await fetch("/api/app-ratings");
    if (resA.ok) {
      const serverRatings = await resA.json();
      if (Array.isArray(serverRatings) && serverRatings.length > 0) {
        localStorage.setItem("her_hampers_app_ratings", JSON.stringify(serverRatings));
        window.dispatchEvent(new Event("appRatingsUpdated"));
      }
    }
  } catch (err) {}
};

// Initiate sync immediately on startup
if (typeof window !== "undefined") {
  window.syncWithServerStorage();
}

window.DEFAULT_PRODUCTS = DEFAULT_PRODUCTS;
window.getStoredProducts = getStoredProducts;
window.saveStoredProducts = saveStoredProducts;

function saveStoredProducts(products) {
  localStorage.setItem("her_hampers_products", JSON.stringify(products));
  // Dispatch custom storage event for instant multi-tab sync
  window.dispatchEvent(new Event("catalogUpdated"));

  // Persist directly to server disk file (data/products.json)
  if (typeof fetch === "function") {
    fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(products)
    }).then(res => res.json()).then(resData => {
      console.log(`[Her Hampers] Successfully saved ${products.length} products to data/products.json on disk!`);
    }).catch(err => {
      console.warn("[Her Hampers] Note: Saved locally in browser:", err);
    });
  }
}

function getStoredOrders() {
  const data = localStorage.getItem("her_hampers_orders");
  if (!data) {
    localStorage.setItem("her_hampers_orders", JSON.stringify(DEFAULT_ORDERS));
    return DEFAULT_ORDERS;
  }
  try {
    const orders = JSON.parse(data);
    let updated = false;

    // Ensure sample demo order with Bangles (Red) exists
    if (!orders.some(o => o.id === "HH-10495")) {
      const redBanglesOrder = DEFAULT_ORDERS.find(o => o.id === "HH-10495");
      if (redBanglesOrder) {
        orders.unshift(redBanglesOrder);
        updated = true;
      }
    }

    orders.forEach(o => {
      if (o.courierName || o.trackingAwb) {
        delete o.courierName;
        delete o.trackingAwb;
        updated = true;
      }
      if (!o.estimatedDelivery || o.estimatedDelivery.includes("3 - 5") || o.estimatedDelivery.includes("2 business")) {
        o.estimatedDelivery = "Expected in 3 - 7 working days";
        updated = true;
      }
      // Migrate variants for existing default orders if missing
      const matchDefault = DEFAULT_ORDERS.find(d => d.id === o.id);
      if (matchDefault && matchDefault.items && o.items) {
        matchDefault.items.forEach((dItem, idx) => {
          if (o.items[idx]) {
            if (dItem.color && !o.items[idx].color) {
              o.items[idx].color = dItem.color;
              o.items[idx].size = dItem.size;
              o.items[idx].name = dItem.name;
              o.items[idx].shortName = dItem.shortName;
              updated = true;
            }
          }
        });
      }
    });

    if (updated) {
      localStorage.setItem("her_hampers_orders", JSON.stringify(orders));
    }
    return orders;
  } catch(e) {
    return DEFAULT_ORDERS;
  }
}

function saveStoredOrders(orders) {
  localStorage.setItem("her_hampers_orders", JSON.stringify(orders));
  window.dispatchEvent(new Event("ordersUpdated"));

  // Persist directly to server disk file (data/orders.json)
  if (typeof fetch === "function") {
    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orders)
    }).then(res => res.json()).then(resData => {
      console.log(`[Her Hampers] Successfully saved ${orders.length} orders to data/orders.json on disk!`);
    }).catch(err => {
      console.warn("[Her Hampers] Note: Orders saved locally:", err);
    });
  }
}

function getBoutiqueCoupons() {
  return BOUTIQUE_COUPONS;
}

function findOrderByIdOrPhone(query) {
  if (!query) return null;
  const clean = query.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const orders = getStoredOrders();
  return orders.find(o => {
    const cleanId = (o.id || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const cleanPhone = (o.phone || "").replace(/[^0-9]/g, "");
    return cleanId === clean || (cleanPhone.length >= 5 && cleanPhone.includes(clean));
  }) || null;
}
window.findOrderByIdOrPhone = findOrderByIdOrPhone;

// Smart & robust product resolution for any order item
function findProductForOrderItem(orderItem, productsList) {
  if (!orderItem) return null;
  const prods = (Array.isArray(productsList) && productsList.length > 0)
    ? productsList
    : (typeof currentProducts !== 'undefined' && currentProducts && currentProducts.length ? currentProducts : getStoredProducts());

  // 1. Direct ID / productId match
  if (orderItem.productId) {
    const byPid = prods.find(p => p.id === orderItem.productId);
    if (byPid) return byPid;
  }
  if (orderItem.id) {
    const byId = prods.find(p => p.id === orderItem.id);
    if (byId) return byId;
  }

  // 2. Exact clean name match
  const rawItemName = (orderItem.baseName || orderItem.name || '').trim();
  const cleanName = rawItemName.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
  
  let found = prods.find(p => p.name.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase() === cleanName);
  if (found) return found;

  // 3. Substring / startsWith / includes match
  found = prods.find(p => {
    const pClean = p.name.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    return pClean.includes(cleanName) || cleanName.includes(pClean);
  });
  if (found) return found;

  // 4. Token / keyword match
  const words = cleanName.split(/\s+/).filter(w => w.length > 3);
  if (words.length > 0) {
    found = prods.find(p => {
      const pLower = p.name.toLowerCase();
      return words.every(w => pLower.includes(w));
    });
    if (found) return found;

    found = prods.find(p => {
      const pLower = p.name.toLowerCase();
      const matchCount = words.filter(w => pLower.includes(w)).length;
      return matchCount >= Math.min(2, words.length);
    });
    if (found) return found;
  }

  // 5. ShortName match
  if (orderItem.shortName) {
    const shortClean = orderItem.shortName.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    found = prods.find(p => p.name.toLowerCase().includes(shortClean) || (p.category && p.category.toLowerCase().includes(shortClean)));
    if (found) return found;
  }

  return prods[0] || null;
}
window.findProductForOrderItem = findProductForOrderItem;

function getStoredAppRatings() {
  const data = localStorage.getItem("her_hampers_app_ratings");
  if (!data) return [];
  try {
    return JSON.parse(data) || [];
  } catch (e) {
    return [];
  }
}

function saveStoredAppRatings(ratings) {
  localStorage.setItem("her_hampers_app_ratings", JSON.stringify(ratings));
  window.dispatchEvent(new Event("appRatingsUpdated"));

  if (typeof fetch === "function") {
    fetch("/api/app-ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ratings)
    }).then(res => res.json()).then(resData => {
      console.log(`[Her Hampers] Saved ${ratings.length} app ratings to data/app-ratings.json!`);
    }).catch(err => {
      console.warn("[Her Hampers] Note: App ratings saved locally:", err);
    });
  }
}
window.getStoredAppRatings = getStoredAppRatings;
window.saveStoredAppRatings = saveStoredAppRatings;

// Host Admin Default Credentials - Strictly "admin" / "pinkpassword123"
const HOST_AUTH = {
  defaultUser: "admin",
  defaultPass: "pinkpassword123",
  brandName: "Her Hampers Host Portal"
};

function getHostCredentials() {
  const stored = localStorage.getItem("her_hampers_host_creds");
  if (!stored) {
    localStorage.setItem("her_hampers_host_creds", JSON.stringify({ username: HOST_AUTH.defaultUser, password: HOST_AUTH.defaultPass }));
    return { username: HOST_AUTH.defaultUser, password: HOST_AUTH.defaultPass };
  }
  try {
    const creds = JSON.parse(stored);
    if (!creds || creds.username !== HOST_AUTH.defaultUser || creds.password !== HOST_AUTH.defaultPass) {
      localStorage.setItem("her_hampers_host_creds", JSON.stringify({ username: HOST_AUTH.defaultUser, password: HOST_AUTH.defaultPass }));
      return { username: HOST_AUTH.defaultUser, password: HOST_AUTH.defaultPass };
    }
    return creds;
  } catch(e) {
    localStorage.setItem("her_hampers_host_creds", JSON.stringify({ username: HOST_AUTH.defaultUser, password: HOST_AUTH.defaultPass }));
    return { username: HOST_AUTH.defaultUser, password: HOST_AUTH.defaultPass };
  }
}

function isHostAuthenticated() {
  return sessionStorage.getItem("her_hampers_host_logged_in") === "true";
}

function setHostSession(status) {
  if (status) {
    sessionStorage.setItem("her_hampers_host_logged_in", "true");
  } else {
    sessionStorage.removeItem("her_hampers_host_logged_in");
  }
}

