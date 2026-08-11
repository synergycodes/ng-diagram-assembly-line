import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FieldType, FieldTypeConfig, FormlyAttributes } from '@ngx-formly/core';

@Component({
  selector: 'app-formly-input',
  imports: [ReactiveFormsModule, FormlyAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formly-input.component.html',
  styleUrl: './formly-field.scss',
})
export class FormlyInputComponent extends FieldType<FieldTypeConfig> {}
