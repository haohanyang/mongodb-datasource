import type { Configuration } from "webpack";
import { merge } from "webpack-merge";
import grafanaConfig from "./.config/webpack/webpack.config";

const config = async (env): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  return merge(baseConfig, {
    resolve: {
      fallback: { 
        "crypto": require.resolve("crypto-browserify"),
        "buffer": require.resolve("buffer/"),
        "stream": require.resolve("stream-browserify"),
        "vm": require.resolve("vm-browserify") 
      }
    }
  });
};

export default config;
