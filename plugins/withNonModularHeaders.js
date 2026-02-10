const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Custom Expo config plugin to allow non-modular header includes in framework modules.
 * 
 * This modifies the Podfile to add a post_install hook that sets
 * CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES for ALL pod targets.
 * 
 * Required when using `useFrameworks: "static"` with @react-native-firebase,
 * because Firebase's Objective-C modules import React Native headers that aren't
 * marked as modular headers.
 */
module.exports = function withNonModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      // The Podfile may not exist yet during prebuild, but we still modify it
      // after expo prebuild generates it
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');

        // Check if we already added our hook
        if (!podfileContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
          // Add the post_install hook before the last "end" in the Podfile
          const postInstallHook = `
  # Allow non-modular includes for Firebase compatibility with static frameworks
  post_install do |installer|
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end

    # Call the default React Native post_install if available
    react_native_post_install(installer) if defined?(react_native_post_install)
  end
`;

          // Check if there's already a post_install block
          if (podfileContent.includes('post_install do |installer|')) {
            // Insert our setting into the existing post_install block
            podfileContent = podfileContent.replace(
              /post_install do \|installer\|/,
              `post_install do |installer|\n    installer.pods_project.targets.each do |target|\n      target.build_configurations.each do |config|\n        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'\n      end\n    end`
            );
          } else {
            // Append post_install before the final end statement
            // Find the last 'end' and insert before it
            const lastEndIndex = podfileContent.lastIndexOf('\nend');
            if (lastEndIndex !== -1) {
              podfileContent =
                podfileContent.slice(0, lastEndIndex) +
                postInstallHook +
                podfileContent.slice(lastEndIndex);
            }
          }

          fs.writeFileSync(podfilePath, podfileContent, 'utf8');
        }
      }

      return config;
    },
  ]);
};
