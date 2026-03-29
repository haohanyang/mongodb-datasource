# Sign the Plugin

By default, the plugin is not signed. You need to set the environment variable `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS: haohanyang-mongodb-datasource` to be able to run the plugin.

To sign the plugin, check the official doc [Sign a private plugin](https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin#sign-a-private-plugin). You set the token `GRAFANA_ACCESS_POLICY_TOKEN` obtained from Grafana Cloud in the environment and run the following command to generate a `MANIFEST.txt` file in the plugin directory.

```
npx --yes @grafana/sign-plugin \
    --distDir mongodb-datasource \
    --rootUrls <grafana-server-root-urls>
```

You need to restart the Grafana server afterwards.