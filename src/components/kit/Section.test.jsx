import { render, screen } from '@solidjs/testing-library';
import { describe, test, expect } from 'vitest';
import { Section } from './Section';
import { TextInput } from './TextInput';

describe('Section', () => {
  test('renders its children', () => {
    render(() => (
      <Section title="Notifications">
        <TextInput label="Email address" value="" />
      </Section>
    ));
    expect(screen.getByRole('textbox', { name: 'Email address' })).toBeInTheDocument();
  });

  test('title renders a heading that names the section as a region', () => {
    render(() => (
      <Section title="Account settings">
        <p>Content</p>
      </Section>
    ));
    const heading = screen.getByRole('heading', { name: 'Account settings', level: 3 });
    expect(heading).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Account settings' });
    expect(region).toContainElement(heading);
  });

  test('headingLevel controls the heading element', () => {
    render(() => (
      <Section title="Billing" headingLevel={2}>
        <p>Plans</p>
      </Section>
    ));
    expect(screen.getByRole('heading', { name: 'Billing', level: 2 })).toBeInTheDocument();
  });

  test('without a title there is no landmark region or heading', () => {
    render(() => (
      <Section>
        <p>Anonymous content</p>
      </Section>
    ));
    expect(screen.getByText('Anonymous content')).toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  test('defaults to the section variant', () => {
    render(() => (
      <Section title="Defaults">
        <p>Body</p>
      </Section>
    ));
    expect(screen.getByRole('region', { name: 'Defaults' })).toHaveAttribute(
      'data-variant',
      'section',
    );
  });

  test.each(['section', 'transparent', 'muted'])('renders the %s variant', (variant) => {
    render(() => (
      <Section title={`${variant} group`} variant={variant}>
        <p>Body</p>
      </Section>
    ));
    expect(screen.getByRole('region', { name: `${variant} group` })).toHaveAttribute(
      'data-variant',
      variant,
    );
  });

  test('padding uses the spacing scale tokens (default 4, override, block override)', () => {
    render(() => (
      <Section title="Default padding">
        <p>Body</p>
      </Section>
    ));
    expect(screen.getByRole('region', { name: 'Default padding' }).style.padding).toBe(
      'var(--spacing-4)',
    );

    render(() => (
      <Section title="Tight" padding={2} paddingBlock={0.5}>
        <p>Body</p>
      </Section>
    ));
    const tight = screen.getByRole('region', { name: 'Tight' });
    expect(tight.style.padding).toContain('var(--spacing-2)');
    expect(tight.style.getPropertyValue('padding-block')).toBe('var(--spacing-0-5)');
  });

  test('sizing props accept numbers (px) and strings (as-is)', () => {
    render(() => (
      <Section title="Sized" width={300} maxWidth="100%" minHeight={120}>
        <p>Body</p>
      </Section>
    ));
    const region = screen.getByRole('region', { name: 'Sized' });
    expect(region.style.width).toBe('300px');
    expect(region.style.maxWidth).toBe('100%');
    expect(region.style.minHeight).toBe('120px');
  });
});
