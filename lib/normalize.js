var parse = require("./parse");
var walk = require("./walk");
var stringify = require("./stringify");
var unit = require("./unit");

// Absolute length units normalized to pixels
// https://www.w3.org/TR/css-values-4/#absolute-lengths
var absoluteLengths = {
  px: 1,
  in: 96,
  cm: 96 / 2.54,
};

// Functions whose internals must be left untouched
var ignoredFunctions = {
  calc: true,
  url: true,
};

// A custom property declaration (e.g. `--foo: 1in`) is preserved as-is
function isCustomProperty(nodes) {
  var dash = "-".charCodeAt(0);
  for (var i = 0; i < nodes.length; i += 1) {
    var node = nodes[i];
    if (node.type === "space") {
      continue;
    }
    return (
      node.type === "word" &&
      node.value.charCodeAt(0) === dash &&
      node.value.charCodeAt(1) === dash
    );
  }
  return false;
}

module.exports = function normalize(value) {
  var nodes = parse(value);

  if (isCustomProperty(nodes)) {
    return stringify(nodes);
  }

  walk(nodes, function (node) {
    if (node.type === "function") {
      if (ignoredFunctions[node.value]) {
        return false;
      }
      return;
    }

    if (node.type !== "word") {
      return;
    }

    var dimension = unit(node.value);

    if (!dimension) {
      return;
    }

    var factor = absoluteLengths[dimension.unit];

    if (factor === undefined) {
      return;
    }

    node.value = String(Number(dimension.number) * factor) + "px";
  });

  return stringify(nodes);
};
