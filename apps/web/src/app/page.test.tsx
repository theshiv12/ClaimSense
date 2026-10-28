import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Home from './page';

describe('web smoke', () => {
  it('TC-SMOKE-03 home page renders the app name', () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain('<h1');
    expect(html).toContain('ClaimSense');
  });
});
