const PALETTE = ['#EF4444', '#F97316', '#EAB308', '#0EA5E9', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4'];

export function getCategoryColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  return PALETTE[h % PALETTE.length];
}
