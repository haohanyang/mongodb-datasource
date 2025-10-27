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
    entry: './src/editor/index.jsx',
    resolve: {
      extensions: ['.js', '.ts', '.tsx', '.jsx'],
      alias: {
        'react-use/lib/useClickAway': require.resolve('react-use/lib/useClickAway'),
        'rc-picker/lib/locale/en_US': require.resolve('rc-picker/lib/locale/en_US'),
        'rc-picker/lib/generate/moment': require.resolve('rc-picker/lib/generate/moment'),
        'ol/format/WKT': require.resolve('ol/format/WKT'),
        'ol/geom': require.resolve('ol/geom'),
        'react-use/lib/useMeasure': require.resolve('react-use/lib/useMeasure'),
        'react-use/lib/usePrevious': require.resolve('react-use/lib/usePrevious'),
      },
    },
    output: {
      globalObject: 'self',
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, 'dist-editor'),
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx|tsx|ts)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: require.resolve('babel-loader'),
              options: {
                presets: ['@babel/preset-env', '@babel/preset-typescript', '@babel/preset-react'],
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist-editor'),
      },
      compress: true,
      port: 8001,
      open: false,
    },
    plugins: [
      new HtmlWebPackPlugin({
        template: './src/editor/index.html',
      }),
    ],
  };
};

export default [pluginConfig, editorConfig];
