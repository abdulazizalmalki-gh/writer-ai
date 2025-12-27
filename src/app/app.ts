import { Component } from '@angular/core';
import { PagesStore } from './pages.store';
import { marked } from 'marked';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected renamingPageId: string | null = null;
  protected openPageMenuId: string | null = null;
  protected showMarkdownPreview = true;

  constructor(protected readonly pagesStore: PagesStore) {}

  protected get pages() {
    return this.pagesStore.pages;
  }

  protected get selectedPageId() {
    return this.pagesStore.selectedPageId;
  }

  protected get selectedPage() {
    return this.pagesStore.selectedPage;
  }

  protected selectPage(pageId: string) {
    this.pagesStore.select(pageId);
  }

  protected addPage() {
    void this.pagesStore.addPage();
  }

  protected renamePage(pageId: string, title: string) {
    this.pagesStore.rename(pageId, title);
  }

  protected startRenaming(pageId: string) {
    this.openPageMenuId = null;
    this.renamingPageId = pageId;
  }

  protected stopRenaming() {
    this.renamingPageId = null;
  }

  protected togglePageMenu(pageId: string) {
    this.openPageMenuId = this.openPageMenuId === pageId ? null : pageId;
  }

  protected closePageMenu() {
    this.openPageMenuId = null;
  }

  protected updateSelectedContent(value: string) {
    this.pagesStore.updateSelectedContent(value);
  }

  protected toggleMarkdownPreview() {
    this.showMarkdownPreview = !this.showMarkdownPreview;
  }

  protected onEditorKeydown(event: KeyboardEvent, textarea: HTMLTextAreaElement) {
    if (event.key !== 'Enter') return;
    if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;

    const value = textarea.value;
    const caret = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? caret;
    if (caret !== selectionEnd) return;

    const lineStart = value.lastIndexOf('\n', Math.max(0, caret - 1)) + 1;
    const lineEndIndex = value.indexOf('\n', caret);
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
    const line = value.slice(lineStart, lineEnd);

    // Match: optional indentation + (- or *) + space + rest
    const match = line.match(/^(\s*)([-*])\s(.*)$/);
    if (!match) return;

    event.preventDefault();

    const indent = match[1] ?? '';
    const marker = match[2] ?? '-';
    const rest = (match[3] ?? '').trim();

    const before = value.slice(0, caret);
    const after = value.slice(caret);

    // If current bullet is empty, exit the list by inserting a plain newline (keep indentation).
    const insertion = rest.length === 0 ? `\n${indent}` : `\n${indent}${marker} `;
    const nextValue = `${before}${insertion}${after}`;
    const nextCaret = caret + insertion.length;

    textarea.value = nextValue;
    this.updateSelectedContent(nextValue);
    textarea.setSelectionRange(nextCaret, nextCaret);
  }

  protected renderMarkdown(source: string) {
    const normalized = (source ?? '').toString();

    // Markdown collapses runs of blank lines. For a writing app, it can feel
    // confusing when the preview doesn't reflect the editor's vertical spacing.
    // We preserve extra blank lines by inserting <br /> lines, but avoid
    // modifying fenced code blocks.
    const lines = normalized.split(/\r?\n/);
    let inFence = false;
    let pendingBlankLines = 0;
    const withPreservedSpacing: string[] = [];

    const flushBlankLines = () => {
      if (pendingBlankLines <= 0) return;

      // Keep one blank line as a true markdown blank line.
      withPreservedSpacing.push('');

      // Make every blank line visible in the preview.
      // IMPORTANT: a raw HTML line like <br /> can start an "HTML block" in
      // CommonMark, which would prevent later markdown (like headings) from
      // being parsed until a blank line occurs. So we always follow each spacer
      // with a blank line to terminate the HTML block.
      for (let i = 0; i < pendingBlankLines; i++) {
        withPreservedSpacing.push('<br />');
        withPreservedSpacing.push('');
      }

      pendingBlankLines = 0;
    };

    for (const line of lines) {
      const trimmed = line.trim();
      const isFence = /^(```|~~~)/.test(trimmed);
      if (isFence) {
        flushBlankLines();
        inFence = !inFence;
        withPreservedSpacing.push(line);
        continue;
      }

      if (!inFence && trimmed.length === 0) {
        pendingBlankLines++;
        continue;
      }

      flushBlankLines();
      withPreservedSpacing.push(line);
    }
    flushBlankLines();

    return marked.parse(withPreservedSpacing.join('\n'), {
      gfm: true,
      breaks: true
    }) as string;
  }
}
