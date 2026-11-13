import { fireEvent, render } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { HeaderBanner } from '@api/headerBanners';
import HeaderAdvertisement from './HeaderAdvertisement';
it('replaces a failed campaign image and removes its link', () => {
  const banner = {title:'Campaign',linkUrl:'https://example.com',asset:{url:'/missing.png'}} as HeaderBanner;
  const {container,rerender}=render(<HeaderAdvertisement banner={banner} />);
  const initial=container.querySelector('img')!;
  fireEvent.error(initial);
  expect(container.querySelector('a')).toBeNull();
  expect(container.querySelector('img')?.src).toContain('greenmall-banner');
  expect(container.querySelector('img')?.alt).toBe('');
  rerender(<HeaderAdvertisement banner={{...banner,asset:{...banner.asset!,url:'/new.png'}}} />);
  expect(container.querySelector('a')).not.toBeNull();
  expect(container.querySelector('img')?.src).toContain('/new.png');
});
