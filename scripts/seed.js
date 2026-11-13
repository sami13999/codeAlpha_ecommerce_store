const bcrypt = require('bcryptjs');
const db = require('../server/config/db');

const CATEGORIES_DATA = [
  {
    name: 'Apparel & Wear',
    slug: 'apparel-wear',
    description: 'Timeless tailored silhouettes and organic breathable textiles.',
    image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
    subcategories: [
      { name: "Men's Minimalist Collection", slug: 'mens-minimalist', description: 'Essential shirts, outerwear, and structured trousers.' },
      { name: "Women's Modern Silhouettes", slug: 'womens-modern', description: 'Understated elegance crafted with premium natural fibers.' }
    ]
  },
  {
    name: 'Living & Interior',
    slug: 'living-interior',
    description: 'Artisanal homeware, sculptural ceramics, and architectural lighting.',
    image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
    subcategories: [
      { name: 'Ceramics & Tableware', slug: 'ceramics-tableware', description: 'Hand-thrown stoneware, matte glaze bowls, and carafes.' },
      { name: 'Architectural Lighting', slug: 'architectural-lighting', description: 'Sculptural ambient lamps and brushed bronze pendants.' }
    ]
  },
  {
    name: 'Objects & Everyday',
    slug: 'objects-everyday',
    description: 'Precision timepieces, acoustic hardware, and vegetable-tanned leather.',
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    subcategories: [
      { name: 'Analog Timepieces', slug: 'analog-timepieces', description: 'Sapphire crystal, Swiss movement minimalist watches.' },
      { name: 'Audio & Acoustics', slug: 'audio-acoustics', description: 'Studio-grade wireless over-ear monitors and mahogany speakers.' },
      { name: 'Leather Goods', slug: 'leather-goods', description: 'Full-grain carryalls, cardholders, and desk folios.' }
    ]
  }
];

