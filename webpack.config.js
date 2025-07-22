const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/index.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'ai-data-visualization.min.js' : 'ai-data-visualization.js',
      library: 'AIDataVisualization',
      libraryTarget: 'umd',
      globalObject: 'this',
      clean: true
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    plugins: [
      ...(isProduction ? [] : [
        new HtmlWebpackPlugin({
          template: './examples/index.html',
          filename: 'index.html'
        })
      ])
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'examples')
      },
      port: 3000,
      open: true
    },
    optimization: {
      minimize: isProduction
    },
    externals: {
      'chart.js': {
        root: 'Chart',
        commonjs: 'chart.js',
        commonjs2: 'chart.js',
        amd: 'chart.js'
      }
    }
  };
}; 