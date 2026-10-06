var singleQuote = "'".charCodeAt(0);
var doubleQuote = '"'.charCodeAt(0);
var backslash = "\\".charCodeAt(0);
var space = " ".charCodeAt(0);
var tab = "\t".charCodeAt(0);
var del = 0x7f;

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
 * Follows CSS escaping rules (never JSON escapes): the delimiting quote and
 * backslashes are backslash-escaped, while newlines and other control
 * characters are emitted as hexadecimal escapes. A terminating whitespace is
 * appended after a hexadecimal escape when the next character is a hex digit
 * or whitespace, so the escape is neither extended nor swallowed and the
 * re-lexed value stays identical.
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
      // Control characters (including LF/CR/FF) cannot appear literally
      // inside a CSS string; emit a hexadecimal escape instead.
      result += "\\" + code.toString(16);
      next = value.charCodeAt(i + 1);
      // A hexadecimal escape is extended by a following hex digit or
      // swallowed by a following whitespace; add a terminating space
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
