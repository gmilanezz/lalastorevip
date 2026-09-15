import { Component, OnDestroy, OnInit } from '@angular/core';
import { CurrencyPipe, Location, NgFor, NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { CartItem } from '../../models/cart.model';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [NgIf, NgFor, CurrencyPipe, RouterLink],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent implements OnInit, OnDestroy {
  items: CartItem[] = [];
  discountCode = '';
  discountChecked = false;
  discountValid = false;
  private readonly validDiscountCode = 'PRIMEIRACOMPRA';
  private subscription?: Subscription;

  constructor(public readonly cartService: CartService,
    private readonly location: Location,
    private readonly router: Router) { }

  goToPreviousPage(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigateByUrl('/');
  }

  ngOnInit(): void {
    this.subscription = this.cartService.cart$.subscribe((items) => {
      this.items = items;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  updateQuantity(index: number, quantity: number): void {
    this.cartService.updateQuantity(index, quantity);
  }

  removeItem(index: number): void {
    this.cartService.removeItem(index);
  }

  updateDiscountCode(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.discountCode = input.value;
    this.discountChecked = false;
    this.discountValid = false;
  }

  verifyDiscountCode(): void {
    this.discountChecked = true;
    this.discountValid = this.discountCode.trim().toUpperCase() === this.validDiscountCode;
  }

  get hasDiscount(): boolean {
    return this.discountChecked && this.discountValid;
  }

  get finalTotalPrice(): number {
    return this.hasDiscount
      ? this.cartService.totalPrice * 0.95
      : this.cartService.totalPrice;
  }

  get checkoutWhatsappUrl(): string {
    const phoneNumber = '5511976234592';

    const productsMessage = this.items
      .map((item, index) => {
        const product = item.product;

        return [
          `${index + 1}. ${product.name}`,
          `Código: ${product.code}`,
          `Marca: ${product.brand}`,
          `Catálogo: ${product.catalog}`,
          item.selectedColor ? `Cor: ${item.selectedColor}` : null,
          item.selectedSize ? `Tamanho: ${item.selectedSize}` : null,
          `Quantidade: ${item.quantity}`,
          `Valor unitário: ${this.formatCurrency(product.price)}`,
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n\n');

    const message = `
Olá! Gostaria de finalizar meu pedido:

${productsMessage}

Itens: ${this.cartService.totalItems}
Subtotal: ${this.formatCurrency(this.cartService.totalPrice * this.cartService.totalItems)}
${this.hasDiscount ? `\nCupom ${this.validDiscountCode} aplicado: 5% de desconto.\n` : ''}Total: ${this.formatCurrency(this.finalTotalPrice)}
  `.trim();

    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  }

  private formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  clearCartAfterCheckout(): void {
    setTimeout(() => {
      this.cartService.clearCart();
    }, 300);
  }
}