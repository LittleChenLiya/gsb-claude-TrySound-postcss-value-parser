declare namespace postcssValueParser {
  interface BaseNode {
    /**
     * The offset, inclusive, inside the CSS value at which the node starts.
     */
    sourceIndex: number;

    /**
     * The offset, exclusive, inside the CSS value at which the node ends.
     */
    sourceEndIndex: number;

    /**
     * The node's characteristic value
     */
    value: string;
  }

  interface ClosableNode {
    /**
     * Whether the parsed CSS value ended before the node was properly closed
     */
    unclosed?: true;
  }

  interface AdjacentAwareNode {
    /**
     * The token at the start of the node
     */
    before: string;

    /**
     * The token at the end of the node
     */
    after: string;
  }

  interface CommentNode extends BaseNode, ClosableNode {
    type: "comment";
  }

  interface DivNode extends BaseNode, AdjacentAwareNode {
    type: "div";
  }

  interface FunctionNode extends BaseNode, ClosableNode, AdjacentAwareNode {
    type: "function";

    /**
     * Nodes inside the function
     */
    nodes: Node[];
  }

  interface SpaceNode extends BaseNode {
    type: "space";
  }

  interface StringNode extends BaseNode, ClosableNode {
    type: "string";

    /**
     * The quote type delimiting the string
     */
    quote: '"' | "'";
  }

  interface UnicodeRangeNode extends BaseNode {
    type: "unicode-range";
  }

  interface WordNode extends BaseNode {
    type: "word";
  }

  /**
   * Any node parsed from a CSS value
   */
  type Node =
    | CommentNode
    | DivNode
    | FunctionNode
    | SpaceNode
    | StringNode
    | UnicodeRangeNode
    | WordNode;

  interface CustomStringifierCallback {
    /**
     * @param node The node to stringify
     * @returns The serialized CSS representation of the node
     */
    (nodes: Node): string | undefined;
  }

  interface WalkCallback {
    /**
     * @param node  The currently visited node
     * @param index The index of the node in the series of parsed nodes
     * @param nodes The series of parsed nodes
     * @returns Returning `false` will prevent traversal of descendant nodes (only applies if `bubble` was set to `true` in the `walk()` call)
     */
    (node: Node, index: number, nodes: Node[]): void | boolean;
  }

  /**
   * A CSS dimension, decomposed into its numeric and unit parts
   */
  interface Dimension {
    number: string;
    unit: string;
  }

  /**
   * Options accepted by the parser entry point
   */
  interface ParseOptions {
    /**
     * When `true`, the resulting {@link ParsedValue} exposes `sourceOf()`,
     * projecting every node back onto its exact slice of the original input
     */
    sourceRange?: boolean;
  }

  /**
   * The projection of a node onto the original CSS value
   */
  interface SourceRange {
    /**
     * The offset, inclusive, inside the original CSS value at which the node starts
     */
    start: number;

    /**
     * The offset, exclusive, inside the original CSS value at which the node ends
     */
    end: number;

    /**
     * The exact slice of the original CSS value, or `null` when the range is invalid
     */
    text: string | null;

    /**
     * `true` when the node (or one of its descendants) was modified after
     * parsing, meaning the captured slice no longer reflects the node
     */
    invalid: boolean;
  }

  /**
   * A wrapper around a parsed CSS value that allows for inspecting and walking nodes
   */
  interface ParsedValue {
    /**
     * The series of parsed nodes
     */
    nodes: Node[];

    /**
     * Project a node back onto the original CSS value. Only available when
     * the parser was created with `{ sourceRange: true }`.
     *
     * Returns `null` for foreign nodes; returns a range with `invalid: true`
     * and `text: null` when the node was modified after parsing.
     *
     * @param node A node produced by this parsed value
     */
    sourceOf?(node: Node): SourceRange | null;

    /**
     * Walk all parsed nodes, applying a callback
     *
     * @param callback A visitor callback that will be executed for each node
     * @param bubble   When set to `true`, walking will be done inside-out instead of outside-in
     */
    walk(callback: WalkCallback, bubble?: boolean): this;
  }

  interface ValueParser {
    /**
     * Decompose a CSS dimension into its numeric and unit part
     *
     * @param value The dimension to decompose
     * @returns An object representing `number` and `unit` part of the dimension or `false` if the decomposing fails
     */
    unit(value: string): Dimension | false;

    /**
     * Serialize a series of nodes into a CSS value
     *
     * @param nodes  The nodes to stringify
     * @param custom A custom stringifier callback
     * @returns The generated CSS value
     */
    stringify(nodes: Node | Node[], custom?: CustomStringifierCallback): string;

    /**
     * Walk a series of nodes, applying a callback
     *
     * @param nodes    The nodes to walk
     * @param callback A visitor callback that will be executed for each node
     * @param bubble   When set to `true`, walking will be done inside-out instead of outside-in
     */
    walk(nodes: Node[], callback: WalkCallback, bubble?: boolean): void;

    /**
     * Parse a CSS value into a series of nodes to operate on
     *
     * @param value   The value to parse
     * @param options Options bag; pass `{ sourceRange: true }` to enable `sourceOf()`
     */
    new (value: string, options?: ParseOptions): ParsedValue;

    /**
     * Parse a CSS value into a series of nodes to operate on
     *
     * @param value   The value to parse
     * @param options Options bag; pass `{ sourceRange: true }` to enable `sourceOf()`
     */
    (value: string, options?: ParseOptions): ParsedValue;
  }
}

declare const postcssValueParser: postcssValueParser.ValueParser;

export = postcssValueParser;
