export default function isRTL(text: string): boolean {
  const rtlChars = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC\u0600-\u06FF]/;
  return rtlChars.test(text);
}
