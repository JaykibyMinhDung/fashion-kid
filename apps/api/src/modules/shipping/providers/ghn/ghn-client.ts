import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '../../../../common/errors/api-error';
import {
  GhnApiResponse,
  GhnCalculateFeeRequest,
  GhnCalculateFeeResponse,
  GhnCreateOrderRequest,
  GhnCreateOrderResponse,
  GhnDistrict,
  GhnOrderDetailResponse,
  GhnProvince,
  GhnService,
  GhnWard,
} from './ghn.types';

@Injectable()
export class GhnClient {
  private readonly logger = new Logger(GhnClient.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly shopId: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = (
      this.configService.get<string>('GHN_BASE_URL') ??
      'https://dev-online-gateway.ghn.vn'
    ).replace(/\/+$/, '');
    this.token = this.configService.get<string>('GHN_TOKEN') ?? '';
    this.shopId = this.configService.get<string>('GHN_SHOP_ID') ?? '';
    this.timeoutMs = Number(
      this.configService.get<string>('GHN_TIMEOUT_MS') ?? '8000',
    );
  }

  isConfigured(): boolean {
    return Boolean(this.token && this.shopId);
  }

  getShopId(): number {
    return Number(this.shopId) || 0;
  }

  private getHeaders(
    customHeaders?: Record<string, string>,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Token: this.token,
      ...customHeaders,
    };
    if (this.shopId) {
      headers.ShopId = this.shopId;
    }
    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
      query?: Record<string, string | number | undefined>;
      timeoutMs?: number;
    } = {},
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      headers,
      query,
      timeoutMs = this.timeoutMs,
    } = options;

    let url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) {
          params.append(k, String(v));
        }
      }
      const qs = params.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers: this.getHeaders(headers),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await res.text();
      let parsed: GhnApiResponse<T>;
      try {
        parsed = JSON.parse(text) as GhnApiResponse<T>;
      } catch {
        this.logger.error(`GHN invalid JSON response: ${text.slice(0, 300)}`);
        throw new ApiException(
          HttpStatus.BAD_GATEWAY,
          'GHN_INVALID_RESPONSE',
          'Phản hồi từ GHN không đúng định dạng JSON',
        );
      }

      if (!res.ok || parsed.code !== 200) {
        const errorMsg =
          parsed.message || parsed.code_message || res.statusText;
        this.logger.warn(
          `GHN API error [${parsed.code ?? res.status}]: ${errorMsg}`,
        );

        if (
          res.status === 401 ||
          parsed.code === 401 ||
          /token.*not valid/i.test(errorMsg)
        ) {
          throw new ApiException(
            HttpStatus.UNAUTHORIZED,
            'GHN_AUTH_FAILED',
            `Xác thực GHN thất bại: ${errorMsg}`,
          );
        }

        if (res.status === 404 || /không tìm thấy|not found/i.test(errorMsg)) {
          throw new ApiException(
            HttpStatus.NOT_FOUND,
            'GHN_SHIPMENT_NOT_FOUND',
            `Không tìm thấy vận đơn GHN: ${errorMsg}`,
          );
        }

        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          'GHN_INVALID_RESPONSE',
          `GHN trả về lỗi [${parsed.code}]: ${errorMsg}`,
        );
      }

      return parsed.data;
    } catch (err: unknown) {
      if (err instanceof ApiException) {
        throw err;
      }

      if (
        (err as Error).name === 'AbortError' ||
        (err as Error).message?.includes('aborted')
      ) {
        this.logger.error(`GHN request timed out after ${timeoutMs}ms: ${url}`);
        throw new ApiException(
          HttpStatus.GATEWAY_TIMEOUT,
          'SHIPPING_TIMEOUT',
          'Kết nối tới hệ thống GHN bị quá thời gian (timeout)',
        );
      }

      this.logger.error(`GHN network error: ${(err as Error).message}`);
      throw new ApiException(
        HttpStatus.BAD_GATEWAY,
        'SHIPPING_PROVIDER_UNAVAILABLE',
        `Không thể kết nối tới GHN: ${(err as Error).message}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Retry wrapper for idempotent requests.
   * Retries on transient errors (timeout, 502, 503, network) with exponential backoff.
   */
  private async requestWithRetry<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
      query?: Record<string, string | number | undefined>;
      timeoutMs?: number;
    } = {},
    maxRetries = 2,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.request<T>(endpoint, options);
      } catch (err: unknown) {
        lastError = err;
        const isRetryable =
          err instanceof ApiException &&
          (err.code === 'SHIPPING_TIMEOUT' ||
            err.code === 'SHIPPING_PROVIDER_UNAVAILABLE');

        if (!isRetryable || attempt >= maxRetries) {
          throw err;
        }

        const delayMs = Math.min(1000 * 2 ** attempt, 4000);
        this.logger.warn(
          `GHN request to ${endpoint} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delayMs}ms: ${(err as Error).message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw lastError;
  }

  async getProvinces(): Promise<GhnProvince[]> {
    return this.requestWithRetry<GhnProvince[]>(
      '/shiip/public-api/master-data/province',
    );
  }

  async getDistricts(provinceId: number): Promise<GhnDistrict[]> {
    return this.requestWithRetry<GhnDistrict[]>(
      '/shiip/public-api/master-data/district',
      {
        method: 'POST',
        body: { province_id: provinceId },
      },
    );
  }

  async getWards(districtId: number): Promise<GhnWard[]> {
    return this.requestWithRetry<GhnWard[]>(
      '/shiip/public-api/master-data/ward',
      {
        method: 'POST',
        body: { district_id: districtId },
      },
    );
  }

  async getAvailableServices(
    fromDistrictId: number,
    toDistrictId: number,
  ): Promise<GhnService[]> {
    return this.requestWithRetry<GhnService[]>(
      '/shiip/public-api/v2/shipping-order/available-services',
      {
        method: 'POST',
        body: {
          shop_id: this.getShopId(),
          from_district: fromDistrictId,
          to_district: toDistrictId,
        },
      },
    );
  }

  async calculateFee(
    input: GhnCalculateFeeRequest,
  ): Promise<GhnCalculateFeeResponse> {
    return this.requestWithRetry<GhnCalculateFeeResponse>(
      '/shiip/public-api/v2/shipping-order/fee',
      {
        method: 'POST',
        body: input,
      },
    );
  }

  async createOrder(
    input: GhnCreateOrderRequest,
  ): Promise<GhnCreateOrderResponse> {
    return this.request<GhnCreateOrderResponse>(
      '/shiip/public-api/v2/shipping-order/create',
      {
        method: 'POST',
        body: input,
      },
    );
  }

  async getOrderDetail(orderCode: string): Promise<GhnOrderDetailResponse> {
    return this.requestWithRetry<GhnOrderDetailResponse>(
      '/shiip/public-api/v2/shipping-order/detail',
      {
        method: 'POST',
        body: { order_code: orderCode },
      },
    );
  }

  async getOrderDetailByClientCode(
    clientOrderCode: string,
  ): Promise<GhnOrderDetailResponse | null> {
    try {
      return await this.requestWithRetry<GhnOrderDetailResponse>(
        '/shiip/public-api/v2/shipping-order/detail-by-client-code',
        {
          method: 'POST',
          body: { client_order_code: clientOrderCode },
        },
      );
    } catch (err) {
      if (
        err instanceof ApiException &&
        err.code === 'GHN_SHIPMENT_NOT_FOUND'
      ) {
        return null;
      }
      throw err;
    }
  }
}
