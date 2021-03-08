const documentationGenerator = require('./documentation-generator');
const documentationProvidersPlugin = require('./documentation-providers');
const sourceCodeProviderPlugin = require('./source-code-provider');
const typeDocJsonProviderPlugin = require('./typedoc-json-provider');

function SkyUXPlugin() {

  const preload = (content, resourcePath, config) => {
    let modified = content.toString();

    switch (config.runtime.command) {
      case 'serve':
      case 'build':
        modified = sourceCodeProviderPlugin.preload(modified, resourcePath);
        modified = typeDocJsonProviderPlugin.preload(modified, resourcePath);
        modified = documentationProvidersPlugin.preload(modified, resourcePath);
        break;
      default:
        break;
    }

    return Buffer.from(modified, 'utf8');
  };

  const runCommand = async (command) => {
    switch (command) {
      case 'serve':
      case 'build':
        await documentationGenerator.generateDocumentationFiles();
        break;
      default:
        break;
    }
  };

  return Object.freeze({
    preload,
    runCommand
  });
}

module.exports = {
  SkyUXPlugin
};
