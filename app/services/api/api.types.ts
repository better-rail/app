/* eslint-disable camelcase */

type RailApiRouteItem = {
  departureTime: string
  arrivalTime: string
  freeSeats: number
  travelMessages: any[]
  trains: Train[]
}

export interface Train {
  trainNumber: number
  orignStation: number
  destinationStation: number
  originPlatform: number
  destPlatform: number
  freeSeats: number
  arrivalTime: string
  departureTime: string
  stopStations: StopStation[]
  handicap: number
  crowded: number
  trainPosition: any
  routeStations: RouteStation[]
}

export interface StopStation {
  stationId: number
  arrivalTime: string
  departureTime: string
  platform: number
  crowded: number
}

export interface RouteStation {
  stationId: number
  arrivalTime: string
  crowded: number
  platform: number
}

export type RailApiGetRoutesResult = {
  result: {
    travels: RailApiRouteItem[]
  }
}

export type RouteItem = {
  // delay: number
  isExchange: boolean
  duration: string
  departureTime: number
  arrivalTime: number
  isMuchLonger: boolean
  isMuchShorter: boolean
  trains: {
    originStationId: number
    originStationName: string
    destinationStationId: number
    destinationStationName: string
    arrivalTime: number
    departureTime: number
    originPlatform: number
    destinationPlatform: number
    trainNumber: number
    stopStations: { arrivalTime: number; departureTime: number; stationId: number; stationName: string; platform: number }[]
    lastStop: string
    // delay: number
  }[]
}

export interface Title {
  HE: string
  EN: string
  RU: string
  AR: string
}

export interface ContractTitleCount {
  HE: string
  EN: string
  RU: string
  AR: string
}

export interface Title2 {
  HE: string
  EN: string
  RU: string
  AR: string
}

export interface SubTitle {
  HE: string
  EN: string
  RU: string
  AR: string
}

export interface ContractsResult {
  Trip_Type: string
  ETT_Code: number
  PREDEFINE: number
  Metro_Code: number
  Station_Code_Origin: number
  Station_Code_Dest: number
  SmartCard_Profile_Code: number
  ContractCodeMagnetic: number
  Magnetic_Profile_Code: number
  Contract_Code: number
  Contract_Name_He: string
  Contract_Name_En: string
  Contract_Name_Ar: string
  Contract_Name_Ru: string
  Price: string
  IsAvailableForSale: boolean
  RestrictionTitle_HE: string
  RestrictionTitle_EN: string
  RestrictionTitle_RU: string
  RestrictionTitle_AR: string
}

export interface OmesDetail {
  StationNumber: number
  OmesPercent: number
  Shmurim: string
  Time: string
  Platform: number
}

export interface AnnouncementApiResult {
  messageType: number
  message: string
  data: Announcement[]
}

export interface Announcement {
  updateContentArb: string
  updateContentEng: string
  updateContentHeb: string
  updateContentRus: string
  updateLinkArb: string
  updateLinkEng: string
  updateLinkHeb: string
  updateLinkRus: string
  station: string[]
  reportType: string
  reportImage: string
  startValidationOfReport: string
  endValidationOfReport: string
  nameArb: string
  nameEng: string
  nameHeb: string
  nameRus: string
  float: boolean
  order: number
}
