var parse = require("./parse");
var walk = require("./walk");
var stringify = require("./stringify");

function ValueParser(value, options) {
  if (this instanceof ValueParser) {
    this.nodes = parse(value);
    if (options && options.sourceRange) {
      enableSourceRange(this, value);
    }
    return this;
  }
  return new ValueParser(value, options);
}

// Local source-text projection: anchors every node to the exact slice of the
// original input it was parsed from. Slices are captured once at parse time,
// so later stringify() normalization cannot shift them. A range is reported
// as invalid (instead of returning a stale slice) once the node or one of
// its descendants has been mutated, which is detected by comparing the
// node's current serialization against the captured slice.
function enableSourceRange(parsed, source) {
  var ranges = new WeakMap();
  walk(parsed.nodes, function (node) {
    var start = node.sourceIndex;
    // parse() may grow its internal buffer past the input length while
    // recovering unclosed strings/urls/functions; clamp to the real input.
    var end = Math.min(node.sourceEndIndex, source.length);
    ranges.set(node, {
      start: start,
      end: end,
      text: source.slice(start, end),
    });
  });
  parsed.sourceOf = function (node) {
    var range = ranges.get(node);
    if (!range) {
      return null;
    }
    if (stringify(node) !== range.text) {
      return { start: range.start, end: range.end, text: null, invalid: true };
    }
    return { start: range.start, end: range.end, text: range.text, invalid: false };
  };
}

ValueParser.prototype.toString = function () {
  return Array.isArray(this.nodes) ? stringify(this.nodes) : "";
};

ValueParser.prototype.walk = function (cb, bubble) {
  walk(this.nodes, cb, bubble);
  return this;
};

ValueParser.unit = require("./unit");

ValueParser.walk = walk;

ValueParser.stringify = stringify;

module.exports = ValueParser;
