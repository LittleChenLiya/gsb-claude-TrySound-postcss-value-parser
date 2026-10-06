const { describe, test } = require("node:test");
const { equal, deepEqual } = require("node:assert");
const parser = require("..");
const stringify = require("../lib/stringify");

// Three input examples covering the accepted fixtures
const examples = [
  {
    message: "absolute length nodes (in, cm, px) are normalized to px",
    fixture: "1in 2.54cm 1cm 0.5in 2px",
    expected: "96px 96px 37.79527559055118px 48px 2px",
  },
  {
    message: "relative length nodes are preserved",
    fixture: "1em 1rem 1ex 1ch 100%",
    expected: "1em 1rem 1ex 1ch 100%",
  },
  {
    message: "strings, urls and calc() are preserved",
    fixture: 'url(1in) url("2cm") "1in" \'1cm\' calc(1in + 2cm)',
    expected: 'url(1in) url("2cm") "1in" \'1cm\' calc(1in + 2cm)',
  },
];

// Every re-parsed node must cover exactly its source slice
function assertBoundaries(nodes, text) {
  for (const node of nodes) {
    equal(
      text.slice(node.sourceIndex, node.sourceEndIndex),
      stringify(node),
      `boundary mismatch for ${node.type} node in ${JSON.stringify(text)}`,
    );

    if (Array.isArray(node.nodes)) {
      assertBoundaries(node.nodes, text);
    }
  }
}

describe("normalize", () => {
  examples.forEach((item) => {
    test(item.message, () => {
      equal(parser.normalize(item.fixture), item.expected);
    });
  });

  test("1in and 2.54cm normalize to the same px value", () => {
    const fromIn = parser(parser.normalize("1in")).nodes;
    const fromCm = parser(parser.normalize("2.54cm")).nodes;

    deepEqual(fromIn, [
      { type: "word", sourceIndex: 0, sourceEndIndex: 4, value: "96px" },
    ]);
    deepEqual(fromCm, [
      { type: "word", sourceIndex: 0, sourceEndIndex: 4, value: "96px" },
    ]);
    equal(fromIn[0].value, fromCm[0].value);
  });

  test("1em and 1in inside url() are unchanged", () => {
    equal(parser.normalize("1em"), "1em");
    equal(parser.normalize("url(1in)"), "url(1in)");
  });

  test("calc() internals are not processed", () => {
    equal(parser.normalize("calc(1in + 2cm)"), "calc(1in + 2cm)");
  });

  test("custom property internals are not processed", () => {
    equal(parser.normalize("--foo: 1in"), "--foo: 1in");
    equal(parser.normalize("  --foo: 1in"), "  --foo: 1in");
  });

  test("strings are not processed", () => {
    equal(parser.normalize('"1in"'), '"1in"');
    equal(parser.normalize("'1cm'"), "'1cm'");
  });

  test("re-parsed output has correct node boundaries", () => {
    examples.forEach((item) => {
      const output = parser.normalize(item.fixture);
      assertBoundaries(parser(output).nodes, output);
    });
  });
});
