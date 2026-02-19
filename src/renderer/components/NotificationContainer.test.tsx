import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationContainer } from './NotificationContainer';
import { Notification } from '../context/AppContext';

describe('NotificationContainer', () => {
  test('renders notifications', () => {
    const notifications: Notification[] = [
      {
        id: '1',
        message: 'Success message',
        type: 'success'
      }
    ];

    render(
      <NotificationContainer 
        notifications={notifications}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  test('renders multiple notifications', () => {
    const notifications: Notification[] = [
      {
        id: '1',
        message: 'First message',
        type: 'success'
      },
      {
        id: '2',
        message: 'Second message',
        type: 'info'
      }
    ];

    render(
      <NotificationContainer 
        notifications={notifications}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
  });

  test('calls onDismiss when close button is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = jest.fn();
    const notifications: Notification[] = [
      {
        id: '1',
        message: 'Test message',
        type: 'success'
      }
    ];

    render(
      <NotificationContainer 
        notifications={notifications}
        onDismiss={onDismiss}
      />
    );

    const closeButton = screen.getByLabelText('Close notification');
    await user.click(closeButton);

    expect(onDismiss).toHaveBeenCalledWith('1');
  });

  test('applies correct CSS class for notification type', () => {
    const notifications: Notification[] = [
      {
        id: '1',
        message: 'Error message',
        type: 'error'
      }
    ];

    const { container } = render(
      <NotificationContainer 
        notifications={notifications}
        onDismiss={jest.fn()}
      />
    );

    const notification = container.querySelector('.notification-error');
    expect(notification).toBeInTheDocument();
  });

  test('renders empty when no notifications', () => {
    const { container } = render(
      <NotificationContainer 
        notifications={[]}
        onDismiss={jest.fn()}
      />
    );

    const notifications = container.querySelectorAll('.notification');
    expect(notifications).toHaveLength(0);
  });
});
