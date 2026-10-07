const { describe, test } = require("node:test");
const { equal, deepEqual, throws, ok } = require("node:assert");
const parser = require("..");

function collect(nodes, out = []) {
  for (const node of nodes) {
    out.push(node);
    if (Array.isArray(node.nodes)) collect(node.nodes, out);
  }
  return out;
}

describe("source projection ({ source: true })", () => {
  // Short value containing a comment, nested functions and an unclosed string.
  const source = '/* note */ calc(1px * 2), url(/x.png) "unclosed';

  test("projects every node (comments, nested functions, unclosed string) onto the original source", () => {
    const parsed = parser(source, { source: true });
    equal(parsed.source, source);

    for (const node of collect(parsed.nodes)) {
      const range = parsed.range(node);
      equal(
        range.valid,
        true,
        `fresh node ${node.type} ${JSON.stringify(node.value)} should be valid`,
      );
      equal(
        range.value,
        source.slice(node.sourceIndex, node.sourceEndIndex),
        "range value must be the untouched source slice",
      );
      equal(parsed.slice(node), range.value);
    }

    // Explicit spot checks required for acceptance.
    const comment = parsed.nodes[0];
    equal(comment.type, "comment");
    deepEqual(parsed.range(comment), {
      sourceIndex: 0,
      sourceEndIndex: 10,
      valid: true,
      value: "/* note */",
    });

    const calc = parsed.nodes[2];
    equal(calc.type, "function");
    equal(calc.value, "calc");
    deepEqual(parsed.range(calc), {
      sourceIndex: 11,
      sourceEndIndex: 24,
      valid: true,
      value: "calc(1px * 2)",
    });

    const star = calc.nodes[2];
    equal(star.value, "*");
    equal(parsed.slice(star), "*");

    const url = parsed.nodes[4];
    equal(url.value, "url");
    equal(parsed.slice(url), "url(/x.png)");

    const unclosedString = parsed.nodes[6];
    equal(unclosedString.type, "string");
    equal(unclosedString.unclosed, true);
    deepEqual(parsed.range(unclosedString), {
      sourceIndex: 38,
      sourceEndIndex: 47,
      valid: true,
      value: '"unclosed',
    });
  });

  test("locates unclosed functions and unclosed comments", () => {
    const value = "a /*c*/ fn( inner( 1 ";
    const parsed = parser(value, { source: true });

    const comment = parsed.nodes[2];
    equal(comment.type, "comment");
    equal(parsed.slice(comment), "/*c*/");

    const fn = parsed.nodes[4];
    equal(fn.type, "function");
    equal(fn.value, "fn");
    equal(fn.unclosed, true);
    const fnRange = parsed.range(fn);
    equal(fnRange.valid, true);
    equal(fnRange.value, "fn( inner( 1 ");
    equal(value.slice(fnRange.sourceIndex, fnRange.sourceEndIndex), fnRange.value);

    const inner = fn.nodes[0];
    equal(inner.type, "function");
    equal(inner.unclosed, true);
    equal(parsed.slice(inner), "inner( 1 ");

    const trailing = parser("1px /* never closed", { source: true });
    const unclosedComment = trailing.nodes[2];
    equal(unclosedComment.type, "comment");
    equal(unclosedComment.unclosed, true);
    equal(trailing.range(unclosedComment).valid, true);
    equal(trailing.slice(unclosedComment), "/* never closed");
  });

  test("modifying one node invalidates only its own range; siblings stay locatable", () => {
    const parsed = parser(source, { source: true });
    const calc = parsed.nodes[2];
    const url = parsed.nodes[4];
    const comment = parsed.nodes[0];

    // Mutate a leaf inside calc().
    calc.nodes[0].value = "2rem";

    const leafRange = parsed.range(calc.nodes[0]);
    equal(leafRange.valid, false);
    equal(leafRange.value, null, "stale node must not return an error slice");
    equal(leafRange.currentValue, "2rem");
    // slice() never hands back a misleading slice.
    equal(parsed.slice(calc.nodes[0]), null);

    // The enclosing function covers the mutated leaf, so it is stale too.
    equal(parsed.range(calc).valid, false);
    equal(parsed.slice(calc), null);

    // Everything outside the modified subtree is still locatable.
    equal(parsed.slice(url), "url(/x.png)");
    equal(parsed.range(url).valid, true);
    equal(parsed.slice(comment), "/* note */");
    equal(parsed.slice(parsed.nodes[6]), '"unclosed');
  });

  test("ranges do not drift after stringify normalizes output", () => {
    const parsed = parser(source, { source: true });
    const calc = parsed.nodes[2];

    // Stringifying a modified tree changes serialization; source ranges of
    // untouched nodes must keep pointing at the original text.
    calc.nodes[0].value = "2rem";
    const restringified = parsed.toString();
    ok(restringified.includes("calc(2rem * 2)"));

    equal(parsed.slice(parsed.nodes[4]), "url(/x.png)");
    equal(parsed.slice(parsed.nodes[0]), "/* note */");

    // A node that is intact but whose source slice differs from normalized
    // output is still found via the original slice (divider whitespace is a
    // classic normalization target).
    const spaced = parser("1px    solid    red", { source: true });
    equal(spaced.toString(), "1px    solid    red");
    equal(spaced.slice(spaced.nodes[0]), "1px");
    equal(spaced.slice(spaced.nodes[2]), "solid");
  });

  test("keeps the legacy interface when the option is not enabled", () => {
    // Existing call site: no options argument at all.
    const legacy = parser("rgba(1, 2, 3, .5)");
    equal(Object.prototype.hasOwnProperty.call(legacy, "source"), false);
    equal(legacy.toString(), "rgba(1, 2, 3, .5)");

    const node = legacy.nodes[0];
    throws(
      () => legacy.range(node),
      /Source projection is not enabled/,
    );
    throws(
      () => legacy.slice(node),
      /Source projection is not enabled/,
    );

    // Explicitly disabled behaves exactly like the legacy path.
    const off = parser(source, { source: false });
    equal(Object.prototype.hasOwnProperty.call(off, "source"), false);
    equal(off.toString(), source);
    throws(() => off.range(off.nodes[0]), /not enabled/);

    // Enabled and default parses produce identical node trees.
    const a = parser(source).nodes;
    const b = parser(source, { source: true }).nodes;
    deepEqual(a, b);

    // Static API surface is unchanged.
    equal(typeof parser.stringify, "function");
    equal(typeof parser.walk, "function");
    deepEqual(parser.unit("2rem"), { number: "2", unit: "rem" });
  });
});
