import { fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { customRender as render, screen } from '../../test/render.js';
import { ConfirmDialog } from './confirm-dialog.js';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    title: 'Delete Item',
    message: 'Are you sure you want to delete this item?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when open is false', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);

    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when open is true', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
  });

  it('displays title and message', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('renders default button labels', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders custom button labels', () => {
    render(
      <ConfirmDialog {...defaultProps} confirmLabel="Delete" cancelLabel="Nevermind" />,
    );

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nevermind' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    const { user } = render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const { user } = render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel when Escape key is pressed', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel when backdrop is clicked', async () => {
    const onCancel = vi.fn();
    const { user } = render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByTestId('confirm-dialog-backdrop'));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not call onCancel when dialog body is clicked (not backdrop)', async () => {
    const onCancel = vi.fn();
    const { user } = render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByTestId('confirm-dialog'));

    expect(onCancel).not.toHaveBeenCalled();
  });

  it('has alertdialog role', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('has correct aria attributes', () => {
    render(<ConfirmDialog {...defaultProps} />);

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'confirm-dialog-message');
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<ConfirmDialog {...defaultProps} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations in destructive mode', async () => {
    const { container } = render(<ConfirmDialog {...defaultProps} destructive />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
