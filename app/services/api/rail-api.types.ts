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
  routeStations: RouteStation[]
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

export interface PopUpMessagesApiResult {
  creationDate: string
  version: string
  successStatus: number
  statusCode: number
  errorMessages: any
  result: PopUpMessage[]
}

export interface Announcement {
  updateHeader: string
  updateContent: string
  updateLink: string
  stations: string[]
  linkText: string
  updateType: string
}

export interface PopUpMessage {
  id: number
  pageTypeId: number
  title: string
  messageBody: string
  startDate: string
  endDate: string
  systemTypeId: number
}

export interface StationInfoApiResult {
  creationDate: string
  version: string
  successStatus: number
  statusCode: number
  errorMessages: any
  result: StationInfo
}

export interface StationInfo {
  creationDate: string
  version: any
  successStatus: number
  statusCode: number
  errorMessages: any
  stationUpdates: StationUpdate[]
  stationDetails: StationDetails
  gateInfo: GateInfo[]
  easyCategories: string[]
  safetyInfos: string[]
}

export interface StationUpdate {
  updateHeader: string
  updateContent: string
  updateLink: string
  stations: string[]
  linkText: string
  updateType: string
}

export interface StationDetails {
  stationId: number
  stationName: string
  carParking: string
  parkingCosts: string
  bikeParking: string
  bikeParkingCosts: string
  airPollutionIcon: any
  stationMap: any
  nonActiveElevators: any
  nonActiveElevatorsLink: any
  stationIsClosed: boolean
  stationIsClosedUntill: string
  stationIsClosedText: any
  stationInfoTitle: string
  stationInfo: string
  aboutStationTitle: string
  aboutStationContent: string
  parkingTitleTranslationKey: string
  parkingContentTranslationKey: string
}

export interface GateInfo {
  stationGateId: number
  gateName: string
  gateAddress?: string
  gateLatitude: number
  gateLontitude: number
  gateActivityHours: GateActivityHour[]
  gateServices: GateService[]
  nonActiveElavators: string
}

export interface GateActivityHour {
  activityHoursType: number
  isClosedShortText: string
  isClosedLongText: string
  activityDaysNumbers: string
  startHourTextKey: any
  startHour: string
  startHourReplaceTextKey: any
  endHourPrefixTextKey: any
  endHour: string
  endHourReplaceTextKey: any
  endHourPostfixTextKey: any
  activityHoursReplaceTextKey?: string
}

export interface GateService {
  serviceName: string
  serviceIcon: string
  serviceIconLink: string
  serviceIconImg: any
}
