// Acceptance demo: local source projection of a CSS value.
// Runs fully in-memory: the only input is the string below.
// Run with: node test/fixtures/sourceProjectionDemo.js
const assert = require("node:assert");
const parser = require("../../lib");

const source = '/* note */ calc(1px * 2), url(/x.png) "unclosed';
console.log("source:", JSON.stringify(source), "\n");

const parsed = parser(source, { source: true });

const show = (node) => {
  const r = parsed.range(node);
  console.log(
    r.valid ? "  valid  " : "  STALE  ",
    node.type.padEnd(8),
    `[${String(r.sourceIndex).padStart(2)},${String(r.sourceEndIndex).padStart(2)})`,
    "slice=" + JSON.stringify(r.value),
    r.valid ? "" : "current=" + JSON.stringify(r.currentValue),
  );
};

console.log("== projection of every node onto the ORIGINAL source ==");
parsed.walk(show);
assert.equal(parsed.slice(parsed.nodes[0]), "/* note */"); // comment
assert.equal(parsed.slice(parsed.nodes[2]), "calc(1px * 2)"); // nested fn
assert.equal(parsed.slice(parsed.nodes[6]), '"unclosed'); // unclosed string

// Unclosed function and unclosed comment are locatable too.
const uf = parser("fn( inner( 1 ", { source: true });
assert.equal(uf.nodes[0].unclosed, true);
assert.equal(uf.slice(uf.nodes[0]), "fn( inner( 1 ");
const uc = parser("1px /* never closed", { source: true });
assert.equal(uc.nodes[2].unclosed, true);
assert.equal(uc.slice(uc.nodes[2]), "/* never closed");
console.log("\nunclosed function located:", JSON.stringify("fn( inner( 1 "));
console.log("unclosed comment located:", JSON.stringify("/* never closed"));

console.log("\n== modify ONE leaf: calc nodes[0] '1px' -> '2rem' ==");
const calc = parsed.nodes[2];
calc.nodes[0].value = "2rem";
parsed.walk(show);

assert.equal(parsed.range(calc.nodes[0]).valid, false); // leaf invalid
assert.equal(parsed.slice(calc.nodes[0]), null); // no misleading slice
assert.equal(parsed.range(calc).valid, false); // enclosing fn invalid
assert.equal(parsed.slice(parsed.nodes[4]), "url(/x.png)"); // sibling locatable
assert.equal(parsed.slice(parsed.nodes[0]), "/* note */"); // comment locatable
assert.equal(parsed.slice(parsed.nodes[6]), '"unclosed'); // still locatable

console.log("\nstringify after edit:", JSON.stringify(parsed.toString()));
console.log("(source untouched): ", JSON.stringify(parsed.source));

console.log("\n== option disabled -> legacy interface ==");
const legacy = parser(source);
assert.equal("source" in legacy, false);
assert.throws(() => legacy.range(legacy.nodes[0]), /not enabled/);
console.log("legacy.toString():", JSON.stringify(legacy.toString()));

console.log("\nALL ACCEPTANCE ASSERTIONS PASSED");
