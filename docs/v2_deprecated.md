# 📦 Tiptap Prompt Builder

Создам библиотеку для обработки контента из Tiptap Editor и преобразования его в структурированные промпты.

## Установка зависимостей

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-code-block-lowlight
npm install lowlight highlight.js
npm install -D @types/node
```

## Структура проекта

```
src/
├── index.ts
├── types.ts
├── parser.ts
├── formatter.ts
├── builder.ts
├── tiptap-extractor.ts
└── utils/
    ├── html-cleaner.ts
    └── text-normalizer.ts
```

## Код библиотеки

### `src/types.ts`

```typescript
import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';

export interface TiptapContent {
  text: string;
  html: string;
  json: JSONContent;
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

export interface TiptapMark {
  type: string;
  attrs?: Record<string, any>;
}

export interface ParsedTiptapContent {
  sections: ContentSection[];
  metadata: ContentMetadata;
  rawText: string;
  rawHtml: string;
  rawJson: JSONContent;
}

export interface ContentSection {
  id: string;
  type: SectionType;
  level?: number;
  title?: string;
  content: string;
  rawContent: TiptapNode[];
  children: ContentSection[];
  metadata?: Record<string, any>;
  position: {
    start: number;
    end: number;
  };
}

export enum SectionType {
  HEADING = 'heading',
  PARAGRAPH = 'paragraph',
  CODE_BLOCK = 'codeBlock',
  BLOCKQUOTE = 'blockquote',
  LIST = 'list',
  LIST_ITEM = 'listItem',
  TABLE = 'table',
  HORIZONTAL_RULE = 'horizontalRule',
  IMAGE = 'image',
  HARD_BREAK = 'hardBreak',
  CUSTOM = 'custom',
}

export interface ContentMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  variables?: PromptVariable[];
  codeBlocks?: CodeBlock[];
  links?: Link[];
  images?: Image[];
  customData?: Record<string, any>;
}

export interface PromptVariable {
  name: string;
  description?: string;
  defaultValue?: string;
  allowedValues?: string[];
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  position?: {
    sectionId: string;
    offset: number;
  };
}

export interface CodeBlock {
  id: string;
  language?: string;
  code: string;
  meta?: string;
  position: number;
}

export interface Link {
  text: string;
  href: string;
  title?: string;
  position: number;
}

export interface Image {
  src: string;
  alt?: string;
  title?: string;
  position: number;
}

export interface PromptBlock {
  type: 'text' | 'code' | 'list' | 'table' | 'quote' | 'instruction' | 'example';
  content: string;
  language?: string;
  variables?: PromptVariable[];
  metadata?: Record<string, any>;
}

export interface StructuredPrompt {
  metadata: ContentMetadata;
  systemPrompt?: string;
  userPrompt?: string;
  context?: string[];
  instructions?: string[];
  examples?: Example[];
  constraints?: string[];
  variables?: PromptVariable[];
  sections: Record<string, PromptBlock[]>;
  rawData?: {
    text: string;
    html: string;
    json: JSONContent;
  };
}

export interface Example {
  id: string;
  title?: string;
  input: string;
  output: string;
  explanation?: string;
}

export interface TiptapPromptBuilderOptions {
  extractMetadata?: boolean;
  extractVariables?: boolean;
  variablePattern?: RegExp;
  preserveFormatting?: boolean;
  stripHtml?: boolean;
  normalizeWhitespace?: boolean;
  extractCodeBlocks?: boolean;
  extractLinks?: boolean;
  extractImages?: boolean;
  sectionDetection?: SectionDetectionOptions;
  customParsers?: CustomParser[];
}

export interface SectionDetectionOptions {
  headingLevels?: number[];
  detectByKeywords?: boolean;
  keywords?: {
    system?: string[];
    user?: string[];
    instructions?: string[];
    examples?: string[];
    constraints?: string[];
  };
}

export interface CustomParser {
  name: string;
  nodeType: string;
  parse: (node: TiptapNode, context: ParserContext) => ContentSection | null;
}

export interface ParserContext {
  position: number;
  parentSection?: ContentSection;
  metadata: ContentMetadata;
}

export interface PromptTemplate {
  name: string;
  description?: string;
  structure: TemplateStructure;
  variables: PromptVariable[];
}

export interface TemplateStructure {
  systemPrompt?: string;
  sections: TemplateSectionConfig[];
}

