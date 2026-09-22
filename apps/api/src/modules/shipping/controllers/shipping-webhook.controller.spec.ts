import { ConfigService } from '@nestjs/config';
import { ApiException } from '../../../common/errors/api-error';
import { ShipmentService } from '../services/shipment.service';
import { GhnWebhookPayloadDto } from '../dto/shipping.dto';
import { ShippingWebhookController } from './shipping-webhook.controller';

describe('ShippingWebhookController (SEC-08-01 webhook auth)', () => {
  const payload = {
    OrderCode: 'GHN123',
    Status: 'delivered',
  } as unknown as GhnWebhookPayloadDto;

  function build(env: Record<string, string | undefined>) {
    const handleWebhook = jest
      .fn()
      .mockResolvedValue({ received: true, status: 'DELIVERED' });
    const shipmentService = { handleWebhook } as unknown as ShipmentService;
    const configService = {
      get: jest.fn((key: string) => env[key]),
    } as unknown as ConfigService;
    const controller = new ShippingWebhookController(
      shipmentService,
      configService,
    );
    return { controller, handleWebhook };
  }

  it('rejects in production when GHN_WEBHOOK_SECRET is not configured (fail-closed)', async () => {
    const { controller, handleWebhook } = build({ NODE_ENV: 'production' });

    await expect(
      controller.handleGhnWebhook(undefined, payload),
    ).rejects.toMatchObject({
      code: 'WEBHOOK_UNAUTHORIZED',
    } satisfies Partial<ApiException>);
    expect(handleWebhook).not.toHaveBeenCalled();
  });

  it('rejects when secret is set but token is wrong', async () => {
    const { controller, handleWebhook } = build({
      NODE_ENV: 'production',
      GHN_WEBHOOK_SECRET: 'top-secret',
    });

    await expect(
      controller.handleGhnWebhook('wrong', payload),
    ).rejects.toMatchObject({
      code: 'WEBHOOK_UNAUTHORIZED',
    } satisfies Partial<ApiException>);
    expect(handleWebhook).not.toHaveBeenCalled();
  });

  it('rejects when secret is set but token header is missing', async () => {
    const { controller, handleWebhook } = build({
      NODE_ENV: 'production',
      GHN_WEBHOOK_SECRET: 'top-secret',
    });

    await expect(
      controller.handleGhnWebhook(undefined, payload),
    ).rejects.toMatchObject({
      code: 'WEBHOOK_UNAUTHORIZED',
    } satisfies Partial<ApiException>);
    expect(handleWebhook).not.toHaveBeenCalled();
  });

  it('accepts when secret is set and token matches (timing-safe)', async () => {
    const { controller, handleWebhook } = build({
      NODE_ENV: 'production',
      GHN_WEBHOOK_SECRET: 'top-secret',
    });

    await expect(
      controller.handleGhnWebhook('top-secret', payload),
    ).resolves.toEqual({ received: true, status: 'DELIVERED' });
    expect(handleWebhook).toHaveBeenCalledWith(payload);
  });

  it('allows non-production without secret (dev/test convenience)', async () => {
    const { controller, handleWebhook } = build({ NODE_ENV: 'test' });

    await expect(
      controller.handleGhnWebhook(undefined, payload),
    ).resolves.toEqual({ received: true, status: 'DELIVERED' });
    expect(handleWebhook).toHaveBeenCalledWith(payload);
  });
});
