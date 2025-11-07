const config = require('./config');

function info(...args) {
  console.log(...args);
}

function error(...args) {
  console.error(...args);
}

function verbose(...args) {
  if (config.logVerbose) {
    console.log(...args);
  }
}

module.exports = {
  info,
  error,
  verbose,
};
