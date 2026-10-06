const { describe, test } = require("node:test");
const { equal } = require("node:assert");
const parser = require("..");
const parse = require("../lib/parse");
const stringify = require("../lib/stringify");
const encode = require("../lib/encode");

// Interpret the CSS escapes contained in a parsed string value, mirroring
// the CSS tokenizer: hexadecimal escapes (up to six digits, optionally
// terminated by one whitespace), line continuations and escaped characters.
function cssUnescape(value) {
  let result = "";
  for (let i = 0; i < value.length; i += 1) {
    if (value.charAt(i) !== "\\") {
      result += value.charAt(i);
      continue;
    }
    i += 1;
    if (i >= value.length) {
      break;
    }
    const char = value.charAt(i);
    if (/^[0-9a-fA-F]$/.test(char)) {
      let hex = "";
      while (
        i < value.length &&
        hex.length < 6 &&
        /^[0-9a-fA-F]$/.test(value.charAt(i))
      ) {
        hex += value.charAt(i);
        i += 1;
      }
      // A single whitespace terminator is consumed by the escape
      if (value.charAt(i) === "\r" && value.charAt(i + 1) === "\n") {
        i += 1;
      } else if (/^[ \t\n\f\r]$/.test(value.charAt(i))) {
        // consumed
      } else {
        i -= 1;
      }
      result += String.fromCodePoint(parseInt(hex, 16));
    } else if (char === "\n" || char === "\f") {
      // Line continuation: the escaped newline disappears
    } else if (char === "\r") {
      if (value.charAt(i + 1) === "\n") {
        i += 1;
      }
    } else {
      result += char;
    }
  }
  return result;
}

// Re-lex the serialized output and return the CSS-interpreted value of the
// first string token.
function relexedStringValue(output) {
  const nodes = parse(output);
  const stringNode = nodes.find((node) => node.type === "string");
  return cssUnescape(stringNode.value);
}

describe("encode", () => {
  test("exposes the CSS string encoder", () => {
    equal(parser.encode, encode);
  });

  test("escapes the delimiting quote with a CSS escape, not JSON", () => {
    const raw = `say "hi" and 'bye'`;
    equal(encode(raw, '"'), `say \\"hi\\" and 'bye'`);
    equal(encode(`it's "fine"`, "'"), `it\\'s "fine"`);

    const output = stringify({
      type: "string",
      quote: '"',
      value: raw,
      encode: true,
    });
    equal(output, `"say \\"hi\\" and 'bye'"`);
    equal(relexedStringValue(output), raw);
  });

  test("escapes LF as a hexadecimal escape", () => {
    const raw = "line1\nline2";
    equal(encode(raw, '"'), "line1\\aline2");

    const output = stringify({
      type: "string",
      quote: '"',
      value: raw,
      encode: true,
    });
    equal(output, '"line1\\aline2"');
    equal(relexedStringValue(output), raw);
  });

  test("terminates a hex escape before a following digit", () => {
    const raw = "\n2";
    equal(encode(raw, '"'), "\\a 2");
    equal(encode("\u0001" + "2", '"'), "\\1 2");
    equal(encode("\u0001" + "b", '"'), "\\1 b");

    const output = stringify({
      type: "string",
      quote: '"',
      value: raw,
      encode: true,
    });
    equal(output, '"\\a 2"');
    equal(relexedStringValue(output), raw);
  });

  test("round-trips a selected string node through walk and toString", () => {
    const raw = `say "hi"\n2`;
    const parsed = parser(`10px url(a.png) "old"`);
    parsed.walk((node) => {
      if (node.type === "string") {
        node.value = raw;
        node.encode = true;
      }
    });
    const output = parsed.toString();
    equal(output, `10px url(a.png) "say \\"hi\\"\\a 2"`);
    equal(relexedStringValue(output), raw);
  });

  test("keeps unselected word and url nodes unchanged", () => {
    const fixture = `10px url(a b.png) "old"`;
    const parsed = parser(fixture);
    parsed.walk((node) => {
      if (node.type === "string") {
        node.value = "new\nvalue";
        node.encode = true;
      }
    });
    equal(parsed.toString(), `10px url(a b.png) "new\\avalue"`);
  });

  test("keeps unselected string nodes verbatim", () => {
    const fixture = `"already \\"escaped\\"" 'plain'`;
    equal(stringify(parse(fixture)), fixture);
  });
});
