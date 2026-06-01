const { withDangerousMod } = require("@expo/config-plugins")
const { mergeContents } = require("@expo/config-plugins/build/utils/generateCode")
const fs = require("fs")
const path = require("path")

/**
 * Re-applies the two custom Podfile post_install tweaks from the original bare project that
 * expo-build-properties does not cover:
 *   - strip the unsupported `-GCC_WARN_INHIBIT_ALL_WARNINGS` flag from BoringSSL-GRPC
 *   - define `_LIBCPP_ENABLE_CXX17_REMOVED_UNARY_BINARY_FUNCTION` (libc++ C++17 removals)
 *
 * useFrameworks: "static", deploymentTarget and $RNFirebaseAsStaticFramework are handled by
 * expo-build-properties + the @react-native-firebase/app plugin.
 */
const POST_INSTALL = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)', '_LIBCPP_ENABLE_CXX17_REMOVED_UNARY_BINARY_FUNCTION']
      end
      if target.name == 'BoringSSL-GRPC'
        target.source_build_phase.files.each do |file|
          if file.settings && file.settings['COMPILER_FLAGS']
            flags = file.settings['COMPILER_FLAGS'].split
            flags.reject! { |flag| flag == '-GCC_WARN_INHIBIT_ALL_WARNINGS' }
            file.settings['COMPILER_FLAGS'] = flags.join(' ')
          end
        end
      end
    end`

const withPodfilePostInstall = (config) =>
  withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile")
      let contents = fs.readFileSync(podfile, "utf8")

      // Insert just inside the existing `post_install do |installer|` block that the Expo
      // template generates (it calls react_native_post_install first).
      const merged = mergeContents({
        tag: "better-rail-podfile-post-install",
        src: contents,
        newSrc: POST_INSTALL,
        anchor: /post_install do \|installer\|/,
        offset: 1,
        comment: "#",
      })

      if (merged.didMerge) {
        fs.writeFileSync(podfile, merged.contents)
      }
      return cfg
    },
  ])

module.exports = { withPodfilePostInstall }
