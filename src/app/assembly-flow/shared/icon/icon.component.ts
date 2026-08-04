import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICONS, type IconName } from './icon-registry';

/**
 * Renders a named glyph from the shared {@link ICONS} registry as an inline SVG,
 * so it inherits `currentColor` and responds to CSS exactly like text. Use this
 * instead of pasting SVG markup into feature templates.
 *
 * Each icon is a single `<path>` on a `0 0 24 24` grid, so the `d` binds directly
 * — no inner-markup injection or sanitizer bypass.
 *
 * - `size` sets a square px box; omit it to let CSS size the host (e.g. a drag
 *   handle that stretches the icon to `100%`).
 * - a `class` on `<app-icon>` lands on the host element, so existing icon CSS
 *   (rotation, color, transitions) keeps working after the swap.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    [attr.stroke-width]="def().strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="def().path" />
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
  host: {
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
})
export class IconComponent {
  protected readonly def = computed(() => ICONS[this.name()]);

  readonly name = input.required<IconName>();
  readonly size = input<number>();
}
