import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts", "!src/helpers.test.ts", "!**/*.mock.test.ts"],
  moduleFileExtensions: ["ts", "js"],
  roots: ["<rootDir>/src"],
  extensionsToTreatAsEsm: [".ts", ".test.ts"],
};

export default config;
