export function getErrorMessage(err: unknown, defaultMessage = 'Xatolik yuz berdi'): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const resData = (err as { response?: { data?: { message?: string | string[] } } }).response
      ?.data;
    if (Array.isArray(resData?.message)) {
      const joined = resData.message
        .map((m) => (typeof m === 'string' ? m.trim() : ''))
        .filter(Boolean)
        .join(', ');
      if (joined) return joined;
    }
    if (typeof resData?.message === 'string' && resData.message.trim()) {
      return resData.message.trim();
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  return defaultMessage;
}
