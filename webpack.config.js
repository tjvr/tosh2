'use strict'
const webpack = require('webpack')
const path = require('path')

module.exports = {
  entry: [
    'babel-polyfill', // TODO remove this without requiring regenerator-runtime
    './index.js',
  ],
  output: {path: path.resolve(__dirname, 'build'), filename: 'tosh.bundle.js'},
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        query: {presets: [['es2015', {modules: false}]]},
      }
    ],
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin(),
    //new HtmlWebpackPlugin({template: './src/index.html'})
  ],
  devtool: 'source-map',
}

