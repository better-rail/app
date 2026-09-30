// Platforms sharing one island, so switching between them is a walk across the platform.
const ISLAND_PLATFORMS: Record<string, [number, number][]> = {
  "300": [[2, 3]], // Pa'ate Modi'in
  "400": [[1, 2]], // Modi'in - Center
  "680": [
    [1, 2],
    [3, 4],
  ], // Jerusalem - Yitzhak Navon
  "1240": [[1, 2]], // Yokne'am - Kfar Yehoshu'a
  "1250": [[1, 2]], // Migdal Ha'emek - Kfar Barukh
  "1260": [[1, 2]], // Afula
  "1500": [[2, 3]], // Akko
  "1600": [[2, 3]], // Nahariya
  "1840": [[1, 2]], // Karmiel
  "2100": [[2, 3]], // Haifa Center
  "2300": [[2, 3]], // Haifa - Hof HaKarmel
  "2500": [[2, 3]], // Atlit
  "2800": [[2, 3]], // Binyamina
  "3100": [[2, 3]], // Hadera - West
  "3300": [[2, 3]], // Netanya
  "3500": [
    [1, 2],
    [3, 4],
    [5, 6],
  ], // Herzliya
  "3600": [
    [1, 2],
    [3, 4],
  ], // Tel Aviv - University
  "3700": [
    [1, 2],
    [3, 4],
    [5, 6],
  ], // Tel Aviv - Savidor Center
  "4100": [[2, 3]], // Bnei Brak
  "4600": [[2, 3]], // Tel Aviv - HaShalom
  "4900": [
    [1, 2],
    [3, 4],
  ], // Tel Aviv - HaHagana
  "5000": [
    [1, 2],
    [3, 4],
    [5, 6],
  ], // Lod
  "5200": [[2, 3]], // Rehovot
  "5800": [[2, 3]], // Ashdod - Ad Halom
  "5900": [
    [1, 2],
    [3, 4],
  ], // Ashkelon
  "7000": [
    [1, 2],
    [3, 4],
  ], // Kiryat Gat
  "7300": [[3, 4]], // Be'er Sheva - North/University
  "8600": [[1, 2]], // Ben Gurion Airport
  "8800": [[2, 3]], // Rosh Ha'Ayin - North
  "9650": [
    [1, 2],
    [3, 4],
  ], // Netivot
  "9700": [[2, 3]], // Ofakim
  "9800": [
    [1, 2],
    [3, 4],
  ], // Rishon LeTsiyon - Moshe Dayan
}

export function acrossTheIsland(stationId: string, a: number, b: number): boolean {
  if (a === b) return false
  return !!ISLAND_PLATFORMS[stationId]?.some((pair) => pair.includes(a) && pair.includes(b))
}
