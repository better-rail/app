/* eslint-disable camelcase */

type RailApiRouteItem = {
  Trainno: string
  OrignStation: string
  DestinationStation: string
  ArrivalTime: string
  DepartureTime: string
  StopStations: { StationId: string; ArrivalTime: string; DepartureTime: string; Platform: string }[]
  LineNumber: string
  Route: string
  Midnight: boolean
  Handicap: boolean
  DirectTrain: boolean
  TrainParvariBenironi: any
  ReservedSeat: boolean
  Platform: string
  DestPlatform: string
  IsFullTrain: boolean
}

export type RailApiGetRoutesResult = {
  MessageType: number
  Message: string | null
  Data: {
    Routes: { IsExchange: boolean; EstTime: string; Train: RailApiRouteItem[] }[]
    Details: { Origin: string; Destination: string; Date: string; SugKav: string; Hour: string }
    Delays: { Station: string; Date: string; Time: string; Train: string; Min: string }[]
    Error: { Description: string; ErrorId: string; Exception: string }
    Omasim: { TrainNumber: number; Stations: OmesDetail[] }[]
  }
}

export type RouteItem = {
  delay: number
  isExchange: boolean
  estTime: string
  departureTime: number
  isMuchLonger: boolean
  isMuchShorter: boolean
  trains: {
    originStationId: string
    originStationName: string
    destinationStationId: string
    destinationStationName: string
    arrivalTime: number
    departureTime: number
    originPlatform: string
    destinationPlatform: string
    trainNumber: string
    stopStations: { arrivalTime: number; departureTime: number; stationId: string; stationName: string; platform: string }[]
    lastStop: string
    delay: number
  }[]
}

export type RequestBarodeParams = {
  userId: string
  phoneNumber: string
  token: string
  route: RouteItem
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