export interface TemplateSectionConfig {
  name: string;
  required: boolean;
  type: SectionType;
  placeholder?: string;
}
```

### `src/utils/html-cleaner.ts`

```typescript
export class HtmlCleaner {
  /**
   * Удаляет HTML теги и возвращает чистый текст
   */
  static stripTags(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/ /g, ' ')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/&/g, '&')
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/—/g, '—')
      .replace(/–/g, '–');
  }

  /**
   * Извлекает текст с сохранением базового форматирования
   */
  static extractFormattedText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i>(.*?)<\/i>/gi, '*$1*')
      .replace(/<code>(.*?)<\/code>/gi, '`$1`')
      .replace(/<[^>]+>/g, '');
  }

  /**
   * Очищает и нормализует HTML
   */
  static normalize(html: string): string {
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  }
}
```

### `src/utils/text-normalizer.ts`

```typescript
export class TextNormalizer {
  /**
   * Нормализует пробелы в тексте
   */
  static normalizeWhitespace(text: string): string {
    return text
      .replace(/[\t ]+/g, ' ') // Множественные пробелы в один
      .replace(/\n{3,}/g, '\n\n') // Максимум 2 переноса строки
      .replace(/^\s+|\s+$/g, '') // Удалить пробелы в начале и конце
      .replace(/^ +/gm, ''); // Удалить пробелы в начале строк
  }

  /**
   * Удаляет лишние переносы строк
   */
  static removeExcessiveLineBreaks(text: string): string {
    return text
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
  }

  /**
   * Форматирует списки
   */
  static formatLists(text: string): string {
    const lines = text.split('\n');
    const formatted: string[] = [];
    let inList = false;

    for (const line of lines) {
      const trimmed = line.trim();
    
      if (trimmed.match(/^[-•*]\s+/)) {
        if (!inList) {
          formatted.push('');
          inList = true;
        }
        formatted.push(trimmed);
      } else if (trimmed.match(/^\d+\.\s+/)) {
        if (!inList) {
          formatted.push('');
          inList = true;
        }
        formatted.push(trimmed);
      } else {
        if (inList && trimmed.length > 0) {
          formatted.push('');
          inList = false;
        }
        formatted.push(line);
      }
    }

    return formatted.join('\n');
  }

  /**
   * Унифицирует маркеры списков
   */
  static unifyListMarkers(text: string): string {
    return text
      .replace(/^[*+]\s+/gm, '• ')
      .replace(/^(\d+)\.\s+/gm, '$1. ');
  }

  /**
   * Извлекает чистый текст из параграфа
   */
  static extractParagraphText(text: string): string {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Убрать жирный
      .replace(/\*([^*]+)\*/g, '$1') // Убрать курсив
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/`([^`]+)`/g, '$1') // Убрать inline code
      .trim();
  }
}
```

### `src/tiptap-extractor.ts`

```typescript
import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import type { TiptapContent } from './types';

export class TiptapExtractor {
  /**
   * Извлекает все форматы контента из Tiptap Editor
   */
  static extractContent(editor: Editor): TiptapContent {
    return {
      text: editor.getText(),
      html: editor.getHTML(),
      json: editor.getJSON(),
    };
  }

  /**
   * Извлекает только текст
   */
  static extractText(editor: Editor, separator: string = '\n\n'): string {
    // getText() возвращает текст с учетом структуры документа
    return editor.getText({ blockSeparator: separator });
  }

  /**
   * Извлекает HTML
   */
  static extractHTML(editor: Editor): string {
    return editor.getHTML();
  }

  /**
   * Извлекает JSON
   */
  static extractJSON(editor: Editor): JSONContent {
    return editor.getJSON();
  }

  /**
   * Извлекает контент между позициями
   */
  static extractRange(editor: Editor, from: number, to: number): TiptapContent {
    const { state } = editor;
    const slice = state.doc.slice(from, to);
  
    return {
      text: slice.content.textBetween(0, slice.content.size, '\n\n'),
      html: '', // Для HTML нужна дополнительная сериализация
      json: slice.toJSON() as JSONContent,
    };
  }

  /**
   * Получает позицию курсора
   */
  static getCursorPosition(editor: Editor): { from: number; to: number } {
    const { from, to } = editor.state.selection;
    return { from, to };
  }

  /**
   * Получает выделенный текст
   */
  static getSelectedText(editor: Editor): string {
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, '\n\n');
  }

  /**
   * Получает текущий узел под курсором
   */
  static getCurrentNode(editor: Editor): JSONContent | null {
    const { $from } = editor.state.selection;
    return $from.node().toJSON() as JSONContent;
  }

  /**
   * Ищет узлы по типу
   */
  static findNodesByType(json: JSONContent, type: string): JSONContent[] {
    const nodes: JSONContent[] = [];

    const traverse = (node: JSONContent) => {
      if (node.type === type) {
        nodes.push(node);
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };

    traverse(json);
    return nodes;
  }

  /**
   * Извлекает все заголовки
   */
  static extractHeadings(json: JSONContent): Array<{
    level: number;
    text: string;
    position?: number;
  }> {
    const headings: Array<{ level: number; text: string }> = [];

    const traverse = (node: JSONContent) => {
      if (node.type === 'heading' && node.attrs?.level) {
        const text = this.getNodeText(node);
        headings.push({
          level: node.attrs.level,
          text,
        });
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };

    traverse(json);
    return headings;
  }

  /**
   * Извлекает блоки кода
   */
  static extractCodeBlocks(json: JSONContent): Array<{
    language?: string;
    code: string;
  }> {
    const codeBlocks: Array<{ language?: string; code: string }> = [];

    const traverse = (node: JSONContent) => {
      if (node.type === 'codeBlock') {
        codeBlocks.push({
          language: node.attrs?.language,
          code: this.getNodeText(node),
        });
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };

    traverse(json);
    return codeBlocks;
  }

  /**
   * Извлекает все ссылки
   */
  static extractLinks(json: JSONContent): Array<{
    text: string;
    href: string;
    title?: string;
  }> {
    const links: Array<{ text: string; href: string; title?: string }> = [];

    const traverse = (node: JSONContent) => {
      if (node.marks) {
        const linkMark = node.marks.find((mark) => mark.type === 'link');
        if (linkMark && node.text) {
          links.push({
            text: node.text,
            href: linkMark.attrs?.href || '',
            title: linkMark.attrs?.title,
          });
        }
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };

    traverse(json);
    return links;
  }

  /**
   * Извлекает изображения
   */
  static extractImages(json: JSONContent): Array<{
    src: string;
    alt?: string;
    title?: string;
  }> {
    const images: Array<{ src: string; alt?: string; title?: string }> = [];

    const traverse = (node: JSONContent) => {
      if (node.type === 'image') {
        images.push({
          src: node.attrs?.src || '',
          alt: node.attrs?.alt,
          title: node.attrs?.title,
        });
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };

    traverse(json);
    return images;
  }

  /**
   * Получает текст из узла
   */
  static getNodeText(node: JSONContent): string {
    if (node.text) {
      return node.text;
    }

    if (node.content) {
      return node.content.map((child) => this.getNodeText(child)).join('');
    }

    return '';
  }

  /**
   * Подсчитывает слова в редакторе
   */
  static countWords(editor: Editor): number {
    const text = editor.getText();
    return text
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Подсчитывает символы
   */
  static countCharacters(editor: Editor, includeSpaces: boolean = true): number {
    const text = editor.getText();
    return includeSpaces ? text.length : text.replace(/\s/g, '').length;
  }
}
```

