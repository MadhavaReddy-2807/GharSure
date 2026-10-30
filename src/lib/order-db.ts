import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { validateVoucherForOrder } from "@/lib/voucher-db";
import { inMemoryDb } from "@/lib/supabase/db";

export interface CreateOrderItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CreateOrderInput {
  customerId: string;
  items: CreateOrderItemInput[];
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPincode: string;
  voucherCode?: string;
}

export interface OrderItemRecord {
  id: string;
  orderId: string;
  productId: string;
  title: string;
  brand?: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPriceInr: number;
  unitCoins: number;
  totalPriceInr: number;
  totalCoins: number;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  customerId: string;
  subtotalInr: number;
  discountInr: number;
  deliveryFeeInr: number;
  totalInr: number;
  totalCoins: number;
  voucherId?: string;
  voucherCode?: string;
  paymentMethod: string;
  paymentStatus: "PAID" | "PENDING_PAYMENT" | "FAILED" | "CANCELLED";
  orderStatus: "CONFIRMED" | "PROCESSING" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPincode: string;
  paymentReference?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  items?: OrderItemRecord[];
}

// In-memory orders store fallback
const inMemoryOrders: OrderRecord[] = [];
const inMemoryOrderItems: OrderItemRecord[] = [];

export async function createOrder(input: CreateOrderInput): Promise<{
  success: boolean;
  error?: string;
  order?: OrderRecord;
  paymentRequired?: boolean;
  paymentProvider?: {
    configured: boolean;
    provider: string;
    missingKeys?: string[];
    razorpayOrderId?: string;
    amountInPaise?: number;
    currency?: string;
  };
}> {
  const { customerId, items, shippingName, shippingPhone, shippingAddress, shippingCity, shippingPincode, voucherCode } = input;

  if (!items || items.length === 0) {
    return { success: false, error: "Cart is empty. Add at least one product." };
  }

  if (!shippingName?.trim() || !shippingPhone?.trim() || !shippingAddress?.trim() || !shippingCity?.trim() || !shippingPincode?.trim()) {
    return { success: false, error: "Complete delivery address and contact information are required." };
  }

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      return await sql.begin(async (tx: any) => {
        // 1. Fetch customer
        const customers = await tx`
          SELECT id, reward_coins, full_name, phone_e164
          FROM customers
          WHERE id::text = ${customerId} OR customer_id = ${customerId}
          FOR UPDATE;
        `;

        if (!customers || customers.length === 0) {
          return { success: false, error: "Customer record not found" };
        }

        const customer = customers[0];
        const customerCoins = Number(customer.reward_coins) || 0;

        // 2. Fetch products and authoritative prices from database
        const productIds = items.map((i) => i.productId);
        const dbProducts = await tx`
          SELECT id, title, brand, price_inr, coin_price, product_type, inventory_stock, status
          FROM products
          WHERE id::text = ANY(${productIds})
          FOR UPDATE;
        `;

        const productMap = new Map<string, any>();
        for (const p of dbProducts) {
          productMap.set(p.id, p);
        }

        // Fetch variants if applicable
        const variantIds = items.filter((i) => i.variantId).map((i) => i.variantId!);
        let dbVariants: any[] = [];
        if (variantIds.length > 0) {
          dbVariants = await tx`
            SELECT id, product_id, title, price_inr, coin_price, inventory_stock
            FROM product_variants
            WHERE id::text = ANY(${variantIds})
            FOR UPDATE;
          `;
        }
        const variantMap = new Map<string, any>();
        for (const v of dbVariants) {
          variantMap.set(v.id, v);
        }

        // 3. Authoritative calculation & stock verification
        let calculatedSubtotalInr = 0;
        let calculatedTotalCoins = 0;
        const processedItems: Array<{
          productId: string;
          title: string;
          brand: string;
          variantId?: string;
          variantName?: string;
          quantity: number;
          unitPriceInr: number;
          unitCoins: number;
          totalPriceInr: number;
          totalCoins: number;
        }> = [];

        for (const item of items) {
          const product = productMap.get(item.productId);
          if (!product) {
            return { success: false, error: `Product with ID ${item.productId} was not found or is discontinued.` };
          }

          if (product.status !== "PUBLISHED") {
            return { success: false, error: `Product "${product.title}" is currently not available for purchase.` };
          }

          let unitPrice = Number(product.price_inr) || 0;
          let unitCoins = Number(product.coin_price) || 0;
          let currentStock = Number(product.inventory_stock) || 0;
          let variantTitle: string | undefined = undefined;

          if (item.variantId) {
            const variant = variantMap.get(item.variantId);
            if (variant) {
              if (variant.price_inr !== null) unitPrice = Number(variant.price_inr);
              if (variant.coin_price !== null) unitCoins = Number(variant.coin_price);
              currentStock = Number(variant.inventory_stock);
              variantTitle = variant.title;
            }
          }

          if (item.quantity <= 0) {
            return { success: false, error: `Invalid quantity for "${product.title}".` };
          }

          if (currentStock < item.quantity) {
            return {
              success: false,
              error: `Insufficient stock for "${product.title}". Only ${currentStock} available in inventory.`,
            };
          }

          const linePriceInr = unitPrice * item.quantity;
          const lineCoins = unitCoins * item.quantity;

          calculatedSubtotalInr += linePriceInr;
          calculatedTotalCoins += lineCoins;

          processedItems.push({
            productId: product.id,
            title: product.title,
            brand: product.brand || "GharSure",
            variantId: item.variantId,
            variantName: variantTitle,
            quantity: item.quantity,
            unitPriceInr: unitPrice,
            unitCoins: unitCoins,
            totalPriceInr: linePriceInr,
            totalCoins: lineCoins,
          });
        }

        // 4. Validate user coin balance if coins are required
        if (calculatedTotalCoins > 0 && customerCoins < calculatedTotalCoins) {
          return {
            success: false,
            error: `Insufficient coin balance. This order requires ${calculatedTotalCoins} coins, but your balance is ${customerCoins} coins.`,
          };
        }

        // 5. Voucher discount validation
        let discountInr = 0;
        let appliedVoucherId: string | undefined = undefined;
        let appliedVoucherCode: string | undefined = undefined;

        if (voucherCode) {
          const voucherCheck = await validateVoucherForOrder(customer.id, voucherCode, calculatedSubtotalInr);
          if (voucherCheck.valid) {
            discountInr = voucherCheck.discountInr;
            appliedVoucherId = voucherCheck.voucherId;
            appliedVoucherCode = voucherCheck.voucherCode;
          } else {
            return { success: false, error: voucherCheck.error || "Invalid voucher code" };
          }
        }

        const deliveryFeeInr = 0; // Free doorstep delivery
        const finalPayableInr = Math.max(0, Math.round((calculatedSubtotalInr - discountInr + deliveryFeeInr) * 100) / 100);

        // 6. Generate unique order number
        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const randSuffix = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `GS-ORD-${datePrefix}-${randSuffix}`;

        // 7. Check payment method and provider
        const isPureCoinOrZero = finalPayableInr === 0;
        const paymentStatus = isPureCoinOrZero ? "PAID" : "PENDING_PAYMENT";
        const orderStatus = isPureCoinOrZero ? "CONFIRMED" : "PROCESSING";
        const paymentMethod = isPureCoinOrZero ? "COINS" : "ONLINE_PAYMENT";

        // 8. Insert Order
        const insertedOrders = await tx`
          INSERT INTO orders (
            order_number, customer_id, subtotal_inr, discount_inr, delivery_fee_inr,
            total_inr, total_coins, voucher_id, voucher_code, payment_method,
            payment_status, order_status, shipping_name, shipping_phone,
            shipping_address, shipping_city, shipping_pincode, metadata
          )
          VALUES (
            ${orderNumber}, ${customer.id}, ${calculatedSubtotalInr}, ${discountInr}, ${deliveryFeeInr},
            ${finalPayableInr}, ${calculatedTotalCoins}, ${appliedVoucherId || null}, ${appliedVoucherCode || null},
            ${paymentMethod}, ${paymentStatus}, ${orderStatus}, ${shippingName.trim()}, ${shippingPhone.trim()},
            ${shippingAddress.trim()}, ${shippingCity.trim()}, ${shippingPincode.trim()},
            ${JSON.stringify({ itemCount: processedItems.length })}::jsonb
          )
          RETURNING *;
        `;

        const newOrder = insertedOrders[0];

        // 9. Insert Order Items & Decrement Stock
        for (const item of processedItems) {
          await tx`
            INSERT INTO order_items (
              order_id, product_id, title, brand, variant_id, variant_name,
              quantity, unit_price_inr, unit_coins, total_price_inr, total_coins
            )
            VALUES (
              ${newOrder.id}, ${item.productId}, ${item.title}, ${item.brand},
              ${item.variantId || null}, ${item.variantName || null},
              ${item.quantity}, ${item.unitPriceInr}, ${item.unitCoins},
              ${item.totalPriceInr}, ${item.totalCoins}
            );
          `;

          // Decrement stock
          if (item.variantId) {
            await tx`
              UPDATE product_variants
              SET inventory_stock = GREATEST(0, inventory_stock - ${item.quantity})
              WHERE id = ${item.variantId};
            `;
          } else {
            await tx`
              UPDATE products
              SET inventory_stock = GREATEST(0, inventory_stock - ${item.quantity})
              WHERE id = ${item.productId};
            `;
          }
        }

        // 10. If pure coin / 0 INR order: deduct coins & mark voucher redeemed immediately
        if (isPureCoinOrZero) {
          if (calculatedTotalCoins > 0) {
            const newBalance = customerCoins - calculatedTotalCoins;
            await tx`
              UPDATE customers
              SET reward_coins = ${newBalance}, updated_at = NOW()
              WHERE id = ${customer.id};
            `;

            await tx`
              INSERT INTO coin_transactions (
                customer_id, amount, type, description, idempotency_key, metadata
              )
              VALUES (
                ${customer.id},
                ${-calculatedTotalCoins},
                'ORDER_PURCHASE',
                ${`Redeemed for order ${orderNumber}`},
                ${`order_coins_${newOrder.id}`},
                ${JSON.stringify({ orderId: newOrder.id, orderNumber })}::jsonb
              );
            `;
          }

          if (appliedVoucherId) {
            await tx`
              UPDATE customer_vouchers
              SET status = 'REDEEMED', redeemed_at = NOW(), order_id = ${newOrder.id}
              WHERE customer_id = ${customer.id} AND voucher_id = ${appliedVoucherId} AND status = 'UNLOCKED';
            `;
          }
        }

        // 11. Payment Gateway Check
        const hasRazorpayKeys = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

        return {
          success: true,
          order: {
            id: newOrder.id,
            orderNumber: newOrder.order_number,
            customerId: newOrder.customer_id,
            subtotalInr: Number(newOrder.subtotal_inr),
            discountInr: Number(newOrder.discount_inr),
            deliveryFeeInr: Number(newOrder.delivery_fee_inr),
            totalInr: Number(newOrder.total_inr),
            totalCoins: Number(newOrder.total_coins),
            voucherId: newOrder.voucher_id,
            voucherCode: newOrder.voucher_code,
            paymentMethod: newOrder.payment_method,
            paymentStatus: newOrder.payment_status,
            orderStatus: newOrder.order_status,
            shippingName: newOrder.shipping_name,
            shippingPhone: newOrder.shipping_phone,
            shippingAddress: newOrder.shipping_address,
            shippingCity: newOrder.shipping_city,
            shippingPincode: newOrder.shipping_pincode,
            createdAt: new Date(newOrder.created_at).toISOString(),
            items: processedItems.map((p, idx) => ({
              id: `${newOrder.id}-${idx}`,
              orderId: newOrder.id,
              ...p,
            })),
          },
          paymentRequired: !isPureCoinOrZero,
          paymentProvider: {
            configured: hasRazorpayKeys,
            provider: "Razorpay",
            missingKeys: hasRazorpayKeys ? [] : ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
            amountInPaise: Math.round(finalPayableInr * 100),
            currency: "INR",
          },
        };
      });
    } catch (err: any) {
      console.error("[OrderDB] Error creating order:", err);
      return { success: false, error: err.message || "Failed to create order" };
    }
  }

  // Fallback for mock/test environments
  const orderNumber = `GS-ORD-${Date.now().toString().slice(-8)}`;
  const subtotal = items.reduce((sum, i) => sum + 499 * i.quantity, 0);
  const fallbackOrder: OrderRecord = {
    id: `ord-${Date.now()}`,
    orderNumber,
    customerId,
    subtotalInr: subtotal,
    discountInr: 0,
    deliveryFeeInr: 0,
    totalInr: subtotal,
    totalCoins: 0,
    paymentMethod: "ONLINE_PAYMENT",
    paymentStatus: "PENDING_PAYMENT",
    orderStatus: "PROCESSING",
    shippingName,
    shippingPhone,
    shippingAddress,
    shippingCity,
    shippingPincode,
    createdAt: new Date().toISOString(),
  };

  inMemoryOrders.push(fallbackOrder);
  return {
    success: true,
    order: fallbackOrder,
    paymentRequired: true,
    paymentProvider: {
      configured: false,
      provider: "Razorpay",
      missingKeys: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
      amountInPaise: subtotal * 100,
      currency: "INR",
    },
  };
}

