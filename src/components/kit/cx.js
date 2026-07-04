// Class-string combiner for kit components: cx('a', cond && 'b', props.class)
export const cx = (...parts) => parts.filter(Boolean).join(' ');
