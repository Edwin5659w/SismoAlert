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


export function formatLocalTime(occurredAt: number) {
  return new Date(occurredAt).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatUtcTime(occurredAt: number) {
  return `${new Date(occurredAt).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}
