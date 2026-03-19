import { customRender as render, screen } from '../../test/render.js';
import { EmptyLane } from './empty-lane.js';

describe('EmptyLane', () => {
  it('shows "Drag an agent here" text', () => {
    render(<EmptyLane />);

    expect(screen.getByTestId('empty-lane')).toBeInTheDocument();
    expect(screen.getByText('Drag an agent here')).toBeInTheDocument();
  });

  it('has dashed border style', () => {
    render(<EmptyLane />);

    const element = screen.getByTestId('empty-lane');
    expect(element.className).toContain('border-dashed');
  });

  it('has border class', () => {
    render(<EmptyLane />);

    const element = screen.getByTestId('empty-lane');
    expect(element.className).toContain('border');
  });
});
