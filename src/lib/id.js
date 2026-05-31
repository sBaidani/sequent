export function generateId(prefix = '') {
  return `${prefix}${crypto.randomUUID()}`;
}