const RAW_PRODUCTS = [
  // 1. Timepieces
  {
    name: 'Krono Apex Automatic Watch',
    slug: 'krono-apex-automatic-watch',
    category_slug: 'analog-timepieces',
    brand: 'Krono Copenhagen',
    price: 349.00,
    compare_at_price: 420.00,
    stock: 28,
    is_featured: 1,
    short: 'Sapphire crystal dial with 42-hour power reserve and Italian Horween leather strap.',
    desc: 'Crafted for discerning collectors, the Krono Apex merges Scandinavian minimalism with Swiss automatic mechanical movement. Featuring an anti-reflective sapphire crystal face, brushed 316L stainless steel casing, and water resistance up to 50 meters.',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80'
    ]
  },
  {
    name: 'Vanguard Noir Chronograph',
    slug: 'vanguard-noir-chronograph',
    category_slug: 'analog-timepieces',
    brand: 'Krono Copenhagen',
    price: 289.00,
    compare_at_price: 350.00,
    stock: 15,
    is_featured: 1,
    short: 'Matte black PVD stainless steel with sub-second chronograph and luminous hands.',
    desc: 'The Vanguard Noir redefines tactical elegance. Designed with aerospace-grade brushed titanium accents and a vegetable-tanned full-grain leather strap.',
    images: [
      'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=800&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80'
    ]
  },
  {
    name: 'Aura Minimalist Dress Watch',
    slug: 'aura-minimalist-dress-watch',
    category_slug: 'analog-timepieces',
    brand: 'Aura Horology',
    price: 195.00,
    compare_at_price: null,
    stock: 40,
    is_featured: 0,
    short: 'Ultra-slim 6mm profile with Champagne brushed sunray dial.',
    desc: 'Understated refinement in an ultra-slim chassis. Perfect for formal evenings or contemporary casual wear.',
    images: [
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80'
    ]
  },

  // 2. Audio & Acoustics
  {
    name: 'Sonos Studio Pro Wireless Headphones',
    slug: 'sonos-studio-pro-wireless-headphones',
    category_slug: 'audio-acoustics',
    brand: 'Sonos Acoustics',
    price: 399.00,
    compare_at_price: 450.00,
    stock: 22,
    is_featured: 1,
    short: 'Active Noise Cancellation with 45mm custom beryllium drivers and memory foam cups.',
    desc: 'Experience uncompromised acoustic fidelity. Equipped with high-resolution lossless Bluetooth 5.3 codecs, dual-mode ambient transparency, and 36 hours of continuous playtime.',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80'
    ]
  },
  {
    name: 'Walnut Resonance Desktop Speaker',
    slug: 'walnut-resonance-desktop-speaker',
    category_slug: 'audio-acoustics',
    brand: 'Sonos Acoustics',
    price: 249.00,
    compare_at_price: 299.00,
    stock: 18,
    is_featured: 1,
    short: 'Hand-carved solid walnut cabinet with dual passive bass radiators.',
    desc: 'A fusion of mid-century industrial warmth and modern acoustic engineering. Delivers rich mid-range depth and crisp highs without distortion.',
    images: [
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80',
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80'
    ]
  },
  {
    name: 'Zenith True Wireless Earbuds',
    slug: 'zenith-true-wireless-earbuds',
    category_slug: 'audio-acoustics',
    brand: 'Zenith Audio',
    price: 159.00,
    compare_at_price: 189.00,
    stock: 55,
    is_featured: 0,
    short: 'IPX7 waterproof earbuds with Qi wireless charging case and adaptive EQ.',
    desc: 'Compact ergonomics engineered for seamless transitions between commutes and deep focus studio sessions.',
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80'
    ]
  },

  // 3. Ceramics & Tableware
  {
    name: 'Artisan Terra Hand-Thrown Vase',
    slug: 'artisan-terra-hand-thrown-vase',
    category_slug: 'ceramics-tableware',
    brand: 'Atelier Kinto',
    price: 78.00,
    compare_at_price: 95.00,
    stock: 35,
    is_featured: 1,
    short: 'Raw grogged terracotta vase with a subtle volcanic reactive glaze.',
    desc: 'Individually shaped on a potters wheel in Kyoto. Each piece exhibits organic variations in texture and earth-toned pigmentation, creating a one-of-a-kind sculptural vessel.',
    images: [
      'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=800&q=80',
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80'
    ]
  },
  {
    name: 'Wabi-Sabi Ceramic Dinner Set (12-Piece)',
    slug: 'wabi-sabi-ceramic-dinner-set',
    category_slug: 'ceramics-tableware',
    brand: 'Atelier Kinto',
    price: 185.00,
    compare_at_price: 230.00,
    stock: 14,
    is_featured: 1,
    short: 'Four place settings including dinner plates, salad bowls, and matching tumblers.',
    desc: 'Durable high-fire stoneware designed for daily dining rituals. Dishwasher, microwave, and oven safe up to 250°C.',
    images: [
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80',
      'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=800&q=80'
    ]
  },
  {
    name: 'Nordic Smoked Glass Pour-Over Carafe',
    slug: 'nordic-smoked-glass-pour-over-carafe',
    category_slug: 'ceramics-tableware',
    brand: 'Nordic Studio',
    price: 52.00,
    compare_at_price: null,
    stock: 45,
    is_featured: 0,
    short: 'Borosilicate heat-resistant glass carafe with stainless steel laser mesh filter.',
    desc: 'Brew specialty coffee with exquisite clarity. Designed with a calibrated spout for drip-free pouring.',
    images: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80'
    ]
  },

  // 4. Architectural Lighting
  {
    name: 'Orbital Brass Table Lamp',
    slug: 'orbital-brass-table-lamp',
    category_slug: 'architectural-lighting',
    brand: 'Lumina Works',
    price: 210.00,
    compare_at_price: 260.00,
    stock: 20,
    is_featured: 1,
    short: 'Solid spun brass shade with mouth-blown frosted glass sphere and brass dimmer knob.',
    desc: 'Emits a warm, non-glare ambient glow. Built with solid heavy brass counterweights and a woven braided cord.',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80',
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80'
    ]
  },
  {
    name: 'Cast Iron Architectural Wall Sconce',
    slug: 'cast-iron-architectural-wall-sconce',
    category_slug: 'architectural-lighting',
    brand: 'Lumina Works',
    price: 135.00,
    compare_at_price: 160.00,
    stock: 26,
    is_featured: 0,
    short: 'Geometric dual-directional wall sconce in powder-coated textured iron.',
    desc: 'Casts architectural dramatic lighting upwards and downwards. UL-listed for interior and covered patio installations.',
    images: [
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=80'
    ]
  },

  // 5. Leather Goods
  {
    name: 'Heritage Weekender Duffel Bag',
    slug: 'heritage-weekender-duffel-bag',
    category_slug: 'leather-goods',
    brand: 'Craftsman Leather Co.',
    price: 295.00,
    compare_at_price: 360.00,
    stock: 16,
    is_featured: 1,
    short: 'Full-grain vegetable-tanned cowhide with solid antique brass YKK hardware.',
    desc: 'The consummate travel companion. Features a dedicated reinforced shoe compartment, padded 16-inch laptop compartment, and lifetime construction warranty.',
    images: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'
    ]
  },
  {
    name: 'Minimalist Bifold Card Wallet',
    slug: 'minimalist-bifold-card-wallet',
    category_slug: 'leather-goods',
    brand: 'Craftsman Leather Co.',
    price: 48.00,
    compare_at_price: 60.00,
    stock: 65,
    is_featured: 0,
    short: 'RFID-blocking slim bifold holding 8 cards plus folded currency.',
    desc: 'Hand-stitched using waxed polyester thread for superior longevity. Patinas beautifully with every month of carry.',
    images: [
      'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80'
    ]
  },

  // 6. Apparel - Men
  {
    name: 'Merino Wool Structured Overshirt',
    slug: 'merino-wool-structured-overshirt',
    category_slug: 'mens-minimalist',
    brand: 'Atelier Homme',
    price: 175.00,
    compare_at_price: 210.00,
    stock: 30,
    is_featured: 1,
    short: '100% extra-fine Australian merino wool with natural horn buttons.',
    desc: 'Engineered as the quintessential mid-layer. Resists wrinkles, breathes naturally, and transitions from desk to evening lounge effortlessly.',
    images: [
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80',
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80'
    ]
  },
  {
    name: 'Heavyweight Supima Cotton Tee (Trio Pack)',
    slug: 'heavyweight-supima-cotton-tee-pack',
    category_slug: 'mens-minimalist',
    brand: 'Atelier Homme',
    price: 85.00,
    compare_at_price: 105.00,
    stock: 48,
    is_featured: 0,
    short: '240 GSM organic Supima cotton in Bone White, Charcoal, and Olive.',
    desc: 'Never loses shape. Pre-shrunk tight knit with reinforced double-needle collar stitching.',
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80'
    ]
  },

  // 7. Apparel - Women
  {
    name: 'Double-Faced Cashmere Trench Coat',
    slug: 'double-faced-cashmere-trench-coat',
    category_slug: 'womens-modern',
    brand: 'Maison ÉPure',
    price: 495.00,
    compare_at_price: 620.00,
    stock: 12,
    is_featured: 1,
    short: 'Hand-sewn double-faced cashmere and wool blend with relaxed belt closure.',
    desc: 'Unsurpassed drape and lightweight warmth. Features deep welt pockets, raglan sleeves, and horn buckle detailing.',
    images: [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&q=80',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80'
    ]
  },
  {
    name: 'Raw Mulberry Silk Slip Dress',
    slug: 'raw-mulberry-silk-slip-dress',
    category_slug: 'womens-modern',
    brand: 'Maison ÉPure',
    price: 165.00,
    compare_at_price: 200.00,
    stock: 25,
    is_featured: 1,
    short: '19-momme sandwashed mulberry silk with delicate bias-cut drape.',
    desc: 'A sensual, fluid silhouette with adjustable micro-straps and French seams throughout.',
    images: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80'
    ]
  }
];

