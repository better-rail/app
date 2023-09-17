/* eslint-disable camelcase */

type RailApiRouteItem = {
  departureTime: string
  arrivalTime: string
  freeSeats: number
  travelMessages: any[]
  trains: ApiTrain[]
}

export interface ApiTrain {
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
  trainPosition: TrainPosition
  routeStations: RouteStation[]
}

export interface TrainPosition {
  calcDiffMinutes: number
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

export type Train = {
  originStationId: number
  originStationName: string
  destinationStationId: number
  destinationStationName: string
  arrivalTime: number
  arrivalTimeString: string
  departureTime: number
  departureTimeString: string
  originPlatform: number
  destinationPlatform: number
  trainNumber: number
  stopStations: {
    arrivalTime: number
    arrivalTimeString: string
    departureTime: number
    departureTimeString: string
    stationId: number
    stationName: string
    platform: number
  }[]
  lastStop: string
  delay: number
  trainPosition: TrainPosition
}

export type RouteItem = {
  delay: number
  isExchange: boolean
  duration: string
  departureTime: number
  departureTimeString: String
  arrivalTime: number
  arrivalTimeString: string
  isMuchLonger: boolean
  isMuchShorter: boolean
  trains: Train[]
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
  creationDate: string
  version: string
  successStatus: number
  statusCode: number
  errorMessages: any
  result: Announcement[]
}

export interface Announcement {
  updateHeader: string
  updateContent: string
  updateLink: string
  stations: string[]
  linkText: string
  updateType: string
}
