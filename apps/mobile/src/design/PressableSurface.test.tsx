import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Text } from 'react-native';

import { PressableSurface } from './PressableSurface';


const raised = { boxShadow: '2px 2px 0px #1f1d1a', transform: [{ translateX: 0 }, { translateY: 0 }] };
const flat = { boxShadow: '0px 0px 0px #1f1d1a', transform: [{ translateX: 2 }, { translateY: 2 }] };

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

function setup() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

test('the action fires only after the press has shown for 150ms', async () => {
  const onPress = jest.fn();
  await render(
    <PressableSurface onPress={onPress}>
      <Text>Continue</Text>
    </PressableSurface>,
  );
  const button = screen.getByRole('button', { name: 'Continue' });
  expect(button).toHaveStyle(raised);

  await setup().press(button);
  expect(button).toHaveStyle(flat);
  expect(onPress).not.toHaveBeenCalled();

  await act(() => jest.advanceTimersByTime(149));
  expect(onPress).not.toHaveBeenCalled();
  expect(button).toHaveStyle(flat);

  await act(() => jest.advanceTimersByTime(1));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(button).toHaveStyle(raised);
});

test('the surface presses flat as soon as it is touched', async () => {
  await render(
    <PressableSurface onPress={jest.fn()}>
      <Text>Continue</Text>
    </PressableSurface>,
  );
  const button = screen.getByRole('button', { name: 'Continue' });

  await fireEvent(button, 'pressIn');
  expect(button).toHaveStyle(flat);
});

test('repeat taps during a press are ignored', async () => {
  const onPress = jest.fn();
  await render(
    <PressableSurface onPress={onPress}>
      <Text>Continue</Text>
    </PressableSurface>,
  );
  const button = screen.getByRole('button', { name: 'Continue' });

  // Three taps within one press window.
  await fireEvent.press(button);
  await act(() => jest.advanceTimersByTime(60));
  await fireEvent.press(button);
  await act(() => jest.advanceTimersByTime(60));
  await fireEvent.press(button);
  await act(() => jest.advanceTimersByTime(500));

  expect(onPress).toHaveBeenCalledTimes(1);
  expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
});

test('a press gives a light haptic', async () => {
  await render(
    <PressableSurface onPress={jest.fn()}>
      <Text>Continue</Text>
    </PressableSurface>,
  );

  await setup().press(screen.getByRole('button', { name: 'Continue' }));

  expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  expect(Haptics.selectionAsync).not.toHaveBeenCalled();
});

describe('toggle mode', () => {
  function Chip({ selected, onToggle }: { selected: boolean; onToggle: () => void }) {
    return (
      <PressableSurface selected={selected} onPress={onToggle}>
        <Text>Psychology</Text>
      </PressableSurface>
    );
  }

  test('a selected chip stays pressed in, and springs back when deselected', async () => {
    const user = setup();
    let selected = false;
    const { rerender } = await render(<Chip selected={selected} onToggle={() => (selected = !selected)} />);
    const chip = () => screen.getByRole('button', { name: 'Psychology' });
    expect(chip()).not.toBeSelected();

    await user.press(chip());
    await act(() => jest.advanceTimersByTime(150));
    await rerender(<Chip selected={selected} onToggle={() => (selected = !selected)} />);
    expect(chip()).toBeSelected();
    expect(chip()).toHaveStyle(flat);

    await user.press(chip());
    await act(() => jest.advanceTimersByTime(150));
    await rerender(<Chip selected={selected} onToggle={() => (selected = !selected)} />);
    expect(chip()).not.toBeSelected();
    expect(chip()).toHaveStyle(raised);
  });

  test('a toggle gives a selection haptic', async () => {
    await render(<Chip selected={false} onToggle={jest.fn()} />);

    await setup().press(screen.getByRole('button', { name: 'Psychology' }));

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
});