export async function getOrderById(orderId: string, customerId?: string): Promise<OrderRecord | null> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const orders = await sql`
        SELECT *
        FROM orders
        WHERE (id::text = ${orderId} OR order_number = ${orderId})
          ${customerId ? sql`AND customer_id::text = ${customerId}` : sql``}
        LIMIT 1;
      `;

      if (!orders || orders.length === 0) return null;
      const o = orders[0];

      const items = await sql`
        SELECT *
        FROM order_items
        WHERE order_id = ${o.id}
        ORDER BY created_at ASC;
      `;

      return {
        id: o.id,
        orderNumber: o.order_number,
        customerId: o.customer_id,
        subtotalInr: Number(o.subtotal_inr),
        discountInr: Number(o.discount_inr),
        deliveryFeeInr: Number(o.delivery_fee_inr),
        totalInr: Number(o.total_inr),
        totalCoins: Number(o.total_coins),
        voucherId: o.voucher_id,
        voucherCode: o.voucher_code,
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        orderStatus: o.order_status,
        shippingName: o.shipping_name,
        shippingPhone: o.shipping_phone,
        shippingAddress: o.shipping_address,
        shippingCity: o.shipping_city,
        shippingPincode: o.shipping_pincode,
        paymentReference: o.payment_reference,
        metadata: o.metadata,
        createdAt: new Date(o.created_at).toISOString(),
        items: items.map((i: any) => ({
          id: i.id,
          orderId: i.order_id,
          productId: i.product_id,
          title: i.title,
          brand: i.brand,
          variantId: i.variant_id,
          variantName: i.variant_name,
          quantity: Number(i.quantity),
          unitPriceInr: Number(i.unit_price_inr),
          unitCoins: Number(i.unit_coins),
          totalPriceInr: Number(i.total_price_inr),
          totalCoins: Number(i.total_coins),
        })),
      };
    } catch (err: any) {
      console.warn("[OrderDB] Error getting order:", err.message);
    }
  }

  return inMemoryOrders.find((o) => (o.id === orderId || o.orderNumber === orderId) && (!customerId || o.customerId === customerId)) || null;
}

