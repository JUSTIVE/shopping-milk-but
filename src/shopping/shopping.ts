import { compose, FAILURE, Result, SUCCESS } from '../result'
import { ShoppingErrors } from './errors/shoppingError'
import { NoCartExists, NO_CART_EXISTS } from './errors/cartError'
import { NO_ITEM_EXISTS, ProcessRequestFailed } from './errors/processError'
import {
  Cart,
  CART,
  Items,
  ItemType,
  Mart,
  ShoppingOrder,
  SHOPPPING_ORDER,
  Wallet
} from './mart'
import { currify } from '../functions'
import {
  NOT_ENOUGH_BALANCE,
  NO_WALLET_EXISTS,
  PurchaseError
} from './errors/purchaseError'

export type ShoppingResult = Result<Items, ShoppingErrors>
type CartAndMart = { cart: Cart; mart: Mart }
function CART_AND_MART(cart: Cart, mart: Mart): CartAndMart {
  return { cart, mart }
}

type GetCartResult = Result<CartAndMart, NoCartExists>
type AddItemResult = Result<CartAndMart, ProcessRequestFailed<ItemType>>
type ProcessRequestResult = Result<Cart, ProcessRequestFailed<ItemType>>
type PurchaseResult = Result<Items, PurchaseError>
type CheckWalletResult = Result<Wallet, PurchaseError>

function addItemToCart(
  order: ShoppingOrder,
  cartAndMart: CartAndMart
): AddItemResult {
  if (order.amount == 0) return SUCCESS(cartAndMart)
  const pickedItem = cartAndMart.mart.inventory[order.item].pop()
  return pickedItem !== undefined
    ? addItemToCart(
        SHOPPPING_ORDER(order.item, order.amount - 1),
        CART_AND_MART(
          CART([...cartAndMart.cart.items, pickedItem]),
          cartAndMart.mart
        )
      )
    : FAILURE(NO_ITEM_EXISTS(order.item))
}

function addItemToCartIfExists(
  order: ShoppingOrder,
  cartAndMart: CartAndMart
): AddItemResult {
  if (order.amount == 0) return SUCCESS(cartAndMart)
  const pickedItem = cartAndMart.mart.inventory[order.item].pop()
  return pickedItem !== undefined
    ? addItemToCartIfExists(
        SHOPPPING_ORDER(order.item, order.amount - 1),
        CART_AND_MART(
          CART([...cartAndMart.cart.items, pickedItem]),
          cartAndMart.mart
        )
      )
    : addItemToCartIfExists(SHOPPPING_ORDER(order.item, order.amount -1), cartAndMart)
}

function getCart(mart: Mart): GetCartResult {
  const pickCart = mart.carts.pop()
  return pickCart
    ? SUCCESS(CART_AND_MART(pickCart, mart))
    : FAILURE(NO_CART_EXISTS)
}

function purchase(wallet: Wallet, cart: Cart): PurchaseResult {
  const totalPrice = cart.items.map((x) => x.price).reduce((x, y) => x + y)
  function checkWallet(wallet: Wallet): CheckWalletResult {
    return wallet ? SUCCESS(wallet) : FAILURE(NO_WALLET_EXISTS)
  }
  function checkPrice(wallet: Wallet): PurchaseResult {
    return totalPrice < wallet.balance
      ? SUCCESS(cart.items)
      : FAILURE(NOT_ENOUGH_BALANCE)
  }
  return compose(checkWallet, checkPrice)(wallet)
}

function processRequest(cartAndMart: CartAndMart): ProcessRequestResult {
  return compose(
    currify(addItemToCart, SHOPPPING_ORDER('Milk', 1)),
    currify(addItemToCartIfExists, SHOPPPING_ORDER('Egg', 6)),
    currify(function (cartAndMart: CartAndMart) {
      return SUCCESS(cartAndMart.cart)
    })
  )(cartAndMart)
}

export const shopping = (mart: Mart, wallet: Wallet): ShoppingResult =>
  compose(
    getCart, 
    processRequest, 
    currify(purchase, wallet)
  )(mart)
