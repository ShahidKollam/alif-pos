export function asObject(v, name = 'payload') {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`Invalid ${name}`);
  return v;
}

export function asId(v, name = 'id') {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid ${name}`);
  return n;
}

export function asString(v, { max = 500, required = false, name = 'value' } = {}) {
  if (v == null || v === '') {
    if (required) throw new Error(`${name} is required`);
    return '';
  }
  const s = String(v).trim();
  if (s.length > max) throw new Error(`${name} is too long`);
  return s;
}

export function asNumber(v, { min = null, name = 'value' } = {}) {
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`Invalid ${name}`);
  if (min != null && n < min) throw new Error(`${name} must be at least ${min}`);
  return n;
}

export function asMode(v) {
  if (v !== 'wholesale' && v !== 'retail') throw new Error('Invalid billing mode');
  return v;
}
