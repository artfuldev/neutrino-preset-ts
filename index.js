const htmlLoader = require('neutrino-middleware-html-loader');
const styleLoader = require('neutrino-middleware-style-loader');
const fontLoader = require('neutrino-middleware-font-loader');
const imageLoader = require('neutrino-middleware-image-loader');
const tsLoader = require('neutrino-middleware-ts-loader');
const env = require('neutrino-middleware-env');
const htmlTemplate = require('neutrino-middleware-html-template');
const chunk = require('neutrino-middleware-chunk');
const hot = require('neutrino-middleware-hot');
const copy = require('neutrino-middleware-copy');
const clean = require('neutrino-middleware-clean');
const minify = require('neutrino-middleware-minify');
const loaderMerge = require('neutrino-middleware-loader-merge');
const namedModules = require('neutrino-middleware-named-modules');
const { join, dirname } = require('path');
const { path, pathOr } = require('ramda');

const MODULES = join(__dirname, 'node_modules');

function devServer({ config }, options) {
  config.devServer
    .host(options.host)
    .port(parseInt(options.port, 10))
    .https(options.https)
    .contentBase(options.contentBase)
    .historyApiFallback(true)
    .hot(true)
    .publicPath('/')
    .stats({
      assets: false,
      children: false,
      chunks: false,
      colors: true,
      errors: true,
      errorDetails: true,
      hash: false,
      modules: false,
      publicPath: false,
      timings: false,
      version: false,
      warnings: true
    });
}

module.exports = (neutrino) => {
  const defaultEntry = join(neutrino.options.source, 'index.js');
  const defaultTsEntry = join(neutrino.options.source, 'index.ts');
  neutrino.use(env);
  neutrino.use(htmlLoader);
  neutrino.use(styleLoader);
  neutrino.use(fontLoader);
  neutrino.use(imageLoader);
  neutrino.use(htmlTemplate, neutrino.options.html);
  neutrino.use(namedModules);
  neutrino.use(tsLoader);
  neutrino.config
    .when(process.env.NODE_ENV !== 'test', () => neutrino.use(chunk))
    .target('web')
    .context(neutrino.options.root)
    .entry('index')
      .add(neutrino.options.entry === defaultEntry ? defaultTsEntry : neutrino.options.entry)
      .end()
    .output
      .path(neutrino.options.output)
      .publicPath('./')
      .filename('[name].bundle.js')
      .chunkFilename('[id].[chunkhash].js')
      .end()
    .resolve
      .modules
        .add('node_modules')
        .add(neutrino.options.node_modules)
        .add(MODULES)
        .end()
      .extensions
        .add('.js')
        .add('.json')
        .end()
      .end()
    .resolveLoader
      .modules
        .add(neutrino.options.node_modules)
        .add(MODULES)
        .end()
      .end()
    .node
      .set('console', false)
      .set('global', true)
      .set('process', true)
      .set('Buffer', true)
      .set('__filename', 'mock')
      .set('__dirname', 'mock')
      .set('setImmediate', true)
      .set('fs', 'empty')
      .set('tls', 'empty')
      .end()
    .when(process.env.NODE_ENV === 'development', config => {
      const protocol = process.env.HTTPS ? 'https' : 'http';
      const host = process.env.HOST || pathOr('localhost', ['options', 'config', 'devServer', 'host'], neutrino);
      const port = process.env.PORT || pathOr(5000, ['options', 'config', 'devServer', 'port'], neutrino);
      neutrino.use(hot);
      neutrino.use(devServer, {
        host,
        port,
        https: pathOr(protocol === 'https', ['options', 'config', 'devServer', 'https'], neutrino),
        contentBase: neutrino.options.source
      });
      config
        .devtool('inline-source-map')
        .entry('index')
          .prepend(`webpack-dev-server/client?${protocol}://${host}:${port}/`)
          .end();
    }, config => {
      neutrino.use(clean, { paths: [neutrino.options.output] });
      neutrino.use(minify);
      neutrino.use(copy, {
        patterns: [{ context: neutrino.options.source, from: '**/*' }],
        options: { ignore: ['*.js*', '*.ts*'] }
      });
      config.output.filename('[name].[chunkhash].bundle.js');
    });
};
