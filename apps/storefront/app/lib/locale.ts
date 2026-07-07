export const DEFAULT_LOCALE = 'vi';

export function getLocaleFromRequest(request: Request): string {
  const url = new URL(request.url);
  const locale = url.searchParams.get('locale');
  if (locale === 'en' || locale === 'vi') {
    return locale;
  }
  return DEFAULT_LOCALE;
}