### `src/parser.ts`

```typescript
import type {
  JSONContent,
  ParsedTiptapContent,
  ContentSection,
  ContentMetadata,
  SectionType,
  TiptapPromptBuilderOptions,
  CodeBlock,
  Link,
  Image,
  PromptVariable,
  TiptapNode,
} from './types';
import { TiptapExtractor } from './tiptap-extractor';
import { HtmlCleaner } from './utils/html-cleaner';
import { TextNormalizer } from './utils/text-normalizer';
import type { Editor } from '@tiptap/react';

export class TiptapParser {
  private options: Required<TiptapPromptBuilderOptions>;

  constructor(options: TiptapPromptBuilderOptions = {}) {
    this.options = {
      extractMetadata: true,
      extractVariables: true,
      variablePattern: /\{\{([^}]+)\}\}|\$\{([^}]+)\}|\{([^}]+)\}/g,
      preserveFormatting: false,
      stripHtml: true,
      normalizeWhitespace: true,
      extractCodeBlocks: true,
      extractLinks: true,
      extractImages: true,
      sectionDetection: {
        headingLevels: [1, 2, 3, 4, 5, 6],
        detectByKeywords: true,
        keywords: {
          system: ['system', 'role', 'system prompt', 'системный промпт', 'роль'],
          user: ['user', 'prompt', 'user prompt', 'задача', 'запрос'],
          instructions: ['instructions', 'rules', 'guidelines', 'инструкции', 'правила'],
          examples: ['examples', 'example', 'примеры', 'пример'],
          constraints: ['constraints', 'limitations', 'ограничения'],
        },
      },
      customParsers: [],
      ...options,
    };
  }

  /**
   * Основной метод парсинга контента из Tiptap Editor
   */
  parse(editor: Editor): ParsedTiptapContent {
    const content = TiptapExtractor.extractContent(editor);
    const json = content.json;

    // Извлекаем метаданные
    const metadata = this.extractMetadata(editor, json);

    // Парсим секции
    const sections = this.parseSections(json, metadata);

    // Нормализуем текст
    let rawText = content.text;
    if (this.options.normalizeWhitespace) {
      rawText = TextNormalizer.normalizeWhitespace(rawText);
    }

    return {
      sections,
      metadata,
      rawText,
      rawHtml: content.html,
      rawJson: json,
    };
  }

  /**
   * Извлекает метаданные из контента
   */
  private extractMetadata(editor: Editor, json: JSONContent): ContentMetadata {
    const metadata: ContentMetadata = {
      customData: {},
    };

    if (!this.options.extractMetadata) {
      return metadata;
    }

    // Извлекаем заголовок (первый H1)
    const headings = TiptapExtractor.extractHeadings(json);
    const h1 = headings.find((h) => h.level === 1);
    if (h1) {
      metadata.title = h1.text;
    }

    // Извлекаем описание (первый параграф после заголовка)
    const firstParagraph = TiptapExtractor.findNodesByType(json, 'paragraph')[0];
    if (firstParagraph) {
      const text = TiptapExtractor.getNodeText(firstParagraph);
      if (text.length > 0 && text.length < 500) {
        metadata.description = text;
      }
    }

    // Извлекаем блоки кода
    if (this.options.extractCodeBlocks) {
      const codeBlocks = TiptapExtractor.extractCodeBlocks(json);
      metadata.codeBlocks = codeBlocks.map((block, index) => ({
        id: `code-${index}`,
        language: block.language,
        code: block.code,
        position: index,
      }));
    }

    // Извлекаем ссылки
    if (this.options.extractLinks) {
      const links = TiptapExtractor.extractLinks(json);
      metadata.links = links.map((link, index) => ({
        ...link,
        position: index,
      }));
    }

    // Извлекаем изображения
    if (this.options.extractImages) {
      const images = TiptapExtractor.extractImages(json);
      metadata.images = images.map((img, index) => ({
        ...img,
        position: index,
      }));
    }

    // Извлекаем переменные
    if (this.options.extractVariables) {
      const text = editor.getText();
      metadata.variables = this.extractVariables(text);
    }

    // Извлекаем теги из текста (например, #тег)
    const text = editor.getText();
    const tagMatches = text.match(/#([а-яa-z0-9_-]+)/gi);
    if (tagMatches) {
      metadata.tags = [...new Set(tagMatches.map((tag) => tag.substring(1)))];
    }

    return metadata;
  }

  /**
   * Парсит секции документа
   */
  private parseSections(
    json: JSONContent,
    metadata: ContentMetadata
  ): ContentSection[] {
    const sections: ContentSection[] = [];
    let position = 0;
    let sectionId = 0;

    const parseNode = (
      node: JSONContent,
      parent?: ContentSection
    ): ContentSection | null => {
      const section: ContentSection = {
        id: `section-${sectionId++}`,
        type: this.mapNodeTypeToSectionType(node.type || 'paragraph'),
        content: '',
        rawContent: [node as TiptapNode],
        children: [],
        position: {
          start: position,
          end: position,
        },
      };

      // Обработка заголовков
      if (node.type === 'heading' && node.attrs?.level) {
        section.level = node.attrs.level;
        section.title = TiptapExtractor.getNodeText(node);
        section.content = section.title;
      }
      // Обработка параграфов
      else if (node.type === 'paragraph') {
        section.content = TiptapExtractor.getNodeText(node);
      }
      // Обработка блоков кода
      else if (node.type === 'codeBlock') {
        section.content = TiptapExtractor.getNodeText(node);
        section.metadata = {
          language: node.attrs?.language,
        };
      }
      // Обработка списков
      else if (node.type === 'bulletList' || node.type === 'orderedList') {
        section.content = this.parseListContent(node);
      }
      // Обработка цитат
      else if (node.type === 'blockquote') {
        section.content = TiptapExtractor.getNodeText(node);
      }
      // Другие типы
      else {
        section.content = TiptapExtractor.getNodeText(node);
      }

      // Вычисляем позицию
      const contentLength = section.content.length;
      section.position.end = position + contentLength;
      position += contentLength + 1; // +1 для разделителя

      // Обрабатываем дочерние узлы
      if (node.content) {
        for (const childNode of node.content) {
          const childSection = parseNode(childNode, section);
          if (childSection) {
            section.children.push(childSection);
          }
        }
      }

      return section;
    };

    // Парсим корневые узлы
    if (json.content) {
      for (const node of json.content) {
        const section = parseNode(node);
        if (section) {
          sections.push(section);
        }
      }
    }

    return sections;
  }

  /**
   * Преобразует тип Tiptap узла в SectionType
   */
  private mapNodeTypeToSectionType(type: string): SectionType {
    const mapping: Record<string, SectionType> = {
      heading: SectionType.HEADING,
      paragraph: SectionType.PARAGRAPH,
      codeBlock: SectionType.CODE_BLOCK,
      blockquote: SectionType.BLOCKQUOTE,
      bulletList: SectionType.LIST,
      orderedList: SectionType.LIST,
      listItem: SectionType.LIST_ITEM,
      table: SectionType.TABLE,
      horizontalRule: SectionType.HORIZONTAL_RULE,
      image: SectionType.IMAGE,
      hardBreak: SectionType.HARD_BREAK,
    };

    return mapping[type] || SectionType.CUSTOM;
  }

  /**
   * Парсит содержимое списка
   */
  private parseListContent(node: JSONContent): string {
    const items: string[] = [];
  
    const traverse = (n: JSONContent, level: number = 0) => {
      if (n.type === 'listItem') {
        const indent = '  '.repeat(level);
        const marker = node.type === 'orderedList' ? '1.' : '•';
        const text = TiptapExtractor.getNodeText(n);
        items.push(`${indent}${marker} ${text}`);
      }
    
      if (n.content) {
        for (const child of n.content) {
          const newLevel = child.type === 'bulletList' || child.type === 'orderedList' 
            ? level + 1 
            : level;
          traverse(child, newLevel);
        }
      }
    };

    traverse(node);
    return items.join('\n');
  }

  /**
   * Извлекает переменные из текста
   */
  private extractVariables(text: string): PromptVariable[] {
    const variables = new Map<string, PromptVariable>();
    const pattern = this.options.variablePattern;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      // Проверяем все группы захвата
      const varName = match[1] || match[2] || match[3];
      if (varName && !variables.has(varName)) {
        const trimmed = varName.trim();
      
        // Определяем тип переменной по имени
        let type: PromptVariable['type'] = 'string';
        if (trimmed.toLowerCase().includes('count') || trimmed.toLowerCase().includes('number')) {
          type = 'number';
        } else if (trimmed.toLowerCase().includes('is') || trimmed.toLowerCase().includes('has')) {
          type = 'boolean';
        } else if (trimmed.toLowerCase().includes('list') || trimmed.toLowerCase().includes('array')) {
          type = 'array';
        }

        variables.set(trimmed, {
          name: trimmed,
          type,
          required: true,
        });
      }
    }

    return Array.from(variables.values());
  }

  /**
   * Находит секцию по заголовку
   */
  findSectionByTitle(
    sections: ContentSection[],
    title: string | RegExp
  ): ContentSection | undefined {
    const search = (secs: ContentSection[]): ContentSection | undefined => {
      for (const section of secs) {
        if (section.title) {
          const matches =
            typeof title === 'string'
              ? section.title.toLowerCase().includes(title.toLowerCase())
              : title.test(section.title);

          if (matches) {
            return section;
          }
        }

        if (section.children.length > 0) {
          const found = search(section.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    return search(sections);
  }

  /**
   * Находит секции по типу
   */
  findSectionsByType(
    sections: ContentSection[],
    type: SectionType
  ): ContentSection[] {
    const results: ContentSection[] = [];

    const search = (secs: ContentSection[]) => {
      for (const section of secs) {
        if (section.type === type) {
          results.push(section);
        }
        if (section.children.length > 0) {
          search(section.children);
        }
      }
    };

    search(sections);
    return results;
  }
}
```

