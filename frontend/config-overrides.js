// config-overrides.js

module.exports = function override(config, env) {
  // Найдите правило, использующее source-map-loader
  config.module.rules.forEach(rule => {
    if (rule.use && Array.isArray(rule.use)) {
      rule.use.forEach(useItem => {
        if (useItem.loader === 'source-map-loader') {
          // Исключите из обработки source-map-loader пакет antd
          if (!rule.exclude) {
            rule.exclude = /node_modules\/antd/;
          } else {
            rule.exclude = new RegExp(`${rule.exclude.source}|node_modules/antd`);
          }
        }
      });
    }
  });

  return config;
};
