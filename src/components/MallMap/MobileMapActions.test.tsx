import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MobileMapActions } from './MobileMapActions';

describe('MobileMapActions', () => {
  it('opens the function list and delegates every action', () => {
    const onToggle = vi.fn();
    const onOpenCategories = vi.fn();
    const onToggleLanguage = vi.fn();
    const onOpenRouteBuilder = vi.fn();

    const { rerender } = render(
      <MobileMapActions
        lang="ru"
        open={false}
        onToggle={onToggle}
        onOpenCategories={onOpenCategories}
        onToggleLanguage={onToggleLanguage}
        onOpenRouteBuilder={onOpenRouteBuilder}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Меню карты' }));
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(
      <MobileMapActions
        lang="ru"
        open
        onToggle={onToggle}
        onOpenCategories={onOpenCategories}
        onToggleLanguage={onToggleLanguage}
        onOpenRouteBuilder={onOpenRouteBuilder}
      />,
    );

    fireEvent.click(screen.getByRole('menuitem', { name: /Категории и поиск/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Язык: Русский/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Маршрут между магазинами/ }));

    expect(onOpenCategories).toHaveBeenCalledOnce();
    expect(onToggleLanguage).toHaveBeenCalledOnce();
    expect(onOpenRouteBuilder).toHaveBeenCalledOnce();
  });
});
