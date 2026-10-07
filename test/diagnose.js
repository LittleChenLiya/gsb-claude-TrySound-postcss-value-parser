const { describe, test } = require("node:test");
const { equal, deepEqual, throws } = require("node:assert");
const parser = require("..");

describe("diagnose", () => {
  test("closed values report no diagnostics and keep the regular tree", () => {
    const inputs = [
      "rgba( 34 , 45 , 54, .5 )",
      '"double" \'single\' fn( nested( 1px ) )',
      "url(foo.png)",
    ];

    inputs.forEach((input) => {
      const result = parser.diagnose(input);
      deepEqual(result.diagnostics, []);
      deepEqual(result.nodes, parser(input).nodes);
      equal(parser.stringify(result.nodes), input);
    });
  });

  test("escaped quotes do not produce false positives", () => {
    const inputs = [
      String.raw`"a\"b"`,
      String.raw`'it\'s'`,
      String.raw`"\\"`,
      String.raw`'st\'2'`,
    ];

    inputs.forEach((input) => {
      const result = parser.diagnose(input);
      deepEqual(result.diagnostics, [], JSON.stringify(input));
      equal(parser.stringify(result.nodes), input);
    });
  });

  test("unclosed string reports the offset of its opening quote", () => {
    const input = 'word "unclosed';
    const result = parser.diagnose(input);

    deepEqual(result.diagnostics, [
      { type: "unclosed-string", sourceIndex: 5 },
    ]);
    equal(result.nodes[2].type, "string");
    equal(result.nodes[2].unclosed, true);
    equal(parser.stringify(result.nodes), input);
  });

  test("escaped quote before EOF still counts as unclosed", () => {
    const input = String.raw`"a\"b`;
    const result = parser.diagnose(input);

    deepEqual(result.diagnostics, [
      { type: "unclosed-string", sourceIndex: 0 },
    ]);
    equal(parser.stringify(result.nodes), input);
  });

  test("two nested unclosed functions are located innermost first", () => {
    const input = "fn1( fn2(";
    const result = parser.diagnose(input);

    deepEqual(result.diagnostics, [
      { type: "unclosed-function", sourceIndex: 5 },
      { type: "unclosed-function", sourceIndex: 0 },
    ]);
    equal(result.nodes[0].unclosed, true);
    equal(result.nodes[0].nodes[0].unclosed, true);
    equal(parser.stringify(result.nodes), input);
  });

  test("unclosed url function is reported as an unclosed function", () => {
    const input = "url(foo.png";
    const result = parser.diagnose(input);

    deepEqual(result.diagnostics, [
      { type: "unclosed-function", sourceIndex: 0 },
    ]);
    equal(parser.stringify(result.nodes), input);
  });

  test("empty input yields an empty tree and no diagnostics", () => {
    const result = parser.diagnose("");

    deepEqual(result.nodes, []);
    deepEqual(result.diagnostics, []);
    equal(parser.stringify(result.nodes), "");
  });

  test("diagnostics are read-only", () => {
    const result = parser.diagnose("fn(");

    equal(Object.isFrozen(result.diagnostics), true);
    equal(Object.isFrozen(result.diagnostics[0]), true);
    throws(() => {
      "use strict";
      result.diagnostics.push({ type: "unclosed-string", sourceIndex: 0 });
    }, TypeError);
  });

  test("regression: original parse interface stays compatible", () => {
    const input = "fn1( fn2( \"str";
    const parsed = parser(input);

    equal(Array.isArray(parsed.nodes), true);
    equal(parsed.nodes[0].type, "function");
    equal(parsed.nodes[0].unclosed, true);
    equal(parsed.toString(), input);

    const walked = [];
    parsed.walk((node) => {
      walked.push(node.type);
    });
    deepEqual(walked, ["function", "function", "string"]);

    const result = parser.diagnose(input);
    deepEqual(result.nodes, parsed.nodes);
    deepEqual(result.diagnostics, [
      { type: "unclosed-string", sourceIndex: 10 },
      { type: "unclosed-function", sourceIndex: 5 },
      { type: "unclosed-function", sourceIndex: 0 },
    ]);
  });
});