// Helper to expand catalog to 50+ total rich products
function expandProducts(baseList) {
  const fullList = [...baseList];
  const modifiers = ['Edition II', 'Signature Series', 'Limited Studio', 'Refined Cast'];
  const colors = ['Slate', 'Oatmeal', 'Espresso', 'Ivory', 'Onyx'];

  let count = fullList.length;
  let idx = 0;

  while (fullList.length < 52) {
    const parent = baseList[idx % baseList.length];
    const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    count++;

    const newName = `${parent.name} - ${mod} (${color})`;
    const newSlug = `${parent.slug}-${mod.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${color.toLowerCase()}-${count}`;
    const priceMod = (parent.price * (0.85 + Math.random() * 0.3)).toFixed(2);
    const compareMod = parent.compare_at_price ? (priceMod * 1.25).toFixed(2) : null;

    fullList.push({
      name: newName,
      slug: newSlug,
      category_slug: parent.category_slug,
      brand: parent.brand,
      price: parseFloat(priceMod),
      compare_at_price: compareMod ? parseFloat(compareMod) : null,
      stock: Math.floor(Math.random() * 40) + 5,
      is_featured: count % 6 === 0 ? 1 : 0,
      short: `${parent.short} Hand-finished in ${color}.`,
      desc: `${parent.desc} This bespoke ${mod} variation brings nuanced materials and specialized finishing touches.`,
      images: parent.images
    });
    idx++;
  }

  return fullList;
}

