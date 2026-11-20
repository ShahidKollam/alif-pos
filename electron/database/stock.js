import { getDb, fromPaise } from './db.js';

export function listStock(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM products WHERE is_active = 1';
  const params = [];
  if (filters.search) {
    sql += ' AND (name LIKE ? OR product_code LIKE ?)';
    const q = `%${filters.search}%`;
    params.push(q, q);
  }
  if (filters.lowOnly) sql += ' AND current_stock <= min_stock_level AND min_stock_level > 0';
  sql += ' ORDER BY name ASC';
  return db.prepare(sql).all(...params).map((row) => ({
    id: row.id,
    name: row.name,
    productCode: row.product_code,
    category: row.category,
    unit: row.unit,
    currentStock: row.current_stock,
    minStockLevel: row.min_stock_level,
    isLowStock: row.current_stock <= row.min_stock_level && row.min_stock_level > 0,
    wholesalePrice: fromPaise(row.wholesale_price_paise),
    retailPrice: fromPaise(row.retail_price_paise)
  }));
}

export function adjustStock(data) {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(data.productId);
  if (!product) throw new Error('Product not found');
  const qty = Number(data.quantity);
  if (!qty || Number.isNaN(qty)) throw new Error('Invalid quantity');
  const type = data.movementType || 'adjustment';
  // positive qty = increase, negative = decrease
  const newStock = product.current_stock + qty;
  // Negative stock allowed (oversell / pending purchase)

  return db.transaction(() => {
    db.prepare(`UPDATE products SET current_stock=?, updated_at=datetime('now') WHERE id=?`).run(newStock, data.productId);
    db.prepare(`
      INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, notes)
      VALUES (?, ?, ?, 'manual', ?)
    `).run(data.productId, type, qty, data.notes || 'Manual adjustment');
    return { productId: data.productId, currentStock: newStock };
  })();
}

export function stockMovements(productId, limit = 50) {
  return getDb().prepare(`
    SELECT * FROM stock_movements WHERE product_id = ? ORDER BY id DESC LIMIT ?
  `).all(productId, limit).map((r) => ({
    id: r.id,
    productId: r.product_id,
    movementType: r.movement_type,
    quantity: r.quantity,
    referenceType: r.reference_type,
    referenceId: r.reference_id,
    notes: r.notes,
    createdAt: r.created_at
  }));
}
