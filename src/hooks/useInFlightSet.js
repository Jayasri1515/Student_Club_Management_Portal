// Tracks keys of operations that are currently in flight. `has` reads a ref, so it is
// correct immediately after `add` (state updates are asynchronous, so a fast double click
// could otherwise start two requests); `ids` is state, for rendering busy/disabled UI.

import { useCallback, useRef, useState } from 'react';

export function useInFlightSet() {
    const ref = useRef(new Set());
    const [ids, setIds] = useState([]);

    const has = useCallback((key) => ref.current.has(key), []);
    const add = useCallback((key) => {
        ref.current.add(key);
        setIds(Array.from(ref.current));
    }, []);
    const remove = useCallback((key) => {
        ref.current.delete(key);
        setIds(Array.from(ref.current));
    }, []);

    return { ids, has, add, remove };
}
