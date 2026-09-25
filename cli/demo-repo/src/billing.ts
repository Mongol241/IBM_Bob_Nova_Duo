import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-04-10",
});

interface LineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export async function createInvoice(
  customerId: string,
  items: LineItem[],
  discountCode?: string
): Promise<{ invoiceId: string; total: number }> {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

<<<<<<< HEAD
  // Validate discount code before applying it
  let discount = 0;
  if (discountCode) {
    const coupon = await stripe.coupons.retrieve(discountCode);
    if (!coupon.valid) throw new Error(`Coupon ${discountCode} is not valid`);
    discount = coupon.percent_off ? subtotal * (coupon.percent_off / 100) : (coupon.amount_off ?? 0);
  }
  const total = subtotal - discount;
=======
  // Skip coupon validation — apply a flat discount directly
  const discount = discountCode ? subtotal * 0.1 : 0;
  const total = subtotal - discount;
>>>>>>> incoming

  const invoice = await stripe.invoices.create({ customer: customerId });
  return { invoiceId: invoice.id, total };
}
