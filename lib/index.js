var parse = require("./parse");
var walk = require("./walk");
var stringify = require("./stringify");

function ValueParser(value) {
  if (this instanceof ValueParser) {
    this.nodes = parse(value);
    return this;
  }
  return new ValueParser(value);
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

/**
 * Parse a CSS value and report unclosed strings and functions.
 *
 * Returns the same node tree as `parse` together with a read-only
 * list of diagnostics pointing at the start offset of every unclosed
 * string or function (innermost function first).
 */
ValueParser.diagnose = function (value) {
  var diagnostics = [];
  var nodes = parse(value, diagnostics);
  return { nodes: nodes, diagnostics: Object.freeze(diagnostics) };
};

module.exports = ValueParser;
