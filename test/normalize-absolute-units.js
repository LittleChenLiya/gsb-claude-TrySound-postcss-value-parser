const { describe, test } = require("node:test");
const { equal, deepEqual } = require("node:assert");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const parser = require("..");
const normalize = require("../lib/normalize-absolute-units");

const fixtureDir = join(__dirname, "fixtures", "normalize-absolute-units");

const fixtures = ["in", "cm", "em-and-url"];

function readFixture(name, suffix) {
  return readFileSync(join(fixtureDir, name + suffix), "utf8").trim();
}

// After re-parsing the normalized output, every node must reproduce exactly
// its own slice of the output, i.e. token boundaries have to stay intact.
function assertNodeBoundaries(output) {
  const parsed = parser(output);
  parsed.walk((node) => {
    equal(
      output.slice(node.sourceIndex, node.sourceEndIndex),
      parser.stringify(node),
      "node boundaries mismatch: " + JSON.stringify(node),
    );
  });
}

describe("normalizeAbsoluteUnits", () => {
  fixtures.forEach((name) => {
    test("fixture: " + name, () => {
      const input = readFixture(name, ".css");
      const expected = readFixture(name, ".expected.css");
      const output = normalize(input);

      equal(output, expected);
      assertNodeBoundaries(output);
    });
  });

  test("1in and 2.54cm normalize to the same px value", () => {
    equal(normalize("1in"), normalize("2.54cm"));
    equal(normalize("1in"), "96px");
  });

  test("converts standalone in nodes", () => {
    equal(normalize("2in"), "192px");
    equal(normalize("0.5in"), "48px");
  });

  test("converts standalone cm nodes", () => {
    equal(normalize("2.54cm"), "96px");
  });

  test("keeps existing px nodes untouched", () => {
    equal(normalize("16px"), "16px");
  });

  test("keeps relative units untouched", () => {
    equal(normalize("1em"), "1em");
    equal(normalize("1em 2rem 50%"), "1em 2rem 50%");
  });

  test("keeps strings and urls untouched", () => {
    equal(normalize('"1in"'), '"1in"');
    equal(normalize("'2.54cm'"), "'2.54cm'");
    equal(normalize("url(1in)"), "url(1in)");
    equal(normalize("1em url(1in)"), "1em url(1in)");
    equal(normalize('url("2.54cm.png")'), 'url("2.54cm.png")');
  });

  test("does not process calc() internals", () => {
    equal(normalize("calc(1in + 2px)"), "calc(1in + 2px)");
  });

  test("does not process custom property values", () => {
    equal(normalize("--width 1in"), "--width 1in");
  });

  test("reuses the value parser token structure", () => {
    const output = normalize("1in 2.54cm 1em");

    equal(output, "96px 96px 1em");

    deepEqual(
      parser(output).nodes.map((node) => node.type),
      ["word", "space", "word", "space", "word"],
    );
    assertNodeBoundaries(output);
  });
});
