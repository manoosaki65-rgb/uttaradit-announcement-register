function createdTime(value) {
  if (!value) return 0;
  return Date.parse(value.includes('T') ? value : value.replace(' ', 'T') + 'Z') || 0;
}
export function compareAnnouncements(a, b) {
  return Number(b.announcement_no || 0) - Number(a.announcement_no || 0) ||
    createdTime(b.created_at) - createdTime(a.created_at) ||
    Number(b.created_order || 0) - Number(a.created_order || 0);
}
