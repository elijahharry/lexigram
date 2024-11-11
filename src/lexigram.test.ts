import { lexigram, Targets, Token } from "./lexigram";

const test = <T extends string>(
  name: string,
  targets: Targets<T>,
  test: (
    parse: (
      value: string,
      ...expect: Omit<Token<T | null>, "start" | "end">[]
    ) => void
  ) => void
) => {
  describe(name, () => {
    const lex = lexigram(targets);

    test((value, ...expectedTokens) => {
      let start = 0;
      const expected = expectedTokens.map((token) => {
        const [tokenStart, tokenEnd] = [start, start + token.value.length];
        start = tokenEnd;
        return { ...token, start: tokenStart, end: tokenEnd };
      });

      describe(`parse(${JSON.stringify(value)})`, () => {
        it("tokenizes", () => {
          const tokens = lex.parse(value);
          expect(tokens).toEqual(expected);
        });

        it("streams", () => {
          const stream = lex.stream(value);
          expect(stream[Symbol.iterator]).toBeDefined();
          const tokens = Array.from(stream);
          expect(tokens).toEqual(expected);
        });
      });
    });
  });
};

test(
  "matches strings",
  {
    a: "a",
    b: "b",
    c: "c",
  },
  (parse) => {
    parse(
      "abc",
      { type: "a", value: "a" },
      { type: "b", value: "b" },
      { type: "c", value: "c" }
    );
    parse(
      "a b  c",
      { type: "a", value: "a" },
      { type: null, value: " " },
      { type: "b", value: "b" },
      { type: null, value: "  " },
      { type: "c", value: "c" }
    );
  }
);

test(
  "matches strings with reserved characters",
  {
    bracket: "[",
    exclam: "!",
    paren: "(",
    caret: "^",
  },
  (parse) => {
    parse(
      "[!^(",
      { type: "bracket", value: "[" },
      { type: "exclam", value: "!" },
      { type: "caret", value: "^" },
      { type: "paren", value: "(" }
    );

    parse(
      "[  ! ^  (  ",
      { type: "bracket", value: "[" },
      { type: null, value: "  " },
      { type: "exclam", value: "!" },
      { type: null, value: " " },
      { type: "caret", value: "^" },
      { type: null, value: "  " },
      { type: "paren", value: "(" },
      { type: null, value: "  " }
    );
  }
);

test(
  "matches string groups",
  {
    bracket: ["[", "]"],
    paren: ["(", ")"],
    exclam: "!",
  },
  (parse) => {
    parse(
      "[(!)]",
      { type: "bracket", value: "[" },
      { type: "paren", value: "(" },
      { type: "exclam", value: "!" },
      { type: "paren", value: ")" },
      { type: "bracket", value: "]" }
    );

    parse(
      "[  ( ! )  ]",
      { type: "bracket", value: "[" },
      { type: null, value: "  " },
      { type: "paren", value: "(" },
      { type: null, value: " " },
      { type: "exclam", value: "!" },
      { type: null, value: " " },
      { type: "paren", value: ")" },
      { type: null, value: "  " },
      { type: "bracket", value: "]" }
    );
  }
);

test(
  "matches regex",
  {
    whitespace: /\s+/,
    number: /\d+/,
    word: /\w+/,
    paren: /[()]/,
    bracket: /(\[|\])/,
  },
  (parse) => {
    parse(
      "  123  abc",
      { type: "whitespace", value: "  " },
      { type: "number", value: "123" },
      { type: "whitespace", value: "  " },
      { type: "word", value: "abc" }
    );

    parse(
      "  123  (  456  )  ",
      { type: "whitespace", value: "  " },
      { type: "number", value: "123" },
      { type: "whitespace", value: "  " },
      { type: "paren", value: "(" },
      { type: "whitespace", value: "  " },
      { type: "number", value: "456" },
      { type: "whitespace", value: "  " },
      { type: "paren", value: ")" },
      { type: "whitespace", value: "  " }
    );

    parse(
      "  123  [  456  ]  ",
      { type: "whitespace", value: "  " },
      { type: "number", value: "123" },
      { type: "whitespace", value: "  " },
      { type: "bracket", value: "[" },
      { type: "whitespace", value: "  " },
      { type: "number", value: "456" },
      { type: "whitespace", value: "  " },
      { type: "bracket", value: "]" },
      { type: "whitespace", value: "  " }
    );
  }
);

test(
  "matches mix",
  {
    bob: "bob",
    whitspace: /\s+/,
    amount: [/\$\d+(\.\d+)?/, /\d+\.\d+/, /\d+/],
    word: /\w+/,
    bracket: [/\[/, "]"],
    paren: ["(", /\)/],
  },
  (parse) => {
    parse(
      "  $123  [  bob 456.789  ] $10.11 (  abc  )",
      { type: "whitspace", value: "  " },
      { type: "amount", value: "$123" },
      { type: "whitspace", value: "  " },
      { type: "bracket", value: "[" },
      { type: "whitspace", value: "  " },
      { type: "bob", value: "bob" },
      { type: "whitspace", value: " " },
      { type: "amount", value: "456.789" },
      { type: "whitspace", value: "  " },
      { type: "bracket", value: "]" },
      { type: "whitspace", value: " " },
      { type: "amount", value: "$10.11" },
      { type: "whitspace", value: " " },
      { type: "paren", value: "(" },
      { type: "whitspace", value: "  " },
      { type: "word", value: "abc" },
      { type: "whitspace", value: "  " },
      { type: "paren", value: ")" }
    );
  }
);

for (const linebreak of ["\n", /\r?\n/]) {
  test(
    "matches linebreaks (" +
      (typeof linebreak === "string" ? "string" : "regex") +
      ")",
    {
      linebreak,
    },
    (parse) => {
      parse(
        "hello\nworld",
        { type: null, value: "hello" },
        { type: "linebreak", value: "\n" },
        { type: null, value: "world" }
      );
    }
  );
}

describe("README.md", () => {
  it("matches output shown in example", () => {
    const lexer = lexigram({
      exclaim: "!",
      space: /\s+/,
      vowel: ["a", "e", /[iou]/],
    });

    console.log(lexer.parse("Hello, world!"));

    expect(lexer.parse("Hello, world!")).toEqual([
      { type: null, value: "H", start: 0, end: 1 },
      { type: "vowel", value: "e", start: 1, end: 2 },
      { type: null, value: "ll", start: 2, end: 4 },
      { type: "vowel", value: "o", start: 4, end: 5 },
      { type: null, value: ",", start: 5, end: 6 },
      { type: "space", value: " ", start: 6, end: 7 },
      { type: null, value: "w", start: 7, end: 8 },
      { type: "vowel", value: "o", start: 8, end: 9 },
      { type: null, value: "rld", start: 9, end: 12 },
      { type: "exclaim", value: "!", start: 12, end: 13 },
    ]);
  });
});
