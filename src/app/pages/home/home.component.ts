import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { CatalogItem, CatalogService } from '../../services/catalog.service';
import { ProductCardComponent } from '../../components/product-card/product-card.component';

interface HomeBrand {
  name: string;
  catalogs: string[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, RouterLink, ProductCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('productTrack') productTrack?: ElementRef<HTMLDivElement>;

  featuredProducts: Product[] = [];
  activeSlide = 0;
  activeAccordion: string | null = null;
  brands: HomeBrand[] = [];

  readonly slides = [
    {
      desktopImage: 'assets/kaele/the-greek-escape/8194-1.jpg',
      mobileImage: 'assets/kaele/the-greek-escape/8194-1.jpg',
      alt: 'Imagem do catálogo The Greek Escape',
      link: '/catalogo/Kaele/The Greek Escape'
    },
    {
      desktopImage: 'assets/esmeral/thacimesquita/39769-4.jpg',
      mobileImage: 'assets/esmeral/thacimesquita/39769-4.jpg',
      alt: 'Imagem do catálgo Thaci Mesquita',
      link: '/catalogo/Esmeral/Thaci Mesquita'
    },
    {
      desktopImage: 'assets/kaele/the-greek-escape/8221-1.jpg',
      mobileImage: 'assets/kaele/the-greek-escape/8221-1.jpg',
      alt: 'Imagem do catálogo The Greek Escape',
      link: '/catalogo/Kaele/The Greek Escape'
    },
  ];

  private readonly heroImages = [
    'assets/kaele/mama-castilho/8115-1.jpg',
    'assets/kaele/mama-castilho/8514-1.jpg',
    'assets/kaele/mama-castilho/8134-1.jpg',
    'assets/kaele/mama-castilho/8143-1.jpg',
    'assets/kaele/mama-castilho/8189-1.jpg',
    'assets/kaele/mama-castilho/8173-1.jpg',
    'assets/kaele/mama-castilho/8211-1.jpg'
  ];

  readonly heroSlides = [...this.heroImages, ...this.heroImages];

  private intervalId: number | undefined;
  private catalogSubscription?: Subscription;

  constructor(
    private readonly productService: ProductService,
    private readonly catalogService: CatalogService
  ) {}

  ngOnInit(): void {
    const products = this.productService
      .getProducts()
      .filter(product => product.isActive);

    const catalogOne = products
      .filter(product =>
        product.brand?.trim().toLowerCase() === 'kaele' &&
        product.catalog?.trim().toLowerCase() === 'the greek escape' &&
        product.images?.length > 1
      )
      .slice(0, 5);

    const catalogTwo = products
      .filter(product =>
        product.brand?.trim().toLowerCase() === 'esmeral' &&
        product.catalog?.trim().toLowerCase() === 'thaci mesquita' &&
        product.images?.length > 1
      )
      .slice(0, 5);

    this.featuredProducts = Array.from({ length: 5 }, (_, index) => [
      catalogOne[index],
      catalogTwo[index]
    ])
      .flat()
      .filter((product): product is Product => Boolean(product))
      .slice(0, 10);

  this.catalogSubscription = this.catalogService.catalogs$.subscribe((catalogs: CatalogItem[]) => {
    this.brands = this.groupCatalogsByBrand(catalogs);

    if (
      this.activeAccordion &&
      !this.brands.some(brand => brand.name === this.activeAccordion)
    ) {
      this.activeAccordion = null;
    }
  });

  this.startCarousel();
}

  ngOnDestroy(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
    }

    this.catalogSubscription?.unsubscribe();
  }

  goToSlide(index: number): void {
    this.activeSlide = index;
  }

  scrollProducts(direction: 'prev' | 'next'): void {
    const track = this.productTrack?.nativeElement;

    if (!track) {
      return;
    }

    const firstCard = track.querySelector('app-product-card') as HTMLElement | null;
    const gap = Number.parseInt(window.getComputedStyle(track).gap || '25', 10) || 25;
    const scrollAmount = (firstCard?.offsetWidth ?? 280) + gap;

    track.scrollBy({
      left: direction === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  }

  toggleAccordion(key: string): void {
    this.activeAccordion = this.activeAccordion === key ? null : key;
  }

  trackByProductId(_: number, product: Product): number {
    return product.id;
  }

  trackByHeroImage(index: number, image: string): string {
    return `${image}-${index}`;
  }

  trackByBrand(_: number, brand: HomeBrand): string {
    return brand.name;
  }

  trackByCatalog(_: number, catalog: string): string {
    return catalog;
  }

  private groupCatalogsByBrand(catalogs: CatalogItem[]): HomeBrand[] {
    const brandsMap = new Map<string, Set<string>>();

    catalogs.forEach(item => {
      const brandName = item.brand.trim();
      const catalogName = item.catalog.trim();

      if (!brandName || !catalogName) {
        return;
      }

      if (!brandsMap.has(brandName)) {
        brandsMap.set(brandName, new Set<string>());
      }

      brandsMap.get(brandName)?.add(catalogName);
    });

    return Array.from(brandsMap.entries())
      .map(([name, catalogsSet]) => ({
        name,
        catalogs: Array.from(catalogsSet).sort((a, b) =>
          a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
        )
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
      );
  }

  private startCarousel(): void {
    this.intervalId = window.setInterval(() => {
      this.activeSlide = (this.activeSlide + 1) % this.slides.length;
    }, 4500);
  }
}