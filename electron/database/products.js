import { getDb, toPaise, fromPaise } from './db.js';

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    productCode: row.product_code || '',
    name: row.name,
    category: row.category || '',
    unit: row.unit || 'piece',
    purchaseCost: fromPaise(row.purchase_cost_paise),
    wholesalePrice: fromPaise(row.wholesale_price_paise),
    retailPrice: fromPaise(row.retail_price_paise),
    openingStock: Number(row.opening_stock) || 0,
    currentStock: Number(row.current_stock) || 0,
    minStockLevel: Number(row.min_stock_level) || 0,
    isActive: Number(row.is_active) === 1,
    isDemo: Number(row.is_demo) === 1,
    isLowStock: Number(row.current_stock) <= Number(row.min_stock_level) && Number(row.min_stock_level) > 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function listProducts(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  if (filters.activeOnly !== false) {
    sql += ' AND is_active = 1';
  }
  if (filters.category) {
    sql += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters.search && String(filters.search).trim()) {
    sql += ' AND (LOWER(name) LIKE ? OR LOWER(IFNULL(product_code,\'\')) LIKE ?)';
    const q = `%${String(filters.search).trim().toLowerCase()}%`;
    params.push(q, q);
  }
  sql += ' ORDER BY name COLLATE NOCASE ASC';
  return db.prepare(sql).all(...params).map(mapProduct);
}

export function getProduct(id) {
  return mapProduct(getDb().prepare('SELECT * FROM products WHERE id = ?').get(id));
}

export function searchProducts(query) {
  const q = (query || '').trim();
  if (!q) return listProducts({ activeOnly: true });
  return listProducts({ search: q, activeOnly: true });
}

export function getCategories() {
  return getDb()
    .prepare(`SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category`)
    .all()
    .map((r) => r.category)
    .filter(Boolean);
}

export function createProduct(data) {
  const db = getDb();
  if (!data.name || !String(data.name).trim()) throw new Error('Product name is required');
  const wholesale = Number(data.wholesalePrice) || 0;
  const retail = Number(data.retailPrice) || 0;
  const cost = Number(data.purchaseCost) || 0;
  if (wholesale < 0 || retail < 0 || cost < 0) throw new Error('Prices cannot be negative');
  const opening = Number(data.openingStock) || 0;
  const minStock = Number(data.minStockLevel) || 0;
  if (opening < 0 || minStock < 0) throw new Error('Stock cannot be negative');

  const code = data.productCode ? String(data.productCode).trim() : null;
  if (code) {
    const dup = db.prepare('SELECT id FROM products WHERE product_code = ?').get(code);
    if (dup) throw new Error('Product code already exists');
  }

  const result = db.prepare(`
    INSERT INTO products (
      product_code, name, category, unit,
      purchase_cost_paise, wholesale_price_paise, retail_price_paise,
      opening_stock, current_stock, min_stock_level, is_active, is_demo
    ) VALUES (?,?,?,?,?,?,?,?,?,?,1,?)
  `).run(
    code,
    String(data.name).trim(),
    data.category ? String(data.category).trim() : null,
    data.unit || 'piece',
    toPaise(cost),
    toPaise(wholesale),
    toPaise(retail),
    opening,
    opening,
    minStock,
    data.isDemo ? 1 : 0
  );

  const id = result.lastInsertRowid;
  // Internal unique code if user did not supply one
  if (!code) {
    const auto = `P${String(id).padStart(5, '0')}`;
    db.prepare('UPDATE products SET product_code = ? WHERE id = ?').run(auto, id);
  }
  if (opening > 0) {
    db.prepare(`
      INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, notes)
      VALUES (?, 'opening', ?, 'product', 'Opening stock')
    `).run(id, opening);
  }
  return getProduct(id);
}

export function updateProduct(id, data) {
  const db = getDb();
  if (!getProduct(id)) throw new Error('Product not found');
  if (!data.name || !String(data.name).trim()) throw new Error('Product name is required');
  const wholesale = Number(data.wholesalePrice) || 0;
  const retail = Number(data.retailPrice) || 0;
  const cost = Number(data.purchaseCost) || 0;
  if (wholesale < 0 || retail < 0 || cost < 0) throw new Error('Prices cannot be negative');

  const code = data.productCode ? String(data.productCode).trim() : null;
  if (code) {
    const dup = db.prepare('SELECT id FROM products WHERE product_code = ? AND id != ?').get(code, id);
    if (dup) throw new Error('Product code already exists');
  }

  db.prepare(`
    UPDATE products SET
      product_code=?, name=?, category=?, unit=?,
      purchase_cost_paise=?, wholesale_price_paise=?, retail_price_paise=?,
      min_stock_level=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    code,
    String(data.name).trim(),
    data.category ? String(data.category).trim() : null,
    data.unit || 'piece',
    toPaise(cost),
    toPaise(wholesale),
    toPaise(retail),
    Number(data.minStockLevel) || 0,
    id
  );
  return getProduct(id);
}

export function setProductActive(id, active) {
  getDb().prepare(`UPDATE products SET is_active=?, updated_at=datetime('now') WHERE id=?`).run(active ? 1 : 0, id);
  return getProduct(id);
}

export function countProducts() {
  const row = getDb().prepare('SELECT COUNT(*) AS c FROM products').get();
  return Number(row?.c ?? 0);
}
