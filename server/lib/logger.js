const config = require('./config');

function serialize(data) {
  try {
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  } catch (error) {
    return '[unserializable]';
  }
}

function info(...args) {
  console.log(...args.map(serialize));
}

function error(...args) {
  console.error(...args.map(serialize));
}

function verbose(...args) {
  if (config.logVerbose) {
    console.log(...args.map(serialize));
  }
}

module.exports = {
  info,
  error,
  verbose,
};
