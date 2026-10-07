const { describe, test } = require("node:test");
const { deepEqual, equal, ok } = require("node:assert");
const parse = require("../lib/parse");
const ValueParser = require("../lib/index");

describe("diagnose", () => {
  test("closed value produces no diagnostics and the original tree", () => {
    const fixture = 'rgba( 12, "a\\"b", 50% )';
    const result = ValueParser.diagnose(fixture);
    deepEqual(result.diagnostics, []);
    deepEqual(result.nodes, parse(fixture));
    equal(ValueParser.stringify(result.nodes), fixture);
  });

  test("escaped quotes do not report false positives", () => {
    for (const fixture of ['"a\\"b"', "'it\\'s'", '"\\\\" ok']) {
      const result = ValueParser.diagnose(fixture);
      deepEqual(result.diagnostics, [], fixture);
      equal(ValueParser.stringify(result.nodes), fixture);
    }
  });

  test("unclosed string reports the offset of its opening quote", () => {
    const result = ValueParser.diagnose('1px solid "red');
    deepEqual(result.diagnostics, [{ type: "unclosed-string", offset: 10 }]);
    deepEqual(result.nodes, parse('1px solid "red'));
    equal(ValueParser.stringify(result.nodes), '1px solid "red');
  });

  test("escaped quote before the end still counts as unclosed", () => {
    const result = ValueParser.diagnose('"a\\"');
    deepEqual(result.diagnostics, [{ type: "unclosed-string", offset: 0 }]);
  });

  test("nested unclosed functions report the innermost first", () => {
    const fixture = "foo(bar(";
    const result = ValueParser.diagnose(fixture);
    deepEqual(result.diagnostics, [
      { type: "unclosed-function", offset: 4 },
      { type: "unclosed-function", offset: 0 },
    ]);
    deepEqual(result.nodes, parse(fixture));
    equal(ValueParser.stringify(result.nodes), fixture);
  });

  test("unclosed url function reports its start offset", () => {
    const result = ValueParser.diagnose("url(foo");
    deepEqual(result.diagnostics, [{ type: "unclosed-function", offset: 0 }]);
    equal(ValueParser.stringify(result.nodes), "url(foo");
  });

  test("empty input produces an empty tree and no diagnostics", () => {
    const result = ValueParser.diagnose("");
    deepEqual(result.nodes, []);
    deepEqual(result.diagnostics, []);
  });

  test("diagnostics are read-only", () => {
    const result = ValueParser.diagnose("foo(");
    ok(Object.isFrozen(result.diagnostics));
    ok(Object.isFrozen(result.diagnostics[0]));
  });

  test("original interface stays compatible (regression)", () => {
    const fixture = 'foo(bar( "baz';
    // parse() still returns the bare node array
    const nodes = parse(fixture);
    ok(Array.isArray(nodes));
    // ValueParser() wraps the same tree and stringifies back
    const parsed = ValueParser(fixture);
    deepEqual(parsed.nodes, nodes);
    equal(parsed.toString(), fixture);
    // diagnose() exposes the very same tree shape
    deepEqual(ValueParser.diagnose(fixture).nodes, nodes);
  });
});
