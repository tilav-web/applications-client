export function getErrorMessage(err: unknown, defaultMessage = 'Xatolik yuz berdi'): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const resData = (err as { response?: { data?: { message?: string | string[] } } }).response
      ?.data;
    if (Array.isArray(resData?.message)) {
      return resData.message.join(', ');
    }
    if (typeof resData?.message === 'string') {
      return resData.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return defaultMessage;
}
