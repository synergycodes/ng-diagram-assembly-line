import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sparkline.component.html',
  styleUrl: './sparkline.component.scss',
})
export class SparklineComponent {
  data = input.required<number[]>();
  color = input<string>('#6f7480');
  width = input<number>(100);
  height = input<number>(12);

  protected readonly path = computed<string | null>(() => {
    const d = this.data();
    if (!d || d.length < 2) {
      return null;
    }
    const w = this.width();
    const h = this.height();
    const min = Math.min(...d);
    const max = Math.max(...d);
    const range = max - min || 1;
    const stepX = w / (d.length - 1);
    return d
      .map((v, i) => {
        const x = i * stepX;
        const y = h - 1 - ((v - min) / range) * (h - 2);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  });
}