### `src/builder.ts`

```typescript
import type {
  ParsedTiptapContent,
  StructuredPrompt,
  ContentSection,
  SectionType,
  PromptBlock,
  Example,
  TiptapPromptBuilderOptions,
} from './types';
import { TiptapParser } from './parser';
import { TextNormalizer } from './utils/text-normalizer';
import type { Editor } from '@tiptap/react';

export class TiptapPromptBuilder {
  private parser: TiptapParser;

  constructor(options: TiptapPromptBuilderOptions = {}) {
    this.parser = new TiptapParser(options);
  }

  /**
   * Строит структурированный промпт из Tiptap Editor
   */
  build(editor: Editor): StructuredPrompt {
    const parsed = this.parser.parse(editor);

    return {
      metadata: parsed.metadata,
      systemPrompt: this.extractSystemPrompt(parsed),
      userPrompt: this.extractUserPrompt(parsed),
      context: this.extractContext(parsed),
      instructions: this.extractInstructions(parsed),
      examples: this.extractExamples(parsed),
      constraints: this.extractConstraints(parsed),
      variables: parsed.metadata.variables || [],
      sections: this.buildPromptSections(parsed),
      rawData: {
        text: parsed.rawText,
        html: parsed.rawHtml,
        json: parsed.rawJson,
      },
    };
  }

  /**
   * Извлекает системный промпт
   */
  private extractSystemPrompt(parsed: ParsedTiptapContent): string | undefined {
    const keywords = ['system', 'role', 'система', 'роль'];
    const section = this.findSectionByKeywords(parsed.sections, keywords);

    if (section) {
      return this.formatSectionContent(section);
    }

    return undefined;
  }

  /**
   * Извлекает пользовательский промпт
   */
  private extractUserPrompt(parsed: ParsedTiptapContent): string | undefined {
    const keywords = ['user', 'prompt', 'task', 'задача', 'запрос'];
    const section = this.findSectionByKeywords(parsed.sections, keywords);

    if (section) {
      return this.formatSectionContent(section);
    }

    return undefined;
  }

  /**
   * Извлекает контекст
   */
  private extractContext(parsed: ParsedTiptapContent): string[] {
    const keywords = ['context', 'background', 'контекст', 'предыстория'];
    const section = this.findSectionByKeywords(parsed.sections, keywords);

    if (!section) return [];

    return this.extractListItems(section);
  }

  /**
   * Извлекает инструкции
   */
  private extractInstructions(parsed: ParsedTiptapContent): string[] {
    const keywords = ['instructions', 'rules', 'guidelines', 'инструкции', 'правила'];
    const section = this.findSectionByKeywords(parsed.sections, keywords);

    if (!section) return [];

    return this.extractListItems(section);
  }

  /**
   * Извлекает примеры
   */
  private extractExamples(parsed: ParsedTiptapContent): Example[] {
    const keywords = ['examples', 'example', 'примеры', 'пример'];
    const section = this.findSectionByKeywords(parsed.sections, keywords);

    if (!section) return [];

    const examples: Example[] = [];
    const codeBlocks = this.findCodeBlocksInSection(section);

    // Предполагаем, что примеры идут парами: input -> output
    for (let i = 0; i < codeBlocks.length; i += 2) {
      if (i + 1 < codeBlocks.length) {
        examples.push({
          id: `example-${examples.length}`,
          input: codeBlocks[i].content,
          output: codeBlocks[i + 1].content,
        });
      }
    }

    // Также ищем примеры в подсекциях
    for (const child of section.children) {
      if (child.type === SectionType.HEADING && child.level && child.level > 2) {
        const childCodeBlocks = this.findCodeBlocksInSection(child);
        if (childCodeBlocks.length >= 2) {
          examples.push({
            id: `example-${examples.length}`,
            title: child.title,
            input: childCodeBlocks[0].content,
            output: childCodeBlocks[1].content,
            explanation: child.content,
          });
        }
      }
    }

    return examples;
  }

  /**
   * Извлекает ограничения
   */
  private extractConstraints(parsed: ParsedTiptapContent): string[] {
    const keywords = ['constraints', 'limitations', 'ограничения', 'лимиты'];
    const section = this.findSectionByKeywords(parsed.sections, keywords);

    if (!section) return [];

    return this.extractListItems(section);
  }

  /**
   * Строит секции промпта
   */
  private buildPromptSections(
    parsed: ParsedTiptapContent
  ): Record<string, PromptBlock[]> {
    const sections: Record<string, PromptBlock[]> = {};

    for (const section of parsed.sections) {
      if (section.type === SectionType.HEADING && section.title) {
        const sectionName = this.normalizeSectionName(section.title);
        sections[sectionName] = this.buildBlocksFromSection(section);
      }
    }

    return sections;
  }

  /**
   * Строит блоки из секции
   */
  private buildBlocksFromSection(section: ContentSection): PromptBlock[] {
    const blocks: PromptBlock[] = [];

    // Добавляем контент самой секции
    if (section.content && section.type !== SectionType.HEADING) {
      blocks.push(this.createPromptBlock(section));
    }

    // Добавляем дочерние секции
    for (const child of section.children) {
      blocks.push(...this.buildBlocksFromSection(child));
    }

    return blocks;
  }

  /**
   * Создает блок промпта из секции
   */
  private createPromptBlock(section: ContentSection): PromptBlock {
    let type: PromptBlock['type'] = 'text';

    if (section.type === SectionType.CODE_BLOCK) {
      type = 'code';
    } else if (section.type === SectionType.LIST) {
      type = 'list';
    } else if (section.type === SectionType.TABLE) {
      type = 'table';
    } else if (section.type === SectionType.BLOCKQUOTE) {
      type = 'quote';
    }

    return {
      type,
      content: section.content,
      language: section.metadata?.language,
      metadata: section.metadata,
    };
  }

  /**
   * Находит секцию по ключевым словам
   */
  private findSectionByKeywords(
    sections: ContentSection[],
    keywords: string[]
  ): ContentSection | undefined {
    for (const section of sections) {
      if (section.title) {
        const title = section.title.toLowerCase();
        if (keywords.some((kw) => title.includes(kw.toLowerCase()))) {
          return section;
        }
      }

      // Рекурсивный поиск
      if (section.children.length > 0) {
        const found = this.findSectionByKeywords(section.children, keywords);
        if (found) return found;
      }
    }

    return undefined;
  }

  /**
   * Извлекает элементы списка из секции
   */
  private extractListItems(section: ContentSection): string[] {
    const items: string[] = [];

    const extract = (sec: ContentSection) => {
      if (sec.type === SectionType.LIST) {
        const lines = sec.content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.match(/^[•\-*\d.]\s+/)) {
            items.push(trimmed.replace(/^[•\-*\d.]\s+/, ''));
          }
        }
      }

      for (const child of sec.children) {
        extract(child);
      }
    };

    extract(section);
    return items;
  }

  /**
   * Находит блоки кода в секции
   */
  private findCodeBlocksInSection(section: ContentSection): ContentSection[] {
    const codeBlocks: ContentSection[] = [];

    const search = (sec: ContentSection) => {
      if (sec.type === SectionType.CODE_BLOCK) {
        codeBlocks.push(sec);
      }
      for (const child of sec.children) {
        search(child);
      }
    };

    search(section);
    return codeBlocks;
  }

  /**
   * Форматирует содержимое секции
   */
  private formatSectionContent(section: ContentSection): string {
    let content = section.content;

    // Собираем контент из дочерних секций
    for (const child of section.children) {
      if (child.type !== SectionType.HEADING) {
        content += '\n' + child.content;
      }
    }

    return TextNormalizer.normalizeWhitespace(content);
  }

  /**
   * Нормализует название секции
   */
  private normalizeSectionName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-zа-я0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Преобразует структурированный промпт в текст
   */
  toString(
    prompt: StructuredPrompt,
    variables?: Record<string, string>
  ): string {
    const parts: string[] = [];

    // Системный промпт
    if (prompt.systemPrompt) {
      parts.push('# System\n');
      parts.push(prompt.systemPrompt);
      parts.push('\n');
    }

    // Контекст
    if (prompt.context && prompt.context.length > 0) {
      parts.push('# Context\n');
      prompt.context.forEach((ctx) => {
        parts.push(`• ${ctx}`);
      });
      parts.push('\n');
    }

    // Инструкции
    if (prompt.instructions && prompt.instructions.length > 0) {
      parts.push('# Instructions\n');
      prompt.instructions.forEach((inst, i) => {
        parts.push(`${i + 1}. ${inst}`);
      });
      parts.push('\n');
    }

    // Ограничения
    if (prompt.constraints && prompt.constraints.length > 0) {
      parts.push('# Constraints\n');
      prompt.constraints.forEach((cons) => {
        parts.push(`• ${cons}`);
      });
      parts.push('\n');
    }

    // Пользовательский промпт
    if (prompt.userPrompt) {
      parts.push('# Task\n');
      parts.push(prompt.userPrompt);
      parts.push('\n');
    }

    // Примеры
    if (prompt.examples && prompt.examples.length > 0) {
      parts.push('# Examples\n');
      prompt.examples.forEach((ex, i) => {
        if (ex.title) {
          parts.push(`## ${ex.title}\n`);
        } else {
          parts.push(`## Example ${i + 1}\n`);
        }
        parts.push(`Input:\n${ex.input}\n`);
        parts.push(`Output:\n${ex.output}\n`);
        if (ex.explanation) {
          parts.push(`Explanation: ${ex.explanation}\n`);
        }
      });
      parts.push('\n');
    }

    let result = parts.join('\n');

    // Заменяем переменные
    if (variables) {
      result = this.replaceVariables(result, variables);
    }

    return TextNormalizer.normalizeWhitespace(result);
  }

  /**
   * Заменяет переменные в тексте
   */
  private replaceVariables(
    text: string,
    variables: Record<string, string>
  ): string {
    let result = text;

    for (const [key, value] of Object.entries(variables)) {
      // Поддерживаем разные форматы переменных
      const patterns = [
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        new RegExp(`\\$\\{${key}\\}`, 'g'),
        new RegExp(`\\{${key}\\}`, 'g'),
      ];

      for (const pattern of patterns) {
        result = result.replace(pattern, value);
      }
    }

    return result;
  }
}
```

### `src/index.ts`

```typescript
export { TiptapExtractor } from './tiptap-extractor';
export { TiptapParser } from './parser';
export { TiptapPromptBuilder } from './builder';
export { HtmlCleaner } from './utils/html-cleaner';
export { TextNormalizer } from './utils/text-normalizer';

