import { render, screen } from '@solidjs/testing-library';
import { describe, test, expect, vi, afterEach } from 'vitest';
import { Text } from './Text';
import { Heading } from './Heading';

// jsdom reports zero layout metrics, so truncation never triggers on its own.
// These helpers stub the metrics the truncation check reads
// (scrollWidth/offsetWidth for single-line, Range height/offsetHeight for
// multi-line) and restore them after each test.
const stubbedDescriptors = [];
function stubLayoutMetric(prop, value) {
  stubbedDescriptors.push([prop, Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop)]);
  Object.defineProperty(HTMLElement.prototype, prop, {
    configurable: true,
    get: () => value,
  });
}

afterEach(() => {
  while (stubbedDescriptors.length) {
    const [prop, descriptor, restore] = stubbedDescriptors.pop();
    if (restore) restore();
    else if (descriptor) Object.defineProperty(HTMLElement.prototype, prop, descriptor);
    else delete HTMLElement.prototype[prop];
  }
  vi.restoreAllMocks();
});

describe('Text', () => {
  test('renders an inline span with body type and primary color by default', () => {
    render(() => <Text>Plain body copy</Text>);
    const el = screen.getByText('Plain body copy');
    expect(el.tagName).toBe('SPAN');
    expect(el).toHaveClass('astryx-text', 'body', 'primary', 'inline');
    expect(el).toHaveAttribute('data-type', 'body');
    expect(el).toHaveAttribute('data-color', 'primary');
  });

  test.each(['body', 'large', 'label', 'supporting', 'code', 'display-1', 'display-2', 'display-3'])(
    'reflects the %s type as a theme class and data attribute',
    (type) => {
      render(() => <Text type={type}>Typed text</Text>);
      const el = screen.getByText('Typed text');
      expect(el).toHaveClass('astryx-text', type);
      expect(el).toHaveAttribute('data-type', type);
    },
  );

  test('supporting type defaults to the secondary color', () => {
    render(() => <Text type="supporting">Helper text</Text>);
    expect(screen.getByText('Helper text')).toHaveAttribute('data-color', 'secondary');
  });

  test('an explicit color overrides the type default', () => {
    render(() => (
      <Text type="supporting" color="accent">
        Accent helper
      </Text>
    ));
    const el = screen.getByText('Accent helper');
    expect(el).toHaveAttribute('data-color', 'accent');
    expect(el).toHaveClass('accent');
  });

  test('as="p" renders a paragraph element', () => {
    render(() => <Text as="p">Paragraph copy</Text>);
    const el = screen.getByText('Paragraph copy');
    expect(el.tagName).toBe('P');
  });

  test('as="label" renders a label that names its form control', () => {
    render(() => (
      <>
        <Text as="label" type="label" for="email-input">
          Email address
        </Text>
        <input id="email-input" type="email" />
      </>
    ));
    const input = screen.getByLabelText('Email address');
    expect(input.tagName).toBe('INPUT');
    const label = screen.getByText('Email address');
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveClass('label');
  });

  test('display="block" renders block; default stays inline', () => {
    render(() => <Text display="block">Block text</Text>);
    expect(screen.getByText('Block text')).toHaveClass('block');
  });

  test('type default weight comes from the type-scale token; weight prop overrides', () => {
    render(() => (
      <>
        <Text type="label">Default weight</Text>
        <Text weight="bold">Bold weight</Text>
      </>
    ));
    expect(screen.getByText('Default weight').style.fontWeight).toBe(
      'var(--text-label-weight)',
    );
    expect(screen.getByText('Bold weight').style.fontWeight).toBe(
      'var(--font-weight-bold)',
    );
  });

  test('size overrides font-size via the token scale (xsm maps to the xs token)', () => {
    render(() => (
      <>
        <Text size="2xl">Metric</Text>
        <Text size="xsm">Tiny</Text>
      </>
    ));
    expect(screen.getByText('Metric').style.fontSize).toBe('var(--font-size-2xl)');
    expect(screen.getByText('Tiny').style.fontSize).toBe('var(--font-size-xs)');
  });

  test('decoration and numeric props map to token-backed utilities', () => {
    render(() => (
      <Text hasStrikethrough hasTabularNumbers justify="center">
        1,024 items
      </Text>
    ));
    const el = screen.getByText('1,024 items');
    expect(el).toHaveClass('line-through', 'tabular-nums', 'text-center');
  });

  test('maxLines=1 truncation forces block display and exposes the full text as a native tooltip', () => {
    stubLayoutMetric('scrollWidth', 400);
    stubLayoutMetric('offsetWidth', 100);
    render(() => <Text maxLines={1}>A very long single line of text</Text>);
    const el = screen.getByText('A very long single line of text');
    expect(el).toHaveClass('block', 'overflow-hidden');
    expect(el).toHaveAttribute('title', 'A very long single line of text');
  });

  test('hasTruncateTooltip={false} suppresses the tooltip even when truncated', () => {
    stubLayoutMetric('scrollWidth', 400);
    stubLayoutMetric('offsetWidth', 100);
    render(() => (
      <Text maxLines={1} hasTruncateTooltip={false}>
        Long text without tooltip
      </Text>
    ));
    expect(screen.getByText('Long text without tooltip')).not.toHaveAttribute('title');
  });

  test('untruncated text gets no tooltip', () => {
    stubLayoutMetric('scrollWidth', 50);
    stubLayoutMetric('offsetWidth', 100);
    render(() => <Text maxLines={1}>Short</Text>);
    expect(screen.getByText('Short')).not.toHaveAttribute('title');
  });

  test('maxLines>1 applies the line clamp count', () => {
    stubLayoutMetric('offsetHeight', 40);
    // jsdom's Range has no getBoundingClientRect at all — provide one
    stubbedDescriptors.push([
      'rangeRect',
      null,
      () => delete Range.prototype.getBoundingClientRect,
    ]);
    Range.prototype.getBoundingClientRect = () => ({ height: 120 });
    render(() => <Text maxLines={3}>Multi line clamped text</Text>);
    const el = screen.getByText('Multi line clamped text');
    expect(el.getAttribute('style')).toContain('-webkit-line-clamp');
    expect(el).toHaveAttribute('title', 'Multi line clamped text');
  });

  test('merges a caller-provided class', () => {
    render(() => <Text class="mt-2">Custom class</Text>);
    expect(screen.getByText('Custom class')).toHaveClass('astryx-text', 'mt-2');
  });
});