async function runSeeder() {
  console.log('[Seeder] Initializing database seeding...');

  try {
    // 1. Seed Categories
    console.log('[Seeder] Seeding categories hierarchy...');
    const catIdMap = {}; // slug -> id

    for (let i = 0; i < CATEGORIES_DATA.length; i++) {
      const root = CATEGORIES_DATA[i];
      const [existingRoot] = await db.query('SELECT id FROM categories WHERE slug = ?', [root.slug]);
      let rootId;

      if (existingRoot.length > 0) {
        rootId = existingRoot[0].id;
      } else {
        const [res] = await db.query(
          `INSERT INTO categories (parent_id, name, slug, description, image_url, is_active, sort_order)
           VALUES (NULL, ?, ?, ?, ?, 1, ?)`,
          [root.name, root.slug, root.description, root.image_url, i + 1]
        );
        rootId = res.insertId;
      }
      catIdMap[root.slug] = rootId;

      // Seed Subcategories
      if (root.subcategories) {
        for (let j = 0; j < root.subcategories.length; j++) {
          const sub = root.subcategories[j];
          const [existingSub] = await db.query('SELECT id FROM categories WHERE slug = ?', [sub.slug]);
          let subId;
          if (existingSub.length > 0) {
            subId = existingSub[0].id;
          } else {
            const [subRes] = await db.query(
              `INSERT INTO categories (parent_id, name, slug, description, is_active, sort_order)
               VALUES (?, ?, ?, ?, 1, ?)`,
              [rootId, sub.name, sub.slug, sub.description, j + 1]
            );
            subId = subRes.insertId;
          }
          catIdMap[sub.slug] = subId;
        }
      }
    }

    console.log(`[Seeder] Categories established: ${Object.keys(catIdMap).length}`);

    // 2. Seed 50+ Curated Products
    console.log('[Seeder] Seeding 50+ rich mock products...');
    const productsToSeed = expandProducts(RAW_PRODUCTS);

    let productIndex = 1;
    for (const prod of productsToSeed) {
      const categoryId = catIdMap[prod.category_slug] || catIdMap['objects-everyday'] || 1;
      const sku = `SKU-PROD-${String(productIndex).padStart(5, '0')}`;

      // Check if product exists
      const [existingProd] = await db.query('SELECT id FROM products WHERE slug = ?', [prod.slug]);
      let productId;

      if (existingProd.length > 0) {
        productId = existingProd[0].id;
      } else {
        const [pRes] = await db.query(
          `INSERT INTO products (
            category_id, name, slug, sku, short_description, description,
            price, compare_at_price, stock_quantity, low_stock_threshold,
            brand, weight, is_featured, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 5, ?, 1.25, ?, 1)`,
          [
            categoryId,
            prod.name,
            prod.slug,
            sku,
            prod.short,
            prod.desc,
            prod.price,
            prod.compare_at_price,
            prod.stock,
            prod.brand,
            prod.is_featured
          ]
        );
        productId = pRes.insertId;

        // Insert product images
        let sortOrder = 0;
        for (const imgUrl of prod.images) {
          await db.query(
            `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
             VALUES (?, ?, ?, ?, ?)`,
            [productId, imgUrl, prod.name, sortOrder === 0 ? 1 : 0, sortOrder]
          );
          sortOrder++;
        }
      }

      productIndex++;
    }

    console.log(`[Seeder] Successfully seeded ${productsToSeed.length} products with images!`);

    // 3. Seed Users (Admin & Customer)
    console.log('[Seeder] Seeding default test users...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    // Customer
    const [existingCust] = await db.query('SELECT id FROM users WHERE email = ?', ['customer@example.com']);
    if (existingCust.length === 0) {
      await db.query(
        `INSERT INTO users (full_name, email, phone, password_hash, role, status, email_verified)
         VALUES ('Sami Customer', 'customer@example.com', '+923001234567', ?, 'CUSTOMER', 'ACTIVE', 1)`,
        [passwordHash]
      );
      console.log(' -> Seeded customer: customer@example.com / Password123!');
    }

    // Admin
    const [existingAdmin] = await db.query('SELECT id FROM users WHERE email = ?', ['admin@store.com']);
    if (existingAdmin.length === 0) {
      await db.query(
        `INSERT INTO users (full_name, email, phone, password_hash, role, status, email_verified)
         VALUES ('Store Administrator', 'admin@store.com', '+923009876543', ?, 'ADMIN', 'ACTIVE', 1)`,
        [passwordHash]
      );
      console.log(' -> Seeded admin: admin@store.com / Password123!');
    }

    // 4. Seed Store Settings
    const [existingSettings] = await db.query('SELECT COUNT(*) as count FROM store_settings');
    if (existingSettings[0].count === 0) {
      await db.query(`
        INSERT INTO store_settings (setting_key, setting_value, description) VALUES
        ('store_name', 'Maison & Co. Architectural Goods', 'Store brand title'),
        ('currency', 'PKR', 'Active currency code'),
        ('currency_symbol', 'Rs.', 'Active currency symbol'),
        ('free_shipping_threshold', '2500.00', 'Subtotal threshold for complimentary shipping'),
        ('standard_shipping_fee', '200.00', 'Flat standard shipping rate')
      `);
      console.log(' -> Seeded store settings.');
    }

    console.log('[Seeder] Database seeding finished successfully.');
  } catch (error) {
    console.error('[Seeder] Error during seeding:', error);
  } finally {
    await db.end();
  }
}

if (require.main === module) {
  runSeeder();
}

module.exports = runSeeder;

