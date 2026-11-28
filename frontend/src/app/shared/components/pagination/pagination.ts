import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  computed,
  input,
  output,
  signal
} from "@angular/core";

export interface PaginationState<T> {
  readonly pageIndex: Signal<number>;
  readonly pageSize: Signal<number>;
  readonly totalItems: Signal<number>;
  readonly totalPages: Signal<number>;
  readonly safePageIndex: Signal<number>;
  readonly items: Signal<readonly T[]>;
  setPage(index: number): void;
  setPageSize(size: number): void;
  reset(): void;
}

export function createPagination<T>(
  source: () => readonly T[],
  initialPageSize = 10
): PaginationState<T> {
  const pageIndex = signal(0);
  const pageSize = signal(Math.max(1, initialPageSize));

  const totalItems = computed(() => source().length);
  const totalPages = computed(() => Math.max(1, Math.ceil(totalItems() / pageSize())));
  const safePageIndex = computed(() =>
    Math.min(Math.max(0, pageIndex()), Math.max(0, totalPages() - 1))
  );
  const items = computed(() => {
    const list = source();
    const size = pageSize();
    const start = safePageIndex() * size;
    return list.slice(start, start + size);
  });

  return {
    pageIndex: pageIndex.asReadonly(),
    pageSize: pageSize.asReadonly(),
    totalItems,
    totalPages,
    safePageIndex,
    items,
    setPage(index: number) {
      const maxPage = Math.max(0, totalPages() - 1);
      const next = Math.min(Math.max(0, Math.trunc(index)), maxPage);
      pageIndex.set(next);
    },
    setPageSize(size: number) {
      const nextSize = Math.max(1, Math.trunc(size));
      pageSize.set(nextSize);
      pageIndex.set(0);
    },
    reset() {
      pageIndex.set(0);
    }
  };
}

export type PageToken = number | "ellipsis";

@Component({
  selector: "app-pagination",
  templateUrl: "./pagination.html",
  styleUrl: "./pagination.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginationComponent {
  readonly totalItems = input.required<number>();
  readonly pageIndex = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly pageSizeOptions = input<number[]>([5, 10, 20, 50]);
  readonly compact = input<boolean>(false);
  readonly hideOnSinglePage = input<boolean>(false);
  readonly itemLabel = input<string>("items");

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(Math.max(0, this.totalItems()) / Math.max(1, this.pageSize())))
  );

  readonly safePageIndex = computed(() =>
    Math.min(Math.max(0, this.pageIndex()), this.totalPages() - 1)
  );

  readonly shouldRender = computed(() =>
    this.totalItems() > 0 && (!this.hideOnSinglePage() || this.totalPages() > 1)
  );

  readonly startItem = computed(() =>
    this.totalItems() === 0 ? 0 : this.safePageIndex() * Math.max(1, this.pageSize()) + 1
  );

  readonly endItem = computed(() =>
    Math.min(this.totalItems(), (this.safePageIndex() + 1) * Math.max(1, this.pageSize()))
  );

  readonly isFirstPage = computed(() => this.safePageIndex() <= 0);
  readonly isLastPage = computed(() => this.safePageIndex() >= this.totalPages() - 1);

  readonly pageTokens = computed<PageToken[]>(() => {
    const total = this.totalPages();
    const current = this.safePageIndex();

    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i);
    }

    const pages = new Set<number>([0, total - 1, current - 1, current, current + 1]);
    const sorted = Array.from(pages)
      .filter((p) => p >= 0 && p < total)
      .sort((a, b) => a - b);

    const tokens: PageToken[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
        tokens.push("ellipsis");
      }
      tokens.push(sorted[i]);
    }
    return tokens;
  });

  goToPage(index: number) {
    const clamped = Math.min(Math.max(0, index), this.totalPages() - 1);
    if (clamped !== this.safePageIndex()) {
      this.pageChange.emit(clamped);
    }
  }

  onPageSizeSelect(event: Event) {
    const value = Number((event.target as HTMLSelectElement).value);
    if (Number.isFinite(value) && value > 0) {
      this.pageSizeChange.emit(value);
    }
  }
}
