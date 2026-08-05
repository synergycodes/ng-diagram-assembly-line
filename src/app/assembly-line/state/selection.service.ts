import { Injectable, signal } from '@angular/core';

@Injectable()
export class SelectionService {
  private readonly _selectedNodeId = signal<string | null>(null);
  readonly selectedNodeId = this._selectedNodeId.asReadonly();

  select(id: string | null) {
    this._selectedNodeId.set(id);
  }
}
