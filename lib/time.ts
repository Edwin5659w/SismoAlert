export function formatTimeAgo(occurredAt: number) {
  const diffMs = Date.now() - occurredAt;
  const minutes = Math.max(1, Math.round(diffMs / 60000));

  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `Hace ${hours} h`;
  }

  const days = Math.round(hours / 24);
  return `Hace ${days} d`;
}
