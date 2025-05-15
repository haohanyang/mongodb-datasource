import type { Configuration, Compiler } from 'webpack';
import { merge } from 'webpack-merge';
import grafanaConfig from './.config/webpack/webpack.config';
import { generateCompletionData } from './scripts/completions';

const config = async (env: any): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  return merge(baseConfig, {
    plugins: [
      {
        apply(compiler: Compiler) {
          compiler.hooks.beforeCompile.tapPromise('GenerateCompletionData', () => generateCompletionData());
        },
      },
    ],
  });
};

export default config;
