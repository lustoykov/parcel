const path = require('path');

const JSX_EXTENSIONS = {
  '.jsx': true,
  '.tsx': true
};

const JSX_PRAGMA = {
  react: 'React.createElement',
  preact: 'h',
  nervjs: 'Nerv.createElement',
  hyperapp: 'h'
};

function createJSXRegexFor(dependency) {
  // result looks like /from\s+[`"']react[`"']|require\([`"']react[`"']\)/
  return new RegExp(
    `from\\s+[\`"']${dependency}[\`"']|require\\([\`"']${dependency}[\`"']\\)`
  );
}

/**
 * Solves a use case where JSX is used in .js files or where
 * package.json is empty yet and pragma can not be determined based
 * on pkg.dependencies / pkg.devDependencies
 */
function maybeCreateFallbackPragma(asset) {
  for (const dep in JSX_PRAGMA) {
    if (asset.contents.match(createJSXRegexFor(dep))) {
      return JSX_PRAGMA[dep];
    }
  }
}

/**
 * Generates a babel config for JSX. Attempts to detect react or react-like libraries
 * and changes the pragma accordingly.
 */
async function getJSXConfig(asset, isSourceModule) {
  // Don't enable JSX in node_modules
  if (!isSourceModule) {
    return null;
  }

  let pkg = await asset.getPackage();

  // Find a dependency that we can map to a JSX pragma
  let pragma = null;
  for (let dep in JSX_PRAGMA) {
    if (
      pkg &&
      ((pkg.dependencies && pkg.dependencies[dep]) ||
        (pkg.devDependencies && pkg.devDependencies[dep]))
    ) {
      pragma = JSX_PRAGMA[dep];
      break;
    }
  }

  if (!pragma) {
    pragma = maybeCreateFallbackPragma(asset);
  }

  if (pragma || JSX_EXTENSIONS[path.extname(asset.name)]) {
    return {
      internal: true,
      babelVersion: 7,
      config: {
        plugins: [[require('@babel/plugin-transform-react-jsx'), {pragma}]]
      }
    };
  }
}

module.exports = getJSXConfig;
