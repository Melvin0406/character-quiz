// withExcludeFastImageAppGlideModule.js
const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withExcludeFastImageAppGlideModule(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') { // Asumiendo que tu build.gradle es Groovy
      let contents = config.modResults.contents;

      // Asegurar que el bloque ext exista
      if (!contents.includes('ext {')) {
        // Intentar añadirlo después del bloque buildscript si existe, o al principio
        if (contents.includes('buildscript {')) {
          contents = contents.replace(
            /(buildscript\s*{[\s\S]*?}\s*)/, // Regex para encontrar el bloque buildscript
            '$1\next {\n}\n'
          );
        } else {
          contents = 'ext {\n}\n\n' + contents;
        }
      }
      
      // Añadir la propiedad dentro del bloque ext si no existe
      if (!contents.includes('excludeAppGlideModule = true')) {
        contents = contents.replace(
          /ext\s*{/,
          'ext {\n    excludeAppGlideModule = true // Añadido por config plugin'
        );
        console.log('INFO (withExcludeFastImageAppGlideModule.js): Added excludeAppGlideModule = true to project-level android/build.gradle ext block.');
      } else {
        console.log('INFO (withExcludeFastImageAppGlideModule.js): excludeAppGlideModule = true already exists in project-level android/build.gradle ext block.');
      }
      config.modResults.contents = contents;
    } else {
      console.warn('WARNING (withExcludeFastImageAppGlideModule.js): Kotlin Gradle script (build.gradle.kts) detected. Manual adjustment for excludeAppGlideModule might be needed.');
    }
    return config;
  });
};