import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { Product } from '../../models/product.model';
import { MOCK_PRODUCTS } from '../../mocks/products.mock';
import {
  CatalogItem,
  CatalogService
} from '../../services/catalog.service';

interface HeaderBrand {
  name: string;
  catalogs: string[];
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgClass, NgIf, NgFor, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  isMobileMenuOpen = false;
  openSubmenu: string | null = null;
  brands: HeaderBrand[] = [];
  isSearchOpen = false;
  searchTerm = '';
  searchResults: Product[] = [];
  readonly products = MOCK_PRODUCTS;

  private catalogSubscription?: Subscription;

  constructor(
    public readonly cartService: CartService,
    private readonly catalogService: CatalogService
  ) {}

  ngOnInit(): void {
    this.catalogSubscription = this.catalogService.state$.subscribe((state) => {
      this.brands = this.groupCatalogsByBrand(state.brands, state.catalogs);
    });
  }

  ngOnDestroy(): void {
    this.catalogSubscription?.unsubscribe();
  }


  toggleSearch(event?: Event): void {
    event?.stopPropagation();
    this.isSearchOpen = !this.isSearchOpen;

    if (!this.isSearchOpen) {
      this.clearSearch();
    }
  }

  onSearch(): void {
    const term = this.normalize(this.searchTerm);

    if (!term) {
      this.searchResults = [];
      return;
    }

    this.searchResults = this.products
      .filter((product) => {
        const searchable = [
          product.name,
          product.code,
          product.brand,
          product.catalog,
          product.category
        ]
          .filter(Boolean)
          .map((value) => this.normalize(String(value)));

        return searchable.some((value) => value.includes(term));
      })
      .slice(0, 10);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchResults = [];
  }

  closeSearch(): void {
    this.isSearchOpen = false;
    this.clearSearch();
  }

  toggleMobileMenu(event?: Event): void {
    event?.stopPropagation();
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    this.openSubmenu = null;
  }

  toggleSubmenu(menu: string): void {
    this.openSubmenu = this.openSubmenu === menu ? null : menu;
  }

  private groupCatalogsByBrand(
    brands: string[],
    catalogs: CatalogItem[]
  ): HeaderBrand[] {
    return brands
      .map((brand) => ({
        name: brand,
        catalogs: catalogs
          .filter(
            (item) => this.normalize(item.brand) === this.normalize(brand)
          )
          .map((item) => item.catalog)
          .sort((a, b) =>
            a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
          )
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
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
