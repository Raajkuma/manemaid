import { router, type Href } from 'expo-router';

/**
 * Go back after finishing a form. In a browser the page may have been opened directly
 * (bookmark, refresh, shared link), so there is no previous screen: go to `fallback` instead.
 */
export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
