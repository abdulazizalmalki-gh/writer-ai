import { computed, Injectable, signal } from '@angular/core';

export type PageRecord = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
};

@Injectable({ providedIn: 'root' })
export class PagesStore {
  readonly pages = signal<PageRecord[]>([]);
  readonly selectedPageId = signal<string | null>(null);
  readonly selectedPage = computed(() =>
    this.pages().find((page) => page.id === this.selectedPageId())
  );

  private pendingContentSave: { pageId: string; content: string } | null = null;
  private pendingContentSaveTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly apiBase = '/api';

  constructor() {
    void this.hydrate();
  }

  async hydrate() {
    const response = await fetch(`${this.apiBase}/pages`);
    if (!response.ok) {
      throw new Error(`Failed to load pages: ${response.status}`);
    }

    const existing = (await response.json()) as PageRecord[];

    if (existing.length > 0) {
      this.pages.set(existing);
      this.selectedPageId.set(existing[0]!.id);
      return;
    }

    const created = await this.createPage({ title: 'Page 1', content: '' });
    this.pages.set([created]);
    this.selectedPageId.set(created.id);
  }

  select(pageId: string) {
    this.selectedPageId.set(pageId);
  }

  async addPage() {
    const nextNumber = this.pages().length + 1;

    const created = await this.createPage({ title: `Page ${nextNumber}`, content: '' });
    this.pages.update((existing) => [created, ...existing]);
    this.selectedPageId.set(created.id);
  }

  updateSelectedContent(content: string) {
    const selectedId = this.selectedPageId();
    if (!selectedId) return;

    const now = Date.now();
    this.pages.update((existing) =>
      existing.map((page) =>
        page.id === selectedId ? { ...page, content, updatedAt: now } : page
      )
    );

    this.queueContentSave(selectedId, content);
  }

  async rename(pageId: string, title: string) {
    const now = Date.now();

    this.pages.update((existing) =>
      existing.map((page) => (page.id === pageId ? { ...page, title, updatedAt: now } : page))
    );

    await this.patchPage(pageId, { title });
  }

  private queueContentSave(pageId: string, content: string) {
    this.pendingContentSave = { pageId, content };

    if (this.pendingContentSaveTimer) {
      clearTimeout(this.pendingContentSaveTimer);
    }

    this.pendingContentSaveTimer = setTimeout(() => {
      const pending = this.pendingContentSave;
      this.pendingContentSave = null;
      this.pendingContentSaveTimer = null;
      if (!pending) return;
      void this.patchPage(pending.pageId, { content: pending.content });
    }, 350);
  }

  private async createPage(input: { title: string; content: string }) {
    const response = await fetch(`${this.apiBase}/pages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error(`Failed to create page: ${response.status}`);
    }

    return (await response.json()) as PageRecord;
  }

  private async patchPage(pageId: string, patch: { title?: string; content?: string }) {
    const response = await fetch(`${this.apiBase}/pages/${encodeURIComponent(pageId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch)
    });

    if (!response.ok) {
      throw new Error(`Failed to update page: ${response.status}`);
    }

    return (await response.json()) as PageRecord;
  }
}