export type {
  TiptapContent,
  TiptapNode,
  TiptapMark,
  ParsedTiptapContent,
  ContentSection,
  ContentMetadata,
  PromptVariable,
  CodeBlock,
  Link,
  Image,
  PromptBlock,
  StructuredPrompt,
  Example,
  TiptapPromptBuilderOptions,
  SectionDetectionOptions,
  CustomParser,
  ParserContext,
  PromptTemplate,
  SectionType,
} from './types';

import type { Editor } from '@tiptap/react';
import { TiptapPromptBuilder } from './builder';
import type { TiptapPromptBuilderOptions, StructuredPrompt } from './types';

/**
 * Быстрое создание структурированного промпта из Tiptap Editor
 */
export function buildPromptFromTiptap(
  editor: Editor,
  options?: TiptapPromptBuilderOptions
): StructuredPrompt {
  const builder = new TiptapPromptBuilder(options);
  return builder.build(editor);
}

/**
 * Быстрое создание текстового промпта из Tiptap Editor
 */
export function buildPromptText(
  editor: Editor,
  variables?: Record<string, string>,
  options?: TiptapPromptBuilderOptions
): string {
  const builder = new TiptapPromptBuilder(options);
  const structured = builder.build(editor);
  return builder.toString(structured, variables);
}
```

## Примеры использования

### `examples/basic-tiptap.tsx`

```typescript
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight';
import { buildPromptFromTiptap, buildPromptText } from '../src';

