export function validateJsonQueryText(queryText: string): string | null {
  if (!queryText) {
    return 'Please enter the query text';
  }

  try {
    const queryJson = JSON.parse(queryText);

    if (!Array.isArray(queryJson)) {
      return 'Invalid query';
    } else {
      return null;
    }
  } catch (e) {
    return 'Invalid query';
  }
}

export function validatePositiveNumber(num: string) {
  if (!/^\d+$/.test(num.trim())) {
    return false;
  }

  const parsed = parseInt(num, 10);
  return parsed > 0;
}