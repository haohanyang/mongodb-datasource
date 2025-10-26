import path from 'path';
import type { Configuration, Compiler } from 'webpack';
import { merge } from 'webpack-merge';
import grafanaConfig from './.config/webpack/webpack.config';
import HtmlWebPackPlugin from 'html-webpack-plugin';

const pluginConfig = async (env: any): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  return merge(baseConfig, {
    name: 'plugin',
  });
};

const editorConfig = (env: any): Configuration => {
  return {
    name: 'editor',
    mode: 'development',
    devtool: 'source-map',
    target: 'web',
    entry: {
      app: './src/editor/index.js',
      'editor.worker': 'monaco-editor/esm/vs/editor/editor.worker.js',
      'json.worker': 'monaco-editor/esm/vs/language/json/json.worker',
      'ts.worker': 'monaco-editor/esm/vs/language/typescript/ts.worker',
    },
    resolve: {
      extensions: ['.js', '.ts'],
    },
    output: {
      globalObject: 'self',
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, 'dist-editor'),
    },
    module: {
      rules: [
        {
          test: /\.ts?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.ttf$/,
          use: ['file-loader'],
        },
      ],
    },
    plugins: [
      new HtmlWebPackPlugin({
        title: 'Query Editor',
      }),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist-editor'),
      },
      compress: true,
      port: 8001,
      open: false,
    },
  };
};

export default [pluginConfig, editorConfig];
