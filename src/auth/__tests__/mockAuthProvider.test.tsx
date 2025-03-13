import { render, act, renderHook } from '@testing-library/react';
import { MockAuthProvider, useAuth } from '../mockAuthProvider';
import { ReactNode } from 'react';

describe('MockAuthProvider', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockAuthProvider>{children}</MockAuthProvider>
  );

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle login and set auth state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('test@example.com');
    expect(result.current.accessToken).toBeTruthy();
    expect(result.current.refreshToken).toBeTruthy();
  });

  it('should handle logout and clear auth state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('test@example.com', 'password');
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.refreshToken).toBeNull();
  });

  it('should refresh access token when expired', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Login and get initial token
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    const initialAccessToken = result.current.accessToken;

    // Fast forward 61 seconds to expire the token
    await act(async () => {
      jest.advanceTimersByTime(61000);
    });

    // Trigger a refresh
    await act(async () => {
      const newToken = await result.current.refreshAccessToken();
      expect(newToken).toBeTruthy();
      expect(newToken).not.toBe(initialAccessToken);
    });

    expect(result.current.accessToken).not.toBe(initialAccessToken);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle refresh token expiration', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    // Fast forward 25 hours to expire both tokens
    await act(async () => {
      jest.advanceTimersByTime(25 * 60 * 60 * 1000);
    });

    // Attempt to refresh should fail
    await act(async () => {
      try {
        await result.current.refreshAccessToken();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    // Auth state should be cleared
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();
    expect(result.current.refreshToken).toBeNull();
  });
});