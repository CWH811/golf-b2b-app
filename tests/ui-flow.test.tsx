import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ScannerPage from '@/app/page';
import LoginPage from '@/app/login/page';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('UI flow', () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it('shows an admin login option on the login screen', () => {
    render(<LoginPage />);

    expect(screen.getByRole('button', { name: /admin login/i })).toBeTruthy();
  });

  it('navigates to the cart page when the cart button is pressed', () => {
    render(<ScannerPage />);

    fireEvent.click(screen.getByRole('button', { name: /cart/i }));

    expect(pushMock).toHaveBeenCalledWith('/cart');
  });
});
