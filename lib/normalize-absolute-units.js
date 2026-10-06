var parse = require("./parse");
var stringify = require("./stringify");
var unit = require("./unit");

// CSS reference pixel: 1in == 96px, 1cm == 96 / 2.54 px
// https://www.w3.org/TR/css-values-4/#absolute-lengths
var PX_PER_UNIT = {
  in: 96,
  cm: 96 / 2.54,
};

// Serialize a normalized px value without float noise
function formatPx(number) {
  var result = number.toFixed(6);

  if (result.indexOf(".") !== -1) {
    result = result.replace(/0+$/, "").replace(/\.$/, "");
  }

  return result;
}

// Normalize standalone in/cm word nodes to px.
// Strings, url()/function contents (including calc) and custom property
// values are left untouched: only root-level word nodes are converted.
module.exports = function normalizeAbsoluteUnits(value) {
  var nodes = parse(value);
  var insideCustomProperty = false;

  nodes.forEach(function (node) {
    if (node.type === "word" && node.value.slice(0, 2) === "--") {
      insideCustomProperty = true;
      return;
    }

    if (insideCustomProperty || node.type !== "word") {
      return;
    }

    var dimension = unit(node.value);
    var factor;

    if (
      dimension &&
      (factor = PX_PER_UNIT[dimension.unit.toLowerCase()]) !== undefined
    ) {
      node.value = formatPx(parseFloat(dimension.number) * factor) + "px";
    }
  });

  return stringify(nodes);
};
