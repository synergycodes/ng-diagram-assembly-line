import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FieldType, FieldTypeConfig, FormlyAttributes } from '@ngx-formly/core';

@Component({
  selector: 'flow-formly-input',
  imports: [ReactiveFormsModule, FormlyAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flow-input.type.html',
  styleUrl: './flow-field.scss',
})
export class FlowFormlyInputType extends FieldType<FieldTypeConfig> {}
