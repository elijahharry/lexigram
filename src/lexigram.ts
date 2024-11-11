export type Matchable = string | number | RegExp;
export type Match = Matchable | Matchable[];

export type Targets<T extends string> = Record<T, Match>;

export interface Token<T> {
  type: T | null;
  value: string;
  start: number;
  end: number;
}

export type StringType<T extends PropertyKey> = T extends string
  ? T
  : T extends number
  ? `${T}`
  : string;

export interface TokenSteam<T> extends IterableIterator<Token<T>> {}

export interface TokenList<T> extends Array<Token<T>> {}

export interface Lexigram<T> {
  /** Parses the source value and returns an iterator of tokens. */
  stream(value: string): TokenSteam<T | null>;
  /** Immediately parses the full source value and returns an array of tokens. */
  parse(value: string): TokenList<T | null>;
}

type MatcherResult<T> = {
  value: string;
  type: T;
  index: number;
};

type Matcher<T> = (value: string) => MatcherResult<T> | undefined;
type Ref<T> = { current: T };

function ref<T>(value: T): Ref<T>;
function ref<T>(): Ref<T | undefined>;
function ref<T>(current?: T) {
  return { current };
}

const ESCAPE = /[-\/\\^$*+?.()|[\]{}]/g;
function escapeRegExp(str: string) {
  return str.replace(ESCAPE, "\\$&");
}

function lexigram<T extends string>(targets: Targets<T>): Lexigram<T> {
  const invertTargets: Record<string, T> = {};

  const matchStrings: string[] = [],
    matchPatterns: { type: T; pattern: RegExp }[] = [];

  const matchString = (type: T, value: string) => {
    invertTargets[value] = type;
    matchStrings.push(escapeRegExp(value));
  };

  const match = (type: T, value: Matchable) => {
    switch (typeof value) {
      case "number":
        return matchString(type, String(value));
      case "string":
        return matchString(type, value);
      case "object":
        if (value instanceof RegExp) {
          return matchPatterns.push({ type, pattern: value });
        }
    }
  };

  for (const key in targets)
    if (Object.prototype.hasOwnProperty.call(targets, key)) {
      const value = targets[key];
      if (Array.isArray(value)) {
        value.forEach((value) => match(key, value));
      } else {
        match(key, value);
      }
    }

  const matchers: Array<Matcher<T>> = [];

  if (matchStrings.length) {
    const match = new RegExp(matchStrings.join("|"));
    matchers.push((value) => {
      const exec = match.exec(value);
      if (exec) {
        return {
          value: exec[0],
          type: invertTargets[exec[0]],
          index: exec.index,
        };
      }
    });
  }

  matchPatterns.forEach(({ type, pattern }) => {
    matchers.push((value) => {
      const exec = pattern.exec(value);
      if (exec) {
        return {
          value: exec[0],
          type,
          index: exec.index,
        };
      }
    });
  });

  const createNext = (value: string) => {
    const i = ref(0);

    const commit = (token: Token<T | null>) => {
      i.current = token.end;
      return token;
    };

    const prepare = (result: MatcherResult<T>): Token<T> => {
      result.index += i.current;
      return {
        type: result.type,
        value: result.value,
        start: result.index,
        end: result.index + result.value.length,
      };
    };

    const nextUnknown = (): Token<T | null> | undefined => {
      if (i.current >= value.length) return;
      const remaining = value.slice(i.current);
      let min: MatcherResult<T> | undefined,
        setMin = (result: MatcherResult<T>) => {
          min = result;
          setMin = (result) => result.index < min!.index && (min = result);
        },
        match: MatcherResult<T> | undefined;

      for (const matcher of matchers) {
        match = matcher(remaining);
        if (match) {
          if (match.index === 0) return commit(prepare(match));
          setMin(match);
        }
      }

      let start = i.current,
        end: number;
      if (min) {
        const token = prepare(min);
        end = token.start;
        next.current = () => {
          next.current = nextUnknown;
          return commit(token);
        };
      } else {
        end = value.length;
      }

      return commit({
        type: null,
        value: value.slice(start, end),
        start: start,
        end,
      });
    };

    const next = ref(nextUnknown);

    return () => next.current();
  };

  const stream = (value: string): TokenSteam<T | null> => {
    const next = createNext(value);
    return {
      [Symbol.iterator]: () => stream(value),
      next: () => {
        const value = next();
        return { value, done: value === undefined } as any;
      },
    };
  };

  const parse = (value: string) => {
    let tokens: TokenList<T | null> = [],
      token: Token<T | null> | undefined,
      next = createNext(value);
    while ((token = next())) {
      tokens.push(token);
    }
    return tokens;
  };

  return { stream, parse };
}

export { lexigram };