function MyEditor() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: `
      <h1>Code Review Assistant</h1>
    
      <h2>System</h2>
      <p>You are a senior software engineer specialized in code review.</p>
    
      <h2>Instructions</h2>
      <ul>
        <li>Check for bugs and errors</li>
        <li>Suggest improvements</li>
        <li>Follow best practices</li>
      </ul>
    
      <h2>Task</h2>
      <p>Review this {{language}} code:</p>
    
      <pre><code class="language-typescript">{{code}}</code></pre>
    
      <h2>Examples</h2>
    
      <h3>Example 1</h3>
      <pre><code>function add(a, b) { return a + b; }</code></pre>
      <pre><code>// Missing type annotations
function add(a: number, b: number): number {
  return a + b;
}</code></pre>
    `,
  });

  const handleBuildPrompt = () => {
    if (!editor) return;

    // Структурированный промпт
    const structured = buildPromptFromTiptap(editor, {
      extractVariables: true,
      extractCodeBlocks: true,
    });

    console.log('Structured:', structured);

    // Текстовый промпт с переменными
    const text = buildPromptText(
      editor,
      {
        language: 'typescript',
        code: 'const x = 5;',
      }
    );

    console.log('Text:', text);
  };

  return (
    <div>
      <EditorContent editor={editor} />
      <button onClick={handleBuildPrompt}>Build Prompt</button>
    </div>
  );
}
```

### `examples/advanced-tiptap.tsx`

```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TiptapParser, TiptapPromptBuilder, TiptapExtractor } from '../src';

