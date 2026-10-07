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
 * Parse a CSS value and report read-only diagnostics for unclosed
 * strings and functions alongside the regular node tree.
 *
 * Diagnostics are ordered as they are detected; unclosed functions are
 * reported innermost first. The returned diagnostics array and each of
 * its entries are frozen.
 */
ValueParser.diagnose = function (value) {
  var diagnostics = [];
  var nodes = parse(value, diagnostics);
  diagnostics.forEach(function (diagnostic) {
    Object.freeze(diagnostic);
  });
  return {
    nodes: nodes,
    diagnostics: Object.freeze(diagnostics),
  };
};

module.exports = ValueParser;