describe('Heading', () => {
  test.each([1, 2, 3, 4, 5, 6])('level %i renders the matching h element with a heading role', (level) => {
    render(() => <Heading level={level}>Section title {level}</Heading>);
    const el = screen.getByRole('heading', { level, name: `Section title ${level}` });
    expect(el.tagName).toBe(`H${level}`);
    expect(el).toHaveClass('astryx-heading', `level-${level}`);
    expect(el).toHaveAttribute('data-level', String(level));
  });

  test('defaults to primary color and block display', () => {
    render(() => <Heading level={2}>Defaults</Heading>);
    const el = screen.getByRole('heading', { level: 2, name: 'Defaults' });
    expect(el).toHaveAttribute('data-color', 'primary');
    expect(el).toHaveClass('primary', 'block');
  });

  test('accessibilityLevel overrides the outline level via aria-level', () => {
    render(() => (
      <Heading level={2} accessibilityLevel={4}>
        Sidebar section
      </Heading>
    ));
    // Announced as a level-4 heading despite rendering an h2
    const el = screen.getByRole('heading', { level: 4, name: 'Sidebar section' });
    expect(el.tagName).toBe('H2');
    expect(el).toHaveAttribute('aria-level', '4');
  });

  test('no aria-level is set when accessibilityLevel equals level', () => {
    render(() => (
      <Heading level={3} accessibilityLevel={3}>
        Same level
      </Heading>
    ));
    expect(screen.getByRole('heading', { level: 3, name: 'Same level' })).not.toHaveAttribute(
      'aria-level',
    );
  });

  test('display type keeps the semantic element but applies display-scale tokens in the brand heading font', () => {
    render(() => (
      <Heading level={1} type="display-1">
        Hero title
      </Heading>
    ));
    const el = screen.getByRole('heading', { level: 1, name: 'Hero title' });
    expect(el.tagName).toBe('H1');
    expect(el).toHaveAttribute('data-type', 'display-1');
    expect(el.style.fontFamily).toBe('var(--font-family-heading)');
    expect(el.style.fontSize).toBe('var(--text-display-1-size)');
    expect(el.style.fontWeight).toBe('var(--text-display-1-weight)');
  });

  test('color prop is reflected for the theme color classes', () => {
    render(() => (
      <Heading level={3} color="secondary">
        Muted heading
      </Heading>
    ));
    const el = screen.getByRole('heading', { level: 3, name: 'Muted heading' });
    expect(el).toHaveAttribute('data-color', 'secondary');
    expect(el).toHaveClass('secondary');
  });

  test('truncated heading exposes the full text as a native tooltip', () => {
    stubLayoutMetric('scrollWidth', 400);
    stubLayoutMetric('offsetWidth', 100);
    render(() => (
      <Heading level={2} maxLines={1}>
        A very long section heading
      </Heading>
    ));
    const el = screen.getByRole('heading', { level: 2, name: 'A very long section heading' });
    expect(el).toHaveClass('overflow-hidden');
    expect(el).toHaveAttribute('title', 'A very long section heading');
  });

  test('reports an error and falls back to h2 when level is missing', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(() => <Heading>No level</Heading>);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('`level` prop is required'),
    );
    expect(screen.getByRole('heading', { level: 2, name: 'No level' })).toBeInTheDocument();
  });

  test('justify and strikethrough map to token-backed utilities', () => {
    render(() => (
      <Heading level={4} justify="end" hasStrikethrough>
        Deprecated section
      </Heading>
    ));
    const el = screen.getByRole('heading', { level: 4, name: 'Deprecated section' });
    expect(el).toHaveClass('text-end', 'line-through');
  });
});
