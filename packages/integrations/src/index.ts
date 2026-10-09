export * from "./csv.ts";
export * from "./affiliate/types.ts";
export { createAmazonAdapter, extractAsin } from "./affiliate/amazon.ts";
export { createAwinAdapter, mapAwinStatus } from "./affiliate/awin.ts";
export { createTemplateAdapter, fillTemplate } from "./affiliate/template.ts";
export { PROGRAMS, emailMayLinkDirectly, type ProgramDefinition } from "./affiliate/programs.ts";
