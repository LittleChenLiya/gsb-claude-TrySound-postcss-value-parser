var singleQuote = "'".charCodeAt(0);
var doubleQuote = '"'.charCodeAt(0);
var backslash = "\\".charCodeAt(0);
var tab = 0x09;
var del = 0x7f;
var space = 0x20;

function isHexDigit(code) {
  return (
    (code >= 0x30 && code <= 0x39) || // 0-9
    (code >= 0x41 && code <= 0x46) || // A-F
    (code >= 0x61 && code <= 0x66) // a-f
  );
}

function isWhitespace(code) {
  return (
    code === space ||
    code === tab ||
    code === 0x0a || // LF
    code === 0x0c || // FF
    code === 0x0d // CR
  );
}

/**
 * Escape a raw string value so it can be embedded in a CSS string token.
 *
 * Handles the string delimiter quote, backslashes, newlines and other
 * control characters with CSS escapes (never JSON escapes). Control
 * characters are emitted as hexadecimal escapes; a terminating whitespace
 * is appended after a hexadecimal escape when the next character is a hex
 * digit or whitespace, so the escape is not extended or swallowed.
 *
 * @param {string} value The raw (unescaped) string content
 * @param {string} [quote] The quote delimiting the string, `"` (default) or `'`
 * @returns {string} The escaped content, ready to be wrapped in quotes
 */
module.exports = function encode(value, quote) {
  var quoteCode = quote === "'" ? singleQuote : doubleQuote;
  var result = "";
  var i, code, next;

  for (i = 0; i < value.length; i += 1) {
    code = value.charCodeAt(i);

    if (code === backslash || code === quoteCode) {
      result += "\\" + value.charAt(i);
    } else if ((code < space && code !== tab) || code === del) {
      // Control characters (including LF/CR/FF) are not allowed literally
      // inside CSS strings; emit a hexadecimal escape instead.
      result += "\\" + code.toString(16);
      next = value.charCodeAt(i + 1);
      // A hexadecimal escape is terminated by a following hex digit or
      // would swallow a following whitespace; add a terminating space
      // (consumed by the tokenizer) to keep the value intact.
      if (isHexDigit(next) || isWhitespace(next)) {
        result += " ";
      }
    } else {
      result += value.charAt(i);
    }
  }

  return result;
};