function AdvancedEditor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
  });

  const analyzeContent = () => {
    if (!editor) return;

    // Извлечение базового контента
    const content = TiptapExtractor.extractContent(editor);
    console.log('Text:', content.text);
    console.log('HTML:', content.html);
    console.log('JSON:', content.json);

    // Парсинг с опциями
    const parser = new TiptapParser({
      extractVariables: true,
      variablePattern: /\{\{([^}]+)\}\}/g,
      normalizeWhitespace: true,
    });

    const parsed = parser.parse(editor);
    console.log('Sections:', parsed.sections);
    console.log('Variables:', parsed.metadata.variables);
    console.log('Code Blocks:', parsed.metadata.codeBlocks);

    // Построение промпта
    const builder = new TiptapPromptBuilder();
    const prompt = builder.build(editor);

    console.log('System Prompt:', prompt.systemPrompt);
    console.log('User Prompt:', prompt.userPrompt);
    console.log('Instructions:', prompt.instructions);
    console.log('Examples:', prompt.examples);

    // Экспорт в текст
    const finalText = builder.toString(prompt, {
      name: 'John',
      task: 'Write tests',
    });

    console.log('Final:', finalText);
  };

  return (
    <div>
      <EditorContent editor={editor} />
      <button onClick={analyzeContent}>Analyze</button>
    </div>
  );
}
```

### `examples/realtime-analysis.tsx`

```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useState, useEffect } from 'react';
import { TiptapExtractor, buildPromptFromTiptap } from '../src';

