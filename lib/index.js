var parse = require("./parse");
var walk = require("./walk");
var stringify = require("./stringify");

function ValueParser(value, options) {
  if (this instanceof ValueParser) {
    this.nodes = parse(value);
    // Source projection is opt-in. When enabled the parsed instance keeps a
    // reference to the original CSS value so node ranges can be projected back
    // onto the untouched source (see #range() and #slice()). When the option
    // is absent the instance keeps its original shape.
    if (options && options.source === true) {
      this.source = String(value);
    }
    return this;
  }
  return new ValueParser(value, options);
}

ValueParser.prototype.toString = function () {
  return Array.isArray(this.nodes) ? stringify(this.nodes) : "";
};

ValueParser.prototype.walk = function (cb, bubble) {
  walk(this.nodes, cb, bubble);
  return this;
};

/**
 * Project a parsed node back onto its range in the original source value.
 *
 * The range is always reported against the string passed to the parser, so it
 * never drifts the way stringified output can (e.g. normalized whitespace or
 * re-added delimiters). If the node (or one of its descendants) has been
 * modified since parsing, the range is marked invalid instead of returning a
 * slice of source text that no longer represents the node.
 *
 * Requires parsing with the `{ source: true }` option.
 *
 * @param {object} node A node reachable from `parsed.nodes`
 * @returns {{sourceIndex: number, sourceEndIndex: number, valid: boolean,
 * value: (string|null), currentValue: (string|undefined)}}
 */
ValueParser.prototype.range = function (node) {
  if (typeof this.source !== "string") {
    throw new Error(
      "Source projection is not enabled. Parse with valueParser(value, { source: true }).",
    );
  }

  var sourceIndex = node.sourceIndex;
  var sourceEndIndex = node.sourceEndIndex;
  var original = this.source.slice(sourceIndex, sourceEndIndex);
  var current = stringify(node);

  if (current === original) {
    return {
      sourceIndex: sourceIndex,
      sourceEndIndex: sourceEndIndex,
      valid: true,
      value: original,
    };
  }

  return {
    sourceIndex: sourceIndex,
    sourceEndIndex: sourceEndIndex,
    valid: false,
    value: null,
    currentValue: current,
  };
};

/**
 * Return the slice of the original source value covered by the node, or `null`
 * when the node has been modified (and its recorded range is stale).
 *
 * Requires parsing with the `{ source: true }` option.
 *
 * @param {object} node A node reachable from `parsed.nodes`
 * @returns {string|null}
 */
ValueParser.prototype.slice = function (node) {
  var range = this.range(node);
  return range.value;
};

ValueParser.unit = require("./unit");

ValueParser.walk = walk;

ValueParser.stringify = stringify;

module.exports = ValueParser;
