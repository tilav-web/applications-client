/**
 * Brauzerda xavfsiz va ishonchli nusxalash yordamchisi.
 * HTTPS bo‘lmagan (HTTP) serverlarda va iframe larda ham 100% ishlaydi.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  // 1. Agar navigator.clipboard mavjud bo'lsa va SecureContext bo'lsa
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('navigator.clipboard.writeText ishlamadi, fallback ishlatiladi:', e);
    }
  }

  // 2. Universal Fallback: document.execCommand('copy')
  // HTTP (masalan http://10.106.0.132:83) va eski brauzerlarda to'liq ishlaydi
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Ekranni pastga siljitib yubormasligi uchun maxsus uslub
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Nusxalashda xatolik:', err);
    return false;
  }
}

