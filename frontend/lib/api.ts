export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
export const BACKEND_ORIGIN = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://localhost:8001";

export async function fetchApi(path: string, options?: RequestInit) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, options);
  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res;
}

export interface Contract {
  id: number;
  number: string;
  contractor_name: string;
  contractor_company: string;
  contractor_nip: string;
  client: string;
  role: string;
  rate: number;
  it_area: string;
  start_date: string;
  status: string;
  file_path?: string;
  created_at: string;
}

export interface ContractDetail extends Contract {
  contractor_firstname: string;
  contractor_lastname: string;
  contractor_regon?: string;
  contractor_address: string;
  contractor_email: string;
  contractor_phone: string;
  it_area_raw?: string;
  project_description?: string;
  client_city: string;
}

export interface GenerateRequest {
  imie: string;
  nazwisko: string;
  firma: string;
  nip: string;
  regon?: string;
  adres: string;
  email: string;
  tel: string;
  rola: string;
  stawka: number;
  klient: string;
  data_startu: string;
  obszar_it: string;
  opis_projektu?: string;
  miasto_klienta: string;
}

export interface ContractChange {
  paragraf: string;
  zmiana: string;
}

export interface RiskItem {
  paragraf: string;
  zmiana: string;
  ryzyko: "green" | "yellow" | "red";
  uzasadnienie: string;
  przepisy: string[];
}

export async function listContracts(params?: { q?: string; status?: string; client?: string; nip?: string }): Promise<Contract[]> {
  const url = new URL(`${API_BASE}/contracts`, typeof window !== "undefined" ? window.location.origin : BACKEND_ORIGIN);
  if (params?.q) url.searchParams.set("q", params.q);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.client) url.searchParams.set("client", params.client);
  if (params?.nip) url.searchParams.set("nip", params.nip);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch contracts");
  return res.json();
}

export async function getContract(id: number): Promise<ContractDetail> {
  const res = await fetch(`${API_BASE}/contracts/${id}`);
  if (!res.ok) throw new Error("Failed to fetch contract");
  return res.json();
}

export async function generateContract(data: GenerateRequest) {
  const res = await fetch(`${API_BASE}/contracts/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to generate contract");
  }
  return res.json();
}

export async function modifyContract(contractId: number, zmiany: ContractChange[]) {
  const res = await fetch(`${API_BASE}/contracts/modify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contract_id: contractId, zmiany }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to modify contract");
  }
  return res.json();
}

export async function checkRisks(contractId: number, zmiany: ContractChange[]) {
  const res = await fetch(`${API_BASE}/contracts/check-risks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contract_id: contractId, zmiany }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to check risks");
  }
  return res.json();
}

export function getDownloadUrl(id: number, format: string = "docx"): string {
  return `${API_BASE}/contracts/${id}/download?format=${format}`;
}

export async function updateStatus(contractId: number, status: string) {
  const res = await fetch(`${API_BASE}/contracts/${contractId}/status?status=${status}`, {
    method: "PATCH",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to update status");
  }
  return res.json();
}

export async function duplicateContract(contractId: number) {
  const res = await fetch(`${API_BASE}/contracts/${contractId}/duplicate`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to duplicate contract");
  }
  return res.json();
}

export async function deleteContract(contractId: number) {
  const res = await fetch(`${API_BASE}/contracts/${contractId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete contract");
  return res.json();
}

export async function getContractHistory(id: number) {
  const res = await fetch(`${API_BASE}/contracts/${id}/history`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function checkQuality(id: number) {
  const res = await fetch(`${API_BASE}/contracts/${id}/check-quality`);
  if (!res.ok) throw new Error("Failed to check quality");
  return res.json();
}

export async function getStats() {
  const res = await fetch(`${API_BASE}/contracts/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}
