import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PillButton } from './PillButton';
import { BottomSheet } from './BottomSheet';
import { ConfirmDialog } from './ConfirmDialog';
import { PRESS_DELAY_MS } from './PressableSurface';


beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
const afterPress = () => act(() => jest.advanceTimersByTime(PRESS_DELAY_MS));

/** Android's back button reaches a React Native Modal as its `requestClose` event. */
const pressAndroidBack = (overlay: string) => fireEvent(screen.getByTestId(overlay), 'requestClose');

describe('confirmation dialog', () => {
  function LogOut({ onConfirm = jest.fn() }: { onConfirm?: () => void }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <PillButton label="Log out" tone="accent" onPress={() => setOpen(true)} />
        <ConfirmDialog
          visible={open}
          title="Log out of Mindfeed?"
          body="Your liked ideas and stacks are saved to your account."
          confirmLabel="Log out"
          onConfirm={() => {
            setOpen(false);
            onConfirm();
          }}
          onCancel={() => setOpen(false)}
        />
      </>
    );
  }

  async function openDialog() {
    await user().press(screen.getByRole('button', { name: 'Log out' }));
    await afterPress();
    expect(screen.getByText('Log out of Mindfeed?')).toBeOnTheScreen();
  }

  test('Cancel closes it', async () => {
    await render(<LogOut />);
    await openDialog();

    await user().press(screen.getByRole('button', { name: 'Cancel' }));
    await afterPress();

    expect(screen.queryByText('Log out of Mindfeed?')).not.toBeOnTheScreen();
  });

  test('Android back closes it', async () => {
    await render(<LogOut />);
    await openDialog();

    await pressAndroidBack('confirm-dialog');

    expect(screen.queryByText('Log out of Mindfeed?')).not.toBeOnTheScreen();
  });

  test('tapping outside closes it', async () => {
    await render(<LogOut />);
    await openDialog();

    await user().press(screen.getByLabelText('Close'));

    expect(screen.queryByText('Log out of Mindfeed?')).not.toBeOnTheScreen();
  });

  test('the confirming button acts after its press', async () => {
    const onConfirm = jest.fn();
    await render(<LogOut onConfirm={onConfirm} />);
    await openDialog();

    const [, confirm] = screen.getAllByRole('button', { name: 'Log out' }).slice(-2);
    await user().press(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    await afterPress();

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('bottom sheet', () => {
  const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

  function Picker() {
    const [open, setOpen] = useState(true);
    return (
      <SafeAreaProvider initialMetrics={metrics}>
        <BottomSheet visible={open} title="Add to stack" onClose={() => setOpen(false)}>
          <Text>Two systems run your mind</Text>
        </BottomSheet>
      </SafeAreaProvider>
    );
  }

  test('Done closes it', async () => {
    await render(<Picker />);
    expect(screen.getByText('Two systems run your mind')).toBeOnTheScreen();

    await user().press(screen.getByRole('button', { name: 'Done' }));
    await afterPress();

    expect(screen.queryByText('Add to stack')).not.toBeOnTheScreen();
  });

  test('Android back closes it', async () => {
    await render(<Picker />);

    await pressAndroidBack('bottom-sheet');

    expect(screen.queryByText('Add to stack')).not.toBeOnTheScreen();
  });

  test('tapping outside closes it', async () => {
    await render(<Picker />);

    await user().press(screen.getByLabelText('Close'));

    expect(screen.queryByText('Add to stack')).not.toBeOnTheScreen();
  });
});
