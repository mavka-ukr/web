import Mavka from "mavka";

function buildGlobalContext(mavka) {
  return new mavka.Context(mavka, null, {
    "global": mavka.toCell(window)
  });
}

function buildLoader(mavka) {
  return null;
}

function buildExternal(mavka) {
  return {};
}

export function createMavkaWeb(options = {}) {
  return new Mavka({
    buildGlobalContext,
    buildLoader,
    buildExternal
  });
}
