import type { ReactElement } from 'react';
import type { RefreshControlProps } from 'react-native';
import { act, screen } from '@testing-library/react-native';

/**
 * Does what a finger pulling the list down does: starts the screen's refresh.
 * The test renderer cannot drag, and its RefreshControl mock drops all props,
 * so this calls `onRefresh` on the refresh control that `Screen` gives its ScrollView.
 */
export async function pullToRefresh(): Promise<void> {
  const scroll = screen.getByTestId('screen-scroll');
  const control = scroll.props.refreshControl as ReactElement<RefreshControlProps> | undefined;
  if (!control?.props.onRefresh) {
    throw new Error('This screen has no pull-to-refresh');
  }
  const { onRefresh } = control.props;
  await act(async () => {
    onRefresh();
  });
}
