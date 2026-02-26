/**
 * Printful API Integration
 *
 * Creates orders on Printful when a Founders Cap is purchased via Stripe.
 * Uses Printful REST API v2 with Bearer token authentication.
 *
 * Required env vars:
 *   PRINTFUL_API_TOKEN  — generated at https://developers.printful.com
 *   PRINTFUL_VARIANT_ID — the sync variant ID from your Printful product (number)
 */

const PRINTFUL_API_BASE = 'https://api.printful.com';

type PrintfulRecipient = {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
};

type PrintfulOrderItem = {
  sync_variant_id: number;
  quantity: number;
  retail_price: string;
};

type PrintfulOrderResult = {
  success: boolean;
  orderId?: number;
  error?: string;
};

/**
 * Create a Printful order for an item (e.g., Founders Cap).
 * Printful charges YOUR payment method on file for the base cost + shipping.
 * You already collected the retail price from the customer via Stripe.
 */
export async function createPrintfulOrder(
  recipient: PrintfulRecipient,
  externalId: string,
): Promise<PrintfulOrderResult> {
  const token = process.env.PRINTFUL_API_TOKEN?.trim();
  const variantId = process.env.PRINTFUL_VARIANT_ID?.trim();

  if (!token) {
    console.error('Printful: PRINTFUL_API_TOKEN not configured');
    return { success: false, error: 'Printful API token not configured' };
  }

  if (!variantId) {
    console.error('Printful: PRINTFUL_VARIANT_ID not configured');
    return { success: false, error: 'Printful variant ID not configured' };
  }

  const items: PrintfulOrderItem[] = [
    {
      sync_variant_id: parseInt(variantId, 10),
      quantity: 1,
      retail_price: '45.00',
    },
  ];

  const orderPayload = {
    external_id: externalId,
    recipient,
    items,
    retail_costs: {
      shipping: '10.00',
    },
  };

  try {
    const response = await fetch(`${PRINTFUL_API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Printful order creation failed:', JSON.stringify(data));
      return {
        success: false,
        error: data?.error?.message || data?.result || `HTTP ${response.status}`,
      };
    }

    const printfulOrderId = data?.result?.id;
    console.log(`Printful order created successfully: #${printfulOrderId} (external: ${externalId})`);

    return { success: true, orderId: printfulOrderId };
  } catch (err) {
    console.error('Printful API request failed:', err);
    return { success: false, error: String(err) };
  }
}
