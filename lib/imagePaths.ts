import * as FileSystem from 'expo-file-system/legacy';

/**
 * iOS assigns each app install its own container directory, and that
 * UUID can change across TestFlight/App Store updates even without a
 * full reinstall. Any absolute file:// path saved earlier (e.g. in
 * SQLite) then points at a container that no longer exists, so the
 * image silently fails to load.
 *
 * Fix: never trust a stored absolute path. Extract just the filename
 * and re-resolve it against the CURRENT documentDirectory every time
 * an image is displayed. As long as the underlying file still exists
 * on disk (just under a different prefix), this keeps working.
 */
export function resolveImagePath(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const filename = stored.split('/').pop();
  if (!filename) return null;
  return FileSystem.documentDirectory + filename;
}
