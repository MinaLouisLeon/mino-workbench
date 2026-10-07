import { useLayoutEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { entryNameProblem, stemLength } from "../entryName";

/**
 * The name box in the create and rename dialogs.
 *
 * A rename opens with the current name in the box and the part before the
 * extension selected, so typing replaces `notes` and keeps `.md` - the way
 * every file manager does it. A create opens empty.
 *
 * `problem` is shown as soon as there is something to say, and the confirm is
 * disabled while there is: Rust would refuse the same name, but a sentence
 * under the box is a better way to learn that than a failed round trip.
 */
export function useEntryNameField(initial: string, submit: (name: string) => void) {
  const [value, setValue] = useState(initial);
  const input = useRef<HTMLInputElement | null>(null);

  useLayoutEffect(() => {
    const field = input.current;
    if (!field) return;
    field.focus();
    field.setSelectionRange(0, stemLength(initial));
  }, [initial]);

  const problem = value === "" ? null : entryNameProblem(value);
  const ready = value !== "" && problem === null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (ready) submit(value);
  };

  return { value, setValue, input, problem, ready, onSubmit };
}
