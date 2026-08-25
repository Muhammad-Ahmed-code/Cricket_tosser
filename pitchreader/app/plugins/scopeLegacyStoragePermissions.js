/**
 * Custom config plugin: scopeLegacyStoragePermissions.js
 *
 * Two dependencies unconditionally add unscoped READ_EXTERNAL_STORAGE /
 * WRITE_EXTERNAL_STORAGE entries to the Android manifest with no option to opt out:
 *   - expo-media-library's config plugin (only used by this app's iOS-only photo
 *     grid, PhotoPickerScreen's IOSPhotoPicker, gated behind Platform.OS !== 'android')
 *   - expo-file-system's config plugin, auto-applied by Expo's autolinking since
 *     the package is a dependency (used for local file read/write, e.g. compressImage)
 *
 * The Android gallery/camera flow goes through expo-image-picker directly, whose
 * own bundled manifest already declares these two permissions correctly scoped to
 * maxSdkVersion=32 (legacy pre-Photo-Picker fallback only) and relies on the system
 * Photo Picker on API 33+. An unscoped declaration anywhere in the main manifest
 * wins over a scoped one during Gradle manifest merging, which is what was
 * triggering Google Play's photo/video picker policy warning.
 *
 * expo-file-system is listed explicitly in app.json's plugins array (immediately
 * before this plugin) so Expo's "run once per package" dedup guard skips its
 * autolinked re-application later in the pipeline — otherwise it would silently
 * re-add these unscoped after this plugin runs. This plugin then runs after both
 * expo-media-library and expo-file-system and caps their storage permission
 * entries to maxSdkVersion=32 instead of dropping them outright, since
 * expo-file-system's shared-storage file access is still legitimately needed
 * below API 33.
 *
 * (READ_MEDIA_IMAGES/VIDEO/AUDIO/VISUAL_USER_SELECTED and ACCESS_MEDIA_LOCATION
 * don't need this treatment — they're fully blocked via android.blockedPermissions
 * in app.json instead, since nothing needs them on Android at all.)
 */

const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSIONS_TO_SCOPE = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

/**
 * @param {import('@expo/config-plugins').ExpoConfig} config
 * @returns {import('@expo/config-plugins').ExpoConfig}
 */
const withScopeLegacyStoragePermissions = (config) => {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    if (!manifest['uses-permission']) {
      return modConfig;
    }

    manifest['uses-permission'] = manifest['uses-permission'].map((entry) => {
      if (PERMISSIONS_TO_SCOPE.includes(entry.$['android:name'])) {
        entry.$['android:maxSdkVersion'] = '32';
      }
      return entry;
    });

    return modConfig;
  });
};

module.exports = withScopeLegacyStoragePermissions;
