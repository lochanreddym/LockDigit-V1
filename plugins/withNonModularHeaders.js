const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Custom Expo config plugin to allow non-modular header includes in framework modules.
 * 
 * This is required when using `useFrameworks: "static"` with @react-native-firebase,
 * because Firebase's Objective-C modules import React Native headers that aren't
 * marked as modular headers. Without this flag, Xcode treats these as errors.
 */
module.exports = function withNonModularHeaders(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();

    for (const key in configurations) {
      if (typeof configurations[key].buildSettings !== 'undefined') {
        configurations[key].buildSettings.CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = 'YES';
      }
    }

    return config;
  });
};
