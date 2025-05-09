// withAppGlideModule.js
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withAppGlideModule(config) {
  // Necesitas obtener tu package name de alguna manera, usualmente de config.android.package
  const packageName = config.android?.package;
  if (!packageName) {
    throw new Error("Android package name (android.package) is not defined in your app config.");
  }
  // Convierte el package name a una ruta de directorio
  const packagePath = packageName.replace(/\./g, '/');

  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const glideModuleDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', packagePath);
      const glideModulePath = path.join(glideModuleDir, 'MyAppGlideModule.java');

      const glideModuleContent = `
package ${packageName};

import com.bumptech.glide.annotation.GlideModule;
import com.bumptech.glide.module.AppGlideModule;

@GlideModule
public final class MyAppGlideModule extends AppGlideModule {
    // Puedes dejar esta clase vacía.
}
`;
      // Asegurar que el directorio exista
      fs.mkdirSync(glideModuleDir, { recursive: true });
      // Escribir el archivo
      fs.writeFileSync(glideModulePath, glideModuleContent.trim());
      console.log(`INFO: Created MyAppGlideModule.java at ${glideModulePath}`);
      return config;
    },
  ]);
};