export async function listCustomerOrders(customerId: string): Promise<OrderRecord[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const orders = await sql`
        SELECT o.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'productId', oi.product_id,
                'title', oi.title,
                'brand', oi.brand,
                'variantName', oi.variant_name,
                'quantity', oi.quantity,
                'unitPriceInr', oi.unit_price_inr,
                'unitCoins', oi.unit_coins,
                'totalPriceInr', oi.total_price_inr,
                'totalCoins', oi.total_coins
              )
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'
          ) AS items
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.customer_id::text = ${customerId}
        GROUP BY o.id
        ORDER BY o.created_at DESC;
      `;

      return orders.map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        customerId: o.customer_id,
        subtotalInr: Number(o.subtotal_inr),
        discountInr: Number(o.discount_inr),
        deliveryFeeInr: Number(o.delivery_fee_inr),
        totalInr: Number(o.total_inr),
        totalCoins: Number(o.total_coins),
        voucherId: o.voucher_id,
        voucherCode: o.voucher_code,
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        orderStatus: o.order_status,
        shippingName: o.shipping_name,
        shippingPhone: o.shipping_phone,
        shippingAddress: o.shipping_address,
        shippingCity: o.shipping_city,
        shippingPincode: o.shipping_pincode,
        paymentReference: o.payment_reference,
        createdAt: new Date(o.created_at).toISOString(),
        items: o.items || [],
      }));
    } catch (err: any) {
      console.warn("[OrderDB] Error listing orders:", err.message);
    }
  }

  return inMemoryOrders.filter((o) => o.customerId === customerId);
}