function RealtimeAnalysis() {
  const [stats, setStats] = useState({
    words: 0,
    characters: 0,
    variables: 0,
    sections: 0,
  });

  const editor = useEditor({
    extensions: [StarterKit],
    onUpdate: ({ editor }) => {
      // Обновляем статистику в реальном времени
      const words = TiptapExtractor.countWords(editor);
      const characters = TiptapExtractor.countCharacters(editor);

      const prompt = buildPromptFromTiptap(editor);
      const variables = prompt.variables?.length || 0;
      const sections = Object.keys(prompt.sections).length;

      setStats({ words, characters, variables, sections });
    },
  });

  return (
    <div>
      <EditorContent editor={editor} />
      <div className="stats">
        <div>Words: {stats.words}</div>
        <div>Characters: {stats.characters}</div>
        <div>Variables: {stats.variables}</div>
        <div>Sections: {stats.sections}</div>
      </div>
    </div>
  );
}
```

## Ключевые возможности

✅ **Работа с Tiptap Editor** - прямая интеграция с `editor.getText()`, `getHTML()`, `getJSON()`
✅ **Извлечение структуры** - автоматическое определение секций, заголовков, списков
✅ **Переменные** - поддержка `{{var}}`, `${var}`, `{var}`
✅ **Блоки кода** - извлечение с определением языка
✅ **Метаданные** - автоматическое извлечение заголовка, описания, тегов
✅ **Примеры** - парсинг input/output пар
✅ **Real-time анализ** - подсчет слов, символов, переменных
✅ **Гибкая конфигурация** - множество опций настройки
✅ **TypeScript** - полная типизация

Библиотека готова к использованию с Tiptap! 🚀
