function createdTime(value) {
  if (!value) return 0;
  return Date.parse(value.includes('T') ? value : value.replace(' ', 'T') + 'Z') || 0;
}
export function compareAnnouncements(a, b) {
  const aWaiting = !a.announcement_no;
  const bWaiting = !b.announcement_no;
  if (aWaiting !== bWaiting) return aWaiting ? -1 : 1;
  if (aWaiting && bWaiting) {
    return Number(a.created_order || 0) - Number(b.created_order || 0) ||
      createdTime(a.created_at) - createdTime(b.created_at);
  }
  return Number(b.announcement_no || 0) - Number(a.announcement_no || 0) ||
    createdTime(b.created_at) - createdTime(a.created_at) ||
    Number(b.created_order || 0) - Number(a.created_order || 0);
}
