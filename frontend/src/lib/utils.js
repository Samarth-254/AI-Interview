export const getScoreColor = (scoreVal) => {
  const val = parseFloat(scoreVal);
  if (isNaN(val)) return 'var(--text-muted)';
  if (val <= 4.0) return 'var(--status-fail)';
  if (val < 7.0) return 'var(--accent)';
  return 'var(--status-success)';
};

export const getInitials = (name) => {
  if (!name) return 'SN';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};
