import { render, screen } from '@solidjs/testing-library';
import { describe, test, expect } from 'vitest';
import { FormLayout } from './FormLayout';
import { TextInput } from './TextInput';

describe('FormLayout', () => {
  test('renders its children', () => {
    render(() => (
      <FormLayout>
        <TextInput label="First name" value="" />
        <TextInput label="Last name" value="" />
      </FormLayout>
    ));
    expect(screen.getByRole('textbox', { name: 'First name' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Last name' })).toBeInTheDocument();
  });

  test('defaults to the vertical direction', () => {
    render(() => (
      <FormLayout role="group" aria-label="Profile form">
        <TextInput label="Name" value="" />
      </FormLayout>
    ));
    expect(screen.getByRole('group', { name: 'Profile form' })).toHaveAttribute(
      'data-direction',
      'vertical',
    );
  });

  test.each(['vertical', 'horizontal', 'horizontal-labels'])(
    'exposes the %s direction as a data attribute',
    (direction) => {
      render(() => (
        <FormLayout role="group" aria-label={`${direction} form`} direction={direction}>
          <TextInput label="Field" value="" />
        </FormLayout>
      ));
      expect(screen.getByRole('group', { name: `${direction} form` })).toHaveAttribute(
        'data-direction',
        direction,
      );
    },
  );

  test('an unknown direction falls back to vertical', () => {
    render(() => (
      <FormLayout role="group" aria-label="Odd form" direction="diagonal">
        <TextInput label="Field" value="" />
      </FormLayout>
    ));
    expect(screen.getByRole('group', { name: 'Odd form' })).toHaveAttribute(
      'data-direction',
      'vertical',
    );
  });

  test('horizontal-labels keeps fields fully label-associated and described', () => {
    render(() => (
      <FormLayout direction="horizontal-labels">
        <TextInput label="Email" value="" description="Work address preferred" />
        <TextInput
          label="Handle"
          value=""
          status={{ type: 'error', message: 'Handle is taken' }}
        />
      </FormLayout>
    ));
    const email = screen.getByRole('textbox', { name: 'Email' });
    expect(email).toHaveAccessibleDescription('Work address preferred');
    const handle = screen.getByRole('textbox', { name: 'Handle' });
    expect(handle).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Handle is taken');
  });

  test('nesting: a vertical layout inside horizontal-labels resets the direction for its fields', () => {
    render(() => (
      <FormLayout direction="horizontal-labels" role="group" aria-label="Outer">
        <TextInput label="Country" value="" />
        <FormLayout role="group" aria-label="Inner">
          <TextInput label="City" value="" />
        </FormLayout>
      </FormLayout>
    ));
    expect(screen.getByRole('group', { name: 'Outer' })).toHaveAttribute(
      'data-direction',
      'horizontal-labels',
    );
    expect(screen.getByRole('group', { name: 'Inner' })).toHaveAttribute(
      'data-direction',
      'vertical',
    );
    // Fields in both modes stay label-associated.
    expect(screen.getByRole('textbox', { name: 'Country' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'City' })).toBeInTheDocument();
  });
});
