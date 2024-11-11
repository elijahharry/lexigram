Small utility for performing basic lexical analyses.

To create a lexer, simply provide a map of types and their matchers (strings or regexes):

```js
import lexigram from "lexigram";

const lexer = lexigram({
  // strings will be matched exactly
  exclaim: "!",
  // regexes can also be used
  space: /\s+/,
  // or provide multiple of either
  vowel: ["a", "e", /[iou]/],
});
```

The returned object will have two methods:

| Method   | Description                                      |
| -------- | ------------------------------------------------ |
| `parse`  | Returns an array of tokens.                      |
| `stream` | Returns an iterable iterator that yields tokens. |

Unmatched tokens will always be included with a `type` of `null`. Using the lexer defined above, the following code:

```js
lexer.parse("Hello, world!");
```

Would output these tokens:

```json
[
  { "type": null, "value": "H", "start": 0, "end": 1 },
  { "type": "vowel", "value": "e", "start": 1, "end": 2 },
  { "type": null, "value": "ll", "start": 2, "end": 4 },
  { "type": "vowel", "value": "o", "start": 4, "end": 5 },
  { "type": null, "value": ",", "start": 5, "end": 6 },
  { "type": "space", "value": " ", "start": 6, "end": 7 },
  { "type": null, "value": "w", "start": 7, "end": 8 },
  { "type": "vowel", "value": "o", "start": 8, "end": 9 },
  { "type": null, "value": "rld", "start": 9, "end": 12 },
  { "type": "exclaim", "value": "!", "start": 12, "end": 13 }
]
```
