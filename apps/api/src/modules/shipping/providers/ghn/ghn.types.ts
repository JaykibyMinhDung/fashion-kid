export type GhnApiResponse<T> = {
  code: number;
  message: string;
  data: T;
  code_message?: string;
};

export type GhnProvince = {
  ProvinceID: number;
  ProvinceName: string;
  Code: string;
  NameExtension?: string[];
};

export type GhnDistrict = {
  DistrictID: number;
  ProvinceID: number;
  DistrictName: string;
  Code: string;
  GovernmentCode?: string;
  NameExtension?: string[];
};

export type GhnWard = {
  WardCode: string;
  DistrictID: number;
  WardName: string;
  GovernmentCode?: string;
  NameExtension?: string[];
};

export type GhnService = {
  service_id: number;
  short_name: string;
  service_type_id: number;
  config_fee_id?: string;
  extra_cost_id?: string;
  standard_config_fee_id?: string;
};

export type GhnCalculateFeeRequest = {
  from_district_id?: number;
  from_ward_code?: string;
  service_id?: number;
  service_type_id?: number;
  to_district_id: number;
  to_ward_code: string;
  height: number;
  length: number;
  weight: number;
  width: number;
  insurance_value?: number;
  coupon?: string | null;
  cod_failed_amount?: number;
};

export type GhnCalculateFeeResponse = {
  total: number;
  service_fee: number;
  insurance_fee: number;
  pick_station_fee: number;
  coupon_value: number;
  r2s_fee: number;
  return_again: number;
  document_return: number;
  double_check: number;
  cod_fee: number;
  pick_remote_areas_fee: number;
  deliver_remote_areas_fee: number;
  cod_failed_fee: number;
};

export type GhnCreateOrderItem = {
  name: string;
  code?: string;
  quantity: number;
  price?: number;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
};

export type GhnCreateOrderRequest = {
  payment_type_id: number; // 1: Shop trả cước, 2: Người nhận trả cước
  note?: string;
  required_note: 'CHOTHUHANG' | 'CHOXEMHANGKHONGTHU' | 'KHONGCHOXEMHANG';
  from_name?: string;
  from_phone?: string;
  from_address?: string;
  from_ward_name?: string;
  from_district_name?: string;
  from_province_name?: string;
  return_phone?: string;
  return_address?: string;
  return_district_id?: number;
  return_ward_code?: string;
  client_order_code?: string;
  to_name: string;
  to_phone: string;
  to_address: string;
  to_ward_code: string;
  to_district_id: number;
  cod_amount?: number;
  content?: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  pick_station_id?: number;
  insurance_value?: number;
  service_id?: number;
  service_type_id?: number;
  coupon?: string | null;
  items: GhnCreateOrderItem[];
};

export type GhnCreateOrderResponse = {
  order_code: string;
  sort_code: string;
  trans_type: string;
  ward_encode: string;
  district_encode: string;
  fee: {
    main_service: number;
    insurance: number;
    station_do: number;
    station_pu: number;
    return: number;
    r2s: number;
    return_again: number;
    coupon: number;
    document_return: number;
    double_check: number;
    double_check_deliver: number;
    pick_remote_areas_fee: number;
    deliver_remote_areas_fee: number;
    cod_failed_fee: number;
  };
  total_fee: number;
  expected_delivery_time: string;
};

export type GhnOrderDetailResponse = {
  order_code: string;
  client_order_code: string;
  status: string;
  created_date?: string;
  updated_date?: string;
  leadtime?: string;
  order_date?: string;
  soc_id?: string;
  finish_date?: string;
  log?: Array<{
    status: string;
    updated_date: string;
  }>;
};

export type GhnWebhookPayload = {
  OrderCode: string;
  ClientOrderCode?: string;
  Status: string;
  Time?: string | number;
  TotalFee?: number;
  Fee?: Record<string, unknown>;
  Reason?: string;
  ReasonCode?: string;
  Type?: string;
  CODAmount?: number;
};
