import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { ProductService } from './product.service';

export interface CatalogItem {
  brand: string;
  catalog: string;
}

export interface CatalogState {
  brands: string[];
  catalogs: CatalogItem[];
}

const STORAGE_KEY = 'lalastorevip_catalog_state';
const LEGACY_BRANDS_KEY = 'admin-brands';
const LEGACY_CATALOGS_KEY = 'admin-catalogs-by-brand';

const DEFAULT_STATE: CatalogState = {
  brands: ['Cashier', 'Esmeral', 'Kaele', 'Mysk', 'Rock Lola', 'Outras Peças'],
  catalogs: [
    { brand: 'Esmeral', catalog: 'Summer Dream' },
    { brand: 'Esmeral', catalog: 'A Summer with Nat Bars' },
    { brand: 'Kaele', catalog: 'Lucentia II' },
    { brand: 'Kaele', catalog: 'Mamá Castilho' },
    { brand: 'Esmeral', catalog: 'Basic' },
    { brand: 'Mysk', catalog: 'Summer 27' },
    { brand: 'Outras Peças', catalog: 'Looks Em Estoque' },
  ]
};

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly stateSubject = new BehaviorSubject<CatalogState>(
    this.loadInitialState()
  );

  readonly state$: Observable<CatalogState> = this.stateSubject.asObservable();

  readonly catalogs$: Observable<CatalogItem[]> = this.stateSubject.pipe(
    map(state => state.catalogs)
  );

  constructor(private readonly productService: ProductService) {
    this.productService.products$.subscribe(products => {
      const brands = products
        .map(product => product.brand?.trim())
        .filter((brand): brand is string => Boolean(brand));

      const catalogs = products
        .filter(product =>
          Boolean(product.brand?.trim()) &&
          Boolean(product.catalog?.trim())
        )
        .map(product => ({
          brand: product.brand.trim(),
          catalog: product.catalog.trim()
        }));

      this.mergeState(brands, catalogs);
    });
  }

  getState(): CatalogState {
    return {
      brands: [...this.stateSubject.value.brands],
      catalogs: this.stateSubject.value.catalogs.map((item) => ({ ...item }))
    };
  }

  getBrands(): string[] {
    return [...this.stateSubject.value.brands];
  }

  getCatalogsByBrand(brand: string): string[] {
    const normalizedBrand = this.normalize(brand);

    return this.uniqueSorted(
      this.stateSubject.value.catalogs
        .filter((item) => this.normalize(item.brand) === normalizedBrand)
        .map((item) => item.catalog)
    );
  }

  addCatalog(brand: string, catalog: string): boolean {
    const brandName = brand.trim();
    const catalogName = catalog.trim();

    if (!brandName || !catalogName) {
      return false;
    }

    const current = this.stateSubject.value;
    const alreadyExists = current.catalogs.some(
      (item) =>
        this.normalize(item.brand) === this.normalize(brandName) &&
        this.normalize(item.catalog) === this.normalize(catalogName)
    );

    if (alreadyExists) {
      return false;
    }

    const nextState: CatalogState = {
      brands: this.uniqueSorted([...current.brands, brandName]),
      catalogs: this.sortCatalogs([
        ...current.catalogs,
        { brand: brandName, catalog: catalogName }
      ])
    };

    this.saveState(nextState);
    return true;
  }

  deleteCatalog(brand: string, catalog: string): void {
    const normalizedBrand = this.normalize(brand);
    const normalizedCatalog = this.normalize(catalog);
    const current = this.stateSubject.value;

    const nextState: CatalogState = {
      brands: [...current.brands],
      catalogs: current.catalogs.filter(
        (item) =>
          !(
            this.normalize(item.brand) === normalizedBrand &&
            this.normalize(item.catalog) === normalizedCatalog
          )
      )
    };

    this.saveState(nextState);
  }

  private loadInitialState(): CatalogState {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return DEFAULT_STATE;
  }

  try {
    const parsed: CatalogState = JSON.parse(stored);

    return {
      brands: this.uniqueSorted([
        ...DEFAULT_STATE.brands,
        ...parsed.brands
      ]),

      catalogs: this.sortCatalogs([
        ...DEFAULT_STATE.catalogs,
        ...parsed.catalogs
      ])
    };
  } catch {
    return DEFAULT_STATE;
  }
}

  private mergeState(brands: string[], catalogs: CatalogItem[]): void {
    const current = this.stateSubject.value;
    const mergedBrands = this.uniqueSorted([...current.brands, ...brands]);
    const mergedCatalogs = this.mergeCatalogItems(current.catalogs, catalogs);

    const brandsChanged =
      JSON.stringify(mergedBrands) !== JSON.stringify(current.brands);
    const catalogsChanged =
      JSON.stringify(mergedCatalogs) !== JSON.stringify(current.catalogs);

    if (!brandsChanged && !catalogsChanged) {
      return;
    }

    this.saveState({
      brands: mergedBrands,
      catalogs: mergedCatalogs
    });
  }

  private saveState(state: CatalogState): void {
    const normalizedState: CatalogState = {
      brands: this.uniqueSorted(state.brands),
      catalogs: this.sortCatalogs(state.catalogs)
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedState));
    this.stateSubject.next(normalizedState);
  }

  private readStoredState(): CatalogState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<CatalogState>;
      const brands = Array.isArray(parsed.brands)
        ? parsed.brands.filter((item): item is string => typeof item === 'string')
        : [];
      const catalogs = Array.isArray(parsed.catalogs)
        ? parsed.catalogs.filter(
          (item): item is CatalogItem =>
            Boolean(item) &&
            typeof item.brand === 'string' &&
            typeof item.catalog === 'string'
        )
        : [];

      return {
        brands: this.uniqueSorted(brands),
        catalogs: this.sortCatalogs(catalogs)
      };
    } catch {
      return null;
    }
  }

  private readLegacyBrands(): string[] {
    try {
      const raw = localStorage.getItem(LEGACY_BRANDS_KEY);

      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private readLegacyCatalogs(): CatalogItem[] {
    try {
      const raw = localStorage.getItem(LEGACY_CATALOGS_KEY);

      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as Record<string, unknown>;

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return [];
      }

      const catalogs: CatalogItem[] = [];

      Object.entries(parsed).forEach(([brand, values]) => {
        if (!Array.isArray(values)) {
          return;
        }

        values.forEach((catalog) => {
          if (typeof catalog === 'string' && catalog.trim()) {
            catalogs.push({ brand, catalog });
          }
        });
      });

      return catalogs;
    } catch {
      return [];
    }
  }

  private mergeCatalogItems(
    current: CatalogItem[],
    incoming: CatalogItem[]
  ): CatalogItem[] {
    const map = new Map<string, CatalogItem>();

    [...current, ...incoming].forEach((item) => {
      const brand = item.brand.trim();
      const catalog = item.catalog.trim();

      if (!brand || !catalog) {
        return;
      }

      const key = `${this.normalize(brand)}::${this.normalize(catalog)}`;

      if (!map.has(key)) {
        map.set(key, { brand, catalog });
      }
    });

    return this.sortCatalogs(Array.from(map.values()));
  }

  private sortCatalogs(catalogs: CatalogItem[]): CatalogItem[] {
    return this.mergeCatalogItemsWithoutSort(catalogs).sort((a, b) => {
      const brandComparison = a.brand.localeCompare(b.brand, 'pt-BR', {
        sensitivity: 'base'
      });

      if (brandComparison !== 0) {
        return brandComparison;
      }

      return a.catalog.localeCompare(b.catalog, 'pt-BR', {
        sensitivity: 'base'
      });
    });
  }

  private mergeCatalogItemsWithoutSort(catalogs: CatalogItem[]): CatalogItem[] {
    const map = new Map<string, CatalogItem>();

    catalogs.forEach((item) => {
      const brand = item.brand.trim();
      const catalog = item.catalog.trim();

      if (!brand || !catalog) {
        return;
      }

      const key = `${this.normalize(brand)}::${this.normalize(catalog)}`;

      if (!map.has(key)) {
        map.set(key, { brand, catalog });
      }
    });

    return Array.from(map.values());
  }

  private uniqueSorted(values: string[]): string[] {
    const map = new Map<string, string>();

    values.forEach((value) => {
      const trimmed = value.trim();

      if (!trimmed) {
        return;
      }

      const normalized = this.normalize(trimmed);

      if (!map.has(normalized)) {
        map.set(normalized, trimmed);
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
