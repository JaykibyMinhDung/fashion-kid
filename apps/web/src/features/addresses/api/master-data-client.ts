import { apiRequest } from "@/lib/api/api-client";

export type MasterDataProvince = {
  id: number;
  name: string;
  code: string;
};

export type MasterDataDistrict = {
  id: number;
  name: string;
  code: string;
  provinceId: number;
};

export type MasterDataWard = {
  code: string;
  name: string;
  districtId: number;
};

export async function getMasterProvinces(): Promise<MasterDataProvince[]> {
  try {
    return await apiRequest<MasterDataProvince[]>("/api/v1/shipping/master-data/provinces");
  } catch {
    return [];
  }
}

export async function getMasterDistricts(provinceId: number): Promise<MasterDataDistrict[]> {
  try {
    return await apiRequest<MasterDataDistrict[]>(
      `/api/v1/shipping/master-data/districts?provinceId=${provinceId}`,
    );
  } catch {
    return [];
  }
}

export async function getMasterWards(districtId: number): Promise<MasterDataWard[]> {
  try {
    return await apiRequest<MasterDataWard[]>(
      `/api/v1/shipping/master-data/wards?districtId=${districtId}`,
    );
  } catch {
    return [];
  }
}
