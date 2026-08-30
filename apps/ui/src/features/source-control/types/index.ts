/**
 * The source control view models, one file per surface.
 *
 * A folder rather than one file because the panel grew a branch control and a
 * stash section, and the three groups have nothing to say to each other:
 * `changes` is the working tree, `branches` is where HEAD points, `stash` is
 * the stack. Everything re-exports through here, so nothing outside this
 * folder has to know which of the three a type lives in.
 */
export type * from "./branches";
export type * from "./changes";
export type * from "./stash";
