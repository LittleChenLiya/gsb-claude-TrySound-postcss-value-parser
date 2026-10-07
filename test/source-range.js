const { describe, test } = require("node:test");
const { equal, deepEqual, ok } = require("node:assert");
const parser = require("..");

// Small in-memory fixture covering a comment, nested functions and an
// unclosed string (which also leaves both functions unclosed):
//   0         1         2
//   0123456789012345678901
//   1px /*c*/ fn(a, g("x)
const fixture = '1px /*c*/ fn(a, g("x)';

function collect(parsed) {
  const nodes = [];
  parsed.walk((node) => nodes.push(node));
  return nodes;
}

describe("sourceRange projection", () => {
  test("projects every node onto the exact original slice", () => {
    const parsed = parser(fixture, { sourceRange: true });
    const nodes = collect(parsed);
    ok(nodes.length > 0);
    for (const node of nodes) {
      const range = parsed.sourceOf(node);
      ok(range, `range for ${node.type}`);
      equal(range.invalid, false);
      equal(range.text, fixture.slice(range.start, range.end));
    }
  });

  test("locates comment, nested functions and unclosed string", () => {
    const parsed = parser(fixture, { sourceRange: true });
    const byType = {};
    parsed.walk((node) => {
      (byType[node.type] = byType[node.type] || []).push(node);
    });

    deepEqual(parsed.sourceOf(byType.word[0]), {
      start: 0,
      end: 3,
      text: "1px",
      invalid: false,
    });
    deepEqual(parsed.sourceOf(byType.comment[0]), {
      start: 4,
      end: 9,
      text: "/*c*/",
      invalid: false,
    });
    // nested functions, both unclosed because of the unclosed string
    deepEqual(parsed.sourceOf(byType.function[0]), {
      start: 10,
      end: 21,
      text: 'fn(a, g("x)',
      invalid: false,
    });
    deepEqual(parsed.sourceOf(byType.function[1]), {
      start: 16,
      end: 21,
      text: 'g("x)',
      invalid: false,
    });
    // unclosed string keeps its real extent, no phantom closing quote
    deepEqual(parsed.sourceOf(byType.string[0]), {
      start: 18,
      end: 21,
      text: '"x)',
      invalid: false,
    });
    // divider range covers its surrounding whitespace
    deepEqual(parsed.sourceOf(byType.div[0]), {
      start: 14,
      end: 16,
      text: ", ",
      invalid: false,
    });
  });

  test("locates unclosed comment at end of input", () => {
    const input = "1px /*c";
    const parsed = parser(input, { sourceRange: true });
    const comment = parsed.nodes[2];
    equal(comment.type, "comment");
    equal(comment.unclosed, true);
    deepEqual(parsed.sourceOf(comment), {
      start: 4,
      end: 7,
      text: "/*c",
      invalid: false,
    });
  });

  test("mutation invalidates only the affected ranges", () => {
    const input = "1px solid red";
    const parsed = parser(input, { sourceRange: true });
    const [one, , solid, , red] = parsed.nodes;

    solid.value = "dashed";

    // the modified node is flagged invalid instead of returning a stale slice
    deepEqual(parsed.sourceOf(solid), {
      start: 4,
      end: 9,
      text: null,
      invalid: true,
    });
    // siblings are unaffected and still locate their original text
    deepEqual(parsed.sourceOf(one), {
      start: 0,
      end: 3,
      text: "1px",
      invalid: false,
    });
    deepEqual(parsed.sourceOf(red), {
      start: 10,
      end: 13,
      text: "red",
      invalid: false,
    });
  });

  test("mutation of a child invalidates ancestors but not sibling subtrees", () => {
    const input = "fn(a, g(b))";
    const parsed = parser(input, { sourceRange: true });
    const fn = parsed.nodes[0];
    const a = fn.nodes[0];
    const g = fn.nodes[2];
    const b = g.nodes[0];

    b.value = "c";

    equal(parsed.sourceOf(b).invalid, true);
    equal(parsed.sourceOf(g).invalid, true);
    equal(parsed.sourceOf(fn).invalid, true);
    deepEqual(parsed.sourceOf(a), {
      start: 3,
      end: 4,
      text: "a",
      invalid: false,
    });
  });

  test("ranges do not drift after stringify normalization", () => {
    const input = "1px solid red";
    const parsed = parser(input, { sourceRange: true });
    const [one, , solid, , red] = parsed.nodes;

    solid.value = "dashed";
    // stringify the whole tree (output differs from the original input)
    equal(parsed.toString(), "1px dashed red");

    // untouched nodes keep their original anchors
    deepEqual(parsed.sourceOf(one), {
      start: 0,
      end: 3,
      text: "1px",
      invalid: false,
    });
    deepEqual(parsed.sourceOf(red), {
      start: 10,
      end: 13,
      text: "red",
      invalid: false,
    });
    equal(parsed.sourceOf(solid).invalid, true);
  });

  test("returns null for foreign nodes", () => {
    const parsed = parser("1px", { sourceRange: true });
    equal(parsed.sourceOf({ type: "word", value: "1px" }), null);
    equal(parsed.sourceOf(parser("1px").nodes[0]), null);
  });

  test("original interface is unchanged when the option is not enabled", () => {
    const input = " rgba( 34 , 45 , 54, .5 ) ";
    for (const parsed of [parser(input), parser(input, {})]) {
      equal(parsed.sourceOf, undefined);
      equal(parsed.toString(), input);
      let count = 0;
      parsed.walk(() => {
        count += 1;
      });
      ok(count > 0);
    }
  });

  test("demo: projection table for the fixture", () => {
    const parsed = parser(fixture, { sourceRange: true });
    console.log(`input: ${JSON.stringify(fixture)}`);
    parsed.walk((node) => {
      const r = parsed.sourceOf(node);
      console.log(
        `  ${node.type.padEnd(8)} [${String(r.start).padStart(2)}, ${String(r.end).padStart(2)}) invalid=${r.invalid} text=${JSON.stringify(r.text)}`,
      );
    });
    parsed.nodes[0].value = "2px";
    const r = parsed.sourceOf(parsed.nodes[0]);
    console.log(
      `  after word.value="2px": invalid=${r.invalid} text=${JSON.stringify(r.text)} (range [${r.start}, ${r.end}) kept)`,
    );
    ok(true);
  });
});
