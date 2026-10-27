/** Presentation only. Native fontScale and measured title height both allow readable fallback. */
export function shopColumns(
  width: number,
  fontScale: number,
  titleHeight = 24,
): 1 | 2 {
  return !Number.isFinite(width) ||
    width < 310 ||
    fontScale >= 1.35 ||
    titleHeight > 32
    ? 1
    : 2;
}
