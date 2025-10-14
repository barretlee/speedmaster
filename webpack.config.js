import path from 'path';
import { fileURLToPath } from 'url';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const entries = {
  background: './extension/background.js',
  'content/app': './extension/content/app.js',
  'content/main': './extension/content/main.js',
  'content/controller': './extension/content/controller.js',
  'content/media': './extension/content/media.js',
  'content/constants': './extension/content/constants.js',
  'popup/popup': './extension/popup/popup.js',
  'options/options': './extension/options/options.js'
};

export default (env, argv) => {
  const mode = argv.mode || 'production';
  return {
    mode,
    entry: entries,
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [[
                '@babel/preset-env',
                { targets: { chrome: '100' }, modules: false }
              ]]
            }
          }
        }
      ]
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: 'extension/manifest.json', to: '.' },
          { from: 'extension/assets', to: 'assets' },
          { from: 'extension/content/controller.css', to: 'content/controller.css' },
          { from: 'extension/popup/index.html', to: 'popup/index.html' },
          { from: 'extension/popup/popup.css', to: 'popup/popup.css' },
          { from: 'extension/options/index.html', to: 'options/index.html' },
          { from: 'extension/options/options.css', to: 'options/options.css' }
        ]
      })
    ],
    resolve: {
      extensions: ['.js']
    },
    devtool: mode === 'production' ? false : 'source-map',
    watch: Boolean(argv.watch)
  };
};
