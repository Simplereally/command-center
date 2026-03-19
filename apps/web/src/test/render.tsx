import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { type ReactElement } from 'react';
import { BrowserRouter } from 'react-router';

function AllProviders({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

export function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>): RenderResult & { user: UserEvent } {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  };
}

export { screen, within, waitFor, act } from '@testing-library/react';
