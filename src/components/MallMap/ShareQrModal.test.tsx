import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShareQrModal, type ShareQrModalProps } from './ShareQrModal';

const defaults: ShareQrModalProps = {
  lang: 'ru',
  shareToken: 'token',
  shareLoading: false,
  shareError: null,
  shareUrl: 'https://mall.example/#/route/token',
  onClose: vi.fn(),
};

describe('ShareQrModal', () => {
  it('stays hidden when sharing has not started', () => {
    const { container } = render(<ShareQrModal {...defaults} shareToken={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a modal and closes from its button', () => {
    const onClose = vi.fn();
    render(<ShareQrModal {...defaults} onClose={onClose} />);

    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows an error instead of a QR code for a loopback URL', () => {
    render(<ShareQrModal {...defaults} shareUrl="http://localhost:5173/#/route/token" />);
    expect(screen.getByRole('alert')).toHaveTextContent('с телефона не откроется');
  });

  it('announces API errors', () => {
    render(<ShareQrModal {...defaults} shareToken={null} shareError="Не удалось создать код" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось создать код');
  });
});
